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
    ],
    "Raim Laode": [
        { title: "Lesung Pipi", audio: "Elemen/Lagu Raim Laode/Lesung Pipi.mp3", image: "Elemen/Images Song/Lesung Pipi.jpg" },
    ],
    "Rizky Febian": [
        { title: "Alamak", audio: "Elemen/Lagu Rizky Febian/Alamak.mp3", image: "Elemen/Images Song/Alamak.jpg" },
        { title: "Kesempurnaan Cinta", audio: "Elemen/Lagu Rizky Febian/Kesempurnaan Cinta.mp3", image: "Elemen/Images Song/Kesempurnaan Cinta.jpg" },
        { title: "Penantian Berharga", audio: "Elemen/Lagu Rizky Febian/Penantian Berharga.mp3", image: "Elemen/Images Song/Penantian Berharga.jpg" },
        { title: "Cukup Tau", audio: "Elemen/Lagu Rizky Febian/Cukup Tau.mp3", image: "Elemen/Images Song/Cukup Tau.jpg" },
    ],
    "Rex Orange County": [
        {}
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
let currentPlayerContext = null; // 'main' for album-list1, 'artist' for song-list

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
    const songArtisDiv = document.querySelector('.Song-Artis');
    const songListContainer = songArtisDiv.querySelector('.song-list') || document.createElement('div');
    songListContainer.className = 'song-list';
    songListContainer.innerHTML = generateSongList(artistName);
    songArtisDiv.appendChild(songListContainer);

    // Tambah event listener untuk play button
    songListContainer.querySelectorAll('.song-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const songTitle = e.target.closest('.song-item').dataset.song;
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
            if (audioPlayer) {
                audioPlayer.play();
            }
            playIcon1.style.display = 'block';
            pauseIcon1.style.display = 'none';
        });
    }
}

// ===================== BLOKIR KLIK KANAN DAN TOUCH =====================
function Blokir() {
    // Blokir untuk elemen statis .mobile-album-section
    document.querySelectorAll('.mobile-album-section').forEach(function(elem) {
        elem.addEventListener('touchstart', function(e) {
        let touchTimer = setTimeout(function() {
            e.preventDefault();
        }, 600);
        elem.addEventListener('touchend', function() {
            clearTimeout(touchTimer);
        }, { once: true });
        });
    });

    // Event delegation untuk gambar .player-img dinamis
    const container = document.getElementById('GambarMusik');
    if (container) {
        container.addEventListener('touchstart', function(e) {
        if (e.target.classList.contains('player-img')) {
            let touchTimer = setTimeout(function() {
            e.preventDefault();
            }, 600);
            container.addEventListener('touchend', function() {
            clearTimeout(touchTimer);
            }, { once: true });
        }
        });
    }

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
        const playIcon = document.querySelector('.play-song');
        const pauseIcon = document.querySelector('.pause-song');
        if (playIcon && pauseIcon) {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
        // Reset artist icons to paused state
        const playIcon1 = document.querySelector('.play-song1');
        const pauseIcon1 = document.querySelector('.pause-song1');
        if (playIcon1 && pauseIcon1) {
            playIcon1.style.display = 'none';
            pauseIcon1.style.display = 'block';
        }

        var judulElem = album.querySelector('p');
        var judul = judulElem ? judulElem.textContent : '';
        var playerTitle = document.getElementById('Title');
        if (playerTitle) {
            playerTitle.textContent = judul;
        }

        var Images = album.querySelector('img');
        var musik = Images ? Images.src : '';
        var Random = document.getElementById('GambarMusik');
        if (Random && musik) {
            Random.innerHTML = '<img src="' + musik + '" alt="Album" class="player-img">';
        }

        var judulElem1 = album.querySelector('p');
        var lagu = judulElem1 ? judulElem1.textContent : '';
        var playerTitle = document.getElementById('Lagu');
        if (playerTitle) {
            playerTitle.textContent = lagu;
        }

        var artisElem = document.getElementById('Artis');
        if (artisElem) {
            var songData = LaguTrending[lagu] || LaguFavoriteWindari[lagu];
            var artis = songData ? songData.artist : 'Artis tidak diketahui';
            artisElem.textContent = artis;
        }

        var songData = LaguTrending[lagu] || LaguFavoriteWindari[lagu];
        audioPlayer.src = songData ? songData.audio : '';

        // Set Media Session metadata untuk mobile ( ubah gambar )
        if ('mediaSession' in navigator && songData) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: lagu,
                artist: songData.artist,
                artwork: [
                    { src: songData.image, sizes: '16x16 32x32 48x48 64x64 128x128 256x256 512x512', type: 'image/jpg' }
                ]
            });
        }

        // Tambahkan lagu ke daftar lagu yang sudah dimainkan
        if (!playedSongs.includes(lagu)) {
            playedSongs.push(lagu);
            // Batasi maksimal 5 lagu terakhir untuk menghindari pengulangan
            if (playedSongs.length > 5) {
                playedSongs.shift();
            }
        }

        kontrolLagu.value = 0;
        updateSliderBackground();
        audioPlayer.currentTime = 0;
        audioPlayer.load();
        audioPlayer.play();
        document.getElementById('playerOverlay').classList.add('active');
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
