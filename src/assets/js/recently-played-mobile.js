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

    const currentContext = window.__spotiwindPlaybackContext || window.__spotiwindContext || '';
    return currentContext === 'recently-played';
};

const isRecentCurrentlyPlaying = () => {
    const activeAudio = getGlobalActiveAudio();
    if (!activeAudio || activeAudio.paused || activeAudio.ended) return false;
    return isRecentSessionActive();
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
        const isSame = isSessionActive && currentSong && (String(currentSong.id) === String(songId) || areSameSongs(currentSong, { id: songId, audio: songAudio }));

        item.classList.toggle('is-active-song', Boolean(isSame));

        const overlay = item.querySelector('.recent-song-play-overlay, .recent-grid-play-overlay');
        if (overlay) {
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
                        <div class="recent-grid-play-overlay">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <polygon points="6 4 20 12 6 20 6 4"></polygon>
                            </svg>
                        </div>
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

    const audioUrl = card.dataset.songAudio;
    const name = card.dataset.songName;
    const artist = card.dataset.songArtist;
    const cover = card.dataset.songCover;
    const id = card.dataset.songId;
    const duration = Number(card.dataset.songDuration) || 0;

    const overlay = card.querySelector('.recent-song-play-overlay, .recent-grid-play-overlay');

    window.__spotiwindPlaybackContext = 'recently-played';

    if (typeof window.playPreview === 'function') {
        window.playPreview(overlay, audioUrl, name, artist, cover, id, duration, 'recently-played', filteredRecentSongs);
    }
}

/**
 * Play All button handler
 */
function handlePlayAll() {
    if (filteredRecentSongs.length === 0) {
        showToast('No recently played tracks to play');
        return;
    }

    window.__spotiwindPlaybackContext = 'recently-played';

    if (isRecentCurrentlyPlaying()) {
        if (typeof window.togglePlayPause === 'function') {
            window.togglePlayPause();
        }
        return;
    }

    const firstSong = filteredRecentSongs[0];
    if (firstSong && typeof window.playPreview === 'function') {
        window.playPreview(null, firstSong.audio, firstSong.name, firstSong.artist, firstSong.cover, firstSong.id, Number(firstSong.duration) || 0, 'recently-played', filteredRecentSongs);
    }
}

/**
 * Shuffle play button handler
 */
function handleShuffle() {
    if (filteredRecentSongs.length === 0) {
        showToast('No recently played tracks to shuffle');
        return;
    }

    window.__spotiwindPlaybackContext = 'recently-played';

    const shuffled = [...filteredRecentSongs].sort(() => Math.random() - 0.5);
    const firstSong = shuffled[0];
    if (firstSong && typeof window.playPreview === 'function') {
        window.playPreview(null, firstSong.audio, firstSong.name, firstSong.artist, firstSong.cover, firstSong.id, Number(firstSong.duration) || 0, 'recently-played', shuffled);
        showToast('Shuffling playback history');
    }
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
 * Global Options Sheet Controls
 */
function openGlobalOptions() {
    const modal = document.getElementById('recentGlobalOptionsModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.removeAttribute('inert');
}

function closeGlobalOptions() {
    const modal = document.getElementById('recentGlobalOptionsModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('inert', '');
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

    modal.classList.remove('hidden');
    modal.removeAttribute('inert');
}

function closeSongOptionsModal() {
    const modal = document.getElementById('recentSongOptionsModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('inert', '');
}

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
            if (selectedSongForOptions && typeof window.addToQueueNext === 'function') {
                window.addToQueueNext(selectedSongForOptions);
                showToast(`"${selectedSongForOptions.name}" will play next`);
            } else {
                showToast('Added to queue next');
            }
            closeSongOptionsModal();
        };
        playNextBtn.addEventListener('click', handlePlayNext);
        listeners.push({ element: playNextBtn, type: 'click', handler: handlePlayNext });
    }

    const toggleLikeBtn = document.getElementById('optRecentSongToggleLike');
    if (toggleLikeBtn) {
        const handleToggleLike = async () => {
            if (!selectedSongForOptions) return;
            if (!auth.currentUser) {
                showToast("Please log in to manage favorites");
                closeSongOptionsModal();
                return;
            }
            const updated = await toggleFavorite(selectedSongForOptions);
            if (Array.isArray(updated)) {
                currentFavorites = updated;
            } else {
                await loadFavorites();
            }
            const isNowLiked = Array.isArray(currentFavorites) && currentFavorites.some(f => areSameSongs(f, selectedSongForOptions));
            showToast(isNowLiked ? `Added "${selectedSongForOptions.name}" to Liked Songs` : `Removed "${selectedSongForOptions.name}" from Liked Songs`);
            renderRecentSongs();
            closeSongOptionsModal();
        };
        toggleLikeBtn.addEventListener('click', handleToggleLike);
        listeners.push({ element: toggleLikeBtn, type: 'click', handler: handleToggleLike });
    }

    const downloadBtn = document.getElementById('optRecentSongDownload');
    if (downloadBtn) {
        const handleDownload = async () => {
            if (!selectedSongForOptions) return;
            closeSongOptionsModal();
            showToast(`Downloading "${selectedSongForOptions.name}" for offline playback...`);
            try {
                await cacheSongAudio(selectedSongForOptions);
                showToast(`"${selectedSongForOptions.name}" saved for offline playback!`);
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
            const text = `Listen to ${selectedSongForOptions.name} by ${selectedSongForOptions.artist} on Spotiwind!`;
            if (navigator.share) {
                try {
                    await navigator.share({ title: selectedSongForOptions.name, text, url: window.location.href });
                } catch { }
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(`${text} ${window.location.href}`);
                showToast('Song info copied to clipboard');
            }
            closeSongOptionsModal();
        };
        shareBtn.addEventListener('click', handleShare);
        listeners.push({ element: shareBtn, type: 'click', handler: handleShare });
    }

    const removeBtn = document.getElementById('optRecentSongRemove');
    if (removeBtn) {
        const handleRemove = () => {
            if (selectedSongForOptions) {
                removeSongFromHistory(selectedSongForOptions);
            }
            closeSongOptionsModal();
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

    const onAudioStateChanged = () => {
        syncPlayPauseButtonUI();
    };
    window.addEventListener('song-playing-state-changed', onAudioStateChanged);
    listeners.push({ element: window, type: 'song-playing-state-changed', handler: onAudioStateChanged });

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
    selectedSongForOptions = null;
    currentFavorites = [];
}
