// ===================== SYSTEM.JS =====================
// Website Music Player Web

// Project 3

// Spotiwind - Pemutar Musik Web
// Created By WinandaDev on 18 November 2025
// For Learning and Development Purposes Only
// =====================================================

// ===================== DATA LAGU =====================
// Koleksi lagu-lagu trending yang populer saat ini
// Setiap lagu berisi informasi artis, path file audio, dan path gambar album
const LaguTrending = {
    "Sedia Aku Sebelum Hujan": { artist: "Idgitaf", audio: "Elemen/Lagu Idgitaf/Sedia Aku Sebelum Hujan.mp3", image: "Elemen/Images Song/Sedia Aku Sebelum Hujan.jpg" },
    "Everything U Are": { artist: "Hindia", audio: "Elemen/Lagu Hindia/Everything U Are.mp3", image: "Elemen/Images Song/Everything U Are.jpg" },
    "Bergema Sampai Selamanya": { artist: "Nadhif Basalamah", audio: "Elemen/Lagu Nadhif Basalamah/Bergema Sampai Selamanya.mp3", image: "Elemen/Images Song/Bergema Sampai Selamanya.jpg" },
    "Alamak": { artist: "Rizky Febian & Adrian Khalif", audio: "Elemen/Lagu Rizky Febian/Alamak.mp3", image: "Elemen/Images Song/Alamak.jpg" },
    "Terbuang Dalam Waktu": { artist: "Barasuara", audio: "Elemen/Lagu Barasuara/Terbuang Dalam Waktu.mp3", image: "Elemen/Images Song/Terbuang Dalam Waktu.jpg" },
    "Tarot": { artist: ".Feast", audio: "Elemen/Lagu .Feast/Tarot.mp3", image: "Elemen/Images Song/Tarot.jpg" },
    "Kita Usahakan Lagi": { artist: "Batas Senja", audio: "Elemen/Lagu Batas Senja/Kita Usahakan Lagi.mp3", image: "Elemen/Images Song/Kita Usahakan Lagi.jpg" },
    "Iya Lagi": { artist: "Stevan Pasaribu", audio: "Elemen/Lagu Stevan Pasaribu/Iya Lagi.mp3", image: "Elemen/Images Song/Iya Lagi.jpg" },
    "Lantas": { artist: "Juicy Luicy", audio: "Elemen/Lagu Juicy Luicy/Lantas.mp3", image: "Elemen/Images Song/Lantas.jpg" },
    "Lesung Pipi": { artist: "Raim Laode", audio: "Elemen/Lagu Raim Laode/Lesung Pipi.mp3", image: "Elemen/Images Song/Lesung Pipi.jpg" }
};

const LaguFavoriteWindari = {
    "Niscaya": { artist: "Bilal Indrajaya", audio: "Elemen/Lagu Bilal Indrajaya/Niscaya.mp3", image: "Elemen/Images Song/Niscaya.jpg" },
    "Bila Kau Tak Disampingku": { artist: "Sheila On 7", audio: "Elemen/Lagu Sheila On 7/Bila Kau Tak Disampingku.mp3", image: "Elemen/Images Song/Bila Kau Tak Disampingku.jpg" },
    "Sialan": { artist: "Adrian Khalif & Juicy Luicy", audio: "Elemen/Lagu Juicy Luicy/Sialan.mp3", image: "Elemen/Images Song/Sialan.jpg" },
    "Untungnya, Hidup Harus Tetap Berjalan": { artist: "Bernadya", audio: "Elemen/Lagu Bernadya/Untungnya, Hidup Harus Tetap Berjalan.mp3", image: "Elemen/Images Song/Untungnya, Hidup Harus Tetap Berjalan.jpg" },
    "Love Me Again": { artist: "V", audio: "Elemen/Lagu V/Love Me Again.mp3", image: "Elemen/Images Song/Love Me Again.jpg" },
    "Lama - Lama": { artist: "Bernadya", audio: "Elemen/Lagu Bernadya/Lama - Lama.mp3", image: "Elemen/Images Song/Lama - Lama.jpg" },
    "Tally": { artist: "BLACKPINK", audio: "Elemen/Lagu BLACKPINK/Tally.mp3", image: "Elemen/Images Song/Tally.jpg" }
};

// Data gambar artis
const artistImages = {
    ".Feast": "Elemen/Images Artis/Feast.jpg",
    "Hindia": "Elemen/Images Artis/Hindia.jpg",
    "Raim Laode": "Elemen/Images Artis/Raim Laode.jpg",
    "Rizky Febian": "Elemen/Images Artis/Rizky Febian.jpg",
    "Vierra": "Elemen/Images Artis/Vierra.jpg",
    "Radiohead": "Elemen/Images Artis/Radiohead.jpg"
};

// Data lagu artis dengan jumlah bervariasi
const songsByArtist = {
    ".Feast": [
        { title: "Arteri", audio: "Elemen/Lagu .Feast/Arteri.mp3", image: "Elemen/Images Song/Arteri.jpg" },
        { title: "Dalam Hitungan", audio: "Elemen/Lagu .Feast/Dalam Hitungan.mp3", image: "Elemen/Images Song/Dalam Hitungan.jpg" },
        { title: "Tarot", audio: "Elemen/Lagu .Feast/Tarot.mp3", image: "Elemen/Images Song/Tarot.jpg" },
        { title: "Peradaban", audio: "Elemen/Lagu .Feast/Peradaban.mp3", image: "Elemen/Images Song/Peradaban.jpg" },
        { title: "Nina", audio: "Elemen/Lagu .Feast/Nina.mp3", image: "Elemen/Images Song/Nina.jpg" },
        { title: "Kelelawar", audio: "Elemen/Lagu .Feast/Kelelawar.mp3", image: "Elemen/Images Song/Kelelawar.jpg" },
        { title: "o,Tuan", audio: "Elemen/Lagu .Feast/o,Tuan.mp3", image: "Elemen/Images Song/o,Tuan.jpg" },
        { title: "Kami Belum Tentu", audio: "Elemen/Lagu .Feast/Kami Belum Tentu.mp3", image: "Elemen/Images Song/Kami Belum Tentu.jpg" },
    ],
    "Hindia": [
        { title: "Everything U Are", audio: "Elemen/Lagu Hindia/Everything U Are.mp3", image: "Elemen/Images Song/Everything U Are.jpg" },
        { title: "Cincin", audio: "Elemen/Lagu Hindia/Cincin.mp3", image: "Elemen/Images Song/Cincin.jpg" },
        { title: "Rumah Ke Rumah", audio: "Elemen/Lagu Hindia/Rumah Ke Rumah.mp3", image: "Elemen/Images Song/Rumah Ke Rumah.jpg" },
        { title: "Evaluasi", audio: "Elemen/Lagu Hindia/Evaluasi.mp3", image: "Elemen/Images Song/Evaluasi.jpg" },
        { title: "Kita Ke Sana", audio: "Elemen/Lagu Hindia/Kita Ke Sana.mp3", image: "Elemen/Images Song/Kita Ke Sana.jpg" },
        { title: "Secukupnya", audio: "Elemen/Lagu Hindia/Secukupnya.mp3", image: "Elemen/Images Song/Secukupnya.jpg" },
        { title: "Janji Palsu", audio: "Elemen/Lagu Hindia/Janji Palsu.mp3", image: "Elemen/Images Song/Kita Ke Sana.jpg" },
        { title: "Membasuh", audio: "Elemen/Lagu Hindia/Membasuh.mp3", image: "Elemen/Images Song/Membasuh.jpg" },
    ],
    "Raim Laode": [
        { title: "Pergilah Kasih", audio: "Elemen/Lagu Raim Laode/Pergilah Kasih.mp3", image: "Elemen/Images Song/Pergilah Kasih.jpg" },
        { title: "Lesung Pipi", audio: "Elemen/Lagu Raim Laode/Lesung Pipi.mp3", image: "Elemen/Images Song/Lesung Pipi.jpg" },
        { title: "Komang", audio: "Elemen/Lagu Raim Laode/Komang.mp3", image: "Elemen/Images Song/Komang.jpg" },
        { title: "Bersenja Gurau", audio: "Elemen/Lagu Raim Laode/Bersenja Gurau.mp3", image: "Elemen/Images Song/Bersenja Gurau.jpg" },
        { title: "Ekspektasi", audio: "Elemen/Lagu Raim Laode/Ekspektasi.mp3", image: "Elemen/Images Song/Ekspektasi.jpg" },
    ],
    "Rizky Febian": [
        { title: "Alamak", audio: "Elemen/Lagu Rizky Febian/Alamak.mp3", image: "Elemen/Images Song/Alamak.jpg" },
        { title: "Hingga Tua Bersama", audio: "Elemen/Lagu Rizky Febian/Hingga Tua Bersama.mp3", image: "Elemen/Images Song/Hingga Tua Bersama.jpg" },
        { title: "Malam Rawan", audio: "Elemen/Lagu Rizky Febian/Malam Rawan.mp3", image: "Elemen/Images Song/Malam Rawan.jpg" },
        { title: "Kesempurnaan Cinta", audio: "Elemen/Lagu Rizky Febian/Kesempurnaan Cinta.mp3", image: "Elemen/Images Song/Kesempurnaan Cinta.jpg" },
        { title: "Penantian Berharga", audio: "Elemen/Lagu Rizky Febian/Penantian Berharga.mp3", image: "Elemen/Images Song/Penantian Berharga.jpg" },
        { title: "Cukup Tau", audio: "Elemen/Lagu Rizky Febian/Cukup Tau.mp3", image: "Elemen/Images Song/Cukup Tau.jpg" },
    ],
    "Vierra": [
        { title: "Seandainya", audio: "Elemen/Lagu Vierra/Seandainya.mp3", image: "Elemen/Images Song/Seandainya.jpg" },
        { title: "Terlalu Lama", audio: "Elemen/Lagu Vierra/Terlalu Lama.mp3", image: "Elemen/Images Song/Terlalu Lama.jpg" },
        { title: "Rasa Ini", audio: "Elemen/Lagu Vierra/Rasa Ini.mp3", image: "Elemen/Images Song/Rasa Ini.jpg" },
        { title: "Kesepian", audio: "Elemen/Lagu Vierra/Kesepian.mp3", image: "Elemen/Images Song/Kesepian.jpg" },
        { title: "Bersamamu", audio: "Elemen/Lagu Vierra/Bersamamu.mp3", image: "Elemen/Images Song/Bersamamu.jpg" },
        { title: "Perih", audio: "Elemen/Lagu Vierra/Perih.mp3", image: "Elemen/Images Song/Perih.jpg" },
        { title: "Jadi Yang Kuinginkan", audio: "Elemen/Lagu Vierra/Jadi Yang Kuinginkan.mp3", image: "Elemen/Images Song/Jadi Yang Kuinginkan.jpg" },
        { title: "Dengarkan Curhatku", audio: "Elemen/Lagu Vierra/Dengarkan Curhatku.mp3", image: "Elemen/Images Song/Dengarkan Curhatku.jpg" },
    ],
    "Radiohead": [
        { title: "Creep", audio: "Elemen/Lagu Radiohead/Creep.mp3", image: "Elemen/Images Song/Creep.jpg" },
        { title: "Let Down", audio: "Elemen/Lagu Radiohead/Let Down.mp3", image: "Elemen/Images Song/Let Down.jpg" },
        { title: "No Surprises", audio: "Elemen/Lagu Radiohead/No Surprises.mp3", image: "Elemen/Images Song/No Surprises.jpg" },
        { title: "All I Need", audio: "Elemen/Lagu Radiohead/All I Need.mp3", image: "Elemen/Images Song/All I Need.jpg" },
        { title: "Karma Police", audio: "Elemen/Lagu Radiohead/Karma Police.mp3", image: "Elemen/Images Song/Karma Police.jpg" },
    ]
};

// Ratakan songsByArtist menjadi objek berbasis judul untuk kompatibilitas
const flattenedSongsByArtist = {};
for (const artist in songsByArtist) {
    songsByArtist[artist].forEach(song => {
        if (song.title) {
            flattenedSongsByArtist[song.title] = { artist: artist, audio: song.audio, image: song.image };
        }
    });
}

// ===================== PLAYLIST GABUNGAN =====================
const combinedPlaylist = { ...LaguTrending, ...LaguFavoriteWindari, ...flattenedSongsByArtist };
const playlistKeys = Object.keys(combinedPlaylist);
let playedSongs = [];
let playedSongsByArtist = {};
let songHistory = [];
let currentArtistSong = null;
let currentArtist = null;
let displayedArtist = null;
let songEnded = false;
let artistPlayPending = false;
let isPlaying = false;
let retryPlayOnCanplay = false;

// ===================== CACHE DOM ELEMENTS =====================
const miniPlayer = document.getElementById('miniPlayer');
const miniGambarMusik = document.getElementById('miniGambarMusik');
const miniLagu = document.getElementById('miniLagu');
const miniArtis = document.getElementById('miniArtis');
const miniPlay = document.querySelector('.mini-play-song');
const miniPause = document.querySelector('.mini-pause-song');
const mobileContent = document.getElementById('mobile-content');
const songList = document.querySelector('.song-list');
const playIcon = document.querySelector('.play-song');
const pauseIcon = document.querySelector('.pause-song');
const playIcon1 = document.querySelector('.play-song1');
const pauseIcon1 = document.querySelector('.pause-song1');
const loadingContainer = document.querySelector('.loading-container');
const randomSong = document.querySelector('.random-song');
const loopSong = document.querySelector('.loop-song');
const currentTime = document.getElementById('currentTime');
const durationTime = document.getElementById('durationTime');
const title = document.getElementById('Title');
const lagu = document.getElementById('Lagu');
const artis = document.getElementById('Artis');
const gambarMusik = document.getElementById('GambarMusik');
const gambarMusik2 = document.getElementById('GambarMusik2');
const artis2 = document.getElementById('Artis2');
const playerOverlay = document.getElementById('playerOverlay');
const playerOverlay2 = document.getElementById('playerOverlay2');
const menuOverlay = document.getElementById('menuOverlay');
const desktopContent = document.getElementById('desktop-content');
const mobileContentEl = document.getElementById('mobile-content');

// Flag untuk mencegah multiple event listener pada play/pause icons
let songArtisDiv = null;
let albumList1 = null;
let albumList2 = null;
let playIcon1Cached = null;
let pauseIcon1Cached = null;

// Fungsi untuk mendapatkan elemen yang di-cache
function getCachedElements() {
    if (!songArtisDiv) songArtisDiv = document.querySelector('.Song-Artis');
    if (!albumList1) albumList1 = document.querySelectorAll('.album-list1 a');
    if (!albumList2) albumList2 = document.querySelectorAll('.album-list2 a');
    if (!playIcon1Cached) playIcon1Cached = document.querySelector('.play-song1');
    if (!pauseIcon1Cached) pauseIcon1Cached = document.querySelector('.pause-song1');
    return { songArtisDiv, albumList1, albumList2, playIcon1Cached, pauseIcon1Cached };
}

// ===================== DEBOUNCE FUNCTION =====================
// Fungsi untuk menunda eksekusi fungsi hingga setelah waktu tunggu selesai
// Berguna untuk mengoptimalkan event handler yang sering dipanggil
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===================== FUNGSI UTILITAS =====================
// Mengubah detik menjadi format waktu MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Memperbarui tampilan background slider berdasarkan nilai saat ini
function updateSliderBackground() {
    const value = (kontrolLagu.value - kontrolLagu.min) / (kontrolLagu.max - kontrolLagu.min) * 100;
    kontrolLagu.style.background = `linear-gradient(90deg, rgb(212, 206, 206) ${value}%, rgb(80, 80, 80) ${value}%)`;
}

// Mengecek apakah perangkat saat ini adalah mobile menggunakan MediaQueryList
function Mobile() {
    const mobileQuery = window.matchMedia('(max-width: 1024px)');
    return mobileQuery.matches || /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Mengatur tampilan konten berdasarkan jenis perangkat (desktop/mobile)
function toggleContent() {
    const desktop = document.getElementById('desktop-content');
    const mobile = document.getElementById('mobile-content');
    if (desktop && mobile) {
        if (Mobile()) {
            desktop.remove();
            mobile.style.display = 'block';
        } else {
            mobile.remove();
            desktop.style.display = 'block';
        }
    }
}

// ===================== FUNGSI NAVIGASI LAGU =====================
// Memainkan lagu berdasarkan kunci lagu, dengan opsi untuk pemutaran artis
function playSong(songKey, isArtistPlay = false) {
    const songData = combinedPlaylist[songKey];
    if (!songData) return;

    // Reset songEnded saat memulai lagu baru
    songEnded = false;

    // Update artis dan lagu saat ini
    currentArtistSong = songKey;
    currentArtist = songData.artist;

    // Update highlight lagu artis untuk real-time highlight jika overlay artis aktif
    if (playerOverlay2.classList.contains('active')) {
        updateSongHighlight();
    }

    // Tambahkan lagu ke history untuk back navigation
    songHistory.push(songKey);
    if (songHistory.length > 10) {
        songHistory.shift(); // Batasi maksimal 10 lagu di history
    }

    // Tambahkan lagu ke daftar lagu yang sudah dimainkan
    if (!playedSongs.includes(songKey)) {
        playedSongs.push(songKey);
        // Batasi maksimal 5 lagu terakhir untuk menghindari pengulangan
        if (playedSongs.length > 5) {
            playedSongs.shift();
        }
    }

    // Tambahkan lagu ke daftar lagu yang sudah dimainkan per artis
    if (!playedSongsByArtist[currentArtist]) {
        playedSongsByArtist[currentArtist] = [];
    }
    if (!playedSongsByArtist[currentArtist].includes(songKey)) {
        playedSongsByArtist[currentArtist].push(songKey);
        // Batasi maksimal 5 lagu terakhir per artis untuk menghindari pengulangan
        if (playedSongsByArtist[currentArtist].length > 5) {
            playedSongsByArtist[currentArtist].shift();
        }
    }

// Perbarui UI
    title.textContent = songKey;
    lagu.textContent = songKey;
    artis.textContent = songData.artist;
    gambarMusik.innerHTML = '<img src="' + songData.image + '" alt="Album" class="player-img" loading="lazy" decoding="async" width="150" height="150" style="-webkit-user-drag: none; -moz-user-drag: none; -ms-user-drag: none;">';

    // Update Media Session untuk mobile
    if ('mediaSession' in navigator && songData) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: songKey,
            artist: songData.artist,
            artwork: [
                { src: songData.image, sizes: '16x16 32x32 48x48 64x64 128x128 256x256 512x512', type: 'image/jpg' }
            ]
        });
    }

    // Paksa animasi loading untuk ditampilkan
    if (loadingContainer) {
        loadingContainer.classList.add('loading');
    }

    // Set audio dan play
    audioPlayer.src = songData.audio;
    kontrolLagu.value = 0;
    updateSliderBackground();
    audioPlayer.currentTime = 0;
    audioPlayer.load();
    if (isArtistPlay) artistPlayPending = true;
    audioPlayer.play().then(() => {
        retryPlayOnCanplay = false;
        isPlaying = true;
        if (isArtistPlay) artistPlayPending = false;
        updatePlayPauseIcons();
        // Update highlight lagu artis untuk real-time highlight jika overlay artis aktif
        if (isArtistPlay && playerOverlay2.classList.contains('active')) {
            updateSongHighlight();
        }
    }).catch(error => {
        retryPlayOnCanplay = true;
        isPlaying = false;
        if (isArtistPlay) artistPlayPending = false;
        if (error.name !== 'AbortError') {
            console.error('Play error:', error);
        }
        updatePlayPauseIcons();
        // Pastikan ikon play untuk artis ditampilkan pada error
        if (playIcon1 && pauseIcon1) {
            playIcon1.style.display = 'block';
            pauseIcon1.style.display = 'none';
        }
    });

    // Perbarui mini player
    updateMiniPlayer();
}

// Mengambil lagu acak dari playlist yang belum dimainkan
function getRandomSong() {
    if (playlistKeys.length === 0) return null;

    // Jika semua lagu sudah dimainkan, reset daftar
    if (playedSongs.length >= playlistKeys.length) {
        playedSongs = [];
    }

    let availableSongs = playlistKeys.filter(song => !playedSongs.includes(song));

    // Jika tidak ada lagu yang tersedia, reset dan ambil semua
    if (availableSongs.length === 0) {
        playedSongs = [];
        availableSongs = [...playlistKeys];
    }

    const randomIndex = Math.floor(Math.random() * availableSongs.length);
    return availableSongs[randomIndex];
}

// Mengambil lagu acak dari artis yang belum dimainkan baru-baru ini
function getRandomArtistSong(artistName) {
    const artistSongs = songsByArtist[artistName];
    if (!artistSongs || artistSongs.length === 0) return null;

    // Jika semua lagu artis sudah dimainkan, reset daftar untuk artis ini
    if (playedSongsByArtist[artistName] && playedSongsByArtist[artistName].length >= artistSongs.length) {
        playedSongsByArtist[artistName] = [];
    }

    let availableSongs = artistSongs.filter(song => !playedSongsByArtist[artistName] || !playedSongsByArtist[artistName].includes(song.title));

    // Jika tidak ada lagu yang tersedia, reset dan ambil semua
    if (availableSongs.length === 0) {
        playedSongsByArtist[artistName] = [];
        availableSongs = [...artistSongs];
    }

    const randomIndex = Math.floor(Math.random() * availableSongs.length);
    return availableSongs[randomIndex].title;
}

// Memainkan lagu berikutnya secara acak
function nextSong() {
    const nextSongKey = getRandomSong();
    if (nextSongKey) {
        playSong(nextSongKey);
    }
}

// Memainkan lagu sebelumnya dari history atau lagu acak jika tidak ada history
function backSong() {
    if (songHistory.length > 1) {
        songHistory.pop(); // Hapus current song dari history
        const previousSong = songHistory[songHistory.length - 1]; // Ambil lagu sebelumnya
        if (previousSong) {
            playSong(previousSong);
        }
    } else {
        // Jika tidak ada history, putar lagu random
        const randomSongKey = getRandomSong();
        if (randomSongKey) {
            playSong(randomSongKey);
        }
    }
}

// ===================== SETUP AUDIO PLAYER =====================
// Inisialisasi elemen audio player dan kontrol slider
const audioPlayer = document.getElementById('audioPlayer');
const kontrolLagu = document.getElementById('kontrolLagu');

// Event listener untuk kontrol slider lagu - mengatur posisi pemutaran
if (kontrolLagu) {
    kontrolLagu.addEventListener('input', function() {
        const value = (this.value - this.min) / (kontrolLagu.max - kontrolLagu.min) * 100;
        this.style.background = `linear-gradient(90deg, rgb(212, 206, 206) ${value}%, rgb(80, 80, 80) ${value}%)`;
        if (audioPlayer && audioPlayer.duration) {
            audioPlayer.currentTime = (this.value / 100) * audioPlayer.duration;
        }
    });
}

// Event listener ketika metadata audio dimuat - inisialisasi durasi dan slider
audioPlayer.addEventListener('loadedmetadata', function() {
    kontrolLagu.value = 0;
    updateSliderBackground();
    audioPlayer.currentTime = 0;
    if (durationTime) {
        durationTime.textContent = formatTime(audioPlayer.duration);
    }
});

// Event listener untuk memulai animasi loading saat audio mulai dimuat
audioPlayer.addEventListener('loadstart', function() {
    if (loadingContainer) {
        loadingContainer.classList.add('loading');
    }
});

// Event listener untuk menghentikan animasi loading saat audio siap diputar
audioPlayer.addEventListener('canplay', function() {
    const loadingContainer = document.querySelector('.loading-container');
    if (loadingContainer) {
        setTimeout(() => {
            loadingContainer.classList.remove('loading');
        }, 500);
    }

    // Retry play if previously failed
    if (retryPlayOnCanplay) {
        retryPlayOnCanplay = false;
        audioPlayer.play().then(() => {
            isPlaying = true;
            updatePlayPauseIcons();
        }).catch(error => {
            isPlaying = false;
            if (error.name !== 'AbortError') {
                console.error('Retry play error:', error);
            }
            updatePlayPauseIcons();
            // Pastikan ikon play untuk artis ditampilkan pada error
            if (playIcon1 && pauseIcon1) {
                playIcon1.style.display = 'block';
                pauseIcon1.style.display = 'none';
            }
        });
    }
});

// Event listener untuk update waktu pemutaran dan posisi slider secara real-time
audioPlayer.addEventListener('timeupdate', function() {
    const currentTime = document.getElementById('currentTime');
    if (currentTime) {
        currentTime.textContent = formatTime(audioPlayer.currentTime);
    }
// Perbarui nilai slider
    if (audioPlayer.duration) {
        kontrolLagu.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        updateSliderBackground();
    }
});

// Event listener untuk menangani error pada audio player
audioPlayer.addEventListener('error', function() {
    isPlaying = false;
    updatePlayPauseIcons();
    updateMiniPlayer();
    // Pastikan ikon play untuk artis ditampilkan pada error
    if (playIcon1 && pauseIcon1) {
        playIcon1.style.display = 'block';
        pauseIcon1.style.display = 'none';
    }
    // Hentikan loading animation jika aktif
    if (loadingContainer) {
        loadingContainer.classList.remove('loading');
    }
});

// Event listener untuk menangani akhir pemutaran lagu - auto-play next atau loop
audioPlayer.addEventListener('ended', function() {
    const randomSong = document.querySelector('.random-song');
    const loopSong = document.querySelector('.loop-song');
    songEnded = true;

    // jika mode random aktif, putar lagu acak berikutnya
    if (randomSong && randomSong.classList.contains('active1')) {
        const randomSongKey = getRandomSong();
        if (randomSongKey) {
            playSong(randomSongKey);
        }
    // jika mode loop aktif, ulangi lagu yang sama
    } else if (loopSong && loopSong.classList.contains('active1')) {
        kontrolLagu.value = 0;
        updateSliderBackground();
        audioPlayer.currentTime = 0;
        audioPlayer.play().catch(error => {
            isPlaying = false;
            if (error.name !== 'AbortError') {
                console.error('Play error:', error);
            }
            updatePlayPauseIcons();
        });
    // Jika tidak ada mode khusus aktif, update ikon ke status pause
    } else {
        updatePlayPauseIcons();
    }
});

// Fungsi untuk generate daftar lagu artis
function generateSongList(artistName) {
    const artistSongs = songsByArtist[artistName];
    if (!artistSongs) return '<p>Tidak ada lagu untuk artis ini</p>';

    return artistSongs.map(song => {
        const isPlayingClass = (song.title === currentArtistSong && isPlaying) ? 'playing' : '';
        return `
        <div class="song-item" data-song="${song.title}">
            <div class="song-kiri">
                <img src="${song.image}" alt="${song.title}" loading="lazy" decoding="async" width="150" height="150" style="-webkit-user-drag: none; -moz-user-drag: none; -ms-user-drag: none;">
                <p class="${isPlayingClass}">${song.title}</p>
            </div>
            <div class="song-kanan">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                    viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                    <path stroke-linecap="round" stroke-linejoin="round"
                        d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                </svg>
            </div>
        </div>
    `}).join('');
}

// Fungsi untuk update highlight lagu yang sedang dimainkan tanpa regenerate list
function updateSongHighlight() {
    const { songArtisDiv } = getCachedElements();
    if (!songArtisDiv) return;

    const songItems = songArtisDiv.querySelectorAll('.song-item p');
    songItems.forEach(p => {
        const songTitle = p.closest('.song-item').dataset.song;
        // Highlight jika lagu sedang dimainkan dan dari artis yang ditampilkan
        if (songTitle === currentArtistSong && isPlaying && currentArtist === displayedArtist) {
            p.classList.add('playing');
        } else {
            p.classList.remove('playing');
        }
    });
}

// Fungsi untuk generate link artis
function generateArtistLink(artistName) {
    return window.location.origin + window.location.pathname + '#artist=' + encodeURIComponent(artistName);
}

// Fungsi untuk parse dan buka artis dari URL hash
function openArtistFromHash() {
    console.log('openArtistFromHash called, hash:', window.location.hash);
    if (window.location.hash) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const artist = params.get('artist');
        console.log('Artist from hash:', artist);
        if (artist && songsByArtist[artist]) {
            console.log('Artist found in songsByArtist, opening artist view');

            // Set gambar artis
            const artistImage = artistImages[artist];
            const gambarMusik2 = document.getElementById('GambarMusik2');
            if (gambarMusik2 && artistImage) {
                gambarMusik2.innerHTML = '<img src="' + artistImage + '" alt="Artist" class="player-img2" loading="lazy" decoding="async" width="150" height="150" style="-webkit-user-drag: none; -moz-user-drag: none; -ms-user-drag: none;">';
            }

            // Set nama artis
            const artis2 = document.getElementById('Artis2');
            if (artis2) {
                artis2.textContent = artist;
            }

            updateSongArtis(artist);
            document.getElementById('playerOverlay2').classList.add('active');
            updateOverlayPointerEvents();
        } else {
            console.log('Artist not found or invalid');
        }
    } else {
        console.log('No hash in URL');
    }
}

// Fungsi untuk update div Song-Artis saat artis diklik
function updateSongArtis(artistName) {
    currentArtist = artistName;
    const { songArtisDiv, playIcon1Cached, pauseIcon1Cached } = getCachedElements();

    if (!songArtisDiv) return;

    // Jika artis yang ditampilkan berbeda, regenerate list
    if (displayedArtist !== artistName) {
        displayedArtist = artistName;
        const songListContainer = songArtisDiv.querySelector('.song-list') || document.createElement('div');
        songListContainer.className = 'song-list';
        songListContainer.innerHTML = generateSongList(artistName);
        songArtisDiv.appendChild(songListContainer);

        // Tambah event listener untuk play button
        songListContainer.querySelectorAll('.song-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const songTitle = e.target.closest('.song-item').dataset.song;
                // tampilan pemutar lagu
                playerOverlay.classList.add('active');
                // Set play icon di bagian artis
                if (playIcon1Cached && pauseIcon1Cached) {
                    playIcon1Cached.style.display = 'block';
                    pauseIcon1Cached.style.display = 'none';
                }
                playSong(songTitle);
                // Update highlight saja, bukan regenerate list
                if (playerOverlay2.classList.contains('active')) {
                    updateSongHighlight();
                }
                updateOverlayPointerEvents();
            });
        });
    } else {
        // Jika artis sama, hanya update highlight
        updateSongHighlight();
    }

    // Set play/pause icon berdasarkan status pemutaran
    if (playIcon1Cached && pauseIcon1Cached) {
        if (currentArtistSong && combinedPlaylist[currentArtistSong] && combinedPlaylist[currentArtistSong].artist === currentArtist && !audioPlayer.paused) {
            playIcon1Cached.style.display = 'block';
            pauseIcon1Cached.style.display = 'none';
        } else {
            playIcon1Cached.style.display = 'none';
            pauseIcon1Cached.style.display = 'block';
        }
    }
}

function updatePlayPauseIcons() {
    // Pemutar utama
    if (playIcon && pauseIcon) {
        if (!isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    }
      // Pemutar artis - lewati jika pemutaran tertunda untuk mencegah kedipan ikon
    if (playIcon1 && pauseIcon1 && !artistPlayPending) {
        if (displayedArtist && currentArtistSong && combinedPlaylist[currentArtistSong] && combinedPlaylist[currentArtistSong].artist === displayedArtist && isPlaying) {
            playIcon1.style.display = 'block';
            pauseIcon1.style.display = 'none';
        } else {
            playIcon1.style.display = 'none';
            pauseIcon1.style.display = 'block';
        }
    }
}

// ===================== SETUP PLAY PAUSE ICON =====================
function setupPlayPauseToggle(playIcon, pauseIcon, isArtist = false) {
    if (!playIcon || !pauseIcon) return;

    // Set tampilan awal
    if (isArtist) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }

    playIcon.addEventListener('click', () => {
        if (audioPlayer) {
            audioPlayer.pause();
        }
        updatePlayPauseIcons();
    });

    pauseIcon.addEventListener('click', () => {
        try {
            if (isArtist) {
                if (songEnded) {
                    if (playIcon && pauseIcon) {
                        playIcon.style.display = 'block';
                        pauseIcon.style.display = 'none';
                    }
                    if (playIcon1 && pauseIcon1) {
                        playIcon1.style.display = 'block';
                        pauseIcon1.style.display = 'none';
                    }
                    // Jika lagu telah berakhir, putar ulang lagu secara random dari artis saat ini
                    const randomSongTitle = getRandomArtistSong(currentArtist);
                    if (randomSongTitle) {
                        playSong(randomSongTitle, true);
                    }
                    songEnded = false;
                    // Update highlight lagu artis untuk real-time highlight
                    if (playerOverlay2.classList.contains('active')) {
                        updateSongHighlight();
                    }
                } else if (currentArtistSong && combinedPlaylist[currentArtistSong] && combinedPlaylist[currentArtistSong].artist === currentArtist) {
                    if (audioPlayer && !audioPlayer.paused) {
                        audioPlayer.pause();
                        updatePlayPauseIcons();
                    } else {
                        // Set flag pending untuk mencegah kedipan ikon
                        artistPlayPending = true;
                        if (playIcon && pauseIcon) {
                            playIcon.style.display = 'block';
                            pauseIcon.style.display = 'none';
                        }
                        if (playIcon1 && pauseIcon1) {
                            playIcon1.style.display = 'block';
                            pauseIcon1.style.display = 'none';
                        }
                        if (audioPlayer) {
                            audioPlayer.play().then(() => {
                                artistPlayPending = false;
                            }).catch(error => {
                                artistPlayPending = false;
                                isPlaying = false;
                                if (error.name !== 'AbortError') {
                                    console.error('Play error:', error);
                                }
                                retryPlayOnCanplay = true; // Set untuk retry otomatis saat canplay
                                updatePlayPauseIcons();
                                // Pastikan ikon play untuk artis ditampilkan pada error
                                if (playIcon1 && pauseIcon1) {
                                    playIcon1.style.display = 'block';
                                    pauseIcon1.style.display = 'none';
                                }
                            });
                        }
                    }
                } else {
                    if (playIcon && pauseIcon) {
                        playIcon.style.display = 'block';
                        pauseIcon.style.display = 'none';
                    }
                    if (playIcon1 && pauseIcon1) {
                        playIcon1.style.display = 'block';
                        pauseIcon1.style.display = 'none';
                    }
                    // Putar lagu random dari artis saat ini
                    const randomSongTitle = getRandomArtistSong(currentArtist);
                    if (randomSongTitle) {
                        playSong(randomSongTitle, true);
                    }
                    if (playerOverlay) {
                        playerOverlay.classList.add('active');
                    }
                    // Update highlight lagu artis untuk real-time highlight
                    if (playerOverlay2.classList.contains('active')) {
                        updateSongHighlight();
                    }
                }
            } else {
                // Pemutar utama
                if (playIcon && pauseIcon) {
                    playIcon.style.display = 'block';
                    pauseIcon.style.display = 'none';
                }
                if (playIcon1 && pauseIcon1) {
                    playIcon1.style.display = 'block';
                    pauseIcon1.style.display = 'none';
                }
                if (audioPlayer) {
                    audioPlayer.play().catch(error => {
                        if (error.name !== 'AbortError') {
                            console.error('Play error:', error);
                        }
                        updatePlayPauseIcons();
                    });
                }
            }
        } catch (error) {
            console.error('Error dalam pauseIcon event listener:', error);
            // Reset UI state jika terjadi error
            updatePlayPauseIcons();
        }
    });
}

// ===================== EVENT LISTENERS =====================
// Event listeners untuk kontrol navigasi dan UI utama

// Event navbar - mengelola pembukaan dan penutupan menu navigasi
document.querySelector('.menu-icon').addEventListener('click', function() {
    document.getElementById('menuOverlay').classList.add('active');
    updateOverlayPointerEvents();
});

document.getElementById('closeMenu').addEventListener('click', function() {
    document.getElementById('menuOverlay').classList.remove('active');
    updateOverlayPointerEvents();
});

// Event listeners untuk menutup player utama dan artis player
document.querySelector('#closePlayer1 .navbar-container1 svg').addEventListener('click', function() {
    document.getElementById('playerOverlay').classList.remove('active');
    updateMiniPlayer();
    updateOverlayPointerEvents();
});

document.querySelector('#closePlayer2 .Container-Artis .jarak2 svg').addEventListener('click', function() {
    document.getElementById('playerOverlay2').classList.remove('active');
    updateMiniPlayer();
    updateOverlayPointerEvents();
});

// Event listener untuk toggle ikon like pada lagu
document.querySelector('.like-icon').addEventListener('click', function() {
    this.classList.toggle('liked');
});

// Event listeners untuk toggle mode random dan loop pada pemutaran lagu
document.querySelectorAll('.random-song, .loop-song').forEach(function(elem) {
    elem.addEventListener('click', function() {
        if (this.classList.contains('active1')) {
            // Jika sudah aktif, nonaktifkan
            this.classList.remove('active1');
        } else {
            // Hapus kelas active1 dari kedua tombol
            document.querySelector('.random-song').classList.remove('active1');
            document.querySelector('.loop-song').classList.remove('active1');
            // Tambah kelas active1 ke tombol yang diklik
            this.classList.add('active1');
        }
    });
});

// Event listeners untuk navigasi lagu - tombol back dan next
document.querySelector('.back-song').addEventListener('click', function() {
    backSong();
});

document.querySelector('.next-song').addEventListener('click', function() {
    nextSong();
});

// Event untuk album
getCachedElements();
albumList1.forEach(function(album) {
    album.addEventListener('click', function(e) {
        e.preventDefault();
        // reset artis saat ini
        currentArtist = null;

        const judulElem = album.querySelector('p');
        const lagu = judulElem ? judulElem.textContent : '';

        // Gunakan fungsi playSong untuk menangani pemutaran dan update UI
        playSong(lagu);
        document.getElementById('playerOverlay').classList.add('active');
        updateOverlayPointerEvents();
        // Sembunyikan mini player saat pemutar penuh terbuka
        document.getElementById('miniPlayer').style.display = 'none';
    });
});

albumList2.forEach(function(album) {
    album.addEventListener('click', function(e) {
        e.preventDefault();
        const Images = album.querySelector('img');
        const musik = Images ? Images.src : '';
        const Random = document.getElementById('GambarMusik2');
        if (Random && musik) {
            Random.innerHTML = '<img src="' + musik + '" alt="Album" class="player-img2" loading="lazy" decoding="async" width="150" height="150" style="-webkit-user-drag: none; -moz-user-drag: none; -ms-user-drag: none;">';
        }
        const artisElem = album.querySelector('p');
        const artis = artisElem ? artisElem.textContent : '';
        const artis2 = document.getElementById('Artis2');
        if (artis2) {
            artis2.textContent = artis;
        }
        // Generate daftar lagu untuk artis
        updateSongArtis(artis);
        document.getElementById('playerOverlay2').classList.add('active');
        updateOverlayPointerEvents();
    });
});

// Event listener untuk ikon link artis
document.addEventListener('click', function(e) {
    if (e.target.closest('.link')) {
        e.preventDefault();
        const artistLink = generateArtistLink(displayedArtist);
        navigator.clipboard.writeText(artistLink).then(() => {
            // Optional: Show feedback that link was copied
            console.log('Link artis berhasil disalin:', artistLink);
        }).catch(err => {
            console.error('Gagal menyalin link:', err);
        });
    }
});

// ===================== BLOKIR KLIK KANAN DAN TOUCH =====================
function Blokir() {
    // Blokir klik kanan semua halaman khusus desktop
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    // Blokir mousedown kanan semua halaman khusus desktop
    document.addEventListener('mousedown', function(e) {
        if (e.button === 2) { // Klik kanan
            e.preventDefault();
            return false;
        }
    });

    // Blokir tombol tertentu (Ctrl+U, Ctrl+S, Ctrl+A) semua halaman khusus desktop
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83 || e.keyCode === 65)) { // Ctrl+U, Ctrl+S, Ctrl+A
            e.preventDefault();
            return false;
        }
    });

    // Blokir teken lama semua halaman khusus mobile (hanya cegah multi-touch untuk tidak ganggu scroll normal)
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) { // Jika multi-touch, cegah
            e.preventDefault();
        }
    }, { passive: false });
}

// ===================== OVERLAY POINTER EVENTS MANAGEMENT =====================
function updateOverlayPointerEvents() {
    const overlays = [menuOverlay, playerOverlay, playerOverlay2];
    const isAnyOverlayActive = overlays.some(overlay => overlay.classList.contains('active'));
    if (isAnyOverlayActive && !playerOverlay2.classList.contains('active')) {
        document.body.classList.add('overlay-active');
    } else {
        document.body.classList.remove('overlay-active');
    }
}

// ===================== MINI PLAYER LOGIC =====================
// Fungsi untuk mengelola tampilan mini player di bagian bawah layar mobile
// Menampilkan informasi lagu saat ini dan kontrol play/pause saat player utama tidak aktif
function updateMiniPlayer() {

    // Sembunyikan mini player jika player utama aktif
    if (playerOverlay.classList.contains('active')) {
        miniPlayer.style.display = 'none';
        return;
    }

    // Tampilkan mini player dengan informasi lagu saat ini
    if (currentArtistSong && combinedPlaylist[currentArtistSong]) {
        const songData = combinedPlaylist[currentArtistSong];
        // Update gambar, judul lagu, dan nama artis
        miniGambarMusik.innerHTML = '<img src="' + songData.image + '" alt="Mini Album" loading="lazy" decoding="async" width="150" height="150" style="width: 100%; height: 100%; border-radius: 4px; object-fit: cover; -webkit-user-drag: none; -moz-user-drag: none; -ms-user-drag: none;">';
        miniLagu.textContent = currentArtistSong;
        miniArtis.textContent = songData.artist;
        miniPlayer.style.display = 'block';
        // Tambah padding bottom untuk konten mobile agar tidak tertutup mini player
        mobileContent.style.paddingBottom = '58px';
        songList.style.paddingBottom = '60px';

        // Update ikon play/pause berdasarkan status audio player
        if (audioPlayer.paused) {
            miniPlay.style.display = 'block';
            miniPause.style.display = 'none';
        } else {
            miniPlay.style.display = 'none';
            miniPause.style.display = 'block';
        }
    } else {
        // Sembunyikan mini player jika tidak ada lagu yang diputar
        miniPlayer.style.display = 'none';
    }
}

// Event listener untuk mini player
document.querySelector('.mini-player-content').addEventListener('click', function() {
    document.getElementById('playerOverlay').classList.add('active');
    updateOverlayPointerEvents();
});

document.querySelector('.mini-play-song').addEventListener('click', function(e) {
    e.stopPropagation();
    if (audioPlayer) {
        audioPlayer.play().catch(error => {
            if (error.name !== 'AbortError') {
                console.error('Play error:', error);
            }
        });
        updateMiniPlayer();
    }
});

document.querySelector('.mini-pause-song').addEventListener('click', function(e) {
    e.stopPropagation();
    if (audioPlayer) {
        audioPlayer.pause();
        updateMiniPlayer();
    }
});

// Update mini player pada event audio
audioPlayer.addEventListener('play', updateMiniPlayer);
audioPlayer.addEventListener('pause', updateMiniPlayer);
audioPlayer.addEventListener('ended', updateMiniPlayer);

// Update ikon play/pause pada event audio
audioPlayer.addEventListener('play', () => {
    isPlaying = true;
    updatePlayPauseIcons();
    // Update highlight lagu artis untuk real-time highlight
    if (playerOverlay2.classList.contains('active')) {
        updateSongHighlight();
    }
});

audioPlayer.addEventListener('pause', () => { isPlaying = false; updatePlayPauseIcons(); });
audioPlayer.addEventListener('ended', () => { isPlaying = false; });

// ===================== NAVBAR ACTIVE ITEM =====================
document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Hapus kelas aktif dari semua item
            navItems.forEach(nav => nav.classList.remove('active'));

            // Tambahkan kelas aktif ke item yang diklik
            this.classList.add('active');
        });
    });
});

// ===================== INISIALISASI =====================
// Inisialisasi saat jendela diubah ukurannya
window.addEventListener('resize', debounce(function() {
    setupPlayPauseToggle(playIcon, pauseIcon, false);
    setupPlayPauseToggle(playIcon1, pauseIcon1, true);
    updatePlayPauseIcons();
}, 250));

// Inisialisasi saat orientasi perangkat berubah ( portrait/landscape )
window.addEventListener('orientationchange', debounce(function() {
    setupPlayPauseToggle(playIcon, pauseIcon, false);
    setupPlayPauseToggle(playIcon1, pauseIcon1, true);
    updatePlayPauseIcons();
}, 250));

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
    toggleContent();
    setupPlayPauseToggle(playIcon, pauseIcon, false);
    setupPlayPauseToggle(playIcon1, pauseIcon1, true);
    Blokir();

    // Cache DOM elements terlebih dahulu
    getCachedElements();

    // Panggil openArtistFromHash setelah semua inisialisasi selesai
    setTimeout(() => {
        openArtistFromHash();
    }, 100);
});

// Event listener untuk perubahan hash (ketika user mengubah URL hash)
window.addEventListener('hashchange', function() {
    openArtistFromHash();
});

// Event listener untuk window load (memastikan semua resource dimuat)
window.addEventListener('load', function() {
    openArtistFromHash();
});