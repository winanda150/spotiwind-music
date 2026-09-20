import {
    db,
    collection,
    query as firestoreQuery,
    getDocs,
    onSnapshot,
    orderBy,
    limit,
    doc,
    setDoc,
    increment,
    serverTimestamp
} from "../assets/js/firebase-config.js";
import { areSameSongs } from '../utils/audioUtils.js';

const DEFAULT_LIMIT = 10;
const POPULAR_TRACKS_COLLECTION = 'popular_tracks';

// Simple debounce to prevent rapid duplicate writes for the exact same track
const recentlyRecordedTracks = new Map();
const RECORD_COOLDOWN_MS = 15000; // 15 seconds cooldown per song

const getPopularTracksRef = () => collection(db, POPULAR_TRACKS_COLLECTION);

export const getTrackEntityId = (song = {}) => {
    const rawId = String(song.id || `${song.name || 'track'}-${song.artist || 'unknown'}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return rawId || 'track-unknown';
};

export const normalizePopularTrackAssetUrl = (url) => {
    if (!url || typeof url !== 'string') return '';

    // NEVER treat temporary blob URLs as relative public paths
    if (url.startsWith('blob:') || url.includes('/blob:') || url.includes('blob:http')) {
        return '';
    }

    // If it's an absolute URL containing local asset path (from localhost, vercel, github pages, etc.)
    if (url.startsWith('http://') || url.startsWith('https://')) {
        if (url.includes('/frontend/public/')) {
            url = url.split('/frontend/public/')[1];
        } else if (url.includes('/public/')) {
            url = url.split('/public/')[1];
        } else if (url.includes('/music/')) {
            url = 'music/' + url.split('/music/')[1];
        } else if (url.includes('/images/')) {
            url = 'images/' + url.split('/images/')[1];
        } else if (url.includes('/branding/')) {
            url = 'branding/' + url.split('/branding/')[1];
        } else if (url.includes('/Elemen/')) {
            url = 'music/' + url.split('/Elemen/')[1];
        } else {
            return url; // External CDN (e.g. Jamendo)
        }
    }

    const cleanPath = String(url)
        .replace(/^(\.\.\/)+public\//, '')
        .replace(/^(\.\.\/)+/, '')
        .replace(/^\/?frontend\/public\//, '')
        .replace(/^\/?public\//, '')
        .replace(/^Elemen\/Logo\//, 'branding/')
        .replace(/^Logo\//, 'branding/')
        .replace(/^Elemen\//, 'music/')
        .replace(/^branding\/Hero%20Section\.webp/g, 'images/Hero%20Section.webp')
        .replace(/^branding\/Banner%20Exclusive\.webp/g, 'images/Banner%20Exclusive.webp')
        .replace(/^branding\/Love%20Image\.png/g, 'images/Love%20Image.png')
        .replace(/^Hero%20Section\.webp/g, 'images/Hero%20Section.webp')
        .replace(/^Banner%20Exclusive\.webp/g, 'images/Banner%20Exclusive.webp')
        .replace(/^Love%20Image\.png/g, 'images/Love%20Image.png')
        .replace(/Gambar[12]\.webp/gi, 'images/Hero%20Section.webp')
        .replace(/^\/+/, '');

    if (!cleanPath || cleanPath.startsWith('blob:') || cleanPath.includes('blob:')) {
        return '';
    }

    return `../../public/${cleanPath}`;
};

/**
 * Automatically syncs & updates track paths in Firestore if Firestore holds legacy or outdated paths.
 * Also heals corrupted blob URLs by checking the local song catalog.
 * @param {string} docId - Firestore document ID
 * @param {Object} rawData - Raw data stored in Firestore document
 */
export const syncPopularTrackPathToFirestore = async (docId, rawData = {}) => {
    if (!docId) return;

    const rawCover = String(rawData.cover || '').trim();
    const rawAudio = String(rawData.audio || '').trim();

    const isCorruptedCover = rawCover.includes('blob:');
    const isCorruptedAudio = rawAudio.includes('blob:');

    let resolvedCover = rawCover;
    let resolvedAudio = rawAudio;

    let durationUpdate = null;
    if (typeof window !== 'undefined') {
        const localCatalog = window.__indonesianSongsPlaylist || window.__desktopLocalSongs;
        if (Array.isArray(localCatalog)) {
            const matched = localCatalog.find(s => areSameSongs(s, { id: docId, ...rawData }));
            if (matched) {
                if (Number(matched.duration) > 0 && Number(rawData.duration) !== Number(matched.duration)) {
                    durationUpdate = Number(matched.duration);
                }
                if (isCorruptedAudio && matched.audio && !matched.audio.includes('blob:')) {
                    resolvedAudio = matched.audio;
                }
                if (isCorruptedCover && matched.cover && !matched.cover.includes('blob:')) {
                    resolvedCover = matched.cover;
                }
            }
        }
    }

    const targetCover = normalizePopularTrackAssetUrl(resolvedCover || '../../public/branding/Spotiwind.webp');
    const targetAudio = normalizePopularTrackAssetUrl(resolvedAudio);

    const hasLegacyCover = targetCover && (
        isCorruptedCover ||
        rawCover.includes('Elemen') ||
        rawCover.includes('frontend') ||
        rawCover.includes('Logo') ||
        rawCover.includes('Gambar1') ||
        rawCover.includes('Gambar2') ||
        rawCover.includes('branding/Hero') ||
        rawCover.includes('branding/Banner') ||
        rawCover.includes('branding/Love') ||
        rawCover !== targetCover
    );

    const hasLegacyAudio = targetAudio && (
        isCorruptedAudio ||
        rawAudio.includes('Elemen') ||
        rawAudio.includes('frontend') ||
        rawAudio !== targetAudio
    );

    if (hasLegacyCover || hasLegacyAudio || durationUpdate !== null) {
        try {
            const trackRef = doc(getPopularTracksRef(), docId);
            const updates = {
                updatedAt: serverTimestamp()
            };
            if (hasLegacyCover && targetCover) updates.cover = targetCover;
            if (hasLegacyAudio && targetAudio) updates.audio = targetAudio;
            if (durationUpdate !== null) updates.duration = durationUpdate;

            await setDoc(trackRef, updates, { merge: true });
        } catch {
            // Background sync is silent to avoid blocking UI
        }
    }
};

/**
 * Record a song play to Firestore popular_tracks collection.
 * Increments playCount and updates metadata safely (never saves blob URLs).
 * @param {Object} song - The song object being played
 */
export const recordTrackPlay = async (song) => {
    if (!song || (!song.id && !song.name && !song.audio)) return;

    const trackId = getTrackEntityId(song);
    const now = Date.now();

    // Check cooldown to avoid duplicate increments from rapid play/pause
    if (recentlyRecordedTracks.has(trackId)) {
        const lastRecorded = recentlyRecordedTracks.get(trackId);
        if (now - lastRecorded < RECORD_COOLDOWN_MS) {
            return;
        }
    }
    recentlyRecordedTracks.set(trackId, now);

    try {
        let songDuration = Number(song.duration) || 0;
        let songCover = song.cover || song.image || '';
        let songAudio = song.audio || '';

        // Check local catalog: songs.json is the source of truth for duration & metadata
        if (typeof window !== 'undefined') {
            const localCatalog = window.__indonesianSongsPlaylist || window.__desktopLocalSongs;
            if (Array.isArray(localCatalog)) {
                const matched = localCatalog.find(s => areSameSongs(s, song));
                if (matched) {
                    if (Number(matched.duration) > 0) {
                        songDuration = Number(matched.duration);
                    }
                    if ((!songAudio || songAudio.includes('blob:')) && matched.audio && !matched.audio.includes('blob:')) {
                        songAudio = matched.audio;
                    }
                    if ((!songCover || songCover.includes('blob:')) && matched.cover && !matched.cover.includes('blob:')) {
                        songCover = matched.cover;
                    }
                }
            }
        }

        const normalizedCover = normalizePopularTrackAssetUrl(songCover || '../../public/branding/Spotiwind.webp');
        const normalizedAudio = normalizePopularTrackAssetUrl(songAudio);

        const trackRef = doc(getPopularTracksRef(), trackId);
        const trackData = {
            id: song.id ? String(song.id) : trackId,
            name: String(song.name || song.title || 'Untitled Track').replace(/\\'/g, "'").trim(),
            artist: String(song.artist || song.artist_name || 'Unknown Artist').replace(/\\'/g, "'").trim(),
            playCount: increment(1),
            updatedAt: serverTimestamp()
        };

        if (normalizedCover) {
            trackData.cover = normalizedCover;
        }
        if (normalizedAudio) {
            trackData.audio = normalizedAudio;
        }

        // Only set duration in Firestore if we have a valid positive duration (> 0)
        if (songDuration > 0) {
            trackData.duration = songDuration;
        }

        await setDoc(trackRef, trackData, { merge: true });
    } catch (error) {
        console.error('Failed to record popular track play in Firestore:', error);
    }
};

/**
 * Helper to sort popular tracks:
 * 1. Highest playCount first (descending).
 * 2. If playCount is equal: The track played EARLIER stays in FRONT (ascending time).
 */
export const sortPopularTracks = (list = []) => {
    return [...list].sort((left, right) => {
        const countLeft = Number(left.playCount) || 0;
        const countRight = Number(right.playCount) || 0;

        if (countRight !== countLeft) {
            return countRight - countLeft;
        }

        const getTimestamp = (item) => {
            const ts = item.firstPlayedAt || item.createdAt || item.updatedAt;
            if (!ts) return 0;
            if (typeof ts.toMillis === 'function') return ts.toMillis();
            if (typeof ts.seconds === 'number') return ts.seconds * 1000;
            return Number(ts) || 0;
        };

        return getTimestamp(left) - getTimestamp(right);
    });
};

/**
 * Fetch top popular tracks from Firestore popular_tracks collection.
 * Heals any legacy corrupted blob paths on the fly.
 * @param {number} limitCount - Maximum number of popular tracks to retrieve (default: 10)
 * @returns {Promise<Array>} Array of popular track objects sorted by playCount
 */
export const fetchPopularTracks = async (limitCount = DEFAULT_LIMIT) => {
    try {
        const q = firestoreQuery(
            getPopularTracksRef(),
            orderBy('playCount', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return [];
        }

        const tracks = querySnapshot.docs.map((docSnap) => {
            const data = docSnap.data() || {};
            syncPopularTrackPathToFirestore(docSnap.id, data);
            let audioPath = normalizePopularTrackAssetUrl(data.audio);
            let coverPath = normalizePopularTrackAssetUrl(data.cover);

            if (!audioPath || !coverPath) {
                const localCatalog = (typeof window !== 'undefined')
                    ? (window.__indonesianSongsPlaylist || window.__desktopLocalSongs)
                    : null;
                if (Array.isArray(localCatalog)) {
                    const matched = localCatalog.find(s => areSameSongs(s, { id: docSnap.id, ...data }));
                    if (matched) {
                        if (!audioPath && matched.audio && !matched.audio.includes('blob:')) {
                            audioPath = normalizePopularTrackAssetUrl(matched.audio);
                        }
                        if (!coverPath && matched.cover && !matched.cover.includes('blob:')) {
                            coverPath = normalizePopularTrackAssetUrl(matched.cover);
                        }
                    }
                }
            }

            return {
                id: docSnap.id,
                ...data,
                name: String(data.name || '').replace(/\\'/g, "'").trim(),
                artist: String(data.artist || '').replace(/\\'/g, "'").trim(),
                audio: audioPath || data.audio,
                cover: coverPath || data.cover || '../../public/branding/Spotiwind.webp',
                playCount: Number(data.playCount) || 0
            };
        });

        return sortPopularTracks(tracks).slice(0, limitCount);
    } catch (error) {
        console.error('Failed to get popular tracks from Firestore:', error);
        return [];
    }
};

export const getPopularTracks = fetchPopularTracks;

/**
 * Real-time subscription to top popular tracks in Firestore.
 * Heals any legacy corrupted blob paths on the fly.
 * @param {Function} callback - Function called with popular tracks array on update
 * @param {number} limitCount - Maximum number of tracks to subscribe to (default: 10)
 * @returns {Function} Unsubscribe function
 */
export const subscribePopularTracks = (callback, limitCount = DEFAULT_LIMIT) => {
    try {
        const q = firestoreQuery(
            getPopularTracksRef(),
            orderBy('playCount', 'desc'),
            limit(limitCount)
        );

        return onSnapshot(q, (snapshot) => {
            const tracks = snapshot.docs.map((docSnap) => {
                const data = docSnap.data() || {};
                syncPopularTrackPathToFirestore(docSnap.id, data);
                let audioPath = normalizePopularTrackAssetUrl(data.audio);
                let coverPath = normalizePopularTrackAssetUrl(data.cover);

                if (!audioPath || !coverPath) {
                    const localCatalog = (typeof window !== 'undefined')
                        ? (window.__indonesianSongsPlaylist || window.__desktopLocalSongs)
                        : null;
                    if (Array.isArray(localCatalog)) {
                        const matched = localCatalog.find(s => areSameSongs(s, { id: docSnap.id, ...data }));
                        if (matched) {
                            if (!audioPath && matched.audio && !matched.audio.includes('blob:')) {
                                audioPath = normalizePopularTrackAssetUrl(matched.audio);
                            }
                            if (!coverPath && matched.cover && !matched.cover.includes('blob:')) {
                                coverPath = normalizePopularTrackAssetUrl(matched.cover);
                            }
                        }
                    }
                }

                return {
                    id: docSnap.id,
                    ...data,
                    name: String(data.name || '').replace(/\\'/g, "'").trim(),
                    artist: String(data.artist || '').replace(/\\'/g, "'").trim(),
                    audio: audioPath || data.audio,
                    cover: coverPath || data.cover || '../../public/branding/Spotiwind.webp',
                    playCount: Number(data.playCount) || 0
                };
            });
            const sortedTracks = sortPopularTracks(tracks).slice(0, limitCount);
            callback(sortedTracks);
        }, (error) => {
            console.error('Failed to subscribe to popular tracks in Firestore:', error);
            callback([]);
        });
    } catch (error) {
        console.error('Failed to set up popular tracks listener:', error);
        callback([]);
        return () => {};
    }
};
