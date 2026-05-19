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