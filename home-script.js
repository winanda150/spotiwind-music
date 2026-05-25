import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { // NEW: Import untuk Realtime Database
    getDatabase,
    ref,
    onValue,
    set as rtdbSet, // Menggunakan alias untuk fungsi set RTDB
    onDisconnect,
    serverTimestamp as rtdbServerTimestamp // Menggunakan alias untuk serverTimestamp RTDB
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { 
    getFirestore, 
    collection, 
    query, 
    onSnapshot,
    orderBy,
    getDocs,
    where,
    doc,
    documentId,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDDs92wTS2xVQ0YR2z56veKcwTpzbg0c9s",
    authDomain: "spotiwind-music.firebaseapp.com",
    projectId: "spotiwind-music",
    storageBucket: "spotiwind-music.firebasestorage.app",
    messagingSenderId: "901871323181",
    appId: "1:901871323181:web:541d41d684c48eb7d450a4",
    databaseURL: "https://spotiwind-music-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const rtdb = getDatabase(app); // Inisialisasi Realtime Database
const db = getFirestore(app);

// Jamendo API Configuration (Free for developers)
const JAMENDO_CLIENT_ID = '17b8da78';
const JAMENDO_API_URL = 'https://api.jamendo.com/v3.0/tracks/';

// Audio Controller Global (Single Instance)
let activeAudio = new Audio();
let currentPlayingBtn = null;
let currentPlaylist = [];
let currentSongIndex = -1;
let isShuffle = false;
let isRepeat = false;
let isDragging = false;
let isDraggingVolume = false;

// NEW: Cache untuk status online teman dari Realtime Database
const friendOnlineStatus = {};

const PLAY_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
const PAUSE_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
const VOLUME_PATH = "M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07";
const MUTE_PATH = "M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6";

/**
 * Helper untuk format waktu detik ke MM:SS
 */
const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Event listener untuk memperbarui progress bar dan waktu secara real-time
activeAudio.addEventListener('timeupdate', () => {
    if (isDragging) return; // Jangan update UI jika sedang digeser manual
    
    const progressThumbs = document.querySelectorAll('.progress-thumb');
    const currentTimeEls = document.querySelectorAll('.time-info span:first-child, .curr-time');
    
    if (activeAudio.duration) {
        const percent = (activeAudio.currentTime / activeAudio.duration) * 100;
        progressThumbs.forEach(thumb => thumb.style.width = `${percent}%`);
        currentTimeEls.forEach(el => el.textContent = formatTime(activeAudio.currentTime));
    }
});

// Update total durasi saat metadata lagu dimuat
activeAudio.addEventListener('loadedmetadata', () => {
    const durationEls = document.querySelectorAll('.time-info span:last-child, .total-time');
    durationEls.forEach(el => el.textContent = formatTime(activeAudio.duration));
});

// Toggle class is-playing pada card untuk animasi CSS
activeAudio.addEventListener('play', () => {
    document.querySelector('.now-playing-card')?.classList.add('is-playing');
    document.querySelectorAll('.play-pause-btn').forEach(btn => btn.innerHTML = PAUSE_ICON);
});

activeAudio.addEventListener('pause', () => {
    document.querySelector('.now-playing-card')?.classList.remove('is-playing');
    document.querySelectorAll('.play-pause-btn').forEach(btn => btn.innerHTML = PLAY_ICON);
});

/**
 * Fungsi navigasi lagu (Next / Previous)
 */
window.playNext = () => {
    if (currentPlaylist.length === 0) return;
    
    let nextIndex;
    if (isShuffle && currentPlaylist.length > 1) {
        // Pilih indeks acak yang bukan lagu yang sekarang sedang diputar
        do {
            nextIndex = Math.floor(Math.random() * currentPlaylist.length);
        } while (nextIndex === currentSongIndex);
    } else {
        nextIndex = currentSongIndex + 1;
        if (nextIndex >= currentPlaylist.length) nextIndex = 0; // Kembali ke awal jika sudah di akhir
    }

    triggerSongByIndex(nextIndex);
};

window.playPrevious = () => {
    if (currentPlaylist.length === 0) return;
    let prevIndex = currentSongIndex - 1;
    if (prevIndex < 0) prevIndex = currentPlaylist.length - 1; // Ke akhir jika di awal
    triggerSongByIndex(prevIndex);
};

const triggerSongByIndex = (index) => {
    const song = currentPlaylist[index];
    if (!song) return;

    // Cari tombol di grid untuk sinkronisasi UI (jika ada)
    const songCard = document.querySelector(`.song-card[data-id="${song.id}"]`);
    const btn = songCard ? songCard.querySelector('.play-overlay') : null;

    window.playPreview(btn, song.audio, song.name, song.artist, song.cover);
};

/**
 * Fungsi untuk memperbarui aktivitas pengguna di Firestore
 */
const updateMyActivity = async (songName) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // Menggunakan setDoc dengan merge: true agar jika dokumen belum ada akan dibuat,
        // dan jika sudah ada hanya akan memperbarui field yang diberikan.
        await setDoc(doc(db, "friends_activity", user.uid), {
            name: user.displayName || user.email.split('@')[0],
            song: songName,
            avatar: user.photoURL || "",
            timestamp: serverTimestamp() // Menggunakan waktu server untuk konsistensi
        }, { merge: true });
    } catch (error) {
        console.error("Gagal memperbarui aktivitas ke Firestore:", error);
    }
};

/**
 * Fungsi untuk memutar/menghentikan audio
 */
window.playPreview = async (btn, audioUrl, title, artist, cover) => {
    if (!audioUrl) {
        showToast("Pratinjau lagu tidak tersedia.");
        return;
    }

    const allPlayPauseBtns = document.querySelectorAll('.play-pause-btn');

    // Update indeks lagu yang sedang diputar berdasarkan URL audio
    const foundIndex = currentPlaylist.findIndex(s => s.audio === audioUrl);
    if (foundIndex !== -1) {
        currentSongIndex = foundIndex;
    }

    // Helper untuk mereset UI tombol
    const resetBtnUI = (targetBtn) => {
        if (!targetBtn) return;
        targetBtn.innerHTML = PLAY_ICON;
        targetBtn.classList.remove('btn-loading');
        allPlayPauseBtns.forEach(b => b.classList.remove('btn-loading'));
    };

    // Jika mengklik tombol yang sama (logika pause/resume)
    if (btn && currentPlayingBtn === btn) {
        if (!activeAudio.paused) {
            activeAudio.pause();
            resetBtnUI(btn);
        } else {
            // Lanjutkan pemutaran (Resume) tanpa memuat ulang source (tidak mengulang dari awal)
            allPlayPauseBtns.forEach(b => b.classList.add('btn-loading'));
            try {
                await activeAudio.play();
                btn.innerHTML = PAUSE_ICON;
                btn.classList.remove('btn-loading');
                allPlayPauseBtns.forEach(b => b.classList.remove('btn-loading'));
            } catch (error) {
                if (error.name !== 'AbortError') console.error("Resume error:", error);
                allPlayPauseBtns.forEach(b => b.classList.remove('btn-loading'));
            }
        }
        return;
    }

    // Jika memutar lagu baru (berbeda dari sebelumnya), hentikan lagu lama
    if (currentPlayingBtn) {
        activeAudio.pause();
        resetBtnUI(currentPlayingBtn);
    }

    // Reset Progres Bar dan Waktu ke 0 sebelum lagu baru diputar
    const progressThumbs = document.querySelectorAll('.progress-thumb');
    const currentTimeEls = document.querySelectorAll('.time-info span:first-child, .curr-time');
    const durationEls = document.querySelectorAll('.time-info span:last-child, .total-time');
    
    progressThumbs.forEach(t => t.style.width = '0%');
    currentTimeEls.forEach(e => e.textContent = '0:00');
    durationEls.forEach(e => e.textContent = '0:00');

    // Set tombol aktif baru dan tambahkan class loading
    currentPlayingBtn = btn;
    if (btn) btn.classList.add('btn-loading'); 
    allPlayPauseBtns.forEach(b => b.classList.add('btn-loading'));

    activeAudio.onerror = null;
    activeAudio.onended = null;

    try {
        activeAudio.src = audioUrl;

        // Update Sidebar "Now Playing" di UI
        const nowPlayingCard = document.querySelector('.now-playing-card');
        if (nowPlayingCard) nowPlayingCard.classList.add('active');

        const sidebarTitle = document.querySelector('.now-playing-title');
        const sidebarArtist = document.querySelector('.now-playing-artist');
        const sidebarCover = document.querySelector('.now-playing-cover');
        
        if (sidebarTitle) sidebarTitle.textContent = title;
        if (sidebarArtist) sidebarArtist.textContent = artist;
        if (sidebarCover) {
            sidebarCover.style.backgroundImage = `url(${cover})`;
            sidebarCover.style.backgroundSize = 'cover';
            sidebarCover.style.backgroundPosition = 'center';
        }
        
        // Update Bottom Bar
        const bottomTitle = document.getElementById('bottomTrackName');
        const bottomArtist = document.getElementById('bottomTrackArtist');
        const bottomCover = document.getElementById('bottomTrackCover');
        if (bottomTitle) bottomTitle.textContent = title;
        if (bottomArtist) bottomArtist.textContent = artist;
        if (bottomCover) bottomCover.src = cover;

        // Munculkan Bottom Player Bar jika belum aktif
        const bottomBar = document.querySelector('.bottom-player-bar');
        if (bottomBar) bottomBar.classList.add('active');

        activeAudio.onerror = (e) => {
            console.error("Kesalahan pemutaran audio:", e);
            showToast("Gagal memutar audio. Coba lagu lain.");
            if (btn) resetBtnUI(btn);
            currentPlayingBtn = null;
        };

        await activeAudio.play();
        
        // OTOMATIS: Update aktivitas ke Firestore saat lagu mulai diputar
        updateMyActivity(title);

        if (btn) {
            btn.classList.remove('btn-loading');
            btn.innerHTML = PAUSE_ICON;
        }
        allPlayPauseBtns.forEach(b => b.classList.remove('btn-loading'));

    } catch (error) {
        // Abaikan error "AbortError" (interupsi play() oleh pause() atau ganti src)
        // agar tidak muncul sebagai pesan error di konsol.
        if (error.name === 'AbortError') return;

        console.error("Playback error:", error);
        showToast(error.message || "Gagal memuat lagu.");
        if (btn) resetBtnUI(btn);
        allPlayPauseBtns.forEach(b => b.classList.remove('btn-loading'));
        currentPlayingBtn = null;
    }

    // Event listener untuk saat audio selesai diputar
    activeAudio.onended = () => {
        if (btn) resetBtnUI(btn);
        currentPlayingBtn = null;
        if (isRepeat) {
            triggerSongByIndex(currentSongIndex); // Putar kembali lagu yang sama
        } else {
            playNext(); // Putar lagu berikutnya secara otomatis dari daftar
        }
    };
};

// Notification System (Konsisten dengan script.js)
const showToast = (message) => {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
};

// Debounce utility function
const debounce = (func, delay) => {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
};

/**
 * Menampilkan indikator loading di dalam grid lagu
 */
const showLoader = () => {
    const songGrid = document.querySelector('.song-grid');
    if (songGrid) {
        songGrid.innerHTML = `
            <div class="loader-container">
                <span class="loader"></span>
                <p>Mencari musik terbaik untukmu...</p>
            </div>
        `;
    }
};

// Helper function to format play counts (e.g., 1.2M, 500K, 300)
const formatPlayCount = (count) => {
    if (typeof count !== 'number' || isNaN(count)) {
        return '0'; // Default jika data tidak valid
    }
    if (count >= 1000000) {
        return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
        return (count / 1000).toFixed(1) + 'K';
    } else {
        return count.toString();
    }
};

/**
 * Fungsi untuk menampilkan daftar lagu ke UI secara otomatis
 */
const renderPopularSongs = (songs) => {
    const songGrid = document.querySelector('.song-grid');
    if (!songGrid) return;
    currentPlaylist = songs; // Simpan playlist aktif untuk keperluan navigasi
    songGrid.innerHTML = songs.map(song => `
        <div class="song-card" data-id="${song.id}">
            <div class="song-cover">
                <img src="${song.cover}" alt="${song.name}" style="width:100%; height:100%; object-fit:cover;">
                <button class="play-overlay" aria-label="Play ${song.name}" 
                    onclick="playPreview(this, '${song.audio}', '${song.name.replace(/'/g, "\\'")}', '${song.artist.replace(/'/g, "\\'")}', '${song.cover}')">
                    ${PLAY_ICON}
                </button>
            </div>
            <div class="song-info">
                <h3 class="song-name">${song.name}</h3>
                <p class="song-artist">${song.artist}</p>
            </div>
            <div class="song-footer">
                <div class="song-stats">
                    <button class="play-mini-btn" aria-label="Play ${song.name}" 
                        onclick="playPreview(this.closest('.song-card').querySelector('.play-overlay'), '${song.audio}', '${song.name.replace(/'/g, "\\'")}', '${song.artist.replace(/'/g, "\\'")}', '${song.cover}')">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </button>
                    <span class="play-count">${song.plays || '0'}</span>
                </div>
                <button class="more-btn" aria-label="More options">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
};

/**
 * Fungsi untuk mencari lagu dari Jamendo API
 */
const searchMusic = async (query) => {
    const songGrid = document.querySelector('.song-grid');
    if (!songGrid) return;
    if (!query.trim()) {
        fetchTrendingMusic(); // Jika query kosong, tampilkan lagu populer lagi
        return;
    }
    showLoader(); // Tampilkan loading sebelum fetch
    try {
        const url = `${JAMENDO_API_URL}?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=12&namesearch=${encodeURIComponent(query)}&include=stats`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json(); // Parse JSON here
        console.log("Jamendo Search API Data:", data); // Log the parsed data for debugging
        if (data.results && data.results.length > 0) {
            const songs = data.results.map(item => ({
                id: item.id,
                name: item.name,
                artist: item.artist_name,
                cover: item.image || 'https://via.placeholder.com/400', 
                audio: item.audio || '',
                plays: formatPlayCount(Math.floor(Math.random() * 5000000) + 1000)
            }));
            renderPopularSongs(songs);
        } else {
            songGrid.innerHTML = '<p style="width: 100%; text-align: center; color: var(--text-muted);">Tidak ada hasil ditemukan.</p>';
            showToast("Tidak ada hasil ditemukan.");
        }
    } catch (error) {
        console.error("Search Music Error:", error);
        showToast(`Gagal mencari musik: ${error.message}`);
    }
};

/**
 * Fungsi untuk menampilkan daftar artis ke UI
 */
const renderTopArtists = (artists) => {
    const artistsGrid = document.querySelector('.artists-grid');
    if (!artistsGrid) return;
    artistsGrid.innerHTML = artists.map(artist => ` 
        <div class="artist-card">
            <div class="artist-photo" style="background-image: url('${artist.photo}')"></div>
            <span class="artist-name">${artist.name}</span>
        </div>
    `).join('');
};

/**
 * Fungsi untuk mengambil data artis populer dari Jamendo
 */
const fetchTopArtists = async () => {
    try {
        // Kita ambil limit lebih banyak (50) agar bisa memfilter artis yang benar-benar punya foto asli
        const url = `https://api.jamendo.com/v3.0/artists/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=50&order=popularity_total`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Gagal menghubungi server Jamendo");
        const data = await response.json();
        
        if (data.results) {
            // Filter: Hanya ambil artis yang memiliki link gambar asli dari Jamendo
            const artistsWithPhotos = data.results
                .filter(item => item.image && item.image.trim() !== "")
                .slice(0, 10) // Ambil 10 teratas dari daftar yang sudah difilter
                .map(item => ({
                    id: item.id,
                    name: item.name,
                    photo: item.image
                }));
            
            renderTopArtists(artistsWithPhotos);
        }
    } catch (error) {
        console.error("Gagal mengambil data artis:", error);
        // Kita tidak perlu menampilkan toast error di sini agar tidak mengganggu pengalaman pengguna
        // jika hanya bagian artis yang gagal dimuat.
    }
};

/**
 * Fungsi untuk mengambil data lagu populer dari Jamendo
 */
const fetchTrendingMusic = async () => {
    const songGrid = document.querySelector('.song-grid');
    showLoader(); // Tampilkan loading sebelum fetch
    try {
        const url = `${JAMENDO_API_URL}?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=12&order=popularity_total&include=stats`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("Gagal menghubungi server Jamendo");
        const data = await response.json(); // Parse JSON here
        console.log("Jamendo Trending API Data:", data); // Log the parsed data for debugging
        
        const songs = data.results.map((item) => {
            return {
                id: item.id,
                name: item.name,
                artist: item.artist_name,
                cover: item.image,
                audio: item.audio,
                // Menggunakan angka acak antara 500.000 hingga 25.000.000 untuk lagu trending
                plays: formatPlayCount(Math.floor(Math.random() * 25000000) + 500000)
            };
        });
        renderPopularSongs(songs);
    } catch (error) {
        console.error("Gagal mengambil data musik:", error);
        if (songGrid) {
            songGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Gagal memuat lagu: ${error.message}</p>`;
        }
        showToast("Gagal memuat lagu populer.");
    }
};

// Placeholder untuk pengecekan status premium
// Dalam aplikasi nyata, ini akan mengambil data dari database (misalnya Firestore)
// untuk memeriksa status langganan pengguna berdasarkan UID mereka.
// Untuk demonstrasi, kita akan menggunakan logika sederhana.
const isUserPremium = async (uid) => {
    // Contoh placeholder: Anggap user premium jika UID-nya diakhiri dengan 'premium'
    // Atau Anda bisa mengembalikan 'true' secara langsung untuk pengujian.
    // Di aplikasi nyata:
    // const db = getFirestore(app); // Perlu import getFirestore dan doc
    // const userDoc = await getDoc(doc(db, "users", uid));
    // return userDoc.exists() && userDoc.data().isPremium === true;
    return uid && uid.endsWith('premium'); // Contoh logika placeholder
    // return true; // Untuk pengujian, selalu anggap premium
};

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    const greetingBadge = document.getElementById('greetingBadge');

    // Inject Equalizer Animation ke Now Playing Header
    const npHeader = document.querySelector('.now-playing-header');
    if (npHeader && !npHeader.querySelector('.equalizer')) {
        const originalText = npHeader.textContent.trim();
        npHeader.innerHTML = `
            <span>${originalText}</span>
            <div class="equalizer">
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
            </div>`;
    }

    /**
     * Memperbarui teks salam berdasarkan waktu lokal perangkat
     */
    const updateGreeting = () => {
        if (!greetingBadge) return;
        
        const hour = new Date().getHours();
        let greeting = "";
        let emoji = "";

        // Logika pembagian waktu: Pagi (4-10), Siang (10-15), Sore (15-18), Malam (18-04)
        if (hour >= 4 && hour < 10) {
            greeting = "Morning";
            emoji = "🌅";
        } else if (hour >= 10 && hour < 15) {
            greeting = "Afternoon";
            emoji = "☀️";
        } else if (hour >= 15 && hour < 18) {
            greeting = "Evening";
            emoji = "🌇";
        } else {
            greeting = "Night";
            emoji = "🌙";
        }

        // Tampilkan salam tanpa nama user (Contoh: Good Morning 🌅)
        greetingBadge.textContent = `Good ${greeting} ${emoji}`;
    };

    updateGreeting();

    // Inisialisasi pencarian dan trending music
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const debouncedSearch = debounce((query) => {
            if (query.trim() === '') {
                fetchTrendingMusic(); // Tampilkan trending jika search dikosongkan
            } else {
                searchMusic(query);
            }
        }, 500); // Debounce selama 500ms

        searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
    }
    fetchTrendingMusic(); // Jalankan fungsi ambil data otomatis dari internet
    fetchTopArtists(); // Jalankan fungsi ambil data artis otomatis

    // Listener untuk kontrol musik di sidebar
    document.querySelector('button[title="Next"]')?.addEventListener('click', playNext);
    document.querySelector('button[title="Previous"]')?.addEventListener('click', playPrevious);

    // Fungsi helper untuk sinkronisasi tombol Shuffle & Repeat
    const syncControlButtons = () => {
        document.querySelectorAll('button[title="Repeat"], #bottomRepeat').forEach(btn => {
            btn.classList.toggle('active', isRepeat);
        });
        document.querySelectorAll('button[title="Shuffle"], #bottomShuffle').forEach(btn => {
            btn.classList.toggle('active', isShuffle);
        });
    };

    // Listener untuk Repeat (Sidebar & Bottom)
    document.querySelectorAll('button[title="Repeat"], #bottomRepeat').forEach(btn => {
        btn.addEventListener('click', () => {
            isRepeat = !isRepeat;
            syncControlButtons();
            showToast(isRepeat ? "Repeat One On" : "Repeat Off");
        });
    });

    // Listener untuk Shuffle (Sidebar & Bottom)
    document.querySelectorAll('button[title="Shuffle"], #bottomShuffle').forEach(btn => {
        btn.addEventListener('click', () => {
            isShuffle = !isShuffle;
            syncControlButtons();
            showToast(isShuffle ? "Shuffle On" : "Shuffle Off");
        });
    });
    
    // Tombol Play/Pause (Sidebar & Bottom)
    const togglePlayPause = () => {
        if (currentPlayingBtn) {
            currentPlayingBtn.click();
        } else if (currentPlaylist.length > 0) {
            // Jika belum ada yang diputar, mulai dari lagu pertama di daftar
            triggerSongByIndex(0);
        }
    };

    document.querySelector('.play-pause-btn')?.addEventListener('click', togglePlayPause);
    document.getElementById('bottomMainPlayBtn')?.addEventListener('click', togglePlayPause);

    // Add Playlist Logic
    const addPlaylistBtn = document.querySelector('.add-playlist-btn');
    const playlistContainer = document.getElementById('playlistContainer');

    if (addPlaylistBtn && playlistContainer) {
        addPlaylistBtn.addEventListener('click', () => {
            const playlistName = prompt("Masukkan nama playlist baru:");
            if (playlistName && playlistName.trim() !== "") {
                const newPlaylistItem = document.createElement('a');
                newPlaylistItem.href = "#";
                newPlaylistItem.className = "nav-item";
                newPlaylistItem.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 18V5l12-2v13"></path>
                        <circle cx="6" cy="18" r="3"></circle>
                        <circle cx="18" cy="16" r="3"></circle>
                    </svg>
                    <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 0.5;">
                        <span style="font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${playlistName}</span>
                        <span style="font-size: 0.7rem; color: var(--text-muted);">0 songs</span>
                    </div>
                `;
                playlistContainer.appendChild(newPlaylistItem);
                showToast(`Playlist "${playlistName}" berhasil dibuat!`);
            }
        });
    }

    // Progress bar seeking (Seekbar) logic
    const progressTracks = document.querySelectorAll('.progress-track');
    let activeDraggingTrack = null;

    const seek = (e, track) => {
        if (!activeAudio.duration || activeAudio.duration === Infinity) return;
        const rect = track.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));

        // 1. Update UI secara instan (Visual Feedback)
        const progressThumbs = document.querySelectorAll('.progress-thumb');
        const currentTimeEls = document.querySelectorAll('.time-info span:first-child, .curr-time');
        
        progressThumbs.forEach(thumb => thumb.style.width = `${percentage * 100}%`);
        currentTimeEls.forEach(el => el.textContent = formatTime(percentage * activeAudio.duration));

        // 2. Update waktu audio sesungguhnya
        activeAudio.currentTime = percentage * activeAudio.duration;
    };

    const startDragging = (e) => {
        isDragging = true;
        activeDraggingTrack = e.currentTarget;
        document.body.classList.add('is-dragging-progress'); // Tambahkan class ke body untuk matikan transisi
        seek(e, activeDraggingTrack);
    };

    const moveDragging = (e) => {
        if (isDragging && activeDraggingTrack) {
            if (e.cancelable) e.preventDefault();
            seek(e, activeDraggingTrack);
        }
    };

    const stopDragging = () => {
        isDragging = false;
        activeDraggingTrack = null;
        document.body.classList.remove('is-dragging-progress');
    };

    progressTracks.forEach(track => {
        track.addEventListener('mousedown', startDragging);
        track.addEventListener('touchstart', startDragging, { passive: false });
    });

    window.addEventListener('mousemove', moveDragging);
    window.addEventListener('touchmove', moveDragging, { passive: false });
    window.addEventListener('mouseup', stopDragging);
    window.addEventListener('touchend', stopDragging);

    // Volume Control Logic
    const volumeSlider = document.querySelector('.volume-slider');
    const volumeLevel = document.querySelector('.volume-level');
    const volumeSvg = document.querySelector('.volume-control svg');
    
    let lastVolume = 0.7; // Simpan volume terakhir untuk fitur unmute
    
    // Inisialisasi volume awal (70% sesuai dengan style bawaan di HTML)
    activeAudio.volume = 0.7;

    const updateVolumeUI = (percentage) => {
        activeAudio.volume = percentage;
        if (volumeLevel) volumeLevel.style.width = `${percentage * 100}%`;

        // Update Volume Icon secara dinamis
        if (volumeSvg) {
            const volumePath = volumeSvg.querySelector('path');
            if (percentage === 0) {
                volumePath.setAttribute('d', MUTE_PATH);
            } else {
                volumePath.setAttribute('d', VOLUME_PATH);
            }
        }
    };

    const handleVolumeSeek = (e) => {
        if (!volumeSlider) return;
        const rect = volumeSlider.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        
        updateVolumeUI(percentage);
        if (percentage > 0) lastVolume = percentage;
    };

    // Fitur klik ikon untuk Mute/Unmute
    volumeSvg?.addEventListener('click', () => {
        if (activeAudio.volume > 0) {
            lastVolume = activeAudio.volume;
            updateVolumeUI(0);
        } else {
            updateVolumeUI(lastVolume || 0.7);
        }
    });

    volumeSlider?.addEventListener('mousedown', (e) => {
        isDraggingVolume = true;
        document.body.classList.add('is-dragging-volume');
        handleVolumeSeek(e);
    });

    volumeSlider?.addEventListener('touchstart', (e) => {
        isDraggingVolume = true;
        document.body.classList.add('is-dragging-volume');
        handleVolumeSeek(e);
    }, { passive: false });

    window.addEventListener('mousemove', (e) => {
        if (isDraggingVolume) handleVolumeSeek(e);
    });

    window.addEventListener('touchmove', (e) => {
        if (isDraggingVolume) {
            if (e.cancelable) e.preventDefault();
            handleVolumeSeek(e);
        }
    }, { passive: false });

    window.addEventListener('mouseup', () => {
        isDraggingVolume = false;
        document.body.classList.remove('is-dragging-volume');
    });

    window.addEventListener('touchend', () => {
        isDraggingVolume = false;
        document.body.classList.remove('is-dragging-volume');
    });

    /**
     * Helper untuk memformat timestamp Firestore ke waktu relatif (misal: 2m, 1h)
     */
    const formatRelativeTime = (timestamp) => {
        if (!timestamp) return "now";
        const now = new Date();
        const date = timestamp.toDate();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return "now";
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h`;
        return `${Math.floor(diffInHours / 24)}d`;
    };

    // NEW: Fungsi untuk mengatur status online/offline pengguna saat ini di Realtime Database
    const setupUserPresence = (user) => {
        if (!user) return;

        const userStatusRef = ref(rtdb, `presence/${user.uid}`);
        const isConnectedRef = ref(rtdb, '.info/connected');

        onValue(isConnectedRef, (snapshot) => {
            if (snapshot.val() === true) {
                // Set status online saat terhubung
                rtdbSet(userStatusRef, { // Menggunakan rtdbSet
                    state: 'online',
                    last_changed: rtdbServerTimestamp() // Menggunakan rtdbServerTimestamp
                });

                // Set onDisconnect untuk mengubah status menjadi offline saat terputus
                onDisconnect(userStatusRef).set({
                    state: 'offline',
                    last_changed: rtdbServerTimestamp() // Menggunakan rtdbServerTimestamp
                });
            } else {
                // Klien terputus dari RTDB, onDisconnect akan dipicu secara otomatis
                // Tidak perlu melakukan apa-apa di sini, onDisconnect sudah menangani.
            }
        });
    };

    // NEW: Fungsi untuk mendengarkan status online teman dari Realtime Database
    const listenToFriendPresence = (friendUid) => {
        const friendStatusRef = ref(rtdb, `presence/${friendUid}`);
        onValue(friendStatusRef, (snapshot) => {
            const data = snapshot.val();
            const isOnline = data?.state === 'online';

            friendOnlineStatus[friendUid] = isOnline;
            
            // Cari semua elemen status untuk user ini (antisipasi jika ada lebih dari satu tempat)
            const statusElements = document.querySelectorAll(`.friend-item[data-uid="${friendUid}"] .online-status`);
            statusElements.forEach(el => {
                if (isOnline) el.classList.remove('offline');
                else el.classList.add('offline');
            });
        });
    }

    /**
     * Fungsi untuk merender daftar aktivitas teman secara dinamis
     */
    const renderFriendActivity = async () => {
        const container = document.getElementById('friendActivityContainer');
        const seeAllLink = document.querySelector('.friend-activity-section .see-all-link');
        if (!container) return;

        // Sembunyikan link "See all" di awal
        if (seeAllLink) seeAllLink.classList.add('hidden');

        const currentUser = auth.currentUser;
        if (!currentUser) return;

        // 1. Ambil daftar UID orang yang di-follow
        // Asumsi struktur data: users/{myUid}/following/{friendUid}
        const followingRef = collection(db, "users", currentUser.uid, "following");
        const followingSnap = await getDocs(followingRef);
        const followingIds = followingSnap.docs.map(doc => doc.id);

        // Jika tidak mem-follow siapapun, tampilkan pesan kosong atau instruksi
        if (followingIds.length === 0) {
            container.innerHTML = `<p style="font-size: 0.75rem; color: var(--text-muted); padding: 1rem;">Follow friends to see their activity!</p>`;
            return;
        }

        // Munculkan link "See all" karena user sudah memiliki teman (following > 0)
        if (seeAllLink) seeAllLink.classList.remove('hidden');

        // 2. Query Firestore hanya untuk ID yang ada di followingIds
        // Batasan: Firestore 'in' query mendukung hingga 30 ID.
        const q = query(
            collection(db, "friends_activity"), 
            where(documentId(), "in", followingIds.slice(0, 30)),
            orderBy("timestamp", "desc")
        );

        // Mendengarkan perubahan data secara real-time
        onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                container.innerHTML = `<p style="font-size: 0.75rem; color: var(--text-muted); padding: 1rem;">No active friends right now.</p>`;
                return;
            }

            const docs = snapshot.docs;
            
            // Pastikan kita mendengarkan presence untuk ID yang benar-benar muncul di aktivitas
            docs.forEach(d => listenToFriendPresence(d.id));

            container.innerHTML = docs.map(doc => {
                const friend = doc.data();
                const onlineClass = friendOnlineStatus[doc.id] ? '' : 'offline'; // NEW: Ambil dari cache RTDB
                
                return `
                    <div class="friend-item" data-uid="${doc.id}">
                        <div class="avatar-container">
                            <img src="${friend.avatar || 'https://i.pravatar.cc/150'}" class="friend-avatar" alt="${friend.name}">
                            <span class="online-status ${onlineClass}"></span>
                        </div>
                        <div class="friend-info">
                            <div class="friend-header">
                                <span class="friend-name">${friend.name}</span>
                                <span class="friend-time">${formatRelativeTime(friend.timestamp)}</span>
                            </div>
                            <span class="friend-status">
                                Listening to <strong>${friend.song}</strong>
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
        });
    };

    // 1. Cek Status Login
    onAuthStateChanged(auth, async (user) => { // Tambahkan 'async' di sini
        if (user) {
            // Username display diganti menjadi ikon notifikasi di HTML
            console.log("Logged in as:", user.email);

            // Perbarui nama pengguna
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = user.displayName || user.email.split('@')[0];
            }

            // NEW: Setup presence untuk user yang sedang login
            setupUserPresence(user);

            // Jalankan render activity setelah user dipastikan login
            renderFriendActivity();

            // Periksa dan tampilkan status premium
            const premiumBadgeElement = document.getElementById('premiumBadge');
            if (premiumBadgeElement) {
                const premiumStatus = await isUserPremium(user.uid); // Tunggu hasil pengecekan premium
                if (premiumStatus) {
                    premiumBadgeElement.classList.remove('hidden');
                } else {
                    premiumBadgeElement.classList.add('hidden');
                }
            }

            // Perbarui foto profil (Avatar) dengan fallback default dan logika retry otomatis
            const avatarElement = document.getElementById('userAvatar');
            if (avatarElement) {
                const nameForAvatar = user.displayName || user.email.split('@')[0];
                const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=B91EC9&color=fff`;
                const originalPhotoURL = user.photoURL;
                
                let originalRetry = 0;
                const maxRetries = 2;

                // Gunakan no-referrer untuk menghindari blokir 403 dari provider seperti Google/Facebook
                avatarElement.referrerPolicy = "no-referrer";

                // Pasang event listener untuk mencoba memuat ulang jika gagal (retry logic)
                avatarElement.onerror = function() {
                    // Logika 1: Jika foto asli gagal, coba muat ulang dengan cache-buster sebelum menyerah
                    if (originalPhotoURL && this.src.includes(originalPhotoURL.split('?')[0]) && originalRetry < maxRetries) {
                        originalRetry++;
                        console.warn(`Gagal memuat foto asli, mencoba lagi (${originalRetry}/${maxRetries})...`);
                        setTimeout(() => {
                            const sep = originalPhotoURL.includes('?') ? '&' : '?';
                            // Tambahkan timestamp untuk memaksa browser mengambil data baru dari server
                            this.src = `${originalPhotoURL}${sep}t=${Date.now()}`;
                        }, 2000);
                    } 
                    // Logika 2: Jika foto asli tetap gagal setelah retry, baru gunakan default avatar
                    else if (this.src !== defaultAvatar && !this.src.includes('ui-avatars.com')) {
                        console.warn("Foto asli gagal dimuat permanen, beralih ke default...");
                        this.src = defaultAvatar;
                    } else {
                        // Jika default avatar pun gagal, hentikan agar tidak looping
                        this.onerror = null;
                    }
                };

                // Set sumber awal: Prioritaskan photoURL jika tersedia
                avatarElement.src = originalPhotoURL || defaultAvatar;
            }

        } else {
            // Jika tidak ada user, tendang balik ke index.html
            window.location.href = 'index.html';
            // Bersihkan info pengguna jika logout
            if (document.getElementById('userName')) document.getElementById('userName').textContent = '';
            if (document.getElementById('premiumBadge')) document.getElementById('premiumBadge').classList.add('hidden');
            if (document.getElementById('userAvatar')) document.getElementById('userAvatar').src = '';
            
            // Opsional: Set status offline secara manual di RTDB saat logout jika diinginkan
            // Namun onDisconnect biasanya sudah menangani ini dengan cukup baik.
        }
    });

    // 2. Fungsi Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                console.log("User signed out");
                // Setelah sign out, onAuthStateChanged akan otomatis mengalihkan ke index.html
            } catch (error) {
                console.error("Logout Error:", error);
                showToast("Gagal logout. Silakan coba lagi.");
            }
        });
    }
});