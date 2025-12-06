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
    "Tally": { artist: "BLACKPINK", audio: "Elemen/Lagu BLACKPINK/Tally.mp3", image: "Elemen/Images Song/Tally.jpg" },
    "Untungnya, Hidup Harus Tetap Berjalan": { artist: "Bernadya", audio: "Elemen/Lagu Bernadya/Untungnya, Hidup Harus Tetap Berjalan.mp3", image: "Elemen/Images Song/Untungnya, Hidup Harus Tetap Berjalan.jpg" },
    "Sialan": { artist: "Adrian Khalif & Juicy Luicy", audio: "Elemen/Lagu Juicy Luicy/Sialan.mp3", image: "Elemen/Images Song/Sialan.jpg" },
    "Bila Kau Tak Disampingku": { artist: "Sheila On 7", audio: "Elemen/Lagu Sheila On 7/Bila Kau Tak Disampingku.mp3", image: "Elemen/Images Song/Bila Kau Tak Disampingku.jpg" },
    "Love Me Again": { artist: "V", audio: "Elemen/Lagu V/Love Me Again.mp3", image: "Elemen/Images Song/Love Me Again.jpg" },
    "Lama - Lama": { artist: "Bernadya", audio: "Elemen/Lagu Bernadya/Lama - Lama.mp3", image: "Elemen/Images Song/Lama - Lama.jpg" },
    "Niscaya": { artist: "Bilal Indrajaya", audio: "Elemen/Lagu Bilal Indrajaya/Niscaya.mp3", image: "Elemen/Images Song/Niscaya.jpg" }
};

// ===================== PLAYLIST GABUNGAN =====================
const combinedPlaylist = { ...LaguTrending, ...LaguFavoriteWindari };
const playlistKeys = Object.keys(combinedPlaylist);

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
                { src: songData.image, sizes: '16x16 32x32 48x48 64x64 128x128 256x256 512x512', type: 'image/jpeg' }
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

    // Set audio dan play
    audioPlayer.src = songData.audio;
    kontrolLagu.value = 0;
    updateSliderBackground();
    audioPlayer.currentTime = 0;
    audioPlayer.load();
    audioPlayer.play();
}

function nextSong() {
    if (playlistKeys.length === 0) return;
    const randomIndex = Math.floor(Math.random() * playlistKeys.length);
    const nextSongKey = playlistKeys[randomIndex];
    playSong(nextSongKey);
}

function backSong() {
    if (playlistKeys.length === 0) return;
    const randomIndex = Math.floor(Math.random() * playlistKeys.length);
    currentSongIndex = randomIndex;
    const backSongKey = playlistKeys[currentSongIndex];
    playSong(backSongKey);
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

    // jika kedua loop song dan random song aktif
    if (loopSong && loopSong.classList.contains('active1') && randomSong && randomSong.classList.contains('active1')) {
        if (playIcon && pauseIcon) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        }
    // jika random song aktif
    } else if (randomSong && randomSong.classList.contains('active1')) {
        const allSongs = { ...LaguTrending, ...LaguFavoriteWindari };
        const songKeys = Object.keys(allSongs);
        const randomIndex = Math.floor(Math.random() * songKeys.length);
        const randomSongKey = songKeys[randomIndex];
        const songData = allSongs[randomSongKey];

        // Update UI
        document.getElementById('Title').textContent = randomSongKey;
        document.getElementById('Lagu').textContent = randomSongKey;
        document.getElementById('Artis').textContent = songData.artist;
        const gambarMusik = document.getElementById('GambarMusik');
        gambarMusik.innerHTML = '<img src="' + songData.image + '" alt="Album" class="player-img">';

        // Update Media Session untuk mobile
        if ('mediaSession' in navigator && songData) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: randomSongKey,
                artist: songData.artist,
                artwork: [
                    { src: songData.image, sizes: '16x16 32x32 48x48 64x64 128x128 256x256 512x512', type: 'image/jpeg' }
                ]
            });
        }

        // Set audio dan play
        audioPlayer.src = songData.audio;
        kontrolLagu.value = 0;
        updateSliderBackground();
        audioPlayer.currentTime = 0;
        audioPlayer.load();
        audioPlayer.play();
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

    $(document).on('contextmenu', function(e) {
        e.preventDefault();
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

document.querySelector('#closePlayer .navbar-container1 svg').addEventListener('click', function() {
    document.getElementById('playerOverlay').classList.remove('active');
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
                    { src: songData.image, sizes: '16x16 32x32 48x48 64x64 128x128 256x256 512x512', type: 'image/jpeg' }
                ]
            });
        }

        kontrolLagu.value = 0;
        updateSliderBackground();
        audioPlayer.currentTime = 0;
        audioPlayer.load();
        audioPlayer.play();
        document.getElementById('playerOverlay').classList.add('active');
    });
});

// ===================== INISIALISASI =====================
window.addEventListener('resize', function() {
    toggleContent();
    setupPlayPauseToggle();
    Blokir();
});

window.addEventListener('orientationchange', function() {
    toggleContent();
    setupPlayPauseToggle();
    Blokir();
});

document.addEventListener('DOMContentLoaded', function() {
    toggleContent();
    setupPlayPauseToggle();
    Blokir();
});