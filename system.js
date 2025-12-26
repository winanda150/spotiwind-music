// ===================== DATA LAGU =====================
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

// Data lagu per artis dengan jumlah bervariasi
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

// Flatten songsByArtist into title-based object for compatibility
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
let currentSongIndex = 0;
let playedSongs = [];
let currentArtistSong = null;
let currentArtist = null;
let songEnded = false;

// ===================== FUNGSI UTILITAS =====================
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateSliderBackground() {
    const value = (kontrolLagu.value - kontrolLagu.min) / (kontrolLagu.max - kontrolLagu.min) * 100;
    kontrolLagu.style.background = `linear-gradient(90deg, rgb(212, 206, 206) ${value}%, rgb(80, 80, 80) ${value}%)`;
}

function Mobile() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 1025;
}

function toggleContent() {
    var desktop = document.getElementById('desktop-content');
    var mobile = document.getElementById('mobile-content');
    if (desktop && mobile) {
        if (Mobile()) {
            desktop.style.display = 'none';
            mobile.style.display = 'block';
        } else {
            desktop.style.display = 'block';
            mobile.style.display = 'none';
        }
    }
}

// ===================== FUNGSI NAVIGASI LAGU =====================
function playSong(songKey) {
    const songData = combinedPlaylist[songKey];
    if (!songData) return;

    // Reset songEnded when starting a new song
    songEnded = false;

    // Update current artist and song
    currentArtistSong = songKey;
    currentArtist = songData.artist;

    // Tambahkan lagu ke daftar lagu yang sudah dimainkan
    if (!playedSongs.includes(songKey)) {
        playedSongs.push(songKey);
        // Batasi maksimal 5 lagu terakhir untuk menghindari pengulangan
        if (playedSongs.length > 5) {
            playedSongs.shift();
        }
    }

    // Update UI
    document.getElementById('Title').textContent = songKey;
    document.getElementById('Lagu').textContent = songKey;
    document.getElementById('Artis').textContent = songData.artist;
    const gambarMusik = document.getElementById('GambarMusik');
    gambarMusik.innerHTML = '<img src="' + songData.image + '" alt="Album" class="player-img">';

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

    // Update play/pause icons
    const playIcon = document.querySelector('.play-song');
    const pauseIcon = document.querySelector('.pause-song');
    if (playIcon && pauseIcon) {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
    }

    // Force loading animation to show
    const loadingContainer = document.querySelector('.loading-container');
    if (loadingContainer) {
        loadingContainer.classList.add('loading');
    }

    // Set audio dan play
    audioPlayer.src = songData.audio;
    kontrolLagu.value = 0;
    updateSliderBackground();
    audioPlayer.currentTime = 0;
    audioPlayer.load();
    audioPlayer.play();

    // Update mini player
    updateMiniPlayer();
}

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

function nextSong() {
    const nextSongKey = getRandomSong();
    if (nextSongKey) {
        playSong(nextSongKey);
    }
}

function backSong() {
    const backSongKey = getRandomSong();
    if (backSongKey) {
        playSong(backSongKey);
    }
}

// ===================== SETUP AUDIO PLAYER =====================
const audioPlayer = document.getElementById('audioPlayer');
const kontrolLagu = document.getElementById('kontrolLagu');

// Event listener untuk kontrol lagu
if (kontrolLagu) {
    kontrolLagu.addEventListener('input', function() {
        const value = (this.value - this.min) / (kontrolLagu.max - kontrolLagu.min) * 100;
        this.style.background = `linear-gradient(90deg, rgb(212, 206, 206) ${value}%, rgb(80, 80, 80) ${value}%)`;
        if (audioPlayer && audioPlayer.duration) {
            audioPlayer.currentTime = (this.value / 100) * audioPlayer.duration;
        }
    });
}

// Event listener untuk memperbarui waktu saat ini dan durasi
audioPlayer.addEventListener('loadedmetadata', function() {
    kontrolLagu.value = 0;
    updateSliderBackground();
    audioPlayer.currentTime = 0;
    const durationTime = document.getElementById('durationTime');
    if (durationTime) {
        durationTime.textContent = formatTime(audioPlayer.duration);
    }
});

// Event listener untuk loading animation
audioPlayer.addEventListener('loadstart', function() {
    const loadingContainer = document.querySelector('.loading-container');
    if (loadingContainer) {
        loadingContainer.classList.add('loading');
    }
});

audioPlayer.addEventListener('canplay', function() {
    const loadingContainer = document.querySelector('.loading-container');
    if (loadingContainer) {
        setTimeout(() => {
            loadingContainer.classList.remove('loading');
        }, 500);
    }
});

audioPlayer.addEventListener('timeupdate', function() {
    const currentTime = document.getElementById('currentTime');
    if (currentTime) {
        currentTime.textContent = formatTime(audioPlayer.currentTime);
    }
    // Update slider value
    if (audioPlayer.duration) {
        kontrolLagu.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        updateSliderBackground();
    }
});

// Untuk bagian akhir lagu
audioPlayer.addEventListener('ended', function() {
    const playIcon = document.querySelector('.play-song');
    const pauseIcon = document.querySelector('.pause-song');
    const randomSong = document.querySelector('.random-song');
    const loopSong = document.querySelector('.loop-song');
    songEnded = true;

    // jika random song aktif
    if (randomSong && randomSong.classList.contains('active1')) {
        const randomSongKey = getRandomSong();
        if (randomSongKey) {
            playSong(randomSongKey);
        }
    // jika loop song aktif
    } else if (loopSong && loopSong.classList.contains('active1')) {
        kontrolLagu.value = 0;
        updateSliderBackground();
        audioPlayer.currentTime = 0;
        audioPlayer.play();
    // Jika tidak ada loop atau random aktif, putar lagu berikutnya
    } else {
        if (playIcon && pauseIcon) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        }
    }

    // Set play-song1 to none pada saat lagu berakhir pada bagian artis
    const playIcon1 = document.querySelector('.play-song1');
    const pauseIcon1 = document.querySelector('.pause-song1');
    if (playIcon1 && pauseIcon1) {
        playIcon1.style.display = 'none';
        pauseIcon1.style.display = 'block';
    }
});

// Fungsi untuk generate daftar lagu per artis
function generateSongList(artistName) {
    const artistSongs = songsByArtist[artistName];
    if (!artistSongs) return '<p>Tidak ada lagu untuk artis ini, tunggu update</p>';

    let songListHTML = '';
    artistSongs.forEach(song => {
        songListHTML += `
            <div class="song-item" data-song="${song.title}">
                <div class="song-kiri">
                    <img src="${song.image}" alt="${song.title}">
                    <p>${song.title}</p>
                </div>
                <div class="song-kanan">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                        <path stroke-linecap="round" stroke-linejoin="round"
                            d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                    </svg>
                </div>
            </div>
        `;
    });
    return songListHTML;
}

// Fungsi untuk update div Song-Artis saat artis diklik
function updateSongArtis(artistName) {
    currentArtist = artistName;
    const songArtisDiv = document.querySelector('.Song-Artis');
    const songListContainer = songArtisDiv.querySelector('.song-list') || document.createElement('div');
    songListContainer.className = 'song-list';
    songListContainer.innerHTML = generateSongList(artistName);
    songArtisDiv.appendChild(songListContainer);

    // Set play/pause icon berdasarkan status pemutaran
    const playIcon1 = document.querySelector('.play-song1');
    const pauseIcon1 = document.querySelector('.pause-song1');
    if (playIcon1 && pauseIcon1) {
        if (currentArtistSong && combinedPlaylist[currentArtistSong] && combinedPlaylist[currentArtistSong].artist === currentArtist && !audioPlayer.paused) {
            playIcon1.style.display = 'block';
            pauseIcon1.style.display = 'none';
        } else {
            playIcon1.style.display = 'none';
            pauseIcon1.style.display = 'block';
        }
    }

    // Tambah event listener untuk play button
    songListContainer.querySelectorAll('.song-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const songTitle = e.target.closest('.song-item').dataset.song;
            // tampilan pemutar lagu
            document.getElementById('playerOverlay').classList.add('active');
            // Set play icon di bagian artis
            const playIcon1 = document.querySelector('.play-song1');
            const pauseIcon1 = document.querySelector('.pause-song1');
            if (playIcon1 && pauseIcon1) {
                playIcon1.style.display = 'block';
                pauseIcon1.style.display = 'none';
            }
            playSong(songTitle);
        });
    });
}

// ===================== SETUP PLAY PAUSE ICON =====================
function setupPlayPauseToggle() {
    const playIcon = document.querySelector('.play-song');
    const pauseIcon = document.querySelector('.pause-song');

    if (playIcon && pauseIcon) {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';

        playIcon.addEventListener('click', () => {
            if (audioPlayer) {
                audioPlayer.pause();
            }
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        });

        pauseIcon.addEventListener('click', () => {
            if (audioPlayer) {
                audioPlayer.play();
            }
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        });
    }
}

// ===================== SETUP PLAY PAUSE ICON FOR ARTIST =====================
function setupPlayPauseToggleForArtist() {
    const playIcon1 = document.querySelector('.play-song1');
    const pauseIcon1 = document.querySelector('.pause-song1');

    if (playIcon1 && pauseIcon1) {
        playIcon1.style.display = 'none';
        pauseIcon1.style.display = 'block';

        playIcon1.addEventListener('click', () => {
            if (audioPlayer) {
                audioPlayer.pause();
            }
            playIcon1.style.display = 'none';
            pauseIcon1.style.display = 'block';
        });

        pauseIcon1.addEventListener('click', () => {
            if (songEnded == true) {
                // Jika lagu telah berakhir, putar ulang lagu secara random dari artis saat ini
                const artistSongs = songsByArtist[currentArtist];
                if (artistSongs && artistSongs.length > 0) {
                    const randomIndex = Math.floor(Math.random() * artistSongs.length);
                    const randomSong = artistSongs[randomIndex];
                    playSong(randomSong.title);
                }
                document.getElementById('playerOverlay').classList.add('active');
            } else if (currentArtistSong && combinedPlaylist[currentArtistSong] && combinedPlaylist[currentArtistSong].artist === currentArtist) {
                if (!audioPlayer.paused) {
                    // Pause lagu jika sedang diputar
                    audioPlayer.pause();
                } else {
                    // Play lagi lagu jika sedang dipause
                    audioPlayer.play();
                }
            } else {
                // Putar lagu random dari artis saat ini
                const artistSongs = songsByArtist[currentArtist];
                if (artistSongs && artistSongs.length > 0) {
                    const randomIndex = Math.floor(Math.random() * artistSongs.length);
                    const randomSong = artistSongs[randomIndex];
                    playSong(randomSong.title);
                }
                document.getElementById('playerOverlay').classList.add('active');
            }

            // Set play/pause icon berdasarkan status pemutaran
            if (currentArtistSong && combinedPlaylist[currentArtistSong] && combinedPlaylist[currentArtistSong].artist === currentArtist && !audioPlayer.paused) {
                playIcon1.style.display = 'block';
                pauseIcon1.style.display = 'none';
            } else {
                playIcon1.style.display = 'none';
                pauseIcon1.style.display = 'block';
            }
        });
    }
}

// ===================== BLOKIR KLIK KANAN DAN TOUCH =====================
function Blokir() {
    // Blokir klik kanan semua halaman khusus desktop
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    document.addEventListener('mousedown', function(e) {
        if (e.button === 2) { // Klik kanan
            e.preventDefault();
            return false;
        }
    });

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

// ===================== EVENT LISTENERS =====================
// Event navbar
document.querySelector('.menu-icon').addEventListener('click', function() {
    document.getElementById('menuOverlay').classList.add('active');
});

document.getElementById('closeMenu').addEventListener('click', function() {
    document.getElementById('menuOverlay').classList.remove('active');
});

document.querySelector('#closePlayer1 .navbar-container1 svg').addEventListener('click', function() {
    document.getElementById('playerOverlay').classList.remove('active');
});

document.querySelector('#closePlayer2 .Container-Artis .jarak2 svg').addEventListener('click', function() {
    document.getElementById('playerOverlay2').classList.remove('active');
});

document.querySelector('.like-icon').addEventListener('click', function() {
    this.classList.toggle('liked');
});

document.querySelectorAll('.random-song, .loop-song').forEach(function(elem) {
    elem.addEventListener('click', function() {
        this.classList.toggle('active1');
    });
});

// Event listeners untuk navigasi lagu
document.querySelector('.back-song').addEventListener('click', function() {
    backSong();
});

document.querySelector('.next-song').addEventListener('click', function() {
    nextSong();
});

// Event album
document.querySelectorAll('.album-list1 a').forEach(function(album) {
    album.addEventListener('click', function(e) {
        e.preventDefault();
        // Close artist player when opening album player
        document.getElementById('playerOverlay2').classList.remove('active');
        // reset current artist
        currentArtist = null;

        var judulElem = album.querySelector('p');
        var lagu = judulElem ? judulElem.textContent : '';

        // Use playSong function to handle playback and UI updates
        playSong(lagu);
        document.getElementById('playerOverlay').classList.add('active');
        // Hide mini player when full player is open
        document.getElementById('miniPlayer').style.display = 'none';
    });
});

document.querySelectorAll('.album-list2 a').forEach(function(album) {
    album.addEventListener('click', function(e) {
        e.preventDefault();
        var Images = album.querySelector('img');
        var musik = Images ? Images.src : '';
        var Random = document.getElementById('GambarMusik2');
        if (Random && musik) {
            Random.innerHTML = '<img src="' + musik + '" alt="Album" class="player-img2">';
        }
        var artisElem = album.querySelector('p');
        var artis = artisElem ? artisElem.textContent : '';
        var artis2 = document.getElementById('Artis2');
        if (artis2) {
            artis2.textContent = artis;
        }
        // Generate daftar lagu untuk artis
        updateSongArtis(artis);
        document.getElementById('playerOverlay2').classList.add('active');
    });
});

// ===================== NAVBAR ACTIVE ITEM =====================
document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
        });
    });
});

// ===================== MINI PLAYER LOGIC =====================
function updateMiniPlayer() {
    const miniPlayer = document.getElementById('miniPlayer');
    const miniGambarMusik = document.getElementById('miniGambarMusik');
    const miniLagu = document.getElementById('miniLagu');
    const miniArtis = document.getElementById('miniArtis');
    const miniPlay = document.querySelector('.mini-play-song');
    const miniPause = document.querySelector('.mini-pause-song');
    const mobileContent = document.getElementById('mobile-content');
    const songList = document.querySelector('.song-list');

    if (currentArtistSong && combinedPlaylist[currentArtistSong]) {
        const songData = combinedPlaylist[currentArtistSong];
        miniGambarMusik.innerHTML = '<img src="' + songData.image + '" alt="Mini Album" style="width: 100%; height: 100%; border-radius: 4px; object-fit: cover;">';
        miniLagu.textContent = currentArtistSong;
        miniArtis.textContent = songData.artist;
        miniPlayer.style.display = 'block';
        // tambah padding bottom untuk konten mobile agar tidak tertutup mini player
        mobileContent.style.paddingBottom = '60px';
        songList.style.paddingBottom = '60px';

        // Update play/pause icons
        if (audioPlayer.paused) {
            miniPlay.style.display = 'block';
            miniPause.style.display = 'none';
        } else {
            miniPlay.style.display = 'none';
            miniPause.style.display = 'block';
        }
    } else {
        miniPlayer.style.display = 'none';
    }
}

// Event listener untuk mini player
document.querySelector('.mini-player-content').addEventListener('click', function() {
    document.getElementById('playerOverlay').classList.add('active');
});

document.querySelector('.mini-play-song').addEventListener('click', function(e) {
    e.stopPropagation();
    if (audioPlayer) {
        audioPlayer.play();
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

// Update mini player on audio events
audioPlayer.addEventListener('play', updateMiniPlayer);
audioPlayer.addEventListener('pause', updateMiniPlayer);
audioPlayer.addEventListener('ended', updateMiniPlayer);

// ===================== INISIALISASI =====================
window.addEventListener('resize', function() {
    toggleContent();
    setupPlayPauseToggle();
    setupPlayPauseToggleForArtist();
    Blokir();
});

window.addEventListener('orientationchange', function() {
    toggleContent();
    setupPlayPauseToggle();
    setupPlayPauseToggleForArtist();
    Blokir();
});

document.addEventListener('DOMContentLoaded', function() {
    toggleContent();
    setupPlayPauseToggle();
    setupPlayPauseToggleForArtist();
    Blokir();
});