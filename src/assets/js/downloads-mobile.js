/**
 * Spotiwind — Dedicated Downloads (Offline Music) Page Module (Mobile)
 * Handles offline song library, storage estimate meter, queue playback,
 * search with debounce, filter chips, list/grid toggle, and TikTok-style infinite scroll.
 */

import { showToast } from '../../utils/domUtils.js';
import { debounce } from '../../utils/formatters.js';
import { OFFLINE_CACHE_NAME, getCachedAudioBlobUrl, removeSongAudioFromCache, downloadMp3ToDevice } from '../../services/offlineAudioService.js';

let currentDownloads = [];
let filteredDownloads = [];
let searchQuery = '';
let activeFilter = 'all'; // 'all' | 'tracks' | 'albums' | 'playlists'
let activeSort = 'recent'; // 'recent' | 'size' | 'alpha'
let viewMode = sessionStorage.getItem('downloads_view_mode') || 'list'; // 'list' | 'grid'
let previousPageUrl = 'library-mobile.html';
let selectedSongForOptions = null;
const listeners = [];

const PAGE_CHUNK_SIZE = 10;
let downloadsVisibleLimit = PAGE_CHUNK_SIZE;
let isDownloadsLoadingMore = false;

const PLAY_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
const PAUSE_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function formatBytes(bytes) {
    if (!bytes || isNaN(bytes) || bytes <= 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
        return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
}

const getSavedDownloads = () => {
    try {
        const raw = localStorage.getItem('downloaded_songs') || localStorage.getItem('spotiwind_downloads') || '[]';
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn("Failed to parse downloaded_songs:", e);
        return [];
    }
};

const isGlobalShuffleActive = () => {
    if (typeof window.getPlaybackShuffle === 'function') {
        return window.getPlaybackShuffle();
    }
    return Boolean(window.__spotiwindIsShuffle);
};

const setGlobalShuffleState = (val) => {
    if (typeof window.togglePlaybackShuffle === 'function') {
        window.togglePlaybackShuffle(val);
    } else if (typeof window.setPlaybackShuffle === 'function') {
        window.setPlaybackShuffle(val);
    } else {
        window.__spotiwindIsShuffle = Boolean(val);
        const fullBtn = document.getElementById('fullShuffleBtn');
        if (fullBtn) fullBtn.classList.toggle('active', Boolean(val));
    }
};

const getCurrentLoadedSong = () => {
    return window.spotiwind?.mobile?.getCurrentSongData?.() || window.__currentSongData || (typeof window.getCurrentSongData === 'function' ? window.getCurrentSongData() : null);
};

const getGlobalActiveAudio = () => {
    return window.__activeAudio || (typeof activeAudio !== 'undefined' ? activeAudio : document.querySelector('audio'));
};

const isDownloadsSessionActive = () => {
    const activeAudio = getGlobalActiveAudio();
    if (!activeAudio || !activeAudio.src) return false;

    const currentSong = getCurrentLoadedSong();
    if (!currentSong) return false;

    const currentContext = window.__spotiwindPlaybackContext || window.__spotiwindContext || '';
    return currentContext === 'downloads';
};

const isDownloadsCurrentlyPlaying = () => {
    const activeAudio = getGlobalActiveAudio();
    if (!activeAudio || activeAudio.paused || activeAudio.ended) return false;
    return isDownloadsSessionActive();
};

const syncSongItemsActiveState = () => {
    const isSessionActive = isDownloadsSessionActive();
    const currentSong = getCurrentLoadedSong();
    const activeAudio = getGlobalActiveAudio();
    const isPlaying = activeAudio && !activeAudio.paused && !activeAudio.ended;

    document.querySelectorAll('.download-song-item, .download-grid-card').forEach(item => {
        const songId = item.dataset.songId;
        const songAudio = item.dataset.songAudio;
        const isSame = isSessionActive && currentSong && (String(currentSong.id) === String(songId) || (typeof window.areSameSongs === 'function' && window.areSameSongs(currentSong, { id: songId, audio: songAudio })));

        item.classList.toggle('is-active-song', Boolean(isSame));

        const overlay = item.querySelector('.download-song-play-overlay, .download-grid-play-overlay');
        if (overlay) {
            if (isSame && isPlaying) {
                overlay.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
            } else {
                overlay.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>`;
            }
        }
    });
};

const syncPlayPauseButtonUI = () => {
    const playIconWrapper = document.getElementById('downloadsPlayIconWrapper');
    const playText = document.getElementById('downloadsPlayAllText');
    const isPlaying = isDownloadsCurrentlyPlaying();

    if (playIconWrapper) {
        playIconWrapper.innerHTML = isPlaying ? PAUSE_ICON : PLAY_ICON;
    }
    if (playText) {
        playText.textContent = isPlaying ? 'Pause' : 'Play all';
    }

    const shuffleBtn = document.getElementById('downloadsShuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.classList.toggle('is-active', isGlobalShuffleActive());
    }

    syncSongItemsActiveState();
};

const OFFLINE_STORAGE_BUDGET_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB standard offline storage limit

/**
 * Storage Calculation & Progress Bar Updating
 */
async function updateStorageUsageBar() {
    const summaryEl = document.getElementById('storageUsageSummary');
    const fillSpotiwindEl = document.getElementById('storageFillSpotiwind');
    const fillOtherEl = document.getElementById('storageFillOther');
    const legendSpotiwindVal = document.getElementById('legendSpotiwindVal');
    const legendFreeVal = document.getElementById('legendFreeVal');
    const heroSizeEl = document.getElementById('downloadsStorageSize');

    if (fillOtherEl) fillOtherEl.style.display = 'none';

    // Calculate total downloaded bytes accurately
    const totalBytes = currentDownloads.reduce((acc, song) => {
        let size = Number(song.size);
        if (!isNaN(size) && size > 0) {
            if (size < 1024) size = size * 1024 * 1024; // Convert MB to bytes if stored in MB
            return acc + size;
        }
        const dur = Number(song.duration) || 0;
        return acc + (dur > 0 ? Math.round(dur * (128 * 1024 / 8)) : 4.5 * 1024 * 1024);
    }, 0);

    const formattedDownloaded = formatBytes(totalBytes);
    if (legendSpotiwindVal) legendSpotiwindVal.textContent = formattedDownloaded;
    if (heroSizeEl) heroSizeEl.textContent = `${formattedDownloaded} used`;

    // Offline storage quota standard (10 GB, matching Spotiwind Library limit)
    let quotaBytes = OFFLINE_STORAGE_BUDGET_BYTES;
    let freeBytes = Math.max(0, quotaBytes - totalBytes);

    if (navigator.storage && navigator.storage.estimate) {
        try {
            const estimate = await navigator.storage.estimate();
            if (estimate.quota && estimate.quota < quotaBytes) {
                quotaBytes = estimate.quota;
                freeBytes = Math.max(0, quotaBytes - totalBytes);
            }
        } catch (e) {
            console.warn("Storage estimate check:", e);
        }
    }

    // Dynamic bar percentage with clear visual feedback
    const rawPercent = quotaBytes > 0 ? (totalBytes / quotaBytes) * 100 : 0;
    const visualPercent = totalBytes > 0 ? Math.max(2.5, Math.min(100, rawPercent)) : 0;

    if (fillSpotiwindEl) {
        fillSpotiwindEl.style.width = `${visualPercent.toFixed(1)}%`;
    }

    if (summaryEl) {
        summaryEl.textContent = `${formattedDownloaded} of ${formatBytes(quotaBytes)}`;
    }
    if (legendFreeVal) {
        legendFreeVal.textContent = formatBytes(freeBytes);
    }
}

/**
 * Filter & Sort Logic
 */
function applyFilterAndSort() {
    let result = [...currentDownloads];

    // Filter category
    if (activeFilter === 'tracks') {
        result = result.filter(s => !s.type || s.type === 'track');
    } else if (activeFilter === 'albums') {
        result = result.filter(s => Boolean(s.album || s.album_name || s.albumTitle || s.albumName));
    } else if (activeFilter === 'playlists') {
        result = result.filter(s => Boolean(s.playlist || s.playlistName));
    }

    // Search query
    if (searchQuery) {
        result = result.filter(s => {
            const name = (s.name || s.title || '').toLowerCase();
            const artist = (s.artist || '').toLowerCase();
            const album = (s.album || s.album_name || '').toLowerCase();
            return name.includes(searchQuery) || artist.includes(searchQuery) || album.includes(searchQuery);
        });
    }

    // Sorting
    if (activeSort === 'size') {
        result.sort((a, b) => (Number(b.size) || 0) - (Number(a.size) || 0));
    } else if (activeSort === 'alpha') {
        result.sort((a, b) => (a.name || a.title || '').localeCompare(b.name || b.title || ''));
    } else {
        // 'recent'
        result.sort((a, b) => (Number(b.downloadedAt) || 0) - (Number(a.downloadedAt) || 0));
    }

    filteredDownloads = result;
}

/**
 * Render Downloads List / Grid with Infinite Scroll
 */
function renderDownloadsList() {
    const listEl = document.getElementById('downloadsTrackList');
    const countEl = document.getElementById('downloadsTrackCount');
    if (!listEl) return;

    applyFilterAndSort();

    if (countEl) {
        const count = currentDownloads.length;
        countEl.textContent = `${count} ${count === 1 ? 'track' : 'tracks'}`;
    }

    // Empty state
    if (filteredDownloads.length === 0) {
        if (currentDownloads.length === 0) {
            listEl.className = 'downloads-list view-list';
            listEl.innerHTML = `
                <div class="downloads-empty-state">
                    <div class="downloads-empty-icon-box">
                        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </div>
                    <h2 class="downloads-empty-title">No Downloaded Music Yet</h2>
                    <p class="downloads-empty-desc">Download your favorite songs, albums, and playlists to listen anywhere without internet.</p>
                    <button type="button" class="downloads-empty-btn" id="emptyExploreBtn">Explore Music</button>
                </div>
            `;
            const exploreBtn = document.getElementById('emptyExploreBtn');
            if (exploreBtn) {
                exploreBtn.addEventListener('click', () => {
                    if (typeof window.loadPageContent === 'function') {
                        window.loadPageContent('library-mobile.html', { pushState: true, initialTab: 'overview' });
                    }
                });
            }
        } else {
            listEl.className = 'downloads-list view-list';
            listEl.innerHTML = `
                <div class="downloads-empty-state">
                    <h2 class="downloads-empty-title">No matching tracks found</h2>
                    <p class="downloads-empty-desc">Try changing your search term or filter chips above.</p>
                </div>
            `;
        }
        return;
    }

    listEl.className = `downloads-list view-${viewMode}`;

    const visibleItems = filteredDownloads.slice(0, downloadsVisibleLimit);
    const hasMore = downloadsVisibleLimit < filteredDownloads.length;

    let html = '';

    if (viewMode === 'grid') {
        html = visibleItems.map(song => {
            const songName = escapeHTML(song.name || song.title || 'Unknown Track');
            const songArtist = escapeHTML(song.artist || 'Unknown Artist');
            const songCover = escapeHTML(song.cover || song.coverUrl || song.image || '/public/branding/Spotiwind.webp');
            const songAudio = escapeHTML(song.audio || song.audioUrl || '');
            const songId = escapeHTML(String(song.id));
            const sizeFormatted = formatBytes(song.size || (Number(song.duration) * (128 * 1024 / 8)));

            return `
                <div class="download-grid-card"
                    data-song-id="${songId}"
                    data-song-audio="${songAudio}"
                    data-song-name="${songName}"
                    data-song-artist="${songArtist}"
                    data-song-cover="${songCover}"
                    data-song-duration="${Number(song.duration) || 0}"
                    data-song-size="${Number(song.size) || 0}">
                    <div class="download-grid-art-box">
                        <img src="${songCover}" alt="${songName}" class="download-grid-cover" width="160" height="160" loading="lazy"
                            onerror="this.onerror=null; this.src='/public/branding/Spotiwind.webp';">
                        <div class="download-grid-play-overlay">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <polygon points="6 4 20 12 6 20 6 4"></polygon>
                            </svg>
                        </div>
                    </div>
                    <div class="download-grid-info">
                        <h4 class="download-grid-title">${songName}</h4>
                        <p class="download-grid-artist">${songArtist}</p>
                    </div>
                    <div class="download-grid-footer">
                        <span class="download-grid-badge">
                            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            ${sizeFormatted}
                        </span>
                        <button type="button" class="download-grid-more-btn download-song-more-btn" aria-label="Track options">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <circle cx="12" cy="5" r="1.75"/>
                                <circle cx="12" cy="12" r="1.75"/>
                                <circle cx="12" cy="19" r="1.75"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        // List view
        html = visibleItems.map(song => {
            const songName = escapeHTML(song.name || song.title || 'Unknown Track');
            const songArtist = escapeHTML(song.artist || 'Unknown Artist');
            const songCover = escapeHTML(song.cover || song.coverUrl || song.image || '/public/branding/Spotiwind.webp');
            const songAudio = escapeHTML(song.audio || song.audioUrl || '');
            const songId = escapeHTML(String(song.id));
            const sizeFormatted = formatBytes(song.size || (Number(song.duration) * (128 * 1024 / 8)));
            const durationFormatted = formatDuration(song.duration);

            return `
                <div class="download-song-item"
                    data-song-id="${songId}"
                    data-song-audio="${songAudio}"
                    data-song-name="${songName}"
                    data-song-artist="${songArtist}"
                    data-song-cover="${songCover}"
                    data-song-duration="${Number(song.duration) || 0}"
                    data-song-size="${Number(song.size) || 0}">
                    <div class="download-song-art-wrapper">
                        <img src="${songCover}" alt="${songName}" class="download-song-cover" width="48" height="48" loading="lazy"
                            onerror="this.onerror=null; this.src='/public/branding/Spotiwind.webp';">
                        <div class="download-song-play-overlay">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <polygon points="6 4 20 12 6 20 6 4"></polygon>
                            </svg>
                        </div>
                    </div>
                    <div class="download-song-info">
                        <h4 class="download-song-title">${songName}</h4>
                        <p class="download-song-artist">${songArtist} • ${durationFormatted}</p>
                    </div>
                    <div class="download-song-actions">
                        <span class="download-song-size">${sizeFormatted}</span>
                        <div class="download-offline-badge-icon" title="Offline Ready">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <button type="button" class="download-song-more-btn" aria-label="Opsi ${songName}">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <circle cx="12" cy="5" r="1.75"/>
                                <circle cx="12" cy="12" r="1.75"/>
                                <circle cx="12" cy="19" r="1.75"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    if (hasMore) {
        html += `
            <div class="downloads-infinite-loader" id="downloadsInfiniteLoader">
                <span class="downloads-infinite-spinner"></span>
                <span class="downloads-infinite-text">Loading more tracks...</span>
            </div>
        `;
    }

    listEl.innerHTML = html;
    syncSongItemsActiveState();
}

/**
 * TikTok-style Infinite Scroll Progressive Batch Loader
 */
function triggerLoadMore() {
    if (isDownloadsLoadingMore) return;
    if (downloadsVisibleLimit >= filteredDownloads.length) return;

    isDownloadsLoadingMore = true;

    setTimeout(() => {
        downloadsVisibleLimit += PAGE_CHUNK_SIZE;
        renderDownloadsList();
        isDownloadsLoadingMore = false;
    }, 180);
}

function setupDownloadsInfiniteScroll() {
    let lastScrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    let touchStartY = 0;
    let isTouching = false;

    const handleScroll = debounce(() => {
        if (isDownloadsLoadingMore) return;

        const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
        const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        const clientHeight = window.innerHeight || document.documentElement.clientHeight;

        const isScrollingDown = scrollTop > lastScrollTop;
        lastScrollTop = Math.max(0, scrollTop);

        // Predictive buffer: user scrolls down and reaches >= 80% or within 220px of bottom
        if (isScrollingDown && scrollTop > 60 && (scrollTop + clientHeight >= scrollHeight - 220 || scrollTop + clientHeight >= scrollHeight * 0.80)) {
            triggerLoadMore();
        }
    }, 60);

    const handleTouchStart = (e) => {
        if (isDownloadsLoadingMore || !e.touches || !e.touches[0]) return;
        touchStartY = e.touches[0].clientY;
        isTouching = true;
    };

    const handleTouchMove = (e) => {
        if (!isTouching || isDownloadsLoadingMore || !e.touches || !e.touches[0]) return;
        const currentY = e.touches[0].clientY;
        const pullDistance = touchStartY - currentY;

        const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
        const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        const clientHeight = window.innerHeight || document.documentElement.clientHeight;

        if (pullDistance > 30 && (scrollTop + clientHeight >= scrollHeight - 150)) {
            triggerLoadMore();
        }
    };

    const handleTouchEnd = () => {
        isTouching = false;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    listeners.push({ element: window, type: 'scroll', handler: handleScroll });
    listeners.push({ element: window, type: 'touchstart', handler: handleTouchStart });
    listeners.push({ element: window, type: 'touchmove', handler: handleTouchMove });
    listeners.push({ element: window, type: 'touchend', handler: handleTouchEnd });
}

/**
 * Playback Queue Execution with Offline Cache Fallback
 */
async function playSongInDownloadsContext(targetSong, queueList) {
    if (!targetSong) return;

    // Check if audio file has an offline cached blob
    let finalAudioSrc = targetSong.audio;
    try {
        const cachedBlobUrl = await getCachedAudioBlobUrl(targetSong.audio);
        if (cachedBlobUrl) {
            finalAudioSrc = cachedBlobUrl;
        }
    } catch (err) {
        console.warn("Could not retrieve offline blob URL, using online URL:", err);
    }

    if (typeof window.playPreview === 'function') {
        window.__spotiwindPlaybackContext = 'downloads';
        window.playPreview(
            null,
            finalAudioSrc,
            targetSong.name || targetSong.title,
            targetSong.artist,
            targetSong.cover,
            targetSong.id,
            Number(targetSong.duration) || 0,
            'downloads',
            queueList || currentDownloads
        );
    }
    setTimeout(syncPlayPauseButtonUI, 120);
}

const handlePlayAllClick = () => {
    const activeAudio = getGlobalActiveAudio();
    const isSessionActive = isDownloadsSessionActive();

    // Toggle pause / resume if Downloads session is currently active
    if (isSessionActive && activeAudio && activeAudio.src) {
        if (!activeAudio.paused) {
            activeAudio.pause();
        } else {
            activeAudio.play().catch(e => console.error("Play error:", e));
        }
        syncPlayPauseButtonUI();
        if (typeof window.syncActiveSongUI === 'function') {
            window.syncActiveSongUI();
        }
        return;
    }

    const targetList = filteredDownloads.length > 0 ? filteredDownloads : currentDownloads;
    if (!targetList || targetList.length === 0) {
        showToast('No downloaded tracks to play.');
        return;
    }

    let targetSong = targetList[0];
    let playlistToPlay = [...targetList];

    if (isGlobalShuffleActive()) {
        const shuffled = [...targetList];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        targetSong = shuffled[0];
        playlistToPlay = shuffled;
    }

    playSongInDownloadsContext(targetSong, playlistToPlay);
};

const handleShuffleClick = () => {
    const targetList = filteredDownloads.length > 0 ? filteredDownloads : currentDownloads;
    if (!targetList || targetList.length === 0) {
        showToast('No downloaded tracks to shuffle.');
        return;
    }

    const currentShuffle = isGlobalShuffleActive();
    const nextShuffle = !currentShuffle;
    setGlobalShuffleState(nextShuffle);

    const shuffleBtn = document.getElementById('downloadsShuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.classList.toggle('is-active', nextShuffle);
    }

    if (nextShuffle) {
        const shuffled = [...targetList];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        playSongInDownloadsContext(shuffled[0], shuffled);
        showToast('Shuffle enabled for offline tracks.');
    } else {
        showToast('Shuffle disabled.');
    }
    setTimeout(syncPlayPauseButtonUI, 120);
};

/**
 * Modals and Sheets Management
 */
const openGlobalOptions = () => {
    const modal = document.getElementById('downloadsGlobalOptionsModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.removeAttribute('inert');
    }
};

const closeGlobalOptions = () => {
    const modal = document.getElementById('downloadsGlobalOptionsModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('inert', '');
    }
};

const openSongOptions = (song) => {
    selectedSongForOptions = song;
    const modal = document.getElementById('downloadsSongOptionsModal');
    const coverEl = document.getElementById('songOptionsCover');
    const titleEl = document.getElementById('songOptionsTitle');
    const artistEl = document.getElementById('songOptionsArtist');

    if (coverEl) coverEl.src = song.cover || '/public/branding/Spotiwind.webp';
    if (titleEl) titleEl.textContent = song.name || song.title || 'Track';
    if (artistEl) {
        const sizeFormatted = formatBytes(song.size);
        artistEl.textContent = `${song.artist || 'Unknown Artist'} • ${sizeFormatted}`;
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.removeAttribute('inert');
    }
};

const closeSongOptions = () => {
    selectedSongForOptions = null;
    const modal = document.getElementById('downloadsSongOptionsModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('inert', '');
    }
};

/**
 * Initialize Downloads Page
 * @param {string} previousPage
 */
export async function initDownloadsPage(previousPage = 'library-mobile.html') {
    previousPageUrl = previousPage;
    searchQuery = '';
    activeFilter = 'all';
    downloadsVisibleLimit = PAGE_CHUNK_SIZE;
    isDownloadsLoadingMore = false;

    currentDownloads = getSavedDownloads();

    // 1. Back button setup
    const backBtn = document.getElementById('downloadsBackBtn');
    if (backBtn) {
        const handleBack = async (e) => {
            e.preventDefault();
            cleanupDownloadsPage();
            const targetPage = (previousPageUrl && !previousPageUrl.includes('downloads')) ? previousPageUrl : 'library-mobile.html';

            // Keep Library highlighted in bottom navigation
            document.querySelectorAll('.mobile-bottom-nav .nav-item').forEach(item => {
                const target = item.dataset.target || '';
                item.classList.toggle('active', target.includes('library'));
            });

            if (typeof window.loadPageContent === 'function') {
                await window.loadPageContent(targetPage, { pushState: true, initialTab: 'overview' });
            } else {
                window.location.href = targetPage;
            }
        };
        backBtn.addEventListener('click', handleBack);
        listeners.push({ element: backBtn, type: 'click', handler: handleBack });
    }

    // 2. Global more options button
    const moreBtn = document.getElementById('downloadsMoreBtn');
    if (moreBtn) {
        const handleMore = (e) => {
            e.preventDefault();
            openGlobalOptions();
        };
        moreBtn.addEventListener('click', handleMore);
        listeners.push({ element: moreBtn, type: 'click', handler: handleMore });
    }

    // 3. Play all & Shuffle buttons
    const playAllBtn = document.getElementById('downloadsPlayAllBtn');
    if (playAllBtn) {
        const handlePlayAll = (e) => {
            e.preventDefault();
            handlePlayAllClick();
        };
        playAllBtn.addEventListener('click', handlePlayAll);
        listeners.push({ element: playAllBtn, type: 'click', handler: handlePlayAll });
    }

    const shuffleBtn = document.getElementById('downloadsShuffleBtn');
    if (shuffleBtn) {
        const handleShuffle = (e) => {
            e.preventDefault();
            handleShuffleClick();
        };
        shuffleBtn.addEventListener('click', handleShuffle);
        listeners.push({ element: shuffleBtn, type: 'click', handler: handleShuffle });
    }

    // 4. View mode switcher (List vs Grid)
    const listBtn = document.getElementById('downloadsViewListBtn');
    const gridBtn = document.getElementById('downloadsViewGridBtn');

    const updateViewButtons = () => {
        if (listBtn) listBtn.classList.toggle('is-active', viewMode === 'list');
        if (gridBtn) gridBtn.classList.toggle('is-active', viewMode === 'grid');
    };
    updateViewButtons();

    if (listBtn) {
        const handleListView = () => {
            viewMode = 'list';
            sessionStorage.setItem('downloads_view_mode', 'list');
            updateViewButtons();
            renderDownloadsList();
        };
        listBtn.addEventListener('click', handleListView);
        listeners.push({ element: listBtn, type: 'click', handler: handleListView });
    }

    if (gridBtn) {
        const handleGridView = () => {
            viewMode = 'grid';
            sessionStorage.setItem('downloads_view_mode', 'grid');
            updateViewButtons();
            renderDownloadsList();
        };
        gridBtn.addEventListener('click', handleGridView);
        listeners.push({ element: gridBtn, type: 'click', handler: handleGridView });
    }

    // 5. Search input with 220ms debounce
    const searchInput = document.getElementById('downloadsSearchInput');
    const clearBtn = document.getElementById('downloadsSearchClearBtn');

    if (searchInput) {
        const debouncedSearch = debounce(() => {
            if (searchInput) {
                searchQuery = (searchInput.value || '').trim().toLowerCase();
            }
            downloadsVisibleLimit = PAGE_CHUNK_SIZE;
            renderDownloadsList();
        }, 220);

        const handleSearchInput = (e) => {
            const val = (e.target.value || '').trim();
            if (clearBtn) {
                clearBtn.classList.toggle('hidden', !val);
            }
            debouncedSearch();
        };
        searchInput.addEventListener('input', handleSearchInput);
        listeners.push({ element: searchInput, type: 'input', handler: handleSearchInput });
    }

    if (clearBtn && searchInput) {
        const handleClear = (e) => {
            e.preventDefault();
            searchInput.value = '';
            clearBtn.classList.add('hidden');
            searchQuery = '';
            downloadsVisibleLimit = PAGE_CHUNK_SIZE;
            renderDownloadsList();
            searchInput.focus();
        };
        clearBtn.addEventListener('click', handleClear);
        listeners.push({ element: clearBtn, type: 'click', handler: handleClear });
    }

    // 6. Category filter chips
    document.querySelectorAll('.downloads-chip').forEach(chip => {
        const handleChip = () => {
            document.querySelectorAll('.downloads-chip').forEach(c => c.classList.remove('is-active'));
            chip.classList.add('is-active');
            activeFilter = chip.dataset.filter || 'all';
            downloadsVisibleLimit = PAGE_CHUNK_SIZE;
            renderDownloadsList();
        };
        chip.addEventListener('click', handleChip);
        listeners.push({ element: chip, type: 'click', handler: handleChip });
    });

    // 7. Sort button
    const sortTriggerBtn = document.getElementById('downloadsSortTriggerBtn');
    const sortLabel = document.getElementById('downloadsSortLabel');
    if (sortTriggerBtn) {
        const handleSortCycle = () => {
            if (activeSort === 'recent') {
                activeSort = 'size';
                if (sortLabel) sortLabel.textContent = 'Size';
                showToast('Sorted by file size');
            } else if (activeSort === 'size') {
                activeSort = 'alpha';
                if (sortLabel) sortLabel.textContent = 'A-Z';
                showToast('Sorted by title (A - Z)');
            } else {
                activeSort = 'recent';
                if (sortLabel) sortLabel.textContent = 'Recent';
                showToast('Sorted by recently downloaded');
            }
            renderDownloadsList();
        };
        sortTriggerBtn.addEventListener('click', handleSortCycle);
        listeners.push({ element: sortTriggerBtn, type: 'click', handler: handleSortCycle });
    }

    // 8. Global Options Sheet Actions
    const globalBackdrop = document.getElementById('downloadsGlobalBackdrop');
    const globalCloseBtn = document.getElementById('downloadsGlobalCloseBtn');
    if (globalBackdrop) {
        globalBackdrop.addEventListener('click', closeGlobalOptions);
        listeners.push({ element: globalBackdrop, type: 'click', handler: closeGlobalOptions });
    }
    if (globalCloseBtn) {
        globalCloseBtn.addEventListener('click', closeGlobalOptions);
        listeners.push({ element: globalCloseBtn, type: 'click', handler: closeGlobalOptions });
    }

    const optSortRecent = document.getElementById('optSortRecent');
    if (optSortRecent) {
        const handler = () => {
            activeSort = 'recent';
            if (sortLabel) sortLabel.textContent = 'Recent';
            closeGlobalOptions();
            renderDownloadsList();
            showToast('Sorted by recently downloaded');
        };
        optSortRecent.addEventListener('click', handler);
        listeners.push({ element: optSortRecent, type: 'click', handler });
    }

    const optSortSize = document.getElementById('optSortSize');
    if (optSortSize) {
        const handler = () => {
            activeSort = 'size';
            if (sortLabel) sortLabel.textContent = 'Size';
            closeGlobalOptions();
            renderDownloadsList();
            showToast('Sorted by largest file size');
        };
        optSortSize.addEventListener('click', handler);
        listeners.push({ element: optSortSize, type: 'click', handler });
    }

    const optSortAlpha = document.getElementById('optSortAlpha');
    if (optSortAlpha) {
        const handler = () => {
            activeSort = 'alpha';
            if (sortLabel) sortLabel.textContent = 'A-Z';
            closeGlobalOptions();
            renderDownloadsList();
            showToast('Sorted by title (A - Z)');
        };
        optSortAlpha.addEventListener('click', handler);
        listeners.push({ element: optSortAlpha, type: 'click', handler });
    }

    const optClearAll = document.getElementById('optClearAllDownloads');
    if (optClearAll) {
        const handleClearAll = async () => {
            closeGlobalOptions();
            if (currentDownloads.length === 0) {
                showToast('No downloads to delete.');
                return;
            }

            const confirmed = window.confirm('Are you sure you want to remove all downloaded music from offline storage?');
            if (!confirmed) return;

            try {
                if ('caches' in window) {
                    await caches.delete(OFFLINE_CACHE_NAME);
                }
                localStorage.removeItem('downloaded_songs');
                localStorage.removeItem('spotiwind_downloads');
                currentDownloads = [];
                filteredDownloads = [];

                if (typeof window.updateSidebarMusicCounts === 'function') {
                    window.updateSidebarMusicCounts();
                }
                window.dispatchEvent(new CustomEvent('downloads-updated', { detail: { list: [] } }));

                renderDownloadsList();
                updateStorageUsageBar();
                syncPlayPauseButtonUI();
                showToast('All offline music removed.');
            } catch (err) {
                console.error("Failed to clear downloads:", err);
                showToast('Failed to remove some offline files.');
            }
        };
        optClearAll.addEventListener('click', handleClearAll);
        listeners.push({ element: optClearAll, type: 'click', handler: handleClearAll });
    }

    // 9. Per-Song Options Sheet Actions
    const songBackdrop = document.getElementById('downloadsSongBackdrop');
    const songCloseBtn = document.getElementById('downloadsSongCloseBtn');
    if (songBackdrop) {
        songBackdrop.addEventListener('click', closeSongOptions);
        listeners.push({ element: songBackdrop, type: 'click', handler: closeSongOptions });
    }
    if (songCloseBtn) {
        songCloseBtn.addEventListener('click', closeSongOptions);
        listeners.push({ element: songCloseBtn, type: 'click', handler: closeSongOptions });
    }

    const optSongPlayNext = document.getElementById('optSongPlayNext');
    if (optSongPlayNext) {
        const handler = () => {
            if (selectedSongForOptions) {
                if (typeof window.addToQueue === 'function') {
                    window.addToQueue(selectedSongForOptions);
                    showToast(`"${selectedSongForOptions.name || selectedSongForOptions.title}" will play next.`);
                } else {
                    showToast('Added to queue.');
                }
            }
            closeSongOptions();
        };
        optSongPlayNext.addEventListener('click', handler);
        listeners.push({ element: optSongPlayNext, type: 'click', handler });
    }

    const optSongExportMp3 = document.getElementById('optSongExportMp3');
    if (optSongExportMp3) {
        const handler = async () => {
            if (selectedSongForOptions) {
                closeSongOptions();
                await downloadMp3ToDevice(selectedSongForOptions);
            }
        };
        optSongExportMp3.addEventListener('click', handler);
        listeners.push({ element: optSongExportMp3, type: 'click', handler });
    }

    const optSongRemove = document.getElementById('optSongRemoveDownload');
    if (optSongRemove) {
        const handler = async () => {
            if (!selectedSongForOptions) return;
            const songToRemove = selectedSongForOptions;
            closeSongOptions();

            try {
                await removeSongAudioFromCache(songToRemove);
                let list = getSavedDownloads();
                list = list.filter(s => String(s.id) !== String(songToRemove.id));
                localStorage.setItem('downloaded_songs', JSON.stringify(list));

                currentDownloads = list;
                if (typeof window.updateSidebarMusicCounts === 'function') {
                    window.updateSidebarMusicCounts();
                }
                window.dispatchEvent(new CustomEvent('downloads-updated', { detail: { list } }));

                renderDownloadsList();
                updateStorageUsageBar();
                showToast(`Removed "${songToRemove.name || songToRemove.title}" from downloads.`);
            } catch (e) {
                console.error("Remove download error:", e);
                showToast('Failed to remove track from downloads.');
            }
        };
        optSongRemove.addEventListener('click', handler);
        listeners.push({ element: optSongRemove, type: 'click', handler });
    }

    // 10. Track Item Click & Options Delegation
    const listSection = document.querySelector('.downloads-list-section');
    if (listSection) {
        const handleListClick = async (e) => {
            // Loader click
            const loaderEl = e.target.closest('.downloads-infinite-loader');
            if (loaderEl) {
                triggerLoadMore();
                return;
            }

            // More 3-dots button click
            const moreSongBtn = e.target.closest('.download-song-more-btn');
            if (moreSongBtn) {
                e.stopPropagation();
                const songCard = moreSongBtn.closest('.download-song-item, .download-grid-card');
                if (songCard) {
                    const song = {
                        id: songCard.dataset.songId,
                        name: songCard.dataset.songName,
                        artist: songCard.dataset.songArtist,
                        cover: songCard.dataset.songCover,
                        audio: songCard.dataset.songAudio,
                        duration: Number(songCard.dataset.songDuration) || 0,
                        size: Number(songCard.dataset.songSize) || 0
                    };
                    openSongOptions(song);
                }
                return;
            }

            // Track item play click
            const songCard = e.target.closest('.download-song-item, .download-grid-card');
            if (songCard && songCard.dataset.songAudio) {
                const songId = songCard.dataset.songId;
                const activeAudio = getGlobalActiveAudio();
                const currentSong = getCurrentLoadedSong();
                const isSessionActive = isDownloadsSessionActive();
                const isSameSong = isSessionActive && currentSong && String(currentSong.id) === String(songId);

                if (isSameSong && activeAudio && activeAudio.src) {
                    if (!activeAudio.paused) {
                        activeAudio.pause();
                    } else {
                        activeAudio.play().catch(err => console.error("Audio resume error:", err));
                    }
                    syncPlayPauseButtonUI();
                    if (typeof window.syncActiveSongUI === 'function') {
                        window.syncActiveSongUI();
                    }
                    return;
                }

                const targetSong = {
                    id: songId,
                    name: songCard.dataset.songName,
                    artist: songCard.dataset.songArtist,
                    cover: songCard.dataset.songCover,
                    audio: songCard.dataset.songAudio,
                    duration: Number(songCard.dataset.songDuration) || 0,
                    size: Number(songCard.dataset.songSize) || 0
                };

                const queueList = filteredDownloads.length > 0 ? filteredDownloads : currentDownloads;
                playSongInDownloadsContext(targetSong, queueList);
            }
        };
        listSection.addEventListener('click', handleListClick);
        listeners.push({ element: listSection, type: 'click', handler: handleListClick });
    }

    // 11. External Event Listeners
    const handleDownloadsUpdated = (e) => {
        currentDownloads = getSavedDownloads();
        renderDownloadsList();
        updateStorageUsageBar();
        syncPlayPauseButtonUI();
    };
    window.addEventListener('downloads-updated', handleDownloadsUpdated);
    listeners.push({ element: window, type: 'downloads-updated', handler: handleDownloadsUpdated });

    const handleSyncUI = () => {
        syncPlayPauseButtonUI();
    };
    window.addEventListener('song-changed', handleSyncUI);
    listeners.push({ element: window, type: 'song-changed', handler: handleSyncUI });

    const activeAudio = getGlobalActiveAudio();
    if (activeAudio) {
        activeAudio.addEventListener('play', handleSyncUI);
        activeAudio.addEventListener('pause', handleSyncUI);
        activeAudio.addEventListener('ended', handleSyncUI);
        listeners.push({ element: activeAudio, type: 'play', handler: handleSyncUI });
        listeners.push({ element: activeAudio, type: 'pause', handler: handleSyncUI });
        listeners.push({ element: activeAudio, type: 'ended', handler: handleSyncUI });
    }

    // 12. Setup Infinite Scroll & Initial Render
    setupDownloadsInfiniteScroll();
    renderDownloadsList();
    await updateStorageUsageBar();
    syncPlayPauseButtonUI();
}

/**
 * Cleanup Downloads Page
 */
export function cleanupDownloadsPage() {
    while (listeners.length > 0) {
        const item = listeners.pop();
        if (item && item.element && item.handler) {
            item.element.removeEventListener(item.type, item.handler);
        }
    }
    selectedSongForOptions = null;
    closeGlobalOptions();
    closeSongOptions();
}
