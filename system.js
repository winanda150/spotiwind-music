// ===================== INISIALISASI =====================
document.addEventListener('DOMContentLoaded', function() {
    toggleContent();
});

// ===================== EVENT NAVBAR =====================
document.querySelector('.menu-icon').addEventListener('click', function() {
    document.getElementById('menuOverlay').classList.add('active');
});

document.getElementById('closeMenu').addEventListener('click', function() {
    document.getElementById('menuOverlay').classList.remove('active');
});

// ===================== EVENT ALBUM =====================
document.querySelectorAll('.album-list1 a').forEach(function(album) {
    // Event klik album
    album.addEventListener('click', function(e) {
        e.preventDefault();
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
            artisElem.textContent = 'Artis Populer'; // Default for songs
        }
        document.getElementById('playerOverlay').classList.add('active');
    });
});

// ===================== BLOKIR KLIK KANAN MOBILE ALBUM =====================
document.querySelectorAll('.mobile-album-section').forEach(function(mobileAlbum) {
    // Blokir klik kanan (desktop)
    mobileAlbum.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    // Blokir tekan lama (mobile)
    mobileAlbum.addEventListener('touchstart', function(e) {
        let touchTimer = setTimeout(function() {
            e.preventDefault();
        }, 600);
        mobileAlbum.addEventListener('touchend', function() {
            clearTimeout(touchTimer);
        }, { once: true });
    });
});

// ===================== EVENT KONTROL LAGU =====================
const kontrolLagu = document.getElementById('kontrolLagu');

if (kontrolLagu) {
    kontrolLagu.addEventListener('input', function() {
        const value = (this.value - this.min) / (this.max - this.min) * 100;
        this.style.background = `linear-gradient(90deg, rgb(212, 206, 206) ${value}%, rgb(80, 80, 80) ${value}%)`;
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

// ===================== RESPONSIF =====================
window.addEventListener('resize', function() {
    toggleContent();
});

window.addEventListener('orientationchange', function() {
    toggleContent();
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