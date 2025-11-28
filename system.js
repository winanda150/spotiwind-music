// ===================== DATA LAGU TRENDING =====================
const LaguTrending = {
    "Sedia Aku Sebelum Hujan": { artist: "Idgitaf", audio: "Elemen/Lagu Idgitaf/Sedia Aku Sebelum Hujan.mp3" },
    "Jiwa Yang Bersedih": { artist: "Ghea Indrawari", audio: "Elemen/Lagu Idgitaf/Sedia Aku Sebelum Hujan.mp3" },
    "Kesempurnaan Cinta": { artist: "Rizky Febian", audio: "Elemen/Lagu Idgitaf/Sedia Aku Sebelum Hujan.mp3" },
    "Penantian Berharga": { artist: "Rizky Febian", audio: "Elemen/Lagu Idgitaf/Sedia Aku Sebelum Hujan.mp3" },
    "Jakarta Hari Ini": { artist: "For Revenge, Stereo Wall", audio: "Elemen/Lagu Idgitaf/Sedia Aku Sebelum Hujan.mp3" },
    "Kesepian": { artist: "Vierra", audio: "Elemen/Lagu Idgitaf/Sedia Aku Sebelum Hujan.mp3" },
    "Cukup Tau": { artist: "Rizky Febian", audio: "Elemen/Lagu Idgitaf/Sedia Aku Sebelum Hujan.mp3" }
};

const audioPlayer = document.getElementById('audioPlayer');

// ===================== DATA LAGU SANTAI =====================
const LaguSantai = {
    "Sedia Aku Sebelum Hujan": "Idgitaf",
    "Jiwa Yang Bersedih": "Ghea Indrawari",
    "Kesempurnaan Cinta": "Rizky Febian",
    "Penantian Berharga": "Rizky Febian",
    "Jakarta Hari Ini": "For Revenge, Stereo Wall",
    "Kesepian": "Vierra",
    "Cukup Tau": "Rizky Febian"
};

// ===================== EVENT NAVBAR =====================
document.querySelector('.menu-icon').addEventListener('click', function() {
    document.getElementById('menuOverlay').classList.add('active');
});

document.getElementById('closeMenu').addEventListener('click', function() {
    document.getElementById('menuOverlay').classList.remove('active');
});

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function updateSliderBackground() {
    const value = (kontrolLagu.value - kontrolLagu.min) / (kontrolLagu.max - kontrolLagu.min) * 100;
    kontrolLagu.style.background = `linear-gradient(90deg, rgb(212, 206, 206) ${value}%, rgb(80, 80, 80) ${value}%)`;
}

// Event listener untuk audio player
if (audioPlayer) {
    // Ketika metadata audio dimuat, set durasi
    audioPlayer.addEventListener('loadedmetadata', function() {
        document.getElementById('durationTime').textContent = formatTime(audioPlayer.duration);
        kontrolLagu.max = 100;
        kontrolLagu.value = 0;
        document.getElementById('currentTime').textContent = '0:00';
        updateSliderBackground();
    });

    // Update waktu saat lagu diputar
    audioPlayer.addEventListener('timeupdate', function() {
        document.getElementById('currentTime').textContent = formatTime(audioPlayer.currentTime);
        kontrolLagu.value = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        updateSliderBackground();
    });
}

// ===================== EVENT ALBUM =====================
document.querySelectorAll('.album-list1 a').forEach(function(album) {
    // Event klik album
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
            var artis = LaguTrending[lagu].artist || 'Artis tidak diketahui';
            artisElem.textContent = artis;
        }
        audioPlayer.src = LaguTrending[lagu].audio;
        audioPlayer.load();
        audioPlayer.play();
        document.getElementById('playerOverlay').classList.add('active');
    });
});

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

// ===================== BLOKIR KLIK KANAN MOBILE ALBUM =====================
function Blokirklikkanan() {
    // Blokir untuk elemen statis .mobile-album-section
    document.querySelectorAll('.mobile-album-section').forEach(function(elem) {
        elem.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        });
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
        container.addEventListener('contextmenu', function(e) {
        if (e.target.classList.contains('player-img')) {
            e.preventDefault();
        }
        });
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
}

// ===================== EVENT KONTROL LAGU =====================
const kontrolLagu = document.getElementById('kontrolLagu');

if (kontrolLagu) {
    kontrolLagu.addEventListener('input', function() {
        const value = (this.value - this.min) / (this.max - this.min) * 100;
        this.style.background = `linear-gradient(90deg, rgb(212, 206, 206) ${value}%, rgb(80, 80, 80) ${value}%)`;
        if (audioPlayer && audioPlayer.duration) {
            audioPlayer.currentTime = (this.value / 100) * audioPlayer.duration;
        }
    });
    kontrolLagu.dispatchEvent(new Event('input'));
}

// ===================== EVENT PLAYER OVERLAY =====================
document.querySelector('#closePlayer .navbar-container1 svg').addEventListener('click', function() {
    document.getElementById('playerOverlay').classList.remove('active');
});

// ===================== EVENT LIKE ICON =====================
document.querySelector('.like-icon').addEventListener('click', function() {
    this.classList.toggle('liked');
});

document.querySelectorAll('.random-song, .loop-song').forEach(function(elem) {
    elem.addEventListener('click', function() {
        this.classList.toggle('active1');
    });
});

// ===================== RESPONSIF =====================
window.addEventListener('resize', function() {
    toggleContent();
    setupPlayPauseToggle();
    Blokirklikkanan();
});

window.addEventListener('orientationchange', function() {
    toggleContent();
    setupPlayPauseToggle();
    Blokirklikkanan();
});

document.addEventListener('DOMContentLoaded', function() {
    toggleContent();
    setupPlayPauseToggle();
    Blokirklikkanan();
});

// ===================== FUNGSI UTILITAS =====================
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

// ===================== BLOKIR KLIK KANAN GLOBAL =====================
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});