/**
 * Spotiwind — Dedicated Liked Songs Page Module (Mobile)
 * Handles layout, live Firestore liked songs sync, playback queue, search, and options.
 */

import { auth, db, onAuthStateChanged, collection, onSnapshot } from './firebase-config.js';
import { getFavoriteSongs, toggleFavorite } from '../../services/favoriteService.js';
import { showToast } from '../../utils/domUtils.js';
import { debounce } from '../../utils/formatters.js';

let currentLikedSongs = [];
let searchQuery = '';
let previousPageUrl = 'library-mobile.html';
let likedSongsUnsubscribe = null;
let authUnsubscribe = null;
let scrollHandler = null;
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

    document.querySelectorAll('.liked-song-item').forEach(item => {
        const songId = item.dataset.songId;
        const songAudio = item.dataset.songAudio;
        const isSame = isSessionActive && currentSong && (String(currentSong.id) === String(songId) || (typeof window.areSameSongs === 'function' && window.areSameSongs(currentSong, { id: songId, audio: songAudio })));

        item.classList.toggle('is-active-song', Boolean(isSame));
        item.classList.toggle('is-paused', Boolean(isSame && !isPlaying));

        const overlay = item.querySelector('.liked-song-play-overlay');
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
    document.querySelectorAll(`.liked-song-like-btn[data-song-id="${cleanId}"]`).forEach(btn => {
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

const renderLikedSongsList = () => {
    const container = document.getElementById('likedSongsList');
    const countEl = document.getElementById('likedSongsCount');
    const sheetCountEl = document.getElementById('likedSongsOptionsCount');
    if (!container) return;

    const user = auth.currentUser;

    if (!user) {
        if (countEl) countEl.textContent = '0 songs';
        if (sheetCountEl) sheetCountEl.textContent = '0 songs';
        container.innerHTML = `
            <div class="liked-songs-empty-state">
                <div class="liked-songs-empty-icon" aria-hidden="true">
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
                } catch {}
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

    if (countEl) countEl.textContent = formatSongCount(currentLikedSongs.length);
    if (sheetCountEl) sheetCountEl.textContent = formatSongCount(currentLikedSongs.length);

    // Empty state when logged in but has no liked songs
    if (currentLikedSongs.length === 0) {
        container.innerHTML = `
            <div class="liked-songs-empty-state">
                <div class="liked-songs-empty-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                </div>
                <h3 class="liked-songs-empty-title">Songs you like will appear here</h3>
                <p class="liked-songs-empty-desc">Save songs by tapping the heart icon on any track while browsing.</p>
                <a href="#" class="liked-songs-empty-btn" id="likedExploreBtn">Explore Music</a>
            </div>
        `;
        const exploreBtn = document.getElementById('likedExploreBtn');
        if (exploreBtn) {
            exploreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (typeof window.loadPageContent === 'function') {
                    window.loadPageContent('home-mobile.html', { pushState: true });
                }
            });
        }
        return;
    }

    // Filter by search query
    let filtered = [...currentLikedSongs];
    if (searchQuery) {
        filtered = filtered.filter(s => {
            const name = (s.name || s.title || '').toLowerCase();
            const artist = (s.artist || '').toLowerCase();
            return name.includes(searchQuery) || artist.includes(searchQuery);
        });
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="liked-songs-empty-state" style="padding: 2.5rem 1.5rem;">
                <div class="liked-songs-empty-icon" aria-hidden="true" style="width: 50px; height: 50px;">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                </div>
                <h3 class="liked-songs-empty-title">No songs found</h3>
                <p class="liked-songs-empty-desc">Couldn't find anything matching "${escapeHTML(searchQuery)}".</p>
            </div>
        `;
        return;
    }

    const currentSong = window.spotiwind?.mobile?.getCurrentSongData?.() || window.__currentSongData || (typeof window.getCurrentSongData === 'function' ? window.getCurrentSongData() : null);
    const activeAudio = window.__activeAudio || (typeof activeAudio !== 'undefined' ? activeAudio : document.querySelector('audio'));
    const defaultCover = '../../public/branding/Spotiwind.webp';

    const hasMore = likedSongsVisibleLimit < filtered.length;
    const visibleSongs = filtered.slice(0, likedSongsVisibleLimit);
    const loaderHTML = hasMore ? createInfiniteLoaderHTML() : '';

    container.innerHTML = visibleSongs.map(song => {
        const songId = song.id || song.songId || '';
        const name = song.name || song.title || 'Unknown Track';
        const artist = song.artist || 'Unknown Artist';
        const coverUrl = song.cover || song.coverUrl || song.image || defaultCover;
        const audio = song.audio || song.audioUrl || song.songAudio || '';
        const duration = Number(song.duration) || 0;

        const isSessionActive = isLikedSongsSessionActive();
        const isSame = isSessionActive && currentSong && (String(currentSong.id) === String(songId) || (typeof window.areSameSongs === 'function' && window.areSameSongs(currentSong, { id: songId, audio })));
        const isActive = Boolean(isSame);
        const isPaused = isActive && Boolean(activeAudio?.paused);

        return `
            <div class="liked-song-item ${isActive ? 'is-active-song' : ''}" 
                 data-song-id="${songId}" 
                 data-song-audio="${audio}" 
                 data-song-name="${escapeHTML(name)}" 
                 data-song-artist="${escapeHTML(artist)}" 
                 data-song-cover="${escapeHTML(coverUrl)}" 
                 data-song-duration="${duration}">
                <div class="liked-song-art-wrapper">
                    <img src="${coverUrl}" alt="${escapeHTML(name)}" class="liked-song-cover" width="48" height="48" loading="lazy" onerror="this.src='${defaultCover}'">
                    <div class="liked-song-play-overlay">
                        ${isActive && !isPaused ? `
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                        ` : `
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"></polygon></svg>
                        `}
                    </div>
                </div>
                <div class="liked-song-info">
                    <h3 class="liked-song-name">${escapeHTML(name)}</h3>
                    <p class="liked-song-artist">${escapeHTML(artist)}</p>
                </div>
                <div class="liked-song-actions">
                    <span class="liked-song-duration">${formatDuration(duration)}</span>
                    <button class="liked-song-like-btn is-liked" type="button" data-song-id="${songId}" title="Unlike song" aria-label="Unlike song">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" stroke="transparent" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </button>
                    <button class="liked-song-item-more-btn" type="button" data-song-id="${songId}" data-song-name="${escapeHTML(name)}" title="Options" aria-label="Song options">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <circle cx="12" cy="5" r="1.75"></circle>
                            <circle cx="12" cy="12" r="1.75"></circle>
                            <circle cx="12" cy="19" r="1.75"></circle>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }).join('') + loaderHTML;

    syncSongItemsActiveState();
};

function createInfiniteLoaderHTML() {
    return `
        <div class="liked-songs-infinite-loader is-loading" id="likedSongsInfiniteLoader">
            <div class="liked-songs-infinite-spinner" aria-hidden="true"></div>
            <span class="liked-songs-infinite-text">Memuat lainnya...</span>
        </div>
    `;
}

function triggerLoadMore() {
    if (isLikedSongsLoadingMore) return;

    let filtered = [...currentLikedSongs];
    if (searchQuery) {
        filtered = filtered.filter(s => {
            const name = (s.name || s.title || '').toLowerCase();
            const artist = (s.artist || '').toLowerCase();
            return name.includes(searchQuery) || artist.includes(searchQuery);
        });
    }

    if (likedSongsVisibleLimit >= filtered.length) return;

    isLikedSongsLoadingMore = true;
    const loaderEl = document.getElementById('likedSongsInfiniteLoader');
    if (loaderEl) {
        loaderEl.classList.add('is-loading');
    }

    setTimeout(() => {
        likedSongsVisibleLimit += PAGE_CHUNK_SIZE;
        renderLikedSongsList();
        isLikedSongsLoadingMore = false;
        if (typeof window.syncActiveSongUI === 'function') {
            window.syncActiveSongUI();
        }
    }, 200);
}

function setupLikedSongsInfiniteScroll() {
    let lastScrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    let touchStartY = 0;
    let isTouching = false;

    // 1. Natural Scroll predictive buffer (TikTok & Spotify concept)
    const handleScroll = debounce(() => {
        if (isLikedSongsLoadingMore) return;

        const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
        const scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        const clientHeight = window.innerHeight || document.documentElement.clientHeight;

        const isScrollingDown = scrollTop > lastScrollTop;
        lastScrollTop = Math.max(0, scrollTop);

        // Predictive buffer: when user scrolls down and reaches >= 80% or within 220px of bottom
        if (isScrollingDown && scrollTop > 60 && (scrollTop + clientHeight >= scrollHeight - 220 || scrollTop + clientHeight >= scrollHeight * 0.80)) {
            triggerLoadMore();
        }
    }, 60);

    // 2. Touch support for fast swiping / pull-up near bottom
    const handleTouchStart = (e) => {
        if (isLikedSongsLoadingMore || !e.touches || !e.touches[0]) return;
        touchStartY = e.touches[0].clientY;
        isTouching = true;
    };

    const handleTouchMove = (e) => {
        if (!isTouching || isLikedSongsLoadingMore || !e.touches || !e.touches[0]) return;
        const currentY = e.touches[0].clientY;
        const pullDistance = touchStartY - currentY; // positive when dragging upwards

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

const handlePlayAllClick = () => {
    const activeAudio = getGlobalActiveAudio();
    const isSessionActive = isLikedSongsSessionActive();

    // If current audio session is already playing or paused from Liked Songs, toggle play / pause (RESUME)
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

    if (!currentLikedSongs || currentLikedSongs.length === 0) {
        showToast('Belum ada lagu yang disukai untuk diputar.');
        return;
    }

    let targetSong = currentLikedSongs[0];
    let playlistToPlay = [...currentLikedSongs];

    if (isGlobalShuffleActive()) {
        const shuffled = [...currentLikedSongs];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        targetSong = shuffled[0];
        playlistToPlay = shuffled;
    }

    if (typeof window.playPreview === 'function') {
        window.__spotiwindPlaybackContext = 'liked-songs';
        window.playPreview(
            null,
            targetSong.audio,
            targetSong.name,
            targetSong.artist,
            targetSong.cover,
            targetSong.id,
            Number(targetSong.duration) || 0,
            'liked-songs',
            playlistToPlay
        );
    }
    setTimeout(syncPlayPauseButtonUI, 120);
};

const handleShuffleClick = () => {
    if (!currentLikedSongs || currentLikedSongs.length === 0) {
        showToast('Belum ada lagu yang disukai untuk diacak.');
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
        const shuffled = [...currentLikedSongs];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const targetSong = shuffled[0];
        if (typeof window.playPreview === 'function') {
            window.__spotiwindPlaybackContext = 'liked-songs';
            window.playPreview(
                null,
                targetSong.audio,
                targetSong.name,
                targetSong.artist,
                targetSong.cover,
                targetSong.id,
                Number(targetSong.duration) || 0,
                'liked-songs',
                shuffled
            );
        }
        showToast('Shuffle diaktifkan untuk Lagu yang Disukai.');
    } else {
        showToast('Shuffle dinonaktifkan.');
    }
    setTimeout(syncPlayPauseButtonUI, 120);
};

const openOptionsModal = () => {
    const modal = document.getElementById('likedSongsOptionsModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.removeAttribute('inert');
    }
};

const closeOptionsModal = () => {
    const modal = document.getElementById('likedSongsOptionsModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('inert', '');
    }
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
    likedSongsVisibleLimit = PAGE_CHUNK_SIZE;
    isLikedSongsLoadingMore = false;

    // 1. Back button setup
    const backBtn = document.getElementById('likedSongsBackBtn');
    if (backBtn) {
        const handleBack = async (e) => {
            e.preventDefault();
            cleanupLikedSongsPage();
            const targetPage = (previousPageUrl && !previousPageUrl.includes('liked-songs')) ? previousPageUrl : 'library-mobile.html';
            
            // Highlight library tab in bottom navigation
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
            openOptionsModal();
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

    // 6. Options Modal handlers
    const optionsBackdrop = document.getElementById('likedSongsOptionsBackdrop');
    const optionsCloseBtn = document.getElementById('likedSongsOptionsCloseBtn');
    const optPlayAllAction = document.getElementById('likedOptPlayAllAction');
    const optShuffleAction = document.getElementById('likedOptShuffleAction');
    const optShareAction = document.getElementById('likedOptShareAction');

    if (optionsBackdrop) {
        optionsBackdrop.addEventListener('click', closeOptionsModal);
        listeners.push({ element: optionsBackdrop, type: 'click', handler: closeOptionsModal });
    }
    if (optionsCloseBtn) {
        optionsCloseBtn.addEventListener('click', closeOptionsModal);
        listeners.push({ element: optionsCloseBtn, type: 'click', handler: closeOptionsModal });
    }
    if (optPlayAllAction) {
        const handleOptPlay = () => {
            closeOptionsModal();
            handlePlayAllClick();
        };
        optPlayAllAction.addEventListener('click', handleOptPlay);
        listeners.push({ element: optPlayAllAction, type: 'click', handler: handleOptPlay });
    }
    if (optShuffleAction) {
        const handleOptShuffle = () => {
            closeOptionsModal();
            handleShuffleClick();
        };
        optShuffleAction.addEventListener('click', handleOptShuffle);
        listeners.push({ element: optShuffleAction, type: 'click', handler: handleOptShuffle });
    }
    if (optShareAction) {
        const handleOptShare = async () => {
            closeOptionsModal();
            const shareData = {
                title: 'Liked Songs on Spotiwind',
                text: 'Check out my liked songs collection on Spotiwind!',
                url: window.location.href
            };
            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                } catch {}
            } else {
                try {
                    await navigator.clipboard.writeText(window.location.href);
                    showToast('Tautan Liked Songs disalin ke papan klip.');
                } catch {
                    showToast('Gagal menyalin tautan.');
                }
            }
        };
        optShareAction.addEventListener('click', handleOptShare);
        listeners.push({ element: optShareAction, type: 'click', handler: handleOptShare });
    }

    // 7. Track items click delegation
    const listSection = document.querySelector('.liked-songs-list-section');
    if (listSection) {
        const handleListClick = async (e) => {
            // Infinite loader click to manually load more
            const loaderEl = e.target.closest('.liked-songs-infinite-loader');
            if (loaderEl) {
                triggerLoadMore();
                return;
            }

            // Like/Unlike button
            const likeBtn = e.target.closest('.liked-song-like-btn');
            if (likeBtn) {
                e.stopPropagation();
                const songItem = likeBtn.closest('.liked-song-item');
                if (!songItem) return;

                const user = auth.currentUser;
                if (!user) {
                    showToast("Silakan login untuk mengelola lagu favorit.");
                    return;
                }

                const songId = songItem.dataset.songId;
                const song = {
                    id: songId,
                    name: songItem.dataset.songName,
                    artist: songItem.dataset.songArtist,
                    cover: songItem.dataset.songCover,
                    audio: songItem.dataset.songAudio,
                    duration: Number(songItem.dataset.songDuration) || 0
                };

                const wasLiked = likeBtn.classList.contains('is-liked');
                const targetLiked = !wasLiked;

                // Optimistic UI update
                syncAllLikeButtons(songId, targetLiked);

                try {
                    const updatedList = await toggleFavorite(song);
                    const isNowLiked = Array.isArray(updatedList) && updatedList.some(item => String(item.id || item.songId) === String(songId));
                    syncAllLikeButtons(songId, isNowLiked);

                    showToast(isNowLiked ? `Menambahkan "${song.name}" ke Lagu yang Disukai` : `Menghapus "${song.name}" dari Lagu yang Disukai`);
                    window.dispatchEvent(new CustomEvent('favorites-updated', {
                        detail: { songId, isLiked: isNowLiked, favorites: updatedList }
                    }));
                } catch (err) {
                    console.error("Error toggling favorite:", err);
                    syncAllLikeButtons(songId, wasLiked);
                }
                return;
            }

            // Track options button
            const moreBtn = e.target.closest('.liked-song-item-more-btn');
            if (moreBtn) {
                e.stopPropagation();
                const songItem = moreBtn.closest('.liked-song-item');
                if (songItem) {
                    const song = {
                        id: songItem.dataset.songId,
                        name: songItem.dataset.songName,
                        artist: songItem.dataset.songArtist,
                        cover: songItem.dataset.songCover,
                        audio: songItem.dataset.songAudio,
                        duration: Number(songItem.dataset.songDuration) || 0
                    };
                    if (typeof window.openDownloadOptions === 'function') {
                        window.openDownloadOptions(song);
                    } else {
                        showToast(`Opsi untuk "${song.name}"`);
                    }
                }
                return;
            }

            // Track item click to play or toggle pause/resume
            const songItem = e.target.closest('.liked-song-item');
            if (songItem && songItem.dataset.songAudio) {
                const { songId, songAudio, songName, songArtist, songCover, songDuration } = songItem.dataset;
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

                if (typeof window.playPreview === 'function') {
                    window.__spotiwindPlaybackContext = 'liked-songs';
                    window.__spotiwindContext = 'liked-songs';
                    window.playPreview(
                        null,
                        songAudio,
                        songName,
                        songArtist,
                        songCover,
                        songId,
                        Number(songDuration) || 0,
                        'liked-songs',
                        currentLikedSongs
                    );
                }
                setTimeout(syncPlayPauseButtonUI, 100);
            }
        };

        listSection.addEventListener('click', handleListClick);
        listeners.push({ element: listSection, type: 'click', handler: handleListClick });
    }

    // 8. Setup TikTok-style predictive infinite scroll
    setupLikedSongsInfiniteScroll();

    // 9. Listen to auth state and live liked songs
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

    // 9. Listen for audio element play/pause events directly
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

    // 10. Listen for external player state updates
    const handlePlayerState = () => {
        syncPlayPauseButtonUI();
    };
    window.addEventListener('song-playback-state-changed', handlePlayerState);
    listeners.push({ element: window, type: 'song-playback-state-changed', handler: handlePlayerState });

    window.addEventListener('favorites-updated', (e) => {
        const { favorites } = e.detail || {};
        if (Array.isArray(favorites)) {
            currentLikedSongs = favorites;
            renderLikedSongsList();
            syncPlayPauseButtonUI();
        }
    });

    syncPlayPauseButtonUI();
}

/**
 * Cleanup Liked Songs Page when unmounted
 */
export function cleanupLikedSongsPage() {
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
    closeOptionsModal();
}
