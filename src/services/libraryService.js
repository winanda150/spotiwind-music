import {
    auth,
    db,
    doc,
    collection,
    query,
    orderBy,
    onSnapshot,
    getDocs,
    getDoc,
    setDoc,
    deleteDoc,
    addDoc,
    serverTimestamp
} from "../assets/js/firebase-config.js";

const getLikedSongsRef = (uid) => collection(db, "users", uid, "liked_songs");
const getLikedSongRef = (uid, songId) => doc(db, "users", uid, "liked_songs", String(songId));
const getUserPlaylistsRef = (uid) => collection(db, "users", uid, "playlists");

export const getLibrarySongs = async (uid) => {
    if (!uid) return [];

    try {
        const snapshot = await getDocs(getLikedSongsRef(uid));
        return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    } catch (error) {
        console.error("Failed to get library songs:", error);
        return [];
    }
};

export const addSongToLibrary = async (song) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !song?.id) return null;

    try {
        const songId = String(song.id).trim();
        await setDoc(getLikedSongRef(uid, songId), {
            ...song,
            id: songId,
            likedAt: serverTimestamp()
        });
        return getLibrarySongs(uid);
    } catch (error) {
        console.error("Failed to add song to library:", error);
        return null;
    }
};

export const removeSongFromLibrary = async (songId) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !songId) return null;

    try {
        await deleteDoc(getLikedSongRef(uid, songId));
        return getLibrarySongs(uid);
    } catch (error) {
        console.error("Failed to remove song from library:", error);
        return null;
    }
};

export const isSongInLibrary = async (songId) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !songId) return false;

    const library = await getLibrarySongs(uid);
    return Array.isArray(library) ? library.some((item) => String(item.id ?? item.songId) === String(songId)) : false;
};

export const getUserPlaylists = async (uid) => {
    if (!uid) return [];

    try {
        const q = query(getUserPlaylistsRef(uid), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    } catch (error) {
        console.error("Failed to fetch user playlists:", error);
        return [];
    }
};

export const subscribeUserPlaylists = (uid, callback) => {
    if (!uid || typeof callback !== "function") return () => {};

    try {
        const q = query(getUserPlaylistsRef(uid), orderBy("createdAt", "desc"));
        return onSnapshot(q, (snapshot) => {
            const playlists = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
            callback(playlists);
        });
    } catch (error) {
        console.error("Failed to subscribe user playlists:", error);
        return () => {};
    }
};

export const createUserPlaylist = async (uid, playlistName) => {
    const name = playlistName?.trim();
    if (!uid || !name) return null;

    try {
        const ref = await addDoc(getUserPlaylistsRef(uid), {
            name,
            createdAt: serverTimestamp()
        });

        return { id: ref.id, name, createdAt: Date.now() };
    } catch (error) {
        console.error("Failed to create user playlist:", error);
        return null;
    }
};

export const subscribeLikedSongs = (uid, callback) => {
    if (!uid || typeof callback !== "function") return () => {};

    try {
        return onSnapshot(getLikedSongsRef(uid), (snapshot) => {
            const songs = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
            callback(songs);
        });
    } catch (error) {
        console.error("Failed to subscribe liked songs:", error);
        return () => {};
    }
};

// ==========================================
// ALBUMS SERVICE: Firestore Path: users/{uid}/albums
// ==========================================
const getUserAlbumsRef = (uid) => collection(db, "users", uid, "albums");
const getUserAlbumRef = (uid, albumId) => doc(db, "users", uid, "albums", String(albumId));

export const getUserSavedAlbums = async (uid) => {
    if (!uid) return [];
    try {
        const snapshot = await getDocs(getUserAlbumsRef(uid));
        return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    } catch (error) {
        console.error("Failed to fetch user saved albums:", error);
        return [];
    }
};

export const subscribeUserSavedAlbums = (uid, callback) => {
    if (!uid || typeof callback !== "function") return () => {};

    try {
        const albumsRef = getUserAlbumsRef(uid);
        return onSnapshot(albumsRef, (snapshot) => {
            const albums = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
            callback(albums);
        }, (error) => {
            console.error("Failed to subscribe user saved albums:", error);
            callback([]);
        });
    } catch (error) {
        console.error("Failed to subscribe user saved albums:", error);
        return () => {};
    }
};

export const saveAlbumToLibrary = async (album) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !album) return null;

    try {
        const albumId = String(album.id || album.albumId || (album.name || 'album').toLowerCase().replace(/\s+/g, '-')).trim();
        const ref = getUserAlbumRef(uid, albumId);
        const data = {
            id: albumId,
            albumId: albumId,
            name: album.name || album.title || 'Untitled Album',
            artist: album.artist || 'Various Artists',
            cover: album.cover || album.image || album.albumCover || '',
            tracksCount: Number(album.tracksCount) || (Array.isArray(album.tracks) ? album.tracks.length : 0),
            savedAt: serverTimestamp()
        };
        await setDoc(ref, data, { merge: true });

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('albums-updated', {
                detail: { albumId, isSaved: true, album: data }
            }));
        }
        return true;
    } catch (error) {
        console.error("Failed to save album to library:", error);
        return false;
    }
};

export const removeAlbumFromLibrary = async (albumId) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !albumId) return null;

    try {
        const cleanId = String(albumId).trim();
        const ref = getUserAlbumRef(uid, cleanId);
        await deleteDoc(ref);

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('albums-updated', {
                detail: { albumId: cleanId, isSaved: false }
            }));
        }
        return true;
    } catch (error) {
        console.error("Failed to remove album from library:", error);
        return false;
    }
};

export const toggleSaveAlbum = async (album) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !album) return false;

    try {
        const albumId = String(album.id || album.albumId || (album.name || 'album').toLowerCase().replace(/\s+/g, '-')).trim();
        const ref = getUserAlbumRef(uid, albumId);
        const snapshot = await getDoc(ref);

        if (snapshot.exists()) {
            await deleteDoc(ref);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('albums-updated', {
                    detail: { albumId, isSaved: false }
                }));
            }
            return false;
        } else {
            const data = {
                id: albumId,
                albumId: albumId,
                name: album.name || album.title || 'Untitled Album',
                artist: album.artist || 'Various Artists',
                cover: album.cover || album.image || album.albumCover || '',
                tracksCount: Number(album.tracksCount) || (Array.isArray(album.tracks) ? album.tracks.length : 0),
                savedAt: serverTimestamp()
            };
            await setDoc(ref, data, { merge: true });
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('albums-updated', {
                    detail: { albumId, isSaved: true, album: data }
                }));
            }
            return true;
        }
    } catch (error) {
        console.error("Failed to toggle save album in library:", error);
        return false;
    }
};

export const isAlbumSavedInLibrary = async (albumId) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !albumId) return false;

    try {
        const cleanId = String(albumId).trim();
        const ref = getUserAlbumRef(uid, cleanId);
        const snapshot = await getDoc(ref);
        return snapshot.exists();
    } catch {
        return false;
    }
};

