import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDDs92wTS2xVQ0YR2z56veKcwTpzbg0c9s",
    authDomain: "spotiwind-music.firebaseapp.com",
    projectId: "spotiwind-music",
    storageBucket: "spotiwind-music.firebasestorage.app",
    messagingSenderId: "901871323181",
    appId: "1:901871323181:web:541d41d684c48eb7d450a4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Jamendo API Configuration (Full tracks for education)
// GANTI '56d30c95' dengan Client ID baru dari developer.jamendo.com
const JAMENDO_CLIENT_ID = '17b8da78'; 

// Audio Controller Global (Single Instance)
let activeAudio = new Audio();
let currentPlayingBtn = null;

const PLAY_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
const PAUSE_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

/**
 * Fungsi untuk memutar/menghentikan pratinjau audio
 */
window.playPreview = async (btn, url) => {
    if (!url || url === 'undefined' || url === '') {
        showToast("Pratinjau lagu tidak tersedia.");
        return;
    }

    // Jika lagu yang sama diklik saat sedang diputar
    if (currentPlayingBtn === btn && !activeAudio.paused) {
        activeAudio.pause();
        btn.innerHTML = PLAY_ICON;
        return;
    }

    // Hentikan lagu lain yang sedang berputar
    if (currentPlayingBtn) {
        activeAudio.pause();
        currentPlayingBtn.innerHTML = PLAY_ICON;
    }

    // Set tombol aktif baru dan ubah ikon ke Pause
    currentPlayingBtn = btn;
    btn.innerHTML = PAUSE_ICON;

    try {
        activeAudio.src = url;
        activeAudio.load(); // Paksa browser memuat source baru
        await activeAudio.play();
    } catch (error) {
        console.error("Playback error:", error);
        showToast("Gagal memutar audio.");
        btn.innerHTML = PLAY_ICON;
        currentPlayingBtn = null;
    }

    activeAudio.onended = () => {
        btn.innerHTML = PLAY_ICON;
        currentPlayingBtn = null;
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

/**
 * Fungsi untuk menampilkan daftar lagu ke UI secara otomatis
 */
const renderPopularSongs = (songs) => {
    const songGrid = document.querySelector('.song-grid');
    if (!songGrid) return;

    songGrid.innerHTML = songs.map(song => `
        <div class="song-card" data-preview="${song.previewUrl || ''}">
            <div class="song-cover">
                <img src="${song.cover}" alt="${song.name}" style="width:100%; height:100%; object-fit:cover;">
                <button class="play-overlay" aria-label="Play ${song.name}" onclick="playPreview(this, '${song.previewUrl}')">
                    ${PLAY_ICON}
                </button>
            </div>
            <div class="song-info">
                <h3 class="song-name">${song.name}</h3>
                <p class="song-artist">${song.artist}</p>
            </div>
            <div class="song-footer">
                <div class="song-stats">
                    <button class="play-mini-btn" aria-label="Play ${song.name}" onclick="playPreview(this.closest('.song-card').querySelector('.play-overlay'), '${song.previewUrl || ''}')">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </button>
                    <span class="play-count">${song.plays}</span>
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
 * Fungsi untuk mencari lagu dari iTunes API
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
        // Menggunakan 'namesearch' alih-alih 'search' untuk akurasi judul yang lebih baik di Jamendo
        const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=20&namesearch=${encodeURIComponent(query)}&include=musicinfo&audioformat=mp32`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (data.results && data.results.length > 0 && data.headers.status === "success") {
            const songs = data.results.map(track => ({
                id: track.id,
                name: track.name,
                artist: track.artist_name,
                cover: track.image || 'https://via.placeholder.com/400', 
                link: track.shareurl,
                previewUrl: track.audio, // Di Jamendo, ini adalah URL lagu full
                plays: `${(Math.random() * 45 + 5).toFixed(1)}M`
            }));
            renderPopularSongs(songs);
        } else if (data.headers && data.headers.error_message) {
            // Menangkap pesan spesifik dari Jamendo (seperti "account not active")
            const apiError = data.headers.error_message;
            console.error("Jamendo API Error:", apiError);
            songGrid.innerHTML = `<p style="width: 100%; text-align: center; color: #ef4444;">API Error: ${apiError}</p>`;
            showToast(`Error: ${apiError}`);
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
 * Fungsi untuk mengambil data lagu populer dari Jamendo API
 */
const fetchTrendingMusic = async () => {
    const songGrid = document.querySelector('.song-grid');
    showLoader(); // Tampilkan loading sebelum fetch

    try {
        const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=12&order=popularity_total&audioformat=mp32`);
        if (!response.ok) throw new Error("Gagal menghubungi server musik");
        
        const data = await response.json();
        
        if (data.headers.status !== "success") {
            const msg = data.headers.error_message || "API Error";
            // Jika akun belum aktif, pesan "Your account isn't active" akan muncul di sini
            if (msg.includes("active") || msg.includes("approved")) {
                throw new Error("Akun API Jamendo belum aktif atau sedang ditinjau.");
            }
            throw new Error(msg);
        }
        if (!data.results || data.results.length === 0) throw new Error("Tidak ada lagu populer ditemukan");

        const songs = data.results.map((track) => {
            return {
                id: track.id,
                name: track.name,
                artist: track.artist_name,
                cover: track.image || 'https://via.placeholder.com/400', 
                link: track.shareurl, 
                previewUrl: track.audio, // Di Jamendo, ini adalah lagu full
                plays: `${(Math.random() * (100 - 20) + 20).toFixed(1)}M`
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

    // Fungsi untuk memperbarui indikator status online/offline
    const updateOnlineStatus = () => {
        const statusIndicator = document.querySelector('.online-status');
        if (statusIndicator) {
            if (navigator.onLine) {
                statusIndicator.classList.remove('offline');
            } else {
                statusIndicator.classList.add('offline');
            }
        }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

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

            // Perbarui foto profil (Avatar) dengan fallback default
            const avatarElement = document.getElementById('userAvatar');
            if (avatarElement) {
                // Jika user tidak memiliki foto, gunakan UI Avatars sebagai gambar default
                const nameForAvatar = user.displayName || user.email.split('@')[0];
                const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameForAvatar)}&background=B91EC9&color=fff`;
                avatarElement.src = user.photoURL || defaultAvatar;
            }

            // Jalankan pengecekan status awal setelah user login
            updateOnlineStatus();
        } else {
            // Jika tidak ada user, tendang balik ke index.html
            window.location.href = 'index.html';
            // Bersihkan info pengguna jika logout
            if (document.getElementById('userName')) document.getElementById('userName').textContent = '';
            if (document.getElementById('premiumBadge')) document.getElementById('premiumBadge').classList.add('hidden');
            if (document.getElementById('userAvatar')) document.getElementById('userAvatar').src = '';
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