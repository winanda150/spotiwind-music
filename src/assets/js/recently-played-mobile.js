/**
 * Spotiwind — Dedicated Recently Played Page Module (Mobile)
 * Handles dual layout (List & Grid), History Insights metrics, realtime Firestore sync,
 * smart search with debounce, filter chips, multi-sort, infinite scrolling,
 * and context-aware playback session management.
 */

import { auth } from './firebase-config.js';
import {
    getRecentlyPlayed,
    clearRecentlyPlayed,
    subscribeRecentlyPlayed
} from '../../services/recentlyPlayedService.js';
import { getFavoriteSongs, toggleFavorite } from '../../services/favoriteService.js';
import { cacheSongAudio } from '../../services/offlineAudioService.js';
import { showToast } from '../../utils/domUtils.js';
import { debounce } from '../../utils/formatters.js';
import { areSameSongs } from '../../utils/audioUtils.js';

let currentRecentSongs = [];
let filteredRecentSongs = [];
let currentFavorites = [];
let searchQuery = '';
let activeFilter = 'all'; // 'all' | 'tracks' | 'artists' | 'albums'
let activeSort = 'recent'; // 'recent' | 'alpha' | 'artist' | 'duration'
let viewMode = localStorage.getItem('spotiwind_recent_view_mode') || 'list'; // 'list' | 'grid'

const PAGE_CHUNK_SIZE = 10;
let recentSongsVisibleLimit = PAGE_CHUNK_SIZE;
let isRecentSongsLoadingMore = false;

let previousPageUrl = 'library-mobile.html';
let selectedSongForOptions = null;
let realtimeUnsubscribe = null;
const listeners = [];

const PLAY_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
const PAUSE_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
const PLAY_ICON_16 = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>`;
const PAUSE_ICON_16 = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

const SORT_LABELS = {
    recent: 'Recent',
    alpha: 'A-Z',
    artist: 'Artist',
    duration: 'Duration'
};

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

function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = Math.max(0, now - Number(timestamp));

    if (diff < 60 * 1000) return 'Just now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
    if (diff < 48 * 60 * 60 * 1000) return 'Yesterday';
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
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
    return window.spotiwind?.mobile?.getCurrentSongData?.() || window.__currentSongData || window.currentSongData || (typeof window.getCurrentSongData === 'function' ? window.getCurrentSongData() : null);
};

const getGlobalActiveAudio = () => {
    return window.__activeAudio || (typeof activeAudio !== 'undefined' ? activeAudio : document.querySelector('audio'));
};

const isRecentSessionActive = () => {
    const activeAudio = getGlobalActiveAudio();
    if (!activeAudio || !activeAudio.src) return false;

    const currentSong = getCurrentLoadedSong();
    if (!currentSong) return false;

    const currentContext = window.__spotiwindPlaybackContext || window.__spotiwindContext || window.currentPlaybackContext || '';
    return currentContext === 'recently-played' || currentContext === 'recent' || currentContext === 'account-recent';
};

const isRecentCurrentlyPlaying = () => {
    const activeAudio = getGlobalActiveAudio();
    if (!activeAudio || activeAudio.paused || activeAudio.ended) return false;
    return isRecentSessionActive();
};

const playSongInRecentContext = (targetSong, playlist) => {
    if (!targetSong) return;

    if (typeof window.playPreview === 'function') {
        window.__spotiwindPlaybackContext = 'recently-played';
        window.__spotiwindContext = 'recently-played';

        window.playPreview(
            null,
            targetSong.audio,
            targetSong.name || targetSong.title,
            targetSong.artist,
            targetSong.cover,
            targetSong.id,
            Number(targetSong.duration) || 0,
            'recently-played',
            playlist || currentRecentSongs
        );
    }
    setTimeout(syncPlayPauseButtonUI, 120);
};

/**
 * Loads current user's favorite songs asynchronously into local cache
 */
async function loadFavorites() {
    const user = auth.currentUser;
    if (user && user.uid) {
        try {
            const songs = await getFavoriteSongs(user.uid);
            currentFavorites = Array.isArray(songs) ? songs : [];
        } catch {
            currentFavorites = [];
        }
    } else {
        currentFavorites = [];
    }
}

/**
 * Updates History Insights card metrics
 */
function updateInsightsMetrics() {
    const trackCountEl = document.getElementById('recentTrackCount');
    const totalDurationEl = document.getElementById('recentTotalDuration');
    const syncStatusEl = document.getElementById('recentSyncStatus');

    const statTotalEl = document.getElementById('recentStatTotalVal');
    const statTopArtistEl = document.getElementById('recentStatTopArtistVal');
    const statPlaytimeEl = document.getElementById('recentStatPlaytimeVal');

    const totalCount = currentRecentSongs.length;
    let totalSecs = 0;
    const artistCounts = {};

    currentRecentSongs.forEach(song => {
        totalSecs += Number(song.duration) || 0;
        const artist = (song.artist || 'Unknown Artist').trim();
        artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    });

    let topArtist = '—';
    let maxCount = 0;
    Object.entries(artistCounts).forEach(([artist, count]) => {
        if (count > maxCount && artist !== 'Unknown Artist') {
            maxCount = count;
            topArtist = artist;
        }
    });

    const totalMinutes = Math.round(totalSecs / 60);
    const playtimeFormatted = totalMinutes > 60
        ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
        : `${totalMinutes}m`;

    if (trackCountEl) trackCountEl.textContent = `${totalCount} ${totalCount === 1 ? 'track' : 'tracks'}`;
    if (totalDurationEl) totalDurationEl.textContent = playtimeFormatted;
    if (syncStatusEl) {
        syncStatusEl.textContent = auth.currentUser ? 'Cloud Synced' : 'Offline Mode';
    }

    if (statTotalEl) statTotalEl.textContent = String(totalCount);
    if (statTopArtistEl) statTopArtistEl.textContent = topArtist;
    if (statPlaytimeEl) statPlaytimeEl.textContent = playtimeFormatted;

    const optionsSub = document.getElementById('recentGlobalOptionsSub');
    if (optionsSub) {
        optionsSub.textContent = `${totalCount} tracks in playback history`;
    }
}

/**
 * Filters and sorts currentRecentSongs into filteredRecentSongs
 */
function applyFilterAndSort() {
    let result = [...currentRecentSongs];

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
        // 'recent' by default (descending playedAt)
        result.sort((a, b) => {
            const timeA = Number(a.playedAt) || 0;
            const timeB = Number(b.playedAt) || 0;
            return timeB - timeA;
        });
    }

    filteredRecentSongs = result;
}

/**
 * Synchronizes active song highlighting and play/pause icon overlays
 */
function syncSongItemsActiveState() {
    const isSessionActive = isRecentSessionActive();
    const currentSong = getCurrentLoadedSong();
    const activeAudio = getGlobalActiveAudio();
    const isPlaying = activeAudio && !activeAudio.paused && !activeAudio.ended;

    document.querySelectorAll('.recent-song-item, .recent-grid-card').forEach(item => {
        const songId = item.dataset.songId;
        const songAudio = item.dataset.songAudio;
        const isSame = isSessionActive && currentSong && (String(currentSong.id) === String(songId) || (typeof window.areSameSongs === 'function' ? window.areSameSongs(currentSong, { id: songId, audio: songAudio }) : (songAudio && currentSong.audio === songAudio)));

        item.classList.toggle('is-active-song', Boolean(isSame));
        item.classList.toggle('is-paused', Boolean(isSame && !isPlaying));

        const overlay = item.querySelector('.recent-song-play-overlay, .recent-grid-play-overlay');
        if (overlay) {
            overlay.style.color = '';
            if (isSame && isPlaying) {
                overlay.innerHTML = PAUSE_ICON_16;
            } else {
                overlay.innerHTML = PLAY_ICON_16;
            }
        }
    });
}

/**
 * Synchronizes top action buttons (Play All / Shuffle) with current audio playback
 */
function syncPlayPauseButtonUI() {
    const playAllBtn = document.getElementById('recentPlayAllBtn');
    const playIconWrapper = document.getElementById('recentPlayIconWrapper');
    const playAllText = document.getElementById('recentPlayAllText');
    const isPlaying = isRecentCurrentlyPlaying();

    if (playAllBtn) {
        playAllBtn.classList.toggle('is-active-playing', isPlaying);
    }
    if (playIconWrapper) {
        playIconWrapper.innerHTML = isPlaying ? PAUSE_ICON : PLAY_ICON;
    }
    if (playAllText) {
        playAllText.textContent = isPlaying ? 'Pause' : 'Play all';
    }

    const shuffleBtn = document.getElementById('recentShuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.classList.toggle('is-active', isGlobalShuffleActive());
    }

    syncSongItemsActiveState();
}

/**
 * Renders the songs list or grid into the container
 */
function renderRecentSongs() {
    const container = document.getElementById('recentSongsContainer');
    if (!container) return;

    updateInsightsMetrics();
    applyFilterAndSort();

    // Empty state when no history recorded yet
    if (currentRecentSongs.length === 0) {
        container.className = 'recently-played-list view-list';
        container.innerHTML = `
            <div class="recently-played-empty-state">
                <div class="recently-played-empty-icon-box" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                </div>
                <h3 class="recently-played-empty-title">No recently played tracks yet</h3>
                <p class="recently-played-empty-desc">Music you listen to will automatically appear here so you can easily jump back in.</p>
                <a href="#" class="recently-played-empty-btn" id="recentExploreBtn">Discover Music</a>
            </div>
        `;
        const exploreBtn = document.getElementById('recentExploreBtn');
        if (exploreBtn) {
            exploreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof window.loadPageContent === 'function') {
                    window.loadPageContent('search-mobile.html', { pushState: true, route: '/search', title: 'Search | Spotiwind' });
                }
            });
        }
        syncPlayPauseButtonUI();
        return;
    }

    // No search or filter matches found
    if (filteredRecentSongs.length === 0) {
        container.className = 'recently-played-list view-list';
        container.innerHTML = `
            <div class="recently-played-empty-state" style="padding: 2.5rem 1.5rem;">
                <div class="recently-played-empty-icon-box" aria-hidden="true" style="width: 50px; height: 50px; margin-bottom: 0.75rem;">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
                <h3 class="recently-played-empty-title">No matching tracks found</h3>
                <p class="recently-played-empty-desc">Try changing your search term or category chips above.</p>
            </div>
        `;
        syncPlayPauseButtonUI();
        return;
    }

    container.className = `recently-played-list view-${viewMode}`;

    const defaultCover = '/public/branding/Spotiwind.webp';
    const visibleSongs = filteredRecentSongs.slice(0, recentSongsVisibleLimit);
    const hasMore = recentSongsVisibleLimit < filteredRecentSongs.length;

    let html = '';

    if (viewMode === 'grid') {
        html = visibleSongs.map(song => {
            const songId = escapeHTML(String(song.id || song.audio || ''));
            const name = escapeHTML(song.name || song.title || 'Unknown Track');
            const artist = escapeHTML(song.artist || 'Unknown Artist');
            const coverUrl = escapeHTML(song.cover || song.coverUrl || song.image || defaultCover);
            const audio = escapeHTML(song.audio || song.audioUrl || '');
            const duration = Number(song.duration) || 0;
            const timeAgo = formatRelativeTime(song.playedAt);
            const isLiked = Array.isArray(currentFavorites) && currentFavorites.some(f => areSameSongs(f, song));

            return `
                <div class="recent-grid-card"
                    data-song-id="${songId}"
                    data-song-audio="${audio}"
                    data-song-name="${name}"
                    data-song-artist="${artist}"
                    data-song-cover="${coverUrl}"
                    data-song-duration="${duration}">
                    <div class="recent-grid-art-box">
                        <img src="${coverUrl}" alt="${name}" class="recent-grid-cover" width="160" height="160" loading="lazy"
                            onerror="this.onerror=null; this.src='${defaultCover}';">
                        <button class="recent-grid-play-overlay" type="button" aria-label="Play ${name}">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <polygon points="6 4 20 12 6 20 6 4"></polygon>
                            </svg>
                        </button>
                    </div>
                    <div class="recent-grid-info">
                        <h4 class="recent-grid-title">${name}</h4>
                        <p class="recent-grid-artist">${artist}</p>
                    </div>
                    <div class="recent-grid-footer">
                        <span class="recent-grid-time">${timeAgo}</span>
                        <div class="recent-grid-actions">
                            <button class="recent-song-like-btn ${isLiked ? 'is-liked' : ''}" type="button" data-song-id="${songId}" title="${isLiked ? 'Unlike track' : 'Like track'}" aria-label="Like track">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                </svg>
                            </button>
                            <button class="recent-song-more-btn" type="button" data-song-id="${songId}" title="Track options" aria-label="Track options">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <circle cx="12" cy="5" r="1.75"/>
                                    <circle cx="12" cy="12" r="1.75"/>
                                    <circle cx="12" cy="19" r="1.75"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        html = visibleSongs.map(song => {
            const songId = escapeHTML(String(song.id || song.audio || ''));
            const name = escapeHTML(song.name || song.title || 'Unknown Track');
            const artist = escapeHTML(song.artist || 'Unknown Artist');
            const coverUrl = escapeHTML(song.cover || song.coverUrl || song.image || defaultCover);
            const audio = escapeHTML(song.audio || song.audioUrl || '');
            const duration = Number(song.duration) || 0;
            const durationFormatted = formatDuration(duration);
            const timeAgo = formatRelativeTime(song.playedAt);
            const isLiked = Array.isArray(currentFavorites) && currentFavorites.some(f => areSameSongs(f, song));

            return `
                <div class="recent-song-item"
                    data-song-id="${songId}"
                    data-song-audio="${audio}"
                    data-song-name="${name}"
                    data-song-artist="${artist}"
                    data-song-cover="${coverUrl}"
                    data-song-duration="${duration}">
                    <div class="recent-song-art-wrapper">
                        <img src="${coverUrl}" alt="${name}" class="recent-song-cover" width="48" height="48" loading="lazy"
                            onerror="this.onerror=null; this.src='${defaultCover}';">
                        <div class="recent-song-play-overlay">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <polygon points="6 4 20 12 6 20 6 4"></polygon>
                            </svg>
                        </div>
                    </div>
                    <div class="recent-song-info">
                        <h4 class="recent-song-title">${name}</h4>
                        <p class="recent-song-artist">${artist} • ${durationFormatted}</p>
                    </div>
                    <div class="recent-song-actions">
                        <span class="recent-song-time-badge">${timeAgo}</span>
                        <button class="recent-song-like-btn ${isLiked ? 'is-liked' : ''}" type="button" data-song-id="${songId}" title="${isLiked ? 'Unlike track' : 'Like track'}" aria-label="Like track">
                            <svg viewBox="0 0 24 24" width="17" height="17" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                        </button>
                        <button class="recent-song-more-btn" type="button" data-song-id="${songId}" title="Track options" aria-label="Track options">
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
            <div class="recently-played-infinite-loader" id="recentInfiniteLoader">
                <span class="recently-played-infinite-spinner"></span>
                <span class="recently-played-infinite-text">Loading more history...</span>
            </div>
        `;
    }

    container.innerHTML = html;
    syncPlayPauseButtonUI();
}

/**
 * TikTok-style Infinite Scroll Progressive Batch Loader
 */
function triggerLoadMore() {
    if (isRecentSongsLoadingMore) return;
    if (recentSongsVisibleLimit >= filteredRecentSongs.length) return;

    isRecentSongsLoadingMore = true;

    setTimeout(() => {
        recentSongsVisibleLimit += PAGE_CHUNK_SIZE;
        renderRecentSongs();
        isRecentSongsLoadingMore = false;
    }, 180);
}

function setupRecentInfiniteScroll() {
    let lastScrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    let touchStartY = 0;
    let isTouching = false;

    const handleScroll = debounce(() => {
        if (isRecentSongsLoadingMore) return;

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
        if (isRecentSongsLoadingMore || !e.touches || !e.touches[0]) return;
        touchStartY = e.touches[0].clientY;
        isTouching = true;
    };

    const handleTouchMove = (e) => {
        if (!isTouching || isRecentSongsLoadingMore || !e.touches || !e.touches[0]) return;
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
 * Handles play/pause toggle, like, and more buttons on song cards
 */
function handleSongItemClick(e) {
    const likeBtn = e.target.closest('.recent-song-like-btn');
    if (likeBtn) {
        e.stopPropagation();
        const card = likeBtn.closest('.recent-song-item, .recent-grid-card');
        if (card) {
            if (!auth.currentUser) {
                showToast("Please log in to manage favorites");
                return;
            }
            const songData = {
                id: card.dataset.songId,
                audio: card.dataset.songAudio,
                name: card.dataset.songName,
                artist: card.dataset.songArtist,
                cover: card.dataset.songCover,
                duration: Number(card.dataset.songDuration) || 0
            };
            toggleFavorite(songData).then(async (updatedList) => {
                if (Array.isArray(updatedList)) {
                    currentFavorites = updatedList;
                } else {
                    await loadFavorites();
                }
                const isNowLiked = Array.isArray(currentFavorites) && currentFavorites.some(f => areSameSongs(f, songData));
                showToast(isNowLiked ? `Added "${songData.name}" to Liked Songs` : `Removed "${songData.name}" from Liked Songs`);
                renderRecentSongs();
            });
        }
        return;
    }

    const moreBtn = e.target.closest('.recent-song-more-btn');
    if (moreBtn) {
        e.stopPropagation();
        const card = moreBtn.closest('.recent-song-item, .recent-grid-card');
        if (card) {
            openSongOptionsModal({
                id: card.dataset.songId,
                name: card.dataset.songName,
                artist: card.dataset.songArtist,
                cover: card.dataset.songCover,
                audio: card.dataset.songAudio,
                duration: Number(card.dataset.songDuration) || 0
            });
        }
        return;
    }

    const card = e.target.closest('.recent-song-item, .recent-grid-card');
    if (!card) return;

    // In grid view, user must click the circular play button icon to play/pause (like Liked Songs)
    const isGridCard = card.classList.contains('recent-grid-card');
    const isGridPlayBtn = Boolean(e.target.closest('.recent-grid-play-overlay'));
    if (isGridCard && !isGridPlayBtn) {
        return;
    }

    const audioUrl = card.dataset.songAudio;
    const name = card.dataset.songName;
    const artist = card.dataset.songArtist;
    const cover = card.dataset.songCover;
    const id = card.dataset.songId;
    const duration = Number(card.dataset.songDuration) || 0;

    const isSessionActive = isRecentSessionActive();
    const currentSong = getCurrentLoadedSong();
    const isSameSong = isSessionActive && currentSong && (String(currentSong.id) === String(id) || (typeof window.areSameSongs === 'function' ? window.areSameSongs(currentSong, { id, audio: audioUrl }) : (audioUrl && currentSong.audio === audioUrl)));
    const activeAudio = getGlobalActiveAudio();

    if (isSameSong && activeAudio && activeAudio.src) {
        if (!activeAudio.paused) {
            activeAudio.pause();
        } else {
            activeAudio.play().catch(err => console.error("Play error:", err));
        }
        syncPlayPauseButtonUI();
        if (typeof window.syncActiveSongUI === 'function') {
            window.syncActiveSongUI();
        }
        return;
    }

    const targetSong = {
        id,
        name,
        artist,
        cover,
        audio: audioUrl,
        duration
    };

    const queueList = filteredRecentSongs.length > 0 ? filteredRecentSongs : currentRecentSongs;
    playSongInRecentContext(targetSong, queueList);
}

/**
 * Play All button handler
 */
function handlePlayAll(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    const activeAudio = getGlobalActiveAudio();
    const isSessionActive = isRecentSessionActive();

    // Toggle pause / resume if recently-played session is currently active
    if (isSessionActive && activeAudio && activeAudio.src) {
        if (!activeAudio.paused) {
            activeAudio.pause();
        } else {
            activeAudio.play().catch(err => console.error("Play error:", err));
        }
        syncPlayPauseButtonUI();
        if (typeof window.syncActiveSongUI === 'function') {
            window.syncActiveSongUI();
        }
        return;
    }

    const targetList = filteredRecentSongs.length > 0 ? filteredRecentSongs : currentRecentSongs;
    if (!targetList || targetList.length === 0) {
        showToast('No recently played tracks to play.');
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

    playSongInRecentContext(targetSong, playlistToPlay);
}

/**
 * Shuffle play button handler
 */
function handleShuffle(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    const targetList = filteredRecentSongs.length > 0 ? filteredRecentSongs : currentRecentSongs;
    if (!targetList || targetList.length === 0) {
        showToast('No recently played tracks to shuffle.');
        return;
    }

    const currentShuffle = isGlobalShuffleActive();
    const nextShuffle = !currentShuffle;
    setGlobalShuffleState(nextShuffle);

    const shuffleBtn = document.getElementById('recentShuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.classList.toggle('is-active', nextShuffle);
    }

    if (nextShuffle) {
        const shuffled = [...targetList];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        playSongInRecentContext(shuffled[0], shuffled);
        showToast('Shuffle enabled for recently played.');
    } else {
        showToast('Shuffle disabled.');
    }
    setTimeout(syncPlayPauseButtonUI, 120);
}

/**
 * Switch layout format (list vs grid)
 */
function setViewMode(mode) {
    viewMode = mode;
    localStorage.setItem('spotiwind_recent_view_mode', mode);

    const listBtn = document.getElementById('recentViewListBtn');
    const gridBtn = document.getElementById('recentViewGridBtn');

    if (listBtn) {
        listBtn.classList.toggle('is-active', mode === 'list');
    }
    if (gridBtn) {
        gridBtn.classList.toggle('is-active', mode === 'grid');
    }

    renderRecentSongs();
}

/**
 * Modals and Sheets Management
 */
let cleanupGlobalDrag = null;
let cleanupSongDrag = null;

const resetSheetStyles = (modal) => {
    if (!modal) return;
    const sheet = modal.querySelector('.recently-played-options-sheet');
    const backdrop = modal.querySelector('.recently-played-options-backdrop');
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

/**
 * Global Options Sheet Controls
 */
function openGlobalOptions() {
    const modal = document.getElementById('recentGlobalOptionsModal');
    if (!modal) return;
    resetSheetStyles(modal);
    modal.classList.remove('hidden');
    modal.removeAttribute('inert');
}

function closeGlobalOptions() {
    const modal = document.getElementById('recentGlobalOptionsModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('inert', '');
    resetSheetStyles(modal);
}

/**
 * Track Options Sheet Controls
 */
function openSongOptionsModal(song) {
    selectedSongForOptions = song;
    const modal = document.getElementById('recentSongOptionsModal');
    if (!modal) return;

    const cover = document.getElementById('recentSongOptionsCover');
    const title = document.getElementById('recentSongOptionsTitle');
    const artist = document.getElementById('recentSongOptionsArtist');
    const likeIcon = document.getElementById('recentSongLikeIcon');
    const likeText = document.getElementById('recentSongLikeText');

    if (cover) cover.src = song.cover || '/public/branding/Spotiwind.webp';
    if (title) title.textContent = song.name || 'Unknown Track';
    if (artist) artist.textContent = song.artist || 'Unknown Artist';

    const isLiked = Array.isArray(currentFavorites) && currentFavorites.some(f => areSameSongs(f, song));
    if (likeIcon && likeText) {
        if (isLiked) {
            likeIcon.setAttribute('fill', '#22c55e');
            likeIcon.style.color = '#22c55e';
            likeText.textContent = 'Remove from Liked Songs';
        } else {
            likeIcon.setAttribute('fill', 'none');
            likeIcon.style.color = 'currentColor';
            likeText.textContent = 'Save to Liked Songs';
        }
    }

    resetSheetStyles(modal);
    modal.classList.remove('hidden');
    modal.removeAttribute('inert');
}

function closeSongOptionsModal() {
    const modal = document.getElementById('recentSongOptionsModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('inert', '');
    resetSheetStyles(modal);
    selectedSongForOptions = null;
}

/**
 * Setup swipe-down (drag to dismiss) gesture for bottom sheet modals
 */
const setupSheetDrag = (modalEl, onCloseCallback) => {
    if (!modalEl) return () => {};

    const sheet = modalEl.querySelector('.recently-played-options-sheet');
    const backdrop = modalEl.querySelector('.recently-played-options-backdrop');
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

            const handle = sheet.querySelector('.recently-played-options-handle-wrapper');
            const header = sheet.querySelector('.recently-played-options-header');
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

/**
 * Remove single song from history
 */
function removeSongFromHistory(song) {
    if (!song) return;
    const songId = String(song.id || song.audio).trim();

    try {
        const raw = localStorage.getItem('recently_played_songs') || '[]';
        let parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            parsed = parsed.filter(item => {
                const itemId = String(item.id || item.audio).trim();
                return itemId !== songId && (item.audio !== song.audio || !item.audio);
            });
            localStorage.setItem('recently_played_songs', JSON.stringify(parsed));
            window.dispatchEvent(new CustomEvent('recently-played-updated', { detail: parsed }));
        }

        currentRecentSongs = currentRecentSongs.filter(item => {
            const itemId = String(item.id || item.audio).trim();
            return itemId !== songId && (item.audio !== song.audio || !item.audio);
        });

        renderRecentSongs();
        showToast(`Removed "${song.name}" from history`);
    } catch (e) {
        console.warn("Failed to remove song from history:", e);
    }
}

/**
 * Clear entire history
 */
async function handleClearHistory() {
    closeGlobalOptions();
    if (currentRecentSongs.length === 0) {
        showToast('Playback history is already empty');
        return;
    }

    const confirmed = window.confirm('Clear all recently played tracks? This action cannot be undone.');
    if (!confirmed) return;

    try {
        const user = auth.currentUser;
        await clearRecentlyPlayed(user ? user.uid : null);
        currentRecentSongs = [];
        renderRecentSongs();
        showToast('Playback history cleared');
    } catch (err) {
        console.error("Failed to clear history:", err);
        showToast('Failed to clear playback history');
    }
}

/**
 * Initializes listeners and DOM attachments
 */
function setupEventListeners() {
    // 1. Back button
    const backBtn = document.getElementById('recentBackBtn');
    if (backBtn) {
        const handleBack = (e) => {
            e.preventDefault();
            if (typeof window.loadPageContent === 'function') {
                window.loadPageContent(previousPageUrl || 'library-mobile.html', { pushState: true, initialTab: 'overview' });
            } else {
                window.history.back();
            }
        };
        backBtn.addEventListener('click', handleBack);
        listeners.push({ element: backBtn, type: 'click', handler: handleBack });
    }

    // 2. Play all & shuffle
    const playAllBtn = document.getElementById('recentPlayAllBtn');
    if (playAllBtn) {
        playAllBtn.addEventListener('click', handlePlayAll);
        listeners.push({ element: playAllBtn, type: 'click', handler: handlePlayAll });
    }

    const shuffleBtn = document.getElementById('recentShuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', handleShuffle);
        listeners.push({ element: shuffleBtn, type: 'click', handler: handleShuffle });
    }

    // 3. View format switchers
    const listBtn = document.getElementById('recentViewListBtn');
    if (listBtn) {
        const handleListClick = () => setViewMode('list');
        listBtn.addEventListener('click', handleListClick);
        listeners.push({ element: listBtn, type: 'click', handler: handleListClick });
    }

    const gridBtn = document.getElementById('recentViewGridBtn');
    if (gridBtn) {
        const handleGridClick = () => setViewMode('grid');
        gridBtn.addEventListener('click', handleGridClick);
        listeners.push({ element: gridBtn, type: 'click', handler: handleGridClick });
    }

    // 4. Search input & clear button
    const searchInput = document.getElementById('recentSongsSearchInput');
    const searchClearBtn = document.getElementById('recentSongsSearchClearBtn');
    if (searchInput) {
        const handleSearch = debounce((e) => {
            searchQuery = (e.target.value || '').trim().toLowerCase();
            if (searchClearBtn) {
                searchClearBtn.classList.toggle('hidden', !searchQuery);
            }
            recentSongsVisibleLimit = PAGE_CHUNK_SIZE;
            renderRecentSongs();
        }, 180);
        searchInput.addEventListener('input', handleSearch);
        listeners.push({ element: searchInput, type: 'input', handler: handleSearch });
    }

    if (searchClearBtn) {
        const handleClear = () => {
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
            }
            searchQuery = '';
            searchClearBtn.classList.add('hidden');
            recentSongsVisibleLimit = PAGE_CHUNK_SIZE;
            renderRecentSongs();
        };
        searchClearBtn.addEventListener('click', handleClear);
        listeners.push({ element: searchClearBtn, type: 'click', handler: handleClear });
    }

    // 5. Category Chips Row
    document.querySelectorAll('.recent-chip').forEach(chip => {
        const handleChip = () => {
            document.querySelectorAll('.recent-chip').forEach(c => c.classList.remove('is-active'));
            chip.classList.add('is-active');
            activeFilter = chip.dataset.filter || 'all';
            recentSongsVisibleLimit = PAGE_CHUNK_SIZE;
            renderRecentSongs();
        };
        chip.addEventListener('click', handleChip);
        listeners.push({ element: chip, type: 'click', handler: handleChip });
    });

    // 6. Sort Trigger Button (Cycle Sort)
    const sortTriggerBtn = document.getElementById('recentSortTriggerBtn');
    const sortLabel = document.getElementById('recentSortLabel');
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
                showToast('Sorted by most recent');
            }
            recentSongsVisibleLimit = PAGE_CHUNK_SIZE;
            renderRecentSongs();
        };
        sortTriggerBtn.addEventListener('click', handleSortCycle);
        listeners.push({ element: sortTriggerBtn, type: 'click', handler: handleSortCycle });
    }

    // 7. Song Container clicks
    const container = document.getElementById('recentSongsContainer');
    if (container) {
        container.addEventListener('click', handleSongItemClick);
        listeners.push({ element: container, type: 'click', handler: handleSongItemClick });
    }

    // 8. Global options modal
    const moreBtn = document.getElementById('recentMoreBtn');
    if (moreBtn) {
        moreBtn.addEventListener('click', openGlobalOptions);
        listeners.push({ element: moreBtn, type: 'click', handler: openGlobalOptions });
    }

    const globalBackdrop = document.getElementById('recentGlobalBackdrop');
    if (globalBackdrop) {
        globalBackdrop.addEventListener('click', closeGlobalOptions);
        listeners.push({ element: globalBackdrop, type: 'click', handler: closeGlobalOptions });
    }

    const globalCloseBtn = document.getElementById('recentGlobalCloseBtn');
    if (globalCloseBtn) {
        globalCloseBtn.addEventListener('click', closeGlobalOptions);
        listeners.push({ element: globalCloseBtn, type: 'click', handler: closeGlobalOptions });
    }

    // Global Sort Buttons inside sheet
    const sortRecentBtn = document.getElementById('optRecentSortRecent');
    if (sortRecentBtn) {
        const handleSortRecent = () => {
            activeSort = 'recent';
            if (sortLabel) sortLabel.textContent = 'Recent';
            closeGlobalOptions();
            recentSongsVisibleLimit = PAGE_CHUNK_SIZE;
            renderRecentSongs();
        };
        sortRecentBtn.addEventListener('click', handleSortRecent);
        listeners.push({ element: sortRecentBtn, type: 'click', handler: handleSortRecent });
    }

    const sortAlphaBtn = document.getElementById('optRecentSortAlpha');
    if (sortAlphaBtn) {
        const handleSortAlpha = () => {
            activeSort = 'alpha';
            if (sortLabel) sortLabel.textContent = 'A-Z';
            closeGlobalOptions();
            recentSongsVisibleLimit = PAGE_CHUNK_SIZE;
            renderRecentSongs();
        };
        sortAlphaBtn.addEventListener('click', handleSortAlpha);
        listeners.push({ element: sortAlphaBtn, type: 'click', handler: handleSortAlpha });
    }

    const sortArtistBtn = document.getElementById('optRecentSortArtist');
    if (sortArtistBtn) {
        const handleSortArtist = () => {
            activeSort = 'artist';
            if (sortLabel) sortLabel.textContent = 'Artist';
            closeGlobalOptions();
            recentSongsVisibleLimit = PAGE_CHUNK_SIZE;
            renderRecentSongs();
        };
        sortArtistBtn.addEventListener('click', handleSortArtist);
        listeners.push({ element: sortArtistBtn, type: 'click', handler: handleSortArtist });
    }

    const sortDurationBtn = document.getElementById('optRecentSortDuration');
    if (sortDurationBtn) {
        const handleSortDuration = () => {
            activeSort = 'duration';
            if (sortLabel) sortLabel.textContent = 'Duration';
            closeGlobalOptions();
            recentSongsVisibleLimit = PAGE_CHUNK_SIZE;
            renderRecentSongs();
        };
        sortDurationBtn.addEventListener('click', handleSortDuration);
        listeners.push({ element: sortDurationBtn, type: 'click', handler: handleSortDuration });
    }

    const clearHistoryBtn = document.getElementById('optClearRecentHistory');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', handleClearHistory);
        listeners.push({ element: clearHistoryBtn, type: 'click', handler: handleClearHistory });
    }

    // 9. Per-Song Modal Controls
    const songBackdrop = document.getElementById('recentSongBackdrop');
    if (songBackdrop) {
        songBackdrop.addEventListener('click', closeSongOptionsModal);
        listeners.push({ element: songBackdrop, type: 'click', handler: closeSongOptionsModal });
    }

    const songCloseBtn = document.getElementById('recentSongCloseBtn');
    if (songCloseBtn) {
        songCloseBtn.addEventListener('click', closeSongOptionsModal);
        listeners.push({ element: songCloseBtn, type: 'click', handler: closeSongOptionsModal });
    }

    const playNextBtn = document.getElementById('optRecentSongPlayNext');
    if (playNextBtn) {
        const handlePlayNext = () => {
            if (!selectedSongForOptions) return;
            const targetSong = { ...selectedSongForOptions };
            closeSongOptionsModal();
            if (typeof window.addToQueueNext === 'function') {
                window.addToQueueNext(targetSong);
                showToast(`"${targetSong.name || 'Track'}" will play next`);
            } else if (typeof window.addToQueue === 'function') {
                window.addToQueue(targetSong);
                showToast(`"${targetSong.name || 'Track'}" will play next`);
            } else {
                showToast('Added to queue next');
            }
        };
        playNextBtn.addEventListener('click', handlePlayNext);
        listeners.push({ element: playNextBtn, type: 'click', handler: handlePlayNext });
    }

    const toggleLikeBtn = document.getElementById('optRecentSongToggleLike');
    if (toggleLikeBtn) {
        const handleToggleLike = async () => {
            if (!selectedSongForOptions) return;
            const targetSong = { ...selectedSongForOptions };
            if (!auth.currentUser) {
                showToast("Please log in to manage favorites");
                closeSongOptionsModal();
                return;
            }
            closeSongOptionsModal();
            const updated = await toggleFavorite(targetSong);
            if (Array.isArray(updated)) {
                currentFavorites = updated;
            } else {
                await loadFavorites();
            }
            const isNowLiked = Array.isArray(currentFavorites) && currentFavorites.some(f => areSameSongs(f, targetSong));
            showToast(isNowLiked ? `Added "${targetSong.name || 'Track'}" to Liked Songs` : `Removed "${targetSong.name || 'Track'}" from Liked Songs`);
            renderRecentSongs();
        };
        toggleLikeBtn.addEventListener('click', handleToggleLike);
        listeners.push({ element: toggleLikeBtn, type: 'click', handler: handleToggleLike });
    }

    const downloadBtn = document.getElementById('optRecentSongDownload');
    if (downloadBtn) {
        const handleDownload = async () => {
            if (!selectedSongForOptions) return;
            const targetSong = { ...selectedSongForOptions };
            closeSongOptionsModal();
            showToast(`Downloading "${targetSong.name || 'Track'}" for offline playback...`);
            try {
                await cacheSongAudio(targetSong);
                showToast(`"${targetSong.name || 'Track'}" saved for offline playback!`);
            } catch (err) {
                console.error("Offline download failed:", err);
                showToast('Failed to save track for offline playback');
            }
        };
        downloadBtn.addEventListener('click', handleDownload);
        listeners.push({ element: downloadBtn, type: 'click', handler: handleDownload });
    }

    const shareBtn = document.getElementById('optRecentSongShare');
    if (shareBtn) {
        const handleShare = async () => {
            if (!selectedSongForOptions) return;
            const targetSong = { ...selectedSongForOptions };
            closeSongOptionsModal();
            const songName = targetSong.name || 'Track';
            const artistName = targetSong.artist || 'Unknown Artist';
            const text = `Listen to ${songName} by ${artistName} on Spotiwind!`;
            if (navigator.share) {
                try {
                    await navigator.share({ title: songName, text, url: window.location.href });
                } catch { }
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(`${text} ${window.location.href}`);
                showToast('Song info copied to clipboard');
            }
        };
        shareBtn.addEventListener('click', handleShare);
        listeners.push({ element: shareBtn, type: 'click', handler: handleShare });
    }

    const removeBtn = document.getElementById('optRecentSongRemove');
    if (removeBtn) {
        const handleRemove = () => {
            if (!selectedSongForOptions) return;
            const targetSong = { ...selectedSongForOptions };
            closeSongOptionsModal();
            removeSongFromHistory(targetSong);
        };
        removeBtn.addEventListener('click', handleRemove);
        listeners.push({ element: removeBtn, type: 'click', handler: handleRemove });
    }

    // 10. Reactive Window Events
    const onRecentUpdated = (e) => {
        if (e.detail && Array.isArray(e.detail)) {
            currentRecentSongs = e.detail;
        } else {
            currentRecentSongs = getRecentlyPlayed();
        }
        renderRecentSongs();
    };
    window.addEventListener('recently-played-updated', onRecentUpdated);
    listeners.push({ element: window, type: 'recently-played-updated', handler: onRecentUpdated });

    const onFavoritesUpdated = (e) => {
        const { favorites } = e.detail || {};
        if (Array.isArray(favorites)) {
            currentFavorites = favorites;
            renderRecentSongs();
        } else {
            loadFavorites().then(() => renderRecentSongs());
        }
    };
    window.addEventListener('favorites-updated', onFavoritesUpdated);
    listeners.push({ element: window, type: 'favorites-updated', handler: onFavoritesUpdated });

    const handleSyncUI = () => {
        syncPlayPauseButtonUI();
    };

    window.addEventListener('song-changed', handleSyncUI);
    listeners.push({ element: window, type: 'song-changed', handler: handleSyncUI });

    window.addEventListener('song-playback-state-changed', handleSyncUI);
    listeners.push({ element: window, type: 'song-playback-state-changed', handler: handleSyncUI });

    const activeAudio = getGlobalActiveAudio();
    if (activeAudio) {
        activeAudio.addEventListener('play', handleSyncUI);
        activeAudio.addEventListener('pause', handleSyncUI);
        activeAudio.addEventListener('ended', handleSyncUI);
        listeners.push({ element: activeAudio, type: 'play', handler: handleSyncUI });
        listeners.push({ element: activeAudio, type: 'pause', handler: handleSyncUI });
        listeners.push({ element: activeAudio, type: 'ended', handler: handleSyncUI });
    }

    // 10. Drag-to-dismiss on bottom sheets
    const globalModal = document.getElementById('recentGlobalOptionsModal');
    if (globalModal) {
        if (cleanupGlobalDrag) {
            cleanupGlobalDrag();
            cleanupGlobalDrag = null;
        }
        cleanupGlobalDrag = setupSheetDrag(globalModal, closeGlobalOptions);
    }

    const songModal = document.getElementById('recentSongOptionsModal');
    if (songModal) {
        if (cleanupSongDrag) {
            cleanupSongDrag();
            cleanupSongDrag = null;
        }
        cleanupSongDrag = setupSheetDrag(songModal, closeSongOptionsModal);
    }

    // 11. Infinite scroll setup
    setupRecentInfiniteScroll();
}

/**
 * Main initializer for Recently Played Mobile Page
 */
export async function initRecentlyPlayedPage(prevUrl = 'library-mobile.html') {
    previousPageUrl = prevUrl;
    currentRecentSongs = getRecentlyPlayed();
    recentSongsVisibleLimit = PAGE_CHUNK_SIZE;

    setupEventListeners();

    // Initial load of favorites
    await loadFavorites();

    // Set initial view mode button state and render
    setViewMode(viewMode);

    // Subscribe to realtime changes if user is logged in
    const user = auth.currentUser;
    if (user && user.uid) {
        realtimeUnsubscribe = subscribeRecentlyPlayed(user.uid, (cloudItems) => {
            if (Array.isArray(cloudItems)) {
                currentRecentSongs = cloudItems;
                renderRecentSongs();
            }
        });
    }

    syncPlayPauseButtonUI();
}

/**
 * Cleanup function called before unloading the subpage
 */
export function cleanupRecentlyPlayedPage() {
    if (typeof realtimeUnsubscribe === 'function') {
        realtimeUnsubscribe();
        realtimeUnsubscribe = null;
    }

    listeners.forEach(({ element, type, handler }) => {
        if (element && typeof element.removeEventListener === 'function') {
            element.removeEventListener(type, handler);
        }
    });
    listeners.length = 0;

    if (cleanupGlobalDrag) {
        cleanupGlobalDrag();
        cleanupGlobalDrag = null;
    }
    if (cleanupSongDrag) {
        cleanupSongDrag();
        cleanupSongDrag = null;
    }

    selectedSongForOptions = null;
    currentFavorites = [];
}
