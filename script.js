import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-analytics.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    updateProfile,
    GoogleAuthProvider,
    FacebookAuthProvider,
    OAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Masukkan konfigurasi Firebase Anda di sini
const firebaseConfig = {
    apiKey: "AIzaSyDDs92wTS2xVQ0YR2z56veKcwTpzbg0c9s",
    authDomain: "spotiwind-music.firebaseapp.com",
    projectId: "spotiwind-music",
    storageBucket: "spotiwind-music.firebasestorage.app",
    messagingSenderId: "901871323181",
    appId: "1:901871323181:web:541d41d684c48eb7d450a4",
    measurementId: "G-XH4B1Y9X4V"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', () => {
    // Element Selectors
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const formTitle = document.querySelector('.title');
    const formSubtitle = document.querySelector('.subtitle');

    // Notification System
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

    // Auth Observer: Cek apakah user sudah login sebelumnya
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log("User terdeteksi:", user.email);
            // Redirect otomatis jika sudah login
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1000);
        }
    });

    // SVG Paths for Eye and Eye-Slash
    const eyePath = `<path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />`;
    const eyeSlashPath = `<path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />`;

    // Tab Switching Logic
    const switchTab = (activeBtn, inactiveBtn, showForm, hideForm, title, subtitle) => {
        activeBtn.classList.add('active');
        inactiveBtn.classList.remove('active');
        showForm.classList.remove('hidden');
        hideForm.classList.add('hidden');
        formTitle.textContent = title;
        formSubtitle.textContent = subtitle;
    };

    loginTab.addEventListener('click', () => {
        switchTab(loginTab, registerTab, loginForm, registerForm, 'Welcome Back 👋', 'Login to continue your music journey');
    });

    registerTab.addEventListener('click', () => {
        switchTab(registerTab, loginTab, registerForm, loginForm, 'Create Account ✨', 'Start your musical journey today');
    });

    // Helper: Firebase Error Mapping
    const getErrorMessage = (code) => {
        switch (code) {
            case 'auth/email-already-in-use': return 'Email sudah terdaftar.';
            case 'auth/invalid-email': return 'Format email tidak valid.';
            case 'auth/weak-password': return 'Password terlalu lemah (min 6 karakter).';
            case 'auth/user-not-found': case 'auth/wrong-password': case 'auth/invalid-credential':
                return 'Email atau password salah.';
            default: return 'Terjadi kesalahan. Coba lagi nanti.';
        }
    };

    // Generic Social Login Handler
    const handleSocialLogin = async (providerInstance, btn) => {
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = 'Connecting...';
        
        try {
            const result = await signInWithPopup(auth, providerInstance);
            const user = result.user;
            showToast(`Selamat datang, ${user.displayName || 'User'}!`);
            // Redirect ditangani secara otomatis oleh onAuthStateChanged
        } catch (error) {
            console.error("Social Auth Error:", error);
            if (error.code === 'auth/account-exists-with-different-credential') {
                showToast('Email ini sudah terdaftar dengan metode login lain.');
            } else if (error.code !== 'auth/popup-closed-by-user') {
                showToast('Gagal menghubungkan ke ' + btn.innerText.split('with ')[1]);
            }
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    };

    // Social Login Bindings
    document.getElementById('googleBtn').addEventListener('click', (e) => {
        handleSocialLogin(new GoogleAuthProvider(), e.currentTarget);
    });

    document.getElementById('facebookBtn').addEventListener('click', (e) => {
        handleSocialLogin(new FacebookAuthProvider(), e.currentTarget);
    });

    document.getElementById('appleBtn').addEventListener('click', (e) => {
        handleSocialLogin(new OAuthProvider('apple.com'), e.currentTarget);
    });

    // Forgot Password
    const forgotLink = document.getElementById('forgotPassword');
    forgotLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        if (!email) {
            showToast('Masukkan email untuk reset password.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email);
            showToast('Link reset telah dikirim ke email.');
        } catch (error) {
            showToast(getErrorMessage(error.code));
        }
    });

    // Password Visibility Toggle (Using Event Delegation)
    document.body.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.password-toggle');
        if (toggleBtn) {
            const input = toggleBtn.parentElement.querySelector('input');
            const icon = toggleBtn.querySelector('.eye-icon');
            const isPassword = input.type === 'password';
            
            input.type = isPassword ? 'text' : 'password';
            icon.innerHTML = isPassword ? eyeSlashPath : eyePath;
        }
    });

    // Form Handling
    const handleSubmission = (form, type) => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            if (type === 'register' && data.password !== data['confirm-password']) {
                showToast('Password tidak cocok!');
                return;
            }

            submitBtn.disabled = true;
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Processing...';

            try {
                // Handle Persistence (Remember Me)
                const persistence = data['remember-me'] ? browserLocalPersistence : browserSessionPersistence;
                await setPersistence(auth, persistence);

                if (type === 'register') {
                    const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
                    // Simpan nama lengkap ke profile Firebase
                    await updateProfile(userCredential.user, {
                        displayName: data.name
                    });
                    showToast('Registrasi Berhasil! Silakan login.');
                    loginTab.click(); // Pindah ke tab login
                } else {
                    await signInWithEmailAndPassword(auth, data.email, data.password);
                    showToast('Login Berhasil!');
                    window.location.href = 'home.html';
                }
            } catch (error) {
                showToast(getErrorMessage(error.code));
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    };

    handleSubmission(loginForm, 'login');
    handleSubmission(registerForm, 'register');
});