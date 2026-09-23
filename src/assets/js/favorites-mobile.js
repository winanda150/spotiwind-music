/**
 * Spotiwind — Dedicated Favorites Page Module (Mobile)
 * Theme: Solar Amber Gold (#FAB314)
 * Handles Dual Layout (List & Grid), Favorites Insights Metrics, Realtime Firestore Sync,
 * Smart Search with Debounce, Filter Chips, Multi-Sort, and Context-Aware Playback.
 */

import { auth, db, doc, deleteDoc, onAuthStateChanged } from './firebase-config.js';
import {
    getUserPlaylists,
    subscribeUserPlaylists,
    getUserSavedAlbums,
    subscribeUserSavedAlbums,
    createUserPlaylist,
    removeAlbumFromLibrary
} from '../../services/libraryService.js';
import { showToast } from '../../utils/domUtils.js';
import { debounce } from '../../utils/formatters.js';

let currentPlaylists = [];
let currentAlbums = [];
let allCombinedItems = [];
let filteredFavItems = [];
let searchQuery = '';
let activeFilter = 'all'; // 'all' | 'created' | 'collab' | 'albums'
let activeSort = 'recent'; // 'recent' | 'alpha' | 'tracks'
let viewMode = localStorage.getItem('spotiwind_fav_view_mode') || 'list'; // 'list' | 'grid'

const PAGE_CHUNK_SIZE = 10;
let favItemsVisibleLimit = PAGE_CHUNK_SIZE;

let previousPageUrl = 'library-mobile.html';
let selectedItemForOptions = null;
let playlistsUnsubscribe = null;
let albumsUnsubscribe = null;
let authUnsubscribe = null;
const listeners = [];

const PLAY_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
const PAUSE_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
const PLAY_ICON_16 = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>`;
const PAUSE_ICON_16 = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

let currentlyPlayingItemId = null;

const getCurrentLoadedSong = () => {
    return window.spotiwind?.mobile?.getCurrentSongData?.() || window.__currentSongData || (typeof window.getCurrentSongData === 'function' ? window.getCurrentSongData() : null);
};

const SORT_LABELS = {
    recent: 'Recent',
    alpha: 'A-Z',
    tracks: 'Tracks'
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

function hasCustomCover(cover) {
    if (!cover || typeof cover !== 'string') return false;
    const lower = cover.toLowerCase().trim();
    if (
        !lower ||
        lower === 'null' ||
        lower === 'undefined' ||
        lower.includes('favorites%20image') ||
        lower.includes('favorites image')
    ) {
        return false;
    }
    return true;
}

const getGlobalActiveAudio = () => {
    return window.__activeAudio || (typeof activeAudio !== 'undefined' ? activeAudio : document.querySelector('audio'));
};

const isFavoritesSessionActive = () => {
    const activeAudio = getGlobalActiveAudio();
    if (!activeAudio || !activeAudio.src) return false;
    const currentContext = window.__spotiwindPlaybackContext || window.__spotiwindContext || '';
    return currentContext === 'favorites';
};

const isFavoritesCurrentlyPlaying = () => {
    const activeAudio = getGlobalActiveAudio();
    if (!activeAudio || activeAudio.paused || activeAudio.ended) return false;
    return isFavoritesSessionActive();
};

/**
 * Updates Favorites Insights card metrics
 */
function updateInsightsMetrics() {
    const playlistCountEl = document.getElementById('favPlaylistCount');
    const trackCountEl = document.getElementById('favTrackCount');
    const syncStatusEl = document.getElementById('favSyncStatus');

    const statPlaylistsEl = document.getElementById('favStatPlaylistsVal');
    const statTracksEl = document.getElementById('favStatTracksVal');
    const statCuratedEl = document.getElementById('favStatCuratedVal');

    const totalPlaylists = currentPlaylists.length;
    let totalTracks = 0;
    let curatedCount = 0;

    currentPlaylists.forEach(p => {
        const count = p.songs?.length || p.tracksCount || 0;
        totalTracks += count;
        if (!p.isCollaborative && !p.isCollab) {
            curatedCount++;
        }
    });

    currentAlbums.forEach(a => {
        totalTracks += a.tracksCount || (Array.isArray(a.tracks) ? a.tracks.length : 0);
    });

    if (playlistCountEl) playlistCountEl.textContent = `${totalPlaylists} ${totalPlaylists === 1 ? 'playlist' : 'playlists'}`;
    if (trackCountEl) trackCountEl.textContent = `${totalTracks} ${totalTracks === 1 ? 'track' : 'tracks'}`;
    if (syncStatusEl) {
        syncStatusEl.textContent = auth.currentUser ? 'Cloud Synced' : 'Local Storage';
    }

    if (statPlaylistsEl) statPlaylistsEl.textContent = String(totalPlaylists);
    if (statTracksEl) statTracksEl.textContent = String(totalTracks);
    if (statCuratedEl) statCuratedEl.textContent = String(curatedCount);
}

/**
 * Combines playlists and albums into unified list
 */
function combineAndSortItems() {
    const formattedPlaylists = currentPlaylists.map(p => ({
        id: p.id,
        itemType: 'playlist',
        name: p.name || 'Untitled Playlist',
        subtitle: `${p.songs?.length || p.tracksCount || 0} tracks`,
        trackCount: p.songs?.length || p.tracksCount || 0,
        cover: p.cover || p.image || p.coverUrl || null,
        isCollaborative: Boolean(p.isCollaborative || p.isCollab),
        createdAt: p.createdAt?.toMillis ? p.createdAt.toMillis() : (p.createdAt || 0),
        raw: p
    }));

    const formattedAlbums = currentAlbums.map(a => ({
        id: a.id,
        itemType: 'album',
        name: a.name || 'Untitled Album',
        subtitle: a.artist || 'Album',
        trackCount: Number(a.tracksCount) || (Array.isArray(a.tracks) ? a.tracks.length : 0),
        cover: a.cover || a.image || a.coverUrl || null,
        isCollaborative: false,
        createdAt: a.savedAt?.toMillis ? a.savedAt.toMillis() : (a.savedAt || 0),
        raw: a
    }));

    allCombinedItems = [...formattedPlaylists, ...formattedAlbums];

    // 1. Filter by category
    let result = [...allCombinedItems];
    if (activeFilter === 'created') {
        result = result.filter(item => item.itemType === 'playlist' && !item.isCollaborative);
    } else if (activeFilter === 'collab') {
        result = result.filter(item => item.itemType === 'playlist' && item.isCollaborative);
    } else if (activeFilter === 'albums') {
        result = result.filter(item => item.itemType === 'album');
    }

    // 2. Filter by search query
    if (searchQuery) {
        result = result.filter(item => {
            const nameMatch = (item.name || '').toLowerCase().includes(searchQuery);
            const subMatch = (item.subtitle || '').toLowerCase().includes(searchQuery);
            return nameMatch || subMatch;
        });
    }

    // 3. Multi-Sort
    if (activeSort === 'alpha') {
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (activeSort === 'tracks') {
        result.sort((a, b) => (b.trackCount || 0) - (a.trackCount || 0));
    } else {
        // default recent
        result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    filteredFavItems = result;
}

/**
 * Synchronizes play/pause UI icons
 */
function syncPlayPauseButtonUI() {
    const playAllBtn = document.getElementById('favPlayAllBtn');
    const playIconWrapper = document.getElementById('favPlayIconWrapper');
    const playAllText = document.getElementById('favPlayAllText');

    const isPlaying = isFavoritesCurrentlyPlaying();

    if (playIconWrapper) {
        playIconWrapper.innerHTML = isPlaying ? PAUSE_ICON : PLAY_ICON;
    }
    if (playAllText) {
        playAllText.textContent = isPlaying ? 'Pause' : 'Play all';
    }

    if (playAllBtn) {
        playAllBtn.classList.toggle('is-playing', isPlaying);
    }
}

/**
 * Synchronizes active playing cards (both Grid and List view) with current playback state
 */
function syncFavoritesCardPlayState() {
    syncPlayPauseButtonUI();

    const isPlaying = isFavoritesCurrentlyPlaying();
    const currentSong = getCurrentLoadedSong();
    const isFavSession = isFavoritesSessionActive();

    document.querySelectorAll('.fav-grid-card, .fav-item').forEach(card => {
        const itemId = card.dataset.itemId;
        const matched = allCombinedItems.find(i => String(i.id) === String(itemId));
        if (!matched) return;

        let isThisPlaying = false;
        let isThisActive = false;

        if (isFavSession && currentSong) {
            const hasSong = matched.raw?.songs?.some(s => 
                String(s.id) === String(currentSong.id) || 
                (s.audio && s.audio === currentSong.audio) ||
                (typeof window.areSameSongs === 'function' && window.areSameSongs(currentSong, s))
            );
            if (hasSong || (currentlyPlayingItemId && currentlyPlayingItemId === String(matched.id)) || (window.__favoritesActiveItemId && window.__favoritesActiveItemId === String(matched.id))) {
                isThisActive = true;
                isThisPlaying = isPlaying;
            }
        }

        card.classList.toggle('is-active-item', isThisActive);
        card.classList.toggle('is-playing', isThisPlaying);

        const gridPlayBtn = card.querySelector('.fav-grid-play-overlay');
        if (gridPlayBtn) {
            gridPlayBtn.setAttribute('aria-label', isThisPlaying ? `Pause ${matched.name}` : `Play ${matched.name}`);
            gridPlayBtn.innerHTML = isThisPlaying ? PAUSE_ICON_16 : PLAY_ICON_16;
        }

        const listPlayOverlay = card.querySelector('.fav-item-play-overlay');
        if (listPlayOverlay) {
            listPlayOverlay.innerHTML = isThisPlaying ? PAUSE_ICON_16 : PLAY_ICON_16;
        }
    });
}

/**
 * Renders the favorites list or grid view
 */
function renderFavoritesList() {
    const container = document.getElementById('favoritesListContainer');
    if (!container) return;

    updateInsightsMetrics();
    combineAndSortItems();

    // Guest / Logged-out state: show login prompt
    if (!auth.currentUser) {
        container.className = 'favorites-list view-list';
        container.innerHTML = `
            <div class="favorites-empty-state">
                <div class="favorites-empty-icon-box" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </div>
                <h3 class="favorites-empty-title">Create your custom playlists</h3>
                <p class="favorites-empty-desc">Log in to create, organize, and view your custom playlists.</p>
                <a href="auth-mobile.html" class="favorites-empty-btn" id="favLoginBtn">Log In / Sign Up</a>
            </div>
        `;
        const loginBtn = document.getElementById('favLoginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                try {
                    sessionStorage.setItem('spotiwind_auth_previous_page', 'favorites-mobile.html');
                } catch { }
                if (typeof window.navigateToAuthPage === 'function') {
                    window.navigateToAuthPage('login');
                } else if (typeof window.loadPageContent === 'function') {
                    window.loadPageContent('auth-mobile.html', { pushState: true, route: '/auth', title: 'Account | Spotiwind' });
                } else {
                    window.location.href = 'auth-mobile.html';
                }
            });
        }
        syncPlayPauseButtonUI();
        return;
    }

    // No playlists or albums yet
    if (allCombinedItems.length === 0) {
        container.className = 'favorites-list view-list';
        container.innerHTML = `
            <div class="favorites-empty-state">
                <div class="favorites-empty-icon-box" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </div>
                <h3 class="favorites-empty-title">No Favorites Yet</h3>
                <p class="favorites-empty-desc">Star your favorite playlists and albums to build your custom collection.</p>
                <button type="button" class="favorites-empty-btn" id="emptyCreatePlaylistBtn">
                    Create Playlist
                </button>
            </div>
        `;
        const emptyBtn = document.getElementById('emptyCreatePlaylistBtn');
        if (emptyBtn) {
            emptyBtn.addEventListener('click', handleCreateNewPlaylist);
        }
        syncPlayPauseButtonUI();
        return;
    }

    // No search or filter matches found
    if (filteredFavItems.length === 0) {
        container.className = 'favorites-list view-list';
        container.innerHTML = `
            <div class="favorites-empty-state">
                <div class="favorites-empty-icon-box" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
                <h3 class="favorites-empty-title">No matching favorites</h3>
                <p class="favorites-empty-desc">Try changing your search keywords or active category chips.</p>
            </div>
        `;
        syncPlayPauseButtonUI();
        return;
    }

    container.className = `favorites-list view-${viewMode}`;

    const visibleItems = filteredFavItems.slice(0, favItemsVisibleLimit);
    const hasMore = favItemsVisibleLimit < filteredFavItems.length;

    let html = '';

    if (viewMode === 'grid') {
        html = visibleItems.map(item => {
            const itemId = escapeHTML(String(item.id));
            const name = escapeHTML(item.name);
            const subtitle = escapeHTML(item.subtitle);
            const itemType = escapeHTML(item.itemType);
            const isCollab = Boolean(item.isCollaborative);
            const hasImg = hasCustomCover(item.cover);
            const coverArtHTML = hasImg
                ? `<img src="${escapeHTML(item.cover)}" alt="${name}" class="fav-grid-cover" width="160" height="160" loading="lazy"
                    onerror="this.style.display='none'; this.parentElement.classList.add('fav-pink-gradient-cover'); this.nextElementSibling.classList.remove('hidden');">
                   <div class="fav-grid-pink-fallback hidden" aria-hidden="true">
                       <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
                           <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                       </svg>
                   </div>`
                : `<div class="fav-grid-pink-fallback" aria-hidden="true">
                       <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor">
                           <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                       </svg>
                   </div>`;

            return `
                <div class="fav-grid-card"
                    data-item-id="${itemId}"
                    data-item-type="${itemType}"
                    data-item-name="${name}">
                    <div class="fav-grid-art-box ${!hasImg ? 'fav-pink-gradient-cover' : ''}">
                        ${isCollab ? '<span class="your-playlist-badge">Collab</span>' : ''}
                        ${coverArtHTML}
                        <button class="fav-grid-play-overlay" type="button" aria-label="Play ${name}" data-item-id="${itemId}">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <polygon points="6 4 20 12 6 20 6 4"></polygon>
                            </svg>
                        </button>
                    </div>
                    <div class="fav-grid-info">
                        <h4 class="fav-grid-title">${name}</h4>
                        <p class="fav-grid-meta">${subtitle}</p>
                    </div>
                    <div class="fav-grid-footer">
                        <span class="fav-grid-type">${itemType === 'playlist' ? 'Playlist' : 'Album'}</span>
                        <button class="fav-grid-more-btn" type="button" data-item-id="${itemId}" title="More options" aria-label="More options">
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
        html = visibleItems.map(item => {
            const itemId = escapeHTML(String(item.id));
            const name = escapeHTML(item.name);
            const subtitle = escapeHTML(item.subtitle);
            const itemType = escapeHTML(item.itemType);
            const isCollab = Boolean(item.isCollaborative);
            const hasImg = hasCustomCover(item.cover);
            const coverArtHTML = hasImg
                ? `<img src="${escapeHTML(item.cover)}" alt="${name}" class="fav-item-cover" width="48" height="48" loading="lazy"
                    onerror="this.style.display='none'; this.parentElement.classList.add('fav-pink-gradient-cover'); this.nextElementSibling.classList.remove('hidden');">
                   <div class="fav-item-pink-fallback hidden" aria-hidden="true">
                       <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                           <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                       </svg>
                   </div>`
                : `<div class="fav-item-pink-fallback" aria-hidden="true">
                       <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                           <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                       </svg>
                   </div>`;

            return `
                <div class="fav-item"
                    data-item-id="${itemId}"
                    data-item-type="${itemType}"
                    data-item-name="${name}">
                    <div class="fav-item-art-wrapper ${!hasImg ? 'fav-pink-gradient-cover' : ''}">
                        ${isCollab ? '<span class="your-playlist-badge">Collab</span>' : ''}
                        ${coverArtHTML}
                        <div class="fav-item-play-overlay">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <polygon points="6 4 20 12 6 20 6 4"></polygon>
                            </svg>
                        </div>
                    </div>
                    <div class="fav-item-info">
                        <h4 class="fav-item-title">${name}</h4>
                        <p class="fav-item-meta">${subtitle}</p>
                    </div>
                    <div class="fav-item-actions">
                        <span class="fav-item-badge">${itemType === 'playlist' ? 'Playlist' : 'Album'}</span>
                        <button class="fav-item-more-btn" type="button" data-item-id="${itemId}" title="More options" aria-label="More options">
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
            <div class="favorites-infinite-loader" id="favInfiniteLoader">
                <div class="favorites-infinite-spinner" aria-hidden="true"></div>
                <span class="favorites-infinite-text">Loading more favorites...</span>
            </div>
        `;
    }

    container.innerHTML = html;
    syncFavoritesCardPlayState();
}

/**
 * Progressive Infinite Scroll batch loader
 */
function setupFavInfiniteScroll() {
    const handleScroll = () => {
        if (favItemsVisibleLimit >= filteredFavItems.length) return;

        const loader = document.getElementById('favInfiniteLoader');
        if (!loader) return;

        const rect = loader.getBoundingClientRect();
        if (rect.top <= window.innerHeight + 150) {
            favItemsVisibleLimit += PAGE_CHUNK_SIZE;
            renderFavoritesList();
        }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    listeners.push({ element: window, type: 'scroll', handler: handleScroll });
}

/**
 * Handle Play All click
 */
function handlePlayAll() {
    if (filteredFavItems.length === 0) {
        showToast('No favorite collections to play');
        return;
    }

    const activeAudio = getGlobalActiveAudio();
    if (isFavoritesSessionActive() && activeAudio) {
        if (activeAudio.paused) {
            activeAudio.play();
        } else {
            activeAudio.pause();
        }
        syncPlayPauseButtonUI();
        return;
    }

    window.__spotiwindPlaybackContext = 'favorites';

    // Find first playlist with songs
    const playlistWithSongs = filteredFavItems.find(item => item.itemType === 'playlist' && item.raw?.songs?.length > 0);
    if (playlistWithSongs) {
        currentlyPlayingItemId = String(playlistWithSongs.id);
        window.__favoritesActiveItemId = String(playlistWithSongs.id);
        const songs = playlistWithSongs.raw.songs;
        const first = songs[0];
        if (typeof window.playPreview === 'function') {
            window.playPreview(null, first.audio, first.name, first.artist, first.cover, first.id, Number(first.duration) || 0, 'favorites', songs);
            showToast(`Playing playlist "${playlistWithSongs.name}"`);
        }
        syncFavoritesCardPlayState();
    } else {
        showToast('Select a playlist to start playback');
    }
}

/**
 * Handle Shuffle play click
 */
function handleShuffle() {
    if (filteredFavItems.length === 0) {
        showToast('No favorites to shuffle');
        return;
    }

    window.__spotiwindPlaybackContext = 'favorites';

    // Gather all available songs across favorite playlists
    const allSongs = [];
    currentPlaylists.forEach(p => {
        if (Array.isArray(p.songs)) {
            allSongs.push(...p.songs);
        }
    });

    if (allSongs.length === 0) {
        showToast('Add tracks to your playlists to shuffle');
        return;
    }

    const shuffled = [...allSongs].sort(() => Math.random() - 0.5);
    const first = shuffled[0];
    if (first && typeof window.playPreview === 'function') {
        window.playPreview(null, first.audio, first.name, first.artist, first.cover, first.id, Number(first.duration) || 0, 'favorites', shuffled);
        showToast('Shuffling favorite collections');
    }
}

/**
 * Handle New Playlist creation
 */
function handleCreateNewPlaylist() {
    if (!auth.currentUser) {
        showToast("Please log in to create playlists");
        return;
    }

    const createBtn = document.getElementById('favCreateBtn');
    if (typeof window.openCreatePlaylistModal === 'function') {
        window.openCreatePlaylistModal(createBtn);
    } else {
        const name = window.prompt("Enter playlist name:");
        if (name && name.trim()) {
            createUserPlaylist(auth.currentUser.uid, name.trim()).then(res => {
                if (res) showToast(`Created playlist "${name.trim()}"`);
            });
        }
    }
}

/**
 * Switch layout format (list vs grid)
 */
function setViewMode(mode) {
    viewMode = mode;
    localStorage.setItem('spotiwind_fav_view_mode', mode);

    const listBtn = document.getElementById('favViewListBtn');
    const gridBtn = document.getElementById('favViewGridBtn');

    if (listBtn) listBtn.classList.toggle('is-active', mode === 'list');
    if (gridBtn) gridBtn.classList.toggle('is-active', mode === 'grid');

    renderFavoritesList();
}

/**
 * Global & Item Options Sheet Controls with Pull-to-Dismiss Gestures
 */
let cleanupGlobalDrag = null;
let cleanupItemDrag = null;

const resetSheetStyles = (modal) => {
    if (!modal) return;
    const sheet = modal.querySelector('.favorites-options-sheet');
    const backdrop = modal.querySelector('.favorites-options-backdrop');
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
 * Setup swipe-down (drag to dismiss) gesture for bottom sheet modals
 */
const setupSheetDrag = (modalEl, onCloseCallback) => {
    if (!modalEl) return () => {};

    const sheet = modalEl.querySelector('.favorites-options-sheet');
    const backdrop = modalEl.querySelector('.favorites-options-backdrop');
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

            const handle = sheet.querySelector('.favorites-options-handle-wrapper');
            const header = sheet.querySelector('.favorites-options-header');
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

function openGlobalOptions() {
    const modal = document.getElementById('favGlobalOptionsModal');
    if (!modal) return;
    resetSheetStyles(modal);
    modal.classList.remove('hidden');
    modal.removeAttribute('inert');
}

function closeGlobalOptions() {
    const modal = document.getElementById('favGlobalOptionsModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('inert', '');
    resetSheetStyles(modal);
}

function openItemOptionsModal(item) {
    selectedItemForOptions = item;
    const modal = document.getElementById('favItemOptionsModal');
    if (!modal) return;

    const cover = document.getElementById('favItemOptionsCover');
    const fallback = document.getElementById('favItemOptionsCoverFallback');
    const title = document.getElementById('favItemOptionsTitle');
    const sub = document.getElementById('favItemOptionsSub');
    const deleteLabel = document.getElementById('favItemDeleteLabel');

    const hasImg = hasCustomCover(item.cover);
    if (cover) {
        cover.onerror = () => {
            cover.classList.add('hidden');
            if (fallback) fallback.classList.remove('hidden');
        };
        if (hasImg) {
            cover.src = item.cover;
            cover.classList.remove('hidden');
        } else {
            cover.classList.add('hidden');
        }
    }
    if (fallback) {
        fallback.classList.toggle('hidden', hasImg);
    }
    if (title) title.textContent = item.name || 'Untitled';
    if (sub) sub.textContent = item.subtitle || (item.itemType === 'playlist' ? 'Playlist' : 'Album');
    if (deleteLabel) {
        deleteLabel.textContent = item.itemType === 'playlist' ? 'Delete Playlist' : 'Remove from Favorites';
    }

    resetSheetStyles(modal);
    modal.classList.remove('hidden');
    modal.removeAttribute('inert');
}

function closeItemOptionsModal() {
    const modal = document.getElementById('favItemOptionsModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('inert', '');
    resetSheetStyles(modal);
    selectedItemForOptions = null;
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
    // 1. Back button
    const backBtn = document.getElementById('favBackBtn');
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

    // 2. Play all & shuffle & create
    const playAllBtn = document.getElementById('favPlayAllBtn');
    if (playAllBtn) {
        playAllBtn.addEventListener('click', handlePlayAll);
        listeners.push({ element: playAllBtn, type: 'click', handler: handlePlayAll });
    }

    const shuffleBtn = document.getElementById('favShuffleBtn');
    if (shuffleBtn) {
        shuffleBtn.addEventListener('click', handleShuffle);
        listeners.push({ element: shuffleBtn, type: 'click', handler: handleShuffle });
    }

    const createBtn = document.getElementById('favCreateBtn');
    if (createBtn) {
        createBtn.addEventListener('click', handleCreateNewPlaylist);
        listeners.push({ element: createBtn, type: 'click', handler: handleCreateNewPlaylist });
    }

    // 3. View format switchers
    const listBtn = document.getElementById('favViewListBtn');
    if (listBtn) {
        const handleListClick = () => setViewMode('list');
        listBtn.addEventListener('click', handleListClick);
        listeners.push({ element: listBtn, type: 'click', handler: handleListClick });
    }

    const gridBtn = document.getElementById('favViewGridBtn');
    if (gridBtn) {
        const handleGridClick = () => setViewMode('grid');
        gridBtn.addEventListener('click', handleGridClick);
        listeners.push({ element: gridBtn, type: 'click', handler: handleGridClick });
    }

    // 4. Search input & clear button
    const searchInput = document.getElementById('favSearchInput');
    const searchClearBtn = document.getElementById('favSearchClearBtn');
    if (searchInput) {
        const handleSearch = debounce((e) => {
            searchQuery = (e.target.value || '').trim().toLowerCase();
            if (searchClearBtn) {
                searchClearBtn.classList.toggle('hidden', !searchQuery);
            }
            favItemsVisibleLimit = PAGE_CHUNK_SIZE;
            renderFavoritesList();
        }, 180);
        searchInput.addEventListener('input', handleSearch);
        listeners.push({ element: searchInput, type: 'input', handler: handleSearch });
    }

    if (searchClearBtn && searchInput) {
        const handleClear = () => {
            searchInput.value = '';
            searchQuery = '';
            searchClearBtn.classList.add('hidden');
            favItemsVisibleLimit = PAGE_CHUNK_SIZE;
            renderFavoritesList();
            searchInput.focus();
        };
        searchClearBtn.addEventListener('click', handleClear);
        listeners.push({ element: searchClearBtn, type: 'click', handler: handleClear });
    }

    // 5. Category filter chips
    const chips = document.querySelectorAll('.favorites-chips-row .fav-chip');
    chips.forEach(chip => {
        const handleChipClick = () => {
            chips.forEach(c => c.classList.toggle('is-active', c === chip));
            activeFilter = chip.dataset.filter || 'all';
            favItemsVisibleLimit = PAGE_CHUNK_SIZE;
            renderFavoritesList();
        };
        chip.addEventListener('click', handleChipClick);
        listeners.push({ element: chip, type: 'click', handler: handleChipClick });
    });

    // 6. Sort trigger cycle
    const sortBtn = document.getElementById('favSortTriggerBtn');
    const sortLabel = document.getElementById('favSortLabel');
    if (sortBtn) {
        const handleSortCycle = () => {
            const modes = ['recent', 'alpha', 'tracks'];
            const nextIdx = (modes.indexOf(activeSort) + 1) % modes.length;
            activeSort = modes[nextIdx];
            if (sortLabel) {
                sortLabel.textContent = SORT_LABELS[activeSort] || 'Recent';
            }
            renderFavoritesList();
            showToast(`Sorted by ${SORT_LABELS[activeSort]}`);
        };
        sortBtn.addEventListener('click', handleSortCycle);
        listeners.push({ element: sortBtn, type: 'click', handler: handleSortCycle });
    }

    // 7. Item click delegation
    const container = document.getElementById('favoritesListContainer');
    if (container) {
        const handleItemInteraction = (e) => {
            const moreBtn = e.target.closest('.fav-item-more-btn, .fav-grid-more-btn');
            if (moreBtn) {
                e.stopPropagation();
                const card = moreBtn.closest('.fav-item, .fav-grid-card');
                if (card) {
                    const itemId = card.dataset.itemId;
                    const matched = allCombinedItems.find(i => String(i.id) === String(itemId));
                    if (matched) {
                        openItemOptionsModal(matched);
                    }
                }
                return;
            }

            const card = e.target.closest('.fav-item, .fav-grid-card');
            if (!card) return;

            const isGridCard = card.classList.contains('fav-grid-card');
            const isGridPlayBtn = Boolean(e.target.closest('.fav-grid-play-overlay'));

            // In grid view, user must click the circular play button icon to play/pause!
            if (isGridCard && !isGridPlayBtn) {
                return;
            }

            const itemId = card.dataset.itemId;
            const matched = allCombinedItems.find(i => String(i.id) === String(itemId));
            if (!matched) return;

            const activeAudio = getGlobalActiveAudio();
            const currentSong = getCurrentLoadedSong();
            const isFavSession = isFavoritesSessionActive();

            // Check if this playlist/album is currently the active playback item
            const isThisItemActive = isFavSession && (
                currentlyPlayingItemId === String(matched.id) ||
                (window.__favoritesActiveItemId && window.__favoritesActiveItemId === String(matched.id)) ||
                (matched.raw?.songs && currentSong && matched.raw.songs.some(s => 
                    String(s.id) === String(currentSong.id) || 
                    (s.audio && s.audio === currentSong.audio) ||
                    (typeof window.areSameSongs === 'function' && window.areSameSongs(currentSong, s))
                ))
            );

            if (isThisItemActive && activeAudio && activeAudio.src) {
                if (!activeAudio.paused) {
                    activeAudio.pause();
                } else {
                    activeAudio.play().catch(err => console.error("Play error:", err));
                }
                syncFavoritesCardPlayState();
                if (typeof window.syncActiveSongUI === 'function') {
                    window.syncActiveSongUI();
                }
                return;
            }

            // Start playback of this playlist or album
            if (matched.itemType === 'playlist') {
                if (matched.raw?.songs && matched.raw.songs.length > 0) {
                    currentlyPlayingItemId = String(matched.id);
                    window.__favoritesActiveItemId = String(matched.id);
                    window.__spotiwindPlaybackContext = 'favorites';
                    const first = matched.raw.songs[0];
                    if (typeof window.playPreview === 'function') {
                        window.playPreview(null, first.audio, first.name, first.artist, first.cover, first.id, Number(first.duration) || 0, 'favorites', matched.raw.songs);
                        showToast(`Playing playlist "${matched.name}"`);
                    }
                    syncFavoritesCardPlayState();
                } else {
                    showToast(`Playlist "${matched.name}" is empty`);
                }
            } else if (matched.itemType === 'album') {
                if (matched.raw?.tracks && matched.raw.tracks.length > 0) {
                    currentlyPlayingItemId = String(matched.id);
                    window.__favoritesActiveItemId = String(matched.id);
                    window.__spotiwindPlaybackContext = 'favorites';
                    const first = matched.raw.tracks[0];
                    if (typeof window.playPreview === 'function') {
                        window.playPreview(null, first.audio || first.audioUrl, first.name || first.title, first.artist || matched.subtitle, first.cover || matched.cover, first.id, Number(first.duration) || 0, 'favorites', matched.raw.tracks);
                        showToast(`Playing album "${matched.name}"`);
                    }
                    syncFavoritesCardPlayState();
                } else {
                    showToast(`Album "${matched.name}" has no preview tracks`);
                }
            }
        };
        container.addEventListener('click', handleItemInteraction);
        listeners.push({ element: container, type: 'click', handler: handleItemInteraction });
    }

    // 8. Global Options Sheet Modal
    const moreBtn = document.getElementById('favMoreBtn');
    if (moreBtn) {
        moreBtn.addEventListener('click', openGlobalOptions);
        listeners.push({ element: moreBtn, type: 'click', handler: openGlobalOptions });
    }

    const globalBackdrop = document.getElementById('favGlobalBackdrop');
    const globalCloseBtn = document.getElementById('favGlobalCloseBtn');
    if (globalBackdrop) {
        globalBackdrop.addEventListener('click', closeGlobalOptions);
        listeners.push({ element: globalBackdrop, type: 'click', handler: closeGlobalOptions });
    }
    if (globalCloseBtn) {
        globalCloseBtn.addEventListener('click', closeGlobalOptions);
        listeners.push({ element: globalCloseBtn, type: 'click', handler: closeGlobalOptions });
    }

    // Global sort options
    const optSortRecent = document.getElementById('optFavSortRecent');
    if (optSortRecent) {
        const handle = () => {
            activeSort = 'recent';
            if (sortLabel) sortLabel.textContent = 'Recent';
            renderFavoritesList();
            closeGlobalOptions();
        };
        optSortRecent.addEventListener('click', handle);
        listeners.push({ element: optSortRecent, type: 'click', handler: handle });
    }

    const optSortAlpha = document.getElementById('optFavSortAlpha');
    if (optSortAlpha) {
        const handle = () => {
            activeSort = 'alpha';
            if (sortLabel) sortLabel.textContent = 'A-Z';
            renderFavoritesList();
            closeGlobalOptions();
        };
        optSortAlpha.addEventListener('click', handle);
        listeners.push({ element: optSortAlpha, type: 'click', handler: handle });
    }

    const optSortTracks = document.getElementById('optFavSortTracks');
    if (optSortTracks) {
        const handle = () => {
            activeSort = 'tracks';
            if (sortLabel) sortLabel.textContent = 'Tracks';
            renderFavoritesList();
            closeGlobalOptions();
        };
        optSortTracks.addEventListener('click', handle);
        listeners.push({ element: optSortTracks, type: 'click', handler: handle });
    }

    const optCreateNew = document.getElementById('optFavCreateNew');
    if (optCreateNew) {
        const handle = () => {
            closeGlobalOptions();
            handleCreateNewPlaylist();
        };
        optCreateNew.addEventListener('click', handle);
        listeners.push({ element: optCreateNew, type: 'click', handler: handle });
    }

    // 9. Item Options Sheet Modal
    const itemBackdrop = document.getElementById('favItemBackdrop');
    const itemCloseBtn = document.getElementById('favItemCloseBtn');
    if (itemBackdrop) {
        itemBackdrop.addEventListener('click', closeItemOptionsModal);
        listeners.push({ element: itemBackdrop, type: 'click', handler: closeItemOptionsModal });
    }
    if (itemCloseBtn) {
        itemCloseBtn.addEventListener('click', closeItemOptionsModal);
        listeners.push({ element: itemCloseBtn, type: 'click', handler: closeItemOptionsModal });
    }

    const itemPlayNextBtn = document.getElementById('optFavItemPlayNext');
    if (itemPlayNextBtn) {
        const handlePlayNext = () => {
            if (!selectedItemForOptions) return;
            const item = selectedItemForOptions;
            closeItemOptionsModal();

            if (item.raw?.songs && item.raw.songs.length > 0) {
                const songs = item.raw.songs;
                if (typeof window.addToQueueNext === 'function') {
                    window.addToQueueNext(songs);
                    showToast(`Added "${item.name}" to play next`);
                } else if (typeof window.playPreview === 'function') {
                    const first = songs[0];
                    window.playPreview(null, first.audio, first.name, first.artist, first.cover, first.id, Number(first.duration) || 0, 'favorites', songs);
                    showToast(`Playing "${item.name}"`);
                }
            } else {
                showToast(`No songs in "${item.name}" to queue`);
            }
        };
        itemPlayNextBtn.addEventListener('click', handlePlayNext);
        listeners.push({ element: itemPlayNextBtn, type: 'click', handler: handlePlayNext });
    }

    const itemAddSongsBtn = document.getElementById('optFavItemAddSongs');
    if (itemAddSongsBtn) {
        const handleAddSongs = () => {
            if (!selectedItemForOptions) return;
            const item = selectedItemForOptions;
            closeItemOptionsModal();

            if (typeof window.loadPageContent === 'function') {
                window.loadPageContent('search-mobile.html', { route: '/search', targetPlaylistId: item.id });
            } else {
                showToast('Navigate to search to add songs');
            }
        };
        itemAddSongsBtn.addEventListener('click', handleAddSongs);
        listeners.push({ element: itemAddSongsBtn, type: 'click', handler: handleAddSongs });
    }

    const itemShareBtn = document.getElementById('optFavItemShare');
    if (itemShareBtn) {
        const handleShare = async () => {
            if (!selectedItemForOptions) return;
            const item = selectedItemForOptions;
            closeItemOptionsModal();

            const text = `Check out ${item.name} on Spotiwind!`;
            if (navigator.share) {
                try {
                    await navigator.share({ title: item.name, text, url: window.location.href });
                } catch { }
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(`${text} ${window.location.href}`);
                showToast('Link copied to clipboard');
            }
        };
        itemShareBtn.addEventListener('click', handleShare);
        listeners.push({ element: itemShareBtn, type: 'click', handler: handleShare });
    }

    const itemDeleteBtn = document.getElementById('optFavItemDelete');
    if (itemDeleteBtn) {
        const handleDelete = async () => {
            if (!selectedItemForOptions) return;
            const item = selectedItemForOptions;
            closeItemOptionsModal();

            const confirmed = window.confirm(`Remove "${item.name}" from favorites?`);
            if (!confirmed) return;

            try {
                const user = auth.currentUser;
                if (item.itemType === 'playlist' && user) {
                    await deleteDoc(doc(db, "users", user.uid, "playlists", String(item.id)));
                    currentPlaylists = currentPlaylists.filter(p => String(p.id) !== String(item.id));
                } else if (item.itemType === 'album') {
                    await removeAlbumFromLibrary(item.id);
                    currentAlbums = currentAlbums.filter(a => String(a.id) !== String(item.id));
                }
                renderFavoritesList();
                showToast(`Removed "${item.name}"`);
            } catch (err) {
                console.error("Failed to delete item:", err);
                showToast("Failed to remove item");
            }
        };
        itemDeleteBtn.addEventListener('click', handleDelete);
        listeners.push({ element: itemDeleteBtn, type: 'click', handler: handleDelete });
    }

    // 10. Drag-to-dismiss gesture setup for modals
    const globalModal = document.getElementById('favGlobalOptionsModal');
    if (globalModal) {
        cleanupGlobalDrag = setupSheetDrag(globalModal, closeGlobalOptions);
    }
    const itemModal = document.getElementById('favItemOptionsModal');
    if (itemModal) {
        cleanupItemDrag = setupSheetDrag(itemModal, closeItemOptionsModal);
    }

    // 11. Reactive window audio state
    const onAudioStateChanged = () => {
        syncFavoritesCardPlayState();
    };
    window.addEventListener('song-playing-state-changed', onAudioStateChanged);
    listeners.push({ element: window, type: 'song-playing-state-changed', handler: onAudioStateChanged });

    // 12. Infinite scroll
    setupFavInfiniteScroll();
}

/**
 * Main initializer for Favorites Mobile Page
 */
export async function initFavoritesPage(prevUrl = 'library-mobile.html') {
    previousPageUrl = prevUrl;
    favItemsVisibleLimit = PAGE_CHUNK_SIZE;

    setupEventListeners();

    // Set initial view mode button state
    setViewMode(viewMode);

    // Listen to Firebase auth state changes
    authUnsubscribe = onAuthStateChanged(auth, (user) => {
        if (typeof playlistsUnsubscribe === 'function') {
            playlistsUnsubscribe();
            playlistsUnsubscribe = null;
        }
        if (typeof albumsUnsubscribe === 'function') {
            albumsUnsubscribe();
            albumsUnsubscribe = null;
        }

        if (user && user.uid) {
            playlistsUnsubscribe = subscribeUserPlaylists(user.uid, (playlists) => {
                currentPlaylists = Array.isArray(playlists) ? playlists : [];
                renderFavoritesList();
            });

            albumsUnsubscribe = subscribeUserSavedAlbums(user.uid, (albums) => {
                currentAlbums = Array.isArray(albums) ? albums : [];
                renderFavoritesList();
            });
        } else {
            currentPlaylists = [];
            currentAlbums = [];
            renderFavoritesList();
        }
    });
}

/**
 * Cleanup function called before unloading the subpage
 */
export function cleanupFavoritesPage() {
    if (typeof authUnsubscribe === 'function') {
        authUnsubscribe();
        authUnsubscribe = null;
    }
    if (typeof playlistsUnsubscribe === 'function') {
        playlistsUnsubscribe();
        playlistsUnsubscribe = null;
    }
    if (typeof albumsUnsubscribe === 'function') {
        albumsUnsubscribe();
        albumsUnsubscribe = null;
    }

    listeners.forEach(({ element, type, handler }) => {
        if (element && typeof element.removeEventListener === 'function') {
            element.removeEventListener(type, handler);
        }
    });
    listeners.length = 0;

    if (typeof cleanupGlobalDrag === 'function') {
        cleanupGlobalDrag();
        cleanupGlobalDrag = null;
    }
    if (typeof cleanupItemDrag === 'function') {
        cleanupItemDrag();
        cleanupItemDrag = null;
    }

    selectedItemForOptions = null;
    currentlyPlayingItemId = null;
    window.__favoritesActiveItemId = null;
    currentPlaylists = [];
    currentAlbums = [];
    allCombinedItems = [];
    filteredFavItems = [];
}
