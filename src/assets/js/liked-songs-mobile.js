/**
 * Spotiwind — Dedicated Liked Songs Page Module (Mobile)
 * Handles dual layout (List & Grid), Collection Insights stats, live Firestore sync,
 * smart filters & multi-sort, queue playback, and interactive action sheets.
 */

import { auth, db, onAuthStateChanged, collection, onSnapshot } from './firebase-config.js';
import { getFavoriteSongs, toggleFavorite } from '../../services/favoriteService.js';
import { showToast } from '../../utils/domUtils.js';
import { debounce } from '../../utils/formatters.js';
import { downloadMp3ToDevice, cacheSongAudio } from '../../services/offlineAudioService.js';

let currentLikedSongs = [];
let filteredLikedSongs = [];
let searchQuery = '';
let activeFilter = 'all'; // 'all' | 'tracks' | 'artists' | 'albums'
let activeSort = 'recent'; // 'recent' | 'alpha' | 'artist' | 'duration'
let viewMode = localStorage.getItem('spotiwind_liked_view_mode') || 'list';
let selectedSongForOptions = null;
let previousPageUrl = 'library-mobile.html';
let likedSongsUnsubscribe = null;
let authUnsubscribe = null;
const listeners = [];

const PAGE_CHUNK_SIZE = 10;
let likedSongsVisibleLimit = PAGE_CHUNK_SIZE;
let isLikedSongsLoadingMore = false;

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

function formatSongCount(count) {
    const n = Number(count) || 0;
    return `${n} ${n === 1 ? 'song' : 'songs'}`;
}

function formatTotalPlaytime(totalSeconds) {
    const s = Number(totalSeconds) || 0;
    if (s <= 0) return '0m';
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${Math.max(1, minutes)}m`;
}

function computeTopArtist(songs) {
    if (!Array.isArray(songs) || songs.length === 0) return null;
    const counts = {};
    songs.forEach(s => {
        const artist = (s.artist || '').trim();
        if (artist && artist !== 'Unknown Artist') {
            counts[artist] = (counts[artist] || 0) + 1;
        }
    });
    let topName = null;
    let maxCount = 0;
    for (const [name, count] of Object.entries(counts)) {
        if (count > maxCount) {
            maxCount = count;
            topName = name;
        }
    }
    return topName ? { name: topName, count: maxCount } : null;
}

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

const isLikedSongsSessionActive = () => {
    const activeAudio = getGlobalActiveAudio();
    if (!activeAudio || !activeAudio.src) return false;

    const currentSong = getCurrentLoadedSong();
    if (!currentSong) return false;

    const currentContext = window.__spotiwindPlaybackContext || window.__spotiwindContext || '';
    return currentContext === 'liked-songs';
};

const isLikedSongsCurrentlyPlaying = () => {
    const activeAudio = getGlobalActiveAudio();
    if (!activeAudio || activeAudio.paused || activeAudio.ended) return false;
    return isLikedSongsSessionActive();
};

const syncSongItemsActiveState = () => {
    const isSessionActive = isLikedSongsSessionActive();
    const currentSong = getCurrentLoadedSong();
    const activeAudio = getGlobalActiveAudio();
    const isPlaying = activeAudio && !activeAudio.paused && !activeAudio.ended;

    document.querySelectorAll('.liked-song-item, .liked-grid-card').forEach(item => {
        const songId = item.dataset.songId;
        const songAudio = item.dataset.songAudio;
        const isSame = isSessionActive && currentSong && (String(currentSong.id) === String(songId) || (typeof window.areSameSongs === 'function' && window.areSameSongs(currentSong, { id: songId, audio: songAudio })));

        item.classList.toggle('is-active-song', Boolean(isSame));
        item.classList.toggle('is-paused', Boolean(isSame && !isPlaying));

        const overlay = item.querySelector('.liked-song-play-overlay, .liked-grid-play-overlay');
        if (overlay) {
            if (isSame) {
                overlay.style.color = '';
                if (isPlaying) {
                    overlay.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
                } else {
                    overlay.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>`;
                }
            } else {
                overlay.style.color = '';
                overlay.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>`;
            }
        }
    });
};

const syncPlayPauseButtonUI = () => {
    const playIconWrapper = document.getElementById('likedPlayIconWrapper');
    const playText = document.getElementById('likedPlayAllText');
    const isPlaying = isLikedSongsCurrentlyPlaying();

    if (playIconWrapper) {
        playIconWrapper.innerHTML = isPlaying ? PAUSE_ICON : PLAY_ICON;
    }
    if (playText) {
        playText.textContent = isPlaying ? 'Pause' : 'Play all';
    }

    const shuffleBtn = document.getElementById('likedSongsShuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.classList.toggle('is-active', isGlobalShuffleActive());
    }

    syncSongItemsActiveState();
};

const syncAllLikeButtons = (songId, isLiked) => {
    if (!songId) return;
    const cleanId = String(songId).trim();
    document.querySelectorAll(`.liked-song-like-btn[data-song-id="${cleanId}"], .liked-grid-like-btn[data-song-id="${cleanId}"]`).forEach(btn => {
        btn.classList.toggle('is-liked', isLiked);
        btn.setAttribute('title', isLiked ? 'Unlike song' : 'Like song');
        btn.setAttribute('aria-label', isLiked ? 'Unlike song' : 'Like song');
        const svg = btn.querySelector('svg');
        if (svg) {
            svg.setAttribute('fill', isLiked ? 'currentColor' : 'none');
            svg.setAttribute('stroke', isLiked ? 'transparent' : 'currentColor');
        }
    });
};

/**
 * Collection Insights Calculation & Display
 */
function updateCollectionInsights() {
    const countEl = document.getElementById('likedSongsCount');
    const sheetCountEl = document.getElementById('likedSongsOptionsCount');
    const heroDurationEl = document.getElementById('likedSongsDuration');
    const playtimeValEl = document.getElementById('insightsPlaytimeVal');
    const topArtistValEl = document.getElementById('insightsTopArtistVal');
    const savedValEl = document.getElementById('insightsSavedVal');

    const totalCount = currentLikedSongs.length;
    if (countEl) countEl.textContent = formatSongCount(totalCount);
    if (sheetCountEl) sheetCountEl.textContent = formatSongCount(totalCount);
    if (savedValEl) savedValEl.textContent = `${totalCount} tracks`;

    const totalSeconds = currentLikedSongs.reduce((acc, s) => {
        return acc + (Number(s.duration) || 210); // 3.5 min average fallback
    }, 0);

    const formattedPlaytime = formatTotalPlaytime(totalSeconds);
    if (heroDurationEl) heroDurationEl.textContent = formattedPlaytime;
    if (playtimeValEl) playtimeValEl.textContent = formattedPlaytime;

    const topArtist = computeTopArtist(currentLikedSongs);
    if (topArtistValEl) {
        topArtistValEl.textContent = topArtist ? topArtist.name : '—';
        topArtistValEl.title = topArtist ? `${topArtist.name} (${topArtist.count} songs)` : '';
    }
}

/**
 * Filter & Sort Engine
 */
function applyFilterAndSort() {
    let result = [...currentLikedSongs];

    // 1. Category Filter
    if (activeFilter === 'tracks') {
        result = result.filter(s => !s.type || s.type === 'track');
    } else if (activeFilter === 'artists') {
        result = result.filter(s => Boolean(s.artist && s.artist !== 'Unknown Artist'));
    } else if (activeFilter === 'albums') {
        result = result.filter(s => Boolean(s.album || s.album_name || s.albumTitle || s.albumName));
    }

    // 2. Search Query Filter
    if (searchQuery) {
        result = result.filter(s => {
            const name = (s.name || s.title || '').toLowerCase();
            const artist = (s.artist || '').toLowerCase();
            const album = (s.album || s.album_name || '').toLowerCase();
            return name.includes(searchQuery) || artist.includes(searchQuery) || album.includes(searchQuery);
        });
    }

    // 3. Multi-Sort
    if (activeSort === 'alpha') {
        result.sort((a, b) => {
            const nameA = (a.name || a.title || '').toLowerCase();
            const nameB = (b.name || b.title || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
    } else if (activeSort === 'artist') {
        result.sort((a, b) => {
            const artA = (a.artist || '').toLowerCase();
            const artB = (b.artist || '').toLowerCase();
            return artA.localeCompare(artB);
        });
    } else if (activeSort === 'duration') {
        result.sort((a, b) => (Number(b.duration) || 0) - (Number(a.duration) || 0));
    } else {
        // 'recent' by default: preserve Firestore order or timestamp
        result.sort((a, b) => {
            const getTime = (item) => {
                if (!item) return 0;
                if (item.likedAt?.toMillis) return item.likedAt.toMillis();
                if (item.likedAt?.seconds) return item.likedAt.seconds * 1000;
                if (typeof item.likedAt === 'number') return item.likedAt;
                if (typeof item.addedAt === 'number') return item.addedAt;
                return 0;
            };
            return getTime(b) - getTime(a);
        });
    }

    filteredLikedSongs = result;
}

/**
 * Render Liked Songs with List and Grid support
 */
const renderLikedSongsList = () => {
    const container = document.getElementById('likedSongsList');
    if (!container) return;

    const user = auth.currentUser;

    if (!user) {
        updateCollectionInsights();
        container.className = 'liked-songs-list view-list';
        container.innerHTML = `
            <div class="liked-songs-empty-state">
                <div class="liked-songs-empty-icon-box" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
                <h3 class="liked-songs-empty-title">Save your favorite tracks</h3>
                <p class="liked-songs-empty-desc">Log in to like songs, build your personal library, and listen anytime.</p>
                <a href="auth-mobile.html" class="liked-songs-empty-btn" id="likedLoginBtn">Log In / Sign Up</a>
            </div>
        `;
        const loginBtn = document.getElementById('likedLoginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                try {
                    sessionStorage.setItem('spotiwind_auth_previous_page', 'liked-songs-mobile.html');
                } catch { }
                if (typeof window.navigateToAuthPage === 'function') {
                    window.navigateToAuthPage('login');
                } else if (typeof window.loadPageContent === 'function') {
                    window.loadPageContent('auth-mobile.html', { pushState: true });
                } else {
                    window.location.href = 'auth-mobile.html';
                }
            });
        }
        return;
    }

    updateCollectionInsights();
    applyFilterAndSort();

    // Empty state when logged in but has no liked songs
    if (currentLikedSongs.length === 0) {
        container.className = 'liked-songs-list view-list';
        container.innerHTML = `
            <div class="liked-songs-empty-state">
                <div class="liked-songs-empty-icon-box" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
                <h3 class="liked-songs-empty-title">Songs you like will appear here</h3>
                <p class="liked-songs-empty-desc">Save songs by tapping the heart icon on any track while browsing music.</p>
                <a href="#" class="liked-songs-empty-btn" id="likedExploreBtn">Explore Music</a>
            </div>
        `;
        const exploreBtn = document.getElementById('likedExploreBtn');
        if (exploreBtn) {
            exploreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof window.loadPageContent === 'function') {
                    window.loadPageContent('library-mobile.html', { pushState: true, initialTab: 'overview' });
                }
            });
        }
        return;
    }

    // No matching results for search or filter
    if (filteredLikedSongs.length === 0) {
        container.className = 'liked-songs-list view-list';
        container.innerHTML = `
            <div class="liked-songs-empty-state" style="padding: 2.5rem 1.5rem;">
                <div class="liked-songs-empty-icon-box" aria-hidden="true" style="width: 50px; height: 50px; margin-bottom: 0.75rem;">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
                <h3 class="liked-songs-empty-title">No matching songs found</h3>
                <p class="liked-songs-empty-desc">Try changing your search term or category chips above.</p>
            </div>
        `;
        return;
    }

    container.className = `liked-songs-list view-${viewMode}`;

    const defaultCover = '/public/branding/Spotiwind.webp';
    const visibleSongs = filteredLikedSongs.slice(0, likedSongsVisibleLimit);
    const hasMore = likedSongsVisibleLimit < filteredLikedSongs.length;

    let html = '';

    if (viewMode === 'grid') {
        html = visibleSongs.map(song => {
            const songId = escapeHTML(String(song.id || song.songId || ''));
            const name = escapeHTML(song.name || song.title || 'Unknown Track');
            const artist = escapeHTML(song.artist || 'Unknown Artist');
            const coverUrl = escapeHTML(song.cover || song.coverUrl || song.image || defaultCover);
            const audio = escapeHTML(song.audio || song.audioUrl || song.songAudio || '');
            const duration = Number(song.duration) || 0;

            return `
                <div class="liked-grid-card"
                    data-song-id="${songId}"
                    data-song-audio="${audio}"
                    data-song-name="${name}"
                    data-song-artist="${artist}"
                    data-song-cover="${coverUrl}"
                    data-song-duration="${duration}">
                    <div class="liked-grid-art-box">
                        <img src="${coverUrl}" alt="${name}" class="liked-grid-cover" width="160" height="160" loading="lazy"
                            onerror="this.onerror=null; this.src='${defaultCover}';">
                        <button class="liked-grid-play-overlay" type="button" aria-label="Play ${name}">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <polygon points="6 4 20 12 6 20 6 4"></polygon>
                            </svg>
                        </button>
                    </div>
                    <div class="liked-grid-info">
                        <h4 class="liked-grid-title">${name}</h4>
                        <p class="liked-grid-artist">${artist}</p>
                    </div>
                    <div class="liked-grid-footer">
                        <button class="liked-grid-like-btn is-liked" type="button" data-song-id="${songId}" title="Unlike track" aria-label="Unlike track">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                        </button>
                        <button class="liked-grid-more-btn liked-song-item-more-btn" type="button" data-song-id="${songId}" title="Track options" aria-label="Track options">
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
        html = visibleSongs.map(song => {
            const songId = escapeHTML(String(song.id || song.songId || ''));
            const name = escapeHTML(song.name || song.title || 'Unknown Track');
            const artist = escapeHTML(song.artist || 'Unknown Artist');
            const coverUrl = escapeHTML(song.cover || song.coverUrl || song.image || defaultCover);
            const audio = escapeHTML(song.audio || song.audioUrl || song.songAudio || '');
            const duration = Number(song.duration) || 0;

            return `
                <div class="liked-song-item"
                    data-song-id="${songId}"
                    data-song-audio="${audio}"
                    data-song-name="${name}"
                    data-song-artist="${artist}"
                    data-song-cover="${coverUrl}"
                    data-song-duration="${duration}">
                    <div class="liked-song-art-wrapper">
                        <img src="${coverUrl}" alt="${name}" class="liked-song-cover" width="48" height="48" loading="lazy"
                            onerror="this.onerror=null; this.src='${defaultCover}';">
                        <div class="liked-song-play-overlay">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <polygon points="6 4 20 12 6 20 6 4"></polygon>
                            </svg>
                        </div>
                    </div>
                    <div class="liked-song-info">
                        <h4 class="liked-song-name">${name}</h4>
                        <p class="liked-song-artist">${artist} • ${formatDuration(duration)}</p>
                    </div>
                    <div class="liked-song-actions">
                        <button class="liked-song-like-btn is-liked" type="button" data-song-id="${songId}" title="Unlike track" aria-label="Unlike track">
                            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                        </button>
                        <button class="liked-song-item-more-btn" type="button" data-song-id="${songId}" title="Track options" aria-label="Track options">
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
    }

    if (hasMore) {
        html += `
            <div class="liked-songs-infinite-loader" id="likedSongsInfiniteLoader">
                <span class="liked-songs-infinite-spinner"></span>
                <span class="liked-songs-infinite-text">Loading more tracks...</span>
            </div>
        `;
    }

    container.innerHTML = html;
    syncSongItemsActiveState();
};

function triggerLoadMore() {
    if (isLikedSongsLoadingMore) return;
    if (likedSongsVisibleLimit >= filteredLikedSongs.length) return;

    isLikedSongsLoadingMore = true;

    setTimeout(() => {
        likedSongsVisibleLimit += PAGE_CHUNK_SIZE;
        renderLikedSongsList();
        isLikedSongsLoadingMore = false;
        syncPlayPauseButtonUI();
    }, 150);
}

function setupLikedSongsInfiniteScroll() {
    const handleScroll = () => {
        if (isLikedSongsLoadingMore) return;
        const scrollBottom = window.innerHeight + window.scrollY;
        const threshold = document.documentElement.scrollHeight - 380;
        if (scrollBottom >= threshold) {
            triggerLoadMore();
        }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    listeners.push({ element: window, type: 'scroll', handler: handleScroll });
}

/**
 * Playback Context Handler
 */
const playSongInLikedSongsContext = (targetSong, playlist) => {
    if (!targetSong) return;

    if (typeof window.playPreview === 'function') {
        window.__spotiwindPlaybackContext = 'liked-songs';
        window.__spotiwindContext = 'liked-songs';

        window.playPreview(
            null,
            targetSong.audio,
            targetSong.name,
            targetSong.artist,
            targetSong.cover,
            targetSong.id,
            Number(targetSong.duration) || 0,
            'liked-songs',
            playlist || currentLikedSongs
        );
    }
    setTimeout(syncPlayPauseButtonUI, 120);
};

const handlePlayAllClick = () => {
    const isPlaying = isLikedSongsCurrentlyPlaying();
    const activeAudio = getGlobalActiveAudio();

    if (isLikedSongsSessionActive() && activeAudio) {
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

    const targetList = filteredLikedSongs.length > 0 ? filteredLikedSongs : currentLikedSongs;
    if (!targetList || targetList.length === 0) {
        showToast('No liked songs to play.');
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

    playSongInLikedSongsContext(targetSong, playlistToPlay);
};

const handleShuffleClick = () => {
    const targetList = filteredLikedSongs.length > 0 ? filteredLikedSongs : currentLikedSongs;
    if (!targetList || targetList.length === 0) {
        showToast('No liked songs to shuffle.');
        return;
    }

    const currentShuffle = isGlobalShuffleActive();
    const nextShuffle = !currentShuffle;
    setGlobalShuffleState(nextShuffle);

    const shuffleBtn = document.getElementById('likedSongsShuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.classList.toggle('is-active', nextShuffle);
    }

    if (nextShuffle) {
        const shuffled = [...targetList];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        playSongInLikedSongsContext(shuffled[0], shuffled);
        showToast('Shuffle enabled for Liked Songs.');
    } else {
        showToast('Shuffle disabled.');
    }
    setTimeout(syncPlayPauseButtonUI, 120);
};

/**
 * Modals and Sheets Management
 */
let cleanupGlobalDrag = null;
let cleanupSongDrag = null;

const resetSheetStyles = (modal) => {
    if (!modal) return;
    const sheet = modal.querySelector('.liked-songs-options-sheet');
    const backdrop = modal.querySelector('.liked-songs-options-backdrop');
    if (sheet) {
        sheet.classList.remove('is-dragging');
        sheet.style.transform = '';
        sheet.style.transition = '';
    }
    if (backdrop) {
        backdrop.style.opacity = '';
        backdrop.style.transition = '';
    }
};

const openGlobalOptions = () => {
    const modal = document.getElementById('likedSongsOptionsModal');
    if (modal) {
        resetSheetStyles(modal);
        modal.classList.remove('hidden');
        modal.removeAttribute('inert');
    }
};

const closeGlobalOptions = () => {
    const modal = document.getElementById('likedSongsOptionsModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('inert', '');
        resetSheetStyles(modal);
    }
};

const openSongOptions = (song) => {
    selectedSongForOptions = song;
    const modal = document.getElementById('likedSongItemOptionsModal');
    const coverEl = document.getElementById('likedSongOptionsCover');
    const titleEl = document.getElementById('likedSongOptionsTitle');
    const artistEl = document.getElementById('likedSongOptionsArtist');

    if (coverEl) coverEl.src = song.cover || '/public/branding/Spotiwind.webp';
    if (titleEl) titleEl.textContent = song.name || 'Unknown Track';
    if (artistEl) artistEl.textContent = `${song.artist || 'Unknown Artist'} • ${formatDuration(song.duration)}`;

    if (modal) {
        resetSheetStyles(modal);
        modal.classList.remove('hidden');
        modal.removeAttribute('inert');
    }
};

const closeSongOptions = () => {
    const modal = document.getElementById('likedSongItemOptionsModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('inert', '');
        resetSheetStyles(modal);
    }
    selectedSongForOptions = null;
};

/**
 * Setup swipe-down (drag to dismiss) gesture for bottom sheet modals
 */
const setupSheetDrag = (modalEl, onCloseCallback) => {
    if (!modalEl) return () => {};

    const sheet = modalEl.querySelector('.liked-songs-options-sheet');
    const backdrop = modalEl.querySelector('.liked-songs-options-backdrop');
    if (!sheet) return () => {};

    let startX = 0;
    let startY = 0;
    let currentDeltaY = 0;
    let isDragging = false;
    let startTime = 0;
    let isListeningWindow = false;

    const resetDragStyles = () => {
        isDragging = false;
        sheet.classList.remove('is-dragging');
        sheet.style.transform = '';
        sheet.style.transition = '';
        if (backdrop) {
            backdrop.style.opacity = '';
            backdrop.style.transition = '';
        }
        removeWindowListeners();
    };

    const removeWindowListeners = () => {
        if (!isListeningWindow) return;
        isListeningWindow = false;
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
    };

    const onPointerMove = (e) => {
        if (e.pointerType === 'mouse' && e.buttons === 0) {
            onPointerUp(e);
            return;
        }

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        if (!isDragging) {
            // Ignore gesture if predominantly horizontal
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
                return;
            }

            const handle = sheet.querySelector('.liked-songs-options-handle-wrapper');
            const header = sheet.querySelector('.liked-songs-options-header');
            const isHandleOrHeader = Boolean(
                (handle && handle.contains(e.target)) ||
                (header && header.contains(e.target))
            );
            const dragStartThreshold = isHandleOrHeader ? 10 : 20;

            if (deltaY > dragStartThreshold) {
                isDragging = true;
                sheet.classList.add('is-dragging');
                sheet.style.transition = 'none';
                if (backdrop) backdrop.style.transition = 'none';
            } else if (deltaY < -10) {
                const rubberBand = Math.max(-12, deltaY * 0.12);
                sheet.style.transform = `translateY(${rubberBand}px)`;
                return;
            } else {
                return;
            }
        }

        if (isDragging) {
            if (e.cancelable) e.preventDefault();
            const sheetHeight = sheet.offsetHeight || 320;
            if (deltaY > 0) {
                currentDeltaY = deltaY;
                sheet.style.transform = `translateY(${deltaY}px)`;
                if (backdrop) {
                    const opacity = Math.max(0, 1 - (deltaY / (sheetHeight * 0.95)));
                    backdrop.style.opacity = String(opacity);
                }
            } else {
                currentDeltaY = 0;
                const rubberBand = Math.max(-12, deltaY * 0.12);
                sheet.style.transform = `translateY(${rubberBand}px)`;
                if (backdrop) backdrop.style.opacity = '1';
            }
        }
    };

    const onPointerUp = () => {
        removeWindowListeners();

        if (!isDragging) {
            resetDragStyles();
            return;
        }

        const sheetHeight = sheet.offsetHeight || 320;
        const elapsed = Math.max(1, Date.now() - startTime);
        const velocityY = currentDeltaY / elapsed;

        sheet.classList.remove('is-dragging');

        // Dismiss thresholds: distance >= 30% height or fast swipe down flick (velocity > 0.55 and deltaY >= 40)
        const dismissDistance = Math.max(100, sheetHeight * 0.30);
        const isIntentionalSwipe = (velocityY > 0.55 && currentDeltaY >= 40);
        const shouldDismiss = (currentDeltaY >= dismissDistance || isIntentionalSwipe);

        if (shouldDismiss) {
            sheet.style.transition = 'transform 0.24s cubic-bezier(0.32, 1, 0.23, 1)';
            if (backdrop) backdrop.style.transition = 'opacity 0.24s ease';
            sheet.style.transform = 'translateY(100%)';
            if (backdrop) backdrop.style.opacity = '0';
            setTimeout(() => {
                resetDragStyles();
                if (typeof onCloseCallback === 'function') {
                    onCloseCallback();
                }
            }, 240);
        } else {
            sheet.style.transition = 'transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)';
            if (backdrop) backdrop.style.transition = 'opacity 0.28s ease';
            sheet.style.transform = 'translateY(0)';
            if (backdrop) backdrop.style.opacity = '1';
            setTimeout(() => {
                resetDragStyles();
            }, 280);
        }

        isDragging = false;
    };

    const onPointerCancel = () => {
        resetDragStyles();
    };

    const onPointerDown = (e) => {
        if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
        // Ignore interactive controls inside sheet
        if (e.target.closest('button, a, input, [role="button"]')) return;

        startX = e.clientX;
        startY = e.clientY;
        currentDeltaY = 0;
        startTime = Date.now();

        if (!isListeningWindow) {
            isListeningWindow = true;
            window.addEventListener('pointermove', onPointerMove, { passive: false });
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerCancel);
        }
    };

    sheet.addEventListener('pointerdown', onPointerDown);

    return () => {
        sheet.removeEventListener('pointerdown', onPointerDown);
        removeWindowListeners();
        resetDragStyles();
    };
};

const bindUserLikedSongs = (uid) => {
    if (!uid) {
        currentLikedSongs = [];
        renderLikedSongsList();
        return;
    }

    try {
        const likedRef = collection(db, "users", uid, "liked_songs");
        likedSongsUnsubscribe = onSnapshot(likedRef, (snapshot) => {
            const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            currentLikedSongs = raw.sort((a, b) => {
                const getTime = (item) => {
                    if (!item) return 0;
                    if (item.likedAt?.toMillis) return item.likedAt.toMillis();
                    if (item.likedAt?.seconds) return item.likedAt.seconds * 1000;
                    if (typeof item.likedAt === 'number') return item.likedAt;
                    if (typeof item.addedAt === 'number') return item.addedAt;
                    return 0;
                };
                return getTime(b) - getTime(a);
            });
            renderLikedSongsList();
            syncPlayPauseButtonUI();
        }, async (err) => {
            console.warn("Snapshot fallback for liked songs:", err);
            const fallback = await getFavoriteSongs(uid);
            currentLikedSongs = Array.isArray(fallback) ? fallback : [];
            renderLikedSongsList();
            syncPlayPauseButtonUI();
        });
    } catch (e) {
        console.error("Error setting up liked songs snapshot:", e);
    }
};

/**
 * Initialize Liked Songs Page
 * @param {string} previousPage - The URL of the page to return to.
 */
export async function initLikedSongsPage(previousPage = 'library-mobile.html') {
    previousPageUrl = previousPage;
    searchQuery = '';
    activeFilter = 'all';
    activeSort = 'recent';
    viewMode = localStorage.getItem('spotiwind_liked_view_mode') || 'list';
    likedSongsVisibleLimit = PAGE_CHUNK_SIZE;
    isLikedSongsLoadingMore = false;

    // 1. Back button setup
    const backBtn = document.getElementById('likedSongsBackBtn');
    if (backBtn) {
        const handleBack = async (e) => {
            e.preventDefault();
            cleanupLikedSongsPage();
            const targetPage = (previousPageUrl && !previousPageUrl.includes('liked-songs')) ? previousPageUrl : 'library-mobile.html';

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

    // 2. More options button setup
    const moreBtn = document.getElementById('likedSongsMoreBtn');
    if (moreBtn) {
        const handleMore = (e) => {
            e.preventDefault();
            openGlobalOptions();
        };
        moreBtn.addEventListener('click', handleMore);
        listeners.push({ element: moreBtn, type: 'click', handler: handleMore });
    }

    // 3. Play all & Shuffle buttons
    const playAllBtn = document.getElementById('likedSongsPlayAllBtn');
    if (playAllBtn) {
        const handlePlayAll = (e) => {
            e.preventDefault();
            handlePlayAllClick();
        };
        playAllBtn.addEventListener('click', handlePlayAll);
        listeners.push({ element: playAllBtn, type: 'click', handler: handlePlayAll });
    }

    const shuffleBtn = document.getElementById('likedSongsShuffleBtn');
    if (shuffleBtn) {
        const handleShuffle = (e) => {
            e.preventDefault();
            handleShuffleClick();
        };
        shuffleBtn.addEventListener('click', handleShuffle);
        listeners.push({ element: shuffleBtn, type: 'click', handler: handleShuffle });
    }

    // 4. View Mode Switcher (List vs Grid)
    const viewListBtn = document.getElementById('likedViewListBtn');
    const viewGridBtn = document.getElementById('likedViewGridBtn');

    const updateViewSwitcherUI = () => {
        if (viewListBtn) viewListBtn.classList.toggle('is-active', viewMode === 'list');
        if (viewGridBtn) viewGridBtn.classList.toggle('is-active', viewMode === 'grid');
    };

    if (viewListBtn) {
        const handleViewList = () => {
            viewMode = 'list';
            localStorage.setItem('spotiwind_liked_view_mode', 'list');
            updateViewSwitcherUI();
            renderLikedSongsList();
        };
        viewListBtn.addEventListener('click', handleViewList);
        listeners.push({ element: viewListBtn, type: 'click', handler: handleViewList });
    }

    if (viewGridBtn) {
        const handleViewGrid = () => {
            viewMode = 'grid';
            localStorage.setItem('spotiwind_liked_view_mode', 'grid');
            updateViewSwitcherUI();
            renderLikedSongsList();
        };
        viewGridBtn.addEventListener('click', handleViewGrid);
        listeners.push({ element: viewGridBtn, type: 'click', handler: handleViewGrid });
    }

    updateViewSwitcherUI();

    // 5. Search input setup
    const searchInput = document.getElementById('likedSongsSearchInput');
    const clearBtn = document.getElementById('likedSongsSearchClearBtn');

    if (searchInput) {
        const debouncedSearch = debounce(() => {
            if (searchInput) {
                searchQuery = (searchInput.value || '').trim().toLowerCase();
            }
            likedSongsVisibleLimit = PAGE_CHUNK_SIZE;
            renderLikedSongsList();
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
            searchQuery = '';
            clearBtn.classList.add('hidden');
            searchInput.focus();
            likedSongsVisibleLimit = PAGE_CHUNK_SIZE;
            renderLikedSongsList();
        };
        clearBtn.addEventListener('click', handleClear);
        listeners.push({ element: clearBtn, type: 'click', handler: handleClear });
    }

    // 6. Category Filter Chips
    const chips = document.querySelectorAll('.liked-chip');
    chips.forEach(chip => {
        const handleChip = () => {
            const filterVal = chip.dataset.filter || 'all';
            activeFilter = filterVal;
            chips.forEach(c => c.classList.toggle('is-active', c === chip));
            likedSongsVisibleLimit = PAGE_CHUNK_SIZE;
            renderLikedSongsList();
        };
        chip.addEventListener('click', handleChip);
        listeners.push({ element: chip, type: 'click', handler: handleChip });
    });

    // 7. Sort Button & Cycle
    const sortTriggerBtn = document.getElementById('likedSortTriggerBtn');
    const sortLabel = document.getElementById('likedSortLabel');
    if (sortTriggerBtn) {
        const handleSortCycle = () => {
            if (activeSort === 'recent') {
                activeSort = 'alpha';
                if (sortLabel) sortLabel.textContent = 'A-Z';
                showToast('Sorted by title (A - Z)');
            } else if (activeSort === 'alpha') {
                activeSort = 'artist';
                if (sortLabel) sortLabel.textContent = 'Artist';
                showToast('Sorted by artist (A - Z)');
            } else if (activeSort === 'artist') {
                activeSort = 'duration';
                if (sortLabel) sortLabel.textContent = 'Duration';
                showToast('Sorted by duration (longest first)');
            } else {
                activeSort = 'recent';
                if (sortLabel) sortLabel.textContent = 'Recent';
                showToast('Sorted by recently liked');
            }
            renderLikedSongsList();
        };
        sortTriggerBtn.addEventListener('click', handleSortCycle);
        listeners.push({ element: sortTriggerBtn, type: 'click', handler: handleSortCycle });
    }

    // 8. Global Options Sheet Handlers
    const optionsBackdrop = document.getElementById('likedSongsOptionsBackdrop');
    const optionsCloseBtn = document.getElementById('likedSongsOptionsCloseBtn');
    const optSortRecent = document.getElementById('optLikedSortRecent');
    const optSortAlpha = document.getElementById('optLikedSortAlpha');
    const optSortArtist = document.getElementById('optLikedSortArtist');
    const optSortDuration = document.getElementById('optLikedSortDuration');
    const optShareAction = document.getElementById('likedOptShareAction');

    if (optionsBackdrop) {
        optionsBackdrop.addEventListener('click', closeGlobalOptions);
        listeners.push({ element: optionsBackdrop, type: 'click', handler: closeGlobalOptions });
    }
    if (optionsCloseBtn) {
        optionsCloseBtn.addEventListener('click', closeGlobalOptions);
        listeners.push({ element: optionsCloseBtn, type: 'click', handler: closeGlobalOptions });
    }

    if (optSortRecent) {
        const handler = () => {
            activeSort = 'recent';
            if (sortLabel) sortLabel.textContent = 'Recent';
            closeGlobalOptions();
            renderLikedSongsList();
            showToast('Sorted by recently liked');
        };
        optSortRecent.addEventListener('click', handler);
        listeners.push({ element: optSortRecent, type: 'click', handler });
    }

    if (optSortAlpha) {
        const handler = () => {
            activeSort = 'alpha';
            if (sortLabel) sortLabel.textContent = 'A-Z';
            closeGlobalOptions();
            renderLikedSongsList();
            showToast('Sorted by title (A - Z)');
        };
        optSortAlpha.addEventListener('click', handler);
        listeners.push({ element: optSortAlpha, type: 'click', handler });
    }

    if (optSortArtist) {
        const handler = () => {
            activeSort = 'artist';
            if (sortLabel) sortLabel.textContent = 'Artist';
            closeGlobalOptions();
            renderLikedSongsList();
            showToast('Sorted by artist (A - Z)');
        };
        optSortArtist.addEventListener('click', handler);
        listeners.push({ element: optSortArtist, type: 'click', handler });
    }

    if (optSortDuration) {
        const handler = () => {
            activeSort = 'duration';
            if (sortLabel) sortLabel.textContent = 'Duration';
            closeGlobalOptions();
            renderLikedSongsList();
            showToast('Sorted by duration (longest first)');
        };
        optSortDuration.addEventListener('click', handler);
        listeners.push({ element: optSortDuration, type: 'click', handler });
    }

    if (optShareAction) {
        const handleOptShare = async () => {
            closeGlobalOptions();
            const shareData = {
                title: 'Liked Songs on Spotiwind',
                text: 'Check out my liked songs collection on Spotiwind!',
                url: window.location.href
            };
            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                } catch { }
            } else {
                try {
                    await navigator.clipboard.writeText(window.location.href);
                    showToast('Liked Songs link copied to clipboard.');
                } catch {
                    showToast('Failed to copy link.');
                }
            }
        };
        optShareAction.addEventListener('click', handleOptShare);
        listeners.push({ element: optShareAction, type: 'click', handler: handleOptShare });
    }

    // 9. Per-Song Options Sheet Handlers
    const songItemBackdrop = document.getElementById('likedSongItemBackdrop');
    const songItemCloseBtn = document.getElementById('likedSongItemCloseBtn');
    const optPlayNext = document.getElementById('optLikedSongPlayNext');
    const optDownload = document.getElementById('optLikedSongDownload');
    const optRemove = document.getElementById('optLikedSongRemove');

    if (songItemBackdrop) {
        songItemBackdrop.addEventListener('click', closeSongOptions);
        listeners.push({ element: songItemBackdrop, type: 'click', handler: closeSongOptions });
    }
    if (songItemCloseBtn) {
        songItemCloseBtn.addEventListener('click', closeSongOptions);
        listeners.push({ element: songItemCloseBtn, type: 'click', handler: closeSongOptions });
    }

    // Setup drag-to-dismiss gestures for both options modals
    if (cleanupGlobalDrag) {
        cleanupGlobalDrag();
        cleanupGlobalDrag = null;
    }
    const globalModal = document.getElementById('likedSongsOptionsModal');
    if (globalModal) {
        cleanupGlobalDrag = setupSheetDrag(globalModal, closeGlobalOptions);
    }

    if (cleanupSongDrag) {
        cleanupSongDrag();
        cleanupSongDrag = null;
    }
    const songModal = document.getElementById('likedSongItemOptionsModal');
    if (songModal) {
        cleanupSongDrag = setupSheetDrag(songModal, closeSongOptions);
    }

    if (optPlayNext) {
        const handler = () => {
            if (selectedSongForOptions) {
                if (typeof window.addToQueue === 'function') {
                    window.addToQueue(selectedSongForOptions);
                    showToast(`"${selectedSongForOptions.name || 'Track'}" will play next.`);
                } else {
                    showToast('Added to queue.');
                }
            }
            closeSongOptions();
        };
        optPlayNext.addEventListener('click', handler);
        listeners.push({ element: optPlayNext, type: 'click', handler });
    }

    if (optDownload) {
        const handler = async () => {
            if (selectedSongForOptions) {
                const song = { ...selectedSongForOptions };
                closeSongOptions();
                if (typeof window.toggleDownloadSong === 'function') {
                    await window.toggleDownloadSong(song);
                } else {
                    await downloadMp3ToDevice(song);
                }
            }
        };
        optDownload.addEventListener('click', handler);
        listeners.push({ element: optDownload, type: 'click', handler });
    }

    if (optRemove) {
        const handler = async () => {
            if (!selectedSongForOptions) return;
            const song = { ...selectedSongForOptions };
            closeSongOptions();

            const wasLiked = true;
            syncAllLikeButtons(song.id, false);

            try {
                const updatedList = await toggleFavorite(song);
                const isNowLiked = Array.isArray(updatedList) && updatedList.some(item => String(item.id || item.songId) === String(song.id));
                syncAllLikeButtons(song.id, isNowLiked);
                showToast(`Removed "${song.name || 'Track'}" from Liked Songs.`);
                window.dispatchEvent(new CustomEvent('favorites-updated', {
                    detail: { songId: song.id, isLiked: false, favorites: updatedList }
                }));
            } catch (err) {
                console.error("Error removing favorite:", err);
                syncAllLikeButtons(song.id, wasLiked);
                showToast('Failed to update favorites.');
            }
        };
        optRemove.addEventListener('click', handler);
        listeners.push({ element: optRemove, type: 'click', handler });
    }

    // 10. Track items click delegation
    const listSection = document.querySelector('.liked-songs-list-section');
    if (listSection) {
        const handleListClick = async (e) => {
            // Infinite loader click
            const loaderEl = e.target.closest('.liked-songs-infinite-loader');
            if (loaderEl) {
                triggerLoadMore();
                return;
            }

            // Like/Unlike heart button
            const likeBtn = e.target.closest('.liked-song-like-btn, .liked-grid-like-btn');
            if (likeBtn) {
                e.stopPropagation();
                const songCard = likeBtn.closest('.liked-song-item, .liked-grid-card');
                if (!songCard) return;

                const user = auth.currentUser;
                if (!user) {
                    showToast("Please log in to manage your favorites.");
                    return;
                }

                const songId = songCard.dataset.songId;
                const song = {
                    id: songId,
                    name: songCard.dataset.songName,
                    artist: songCard.dataset.songArtist,
                    cover: songCard.dataset.songCover,
                    audio: songCard.dataset.songAudio,
                    duration: Number(songCard.dataset.songDuration) || 0
                };

                const wasLiked = likeBtn.classList.contains('is-liked');
                const targetLiked = !wasLiked;

                syncAllLikeButtons(songId, targetLiked);

                try {
                    const updatedList = await toggleFavorite(song);
                    const isNowLiked = Array.isArray(updatedList) && updatedList.some(item => String(item.id || item.songId) === String(songId));
                    syncAllLikeButtons(songId, isNowLiked);

                    showToast(isNowLiked ? `Added "${song.name}" to Liked Songs.` : `Removed "${song.name}" from Liked Songs.`);
                    window.dispatchEvent(new CustomEvent('favorites-updated', {
                        detail: { songId, isLiked: isNowLiked, favorites: updatedList }
                    }));
                } catch (err) {
                    console.error("Error toggling favorite:", err);
                    syncAllLikeButtons(songId, wasLiked);
                    showToast('Failed to update favorites.');
                }
                return;
            }

            // More 3-dots options button
            const moreBtn = e.target.closest('.liked-song-item-more-btn');
            if (moreBtn) {
                e.stopPropagation();
                const songCard = moreBtn.closest('.liked-song-item, .liked-grid-card');
                if (songCard) {
                    const song = {
                        id: songCard.dataset.songId,
                        name: songCard.dataset.songName,
                        artist: songCard.dataset.songArtist,
                        cover: songCard.dataset.songCover,
                        audio: songCard.dataset.songAudio,
                        duration: Number(songCard.dataset.songDuration) || 0
                    };
                    openSongOptions(song);
                }
                return;
            }

            // Track item click to play / pause
            const songCard = e.target.closest('.liked-song-item, .liked-grid-card');
            if (songCard && songCard.dataset.songAudio) {
                // In grid view, user must click the circular play button icon to play/pause (like Popular Right Now)
                const isGridCard = songCard.classList.contains('liked-grid-card');
                const isGridPlayBtn = Boolean(e.target.closest('.liked-grid-play-overlay'));
                if (isGridCard && !isGridPlayBtn) {
                    return;
                }

                const { songId, songAudio, songName, songArtist, songCover, songDuration } = songCard.dataset;
                const currentSong = getCurrentLoadedSong();
                const activeAudio = getGlobalActiveAudio();
                const isLikedSession = isLikedSongsSessionActive();
                const isSameSong = isLikedSession && currentSong && (String(currentSong.id) === String(songId) || (typeof window.areSameSongs === 'function' && window.areSameSongs(currentSong, { id: songId, audio: songAudio })));

                if (isSameSong && activeAudio && activeAudio.src) {
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

                const targetSong = {
                    id: songId,
                    name: songName,
                    artist: songArtist,
                    cover: songCover,
                    audio: songAudio,
                    duration: Number(songDuration) || 0
                };

                const queueList = filteredLikedSongs.length > 0 ? filteredLikedSongs : currentLikedSongs;
                playSongInLikedSongsContext(targetSong, queueList);
            }
        };

        listSection.addEventListener('click', handleListClick);
        listeners.push({ element: listSection, type: 'click', handler: handleListClick });
    }

    // 11. Setup infinite scroll
    setupLikedSongsInfiniteScroll();

    // 12. Listen to auth state and live liked songs
    authUnsubscribe = onAuthStateChanged(auth, (user) => {
        if (likedSongsUnsubscribe) {
            likedSongsUnsubscribe();
            likedSongsUnsubscribe = null;
        }

        if (user) {
            bindUserLikedSongs(user.uid);
        } else {
            currentLikedSongs = [];
            renderLikedSongsList();
            syncPlayPauseButtonUI();
        }
    });

    // 13. Direct audio events
    const activeAudio = getGlobalActiveAudio();
    if (activeAudio) {
        const handleAudioState = () => {
            syncPlayPauseButtonUI();
        };
        activeAudio.addEventListener('play', handleAudioState);
        activeAudio.addEventListener('pause', handleAudioState);
        activeAudio.addEventListener('ended', handleAudioState);
        listeners.push({ element: activeAudio, type: 'play', handler: handleAudioState });
        listeners.push({ element: activeAudio, type: 'pause', handler: handleAudioState });
        listeners.push({ element: activeAudio, type: 'ended', handler: handleAudioState });
    }

    // 14. Global sync listeners
    const handlePlayerState = () => {
        syncPlayPauseButtonUI();
    };
    window.addEventListener('song-playback-state-changed', handlePlayerState);
    listeners.push({ element: window, type: 'song-playback-state-changed', handler: handlePlayerState });

    const handleFavoritesUpdated = (e) => {
        const { favorites } = e.detail || {};
        if (Array.isArray(favorites)) {
            currentLikedSongs = favorites;
            renderLikedSongsList();
            syncPlayPauseButtonUI();
        }
    };
    window.addEventListener('favorites-updated', handleFavoritesUpdated);
    listeners.push({ element: window, type: 'favorites-updated', handler: handleFavoritesUpdated });

    syncPlayPauseButtonUI();
}

/**
 * Cleanup Liked Songs Page when unmounted
 */
export function cleanupLikedSongsPage() {
    if (cleanupGlobalDrag) {
        cleanupGlobalDrag();
        cleanupGlobalDrag = null;
    }
    if (cleanupSongDrag) {
        cleanupSongDrag();
        cleanupSongDrag = null;
    }
    if (likedSongsUnsubscribe) {
        likedSongsUnsubscribe();
        likedSongsUnsubscribe = null;
    }
    if (authUnsubscribe) {
        authUnsubscribe();
        authUnsubscribe = null;
    }
    listeners.forEach(({ element, type, handler }) => {
        if (element && typeof element.removeEventListener === 'function') {
            element.removeEventListener(type, handler);
        }
    });
    listeners.length = 0;
    likedSongsVisibleLimit = PAGE_CHUNK_SIZE;
    isLikedSongsLoadingMore = false;
    closeGlobalOptions();
    closeSongOptions();
}
