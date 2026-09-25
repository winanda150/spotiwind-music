import { auth, onAuthStateChanged, signOut } from './firebase-config.js';
import { subscribeUserPlaylists, subscribeLikedSongs } from '../../services/libraryService.js';
import { subscribeUserProfile, getProfileByUid, generateUserCode, setUserPremiumStatus, formatListeningTime, updateProfileInfo } from '../../services/profileService.js';
import { subscribeUserFollowers, subscribeUserFollowing } from '../../services/userService.js';
import { audioEngine } from '../../core/audioEngine.js';

import { defaultAvatar, getHighResAvatarUrl, formatRupiah } from '../../utils/formatters.js';
import { showToast } from '../../utils/domUtils.js';
import { openAvatarPreviewModal, closeAvatarPreviewModal, initAvatarPreviewModal } from '../../components/modals/avatarPreviewModal.js';
import { openProSubscriptionModal, closeProSubscriptionModal } from '../../components/modals/proSubscriptionModal.js';

let unsubscribeAccountAuth = null;
let unsubscribePlaylists = null;
let unsubscribeLikedSongs = null;
let unsubscribeFollowers = null;
let unsubscribeFollowing = null;
let unsubscribeProfile = null;
let editProfileBtnHandler = null;
let shareProfileBtnHandler = null;
let managePlanBtnHandler = null;
let accountCodeClickHandler = null;
let avatarClickHandler = null;
let previewBackBtnHandler = null;
let previewEditBtnHandler = null;
let previewShareBtnHandler = null;
let keydownHandler = null;

// Settings & Developer card handlers
let sleepTimerHandler = null;
let unsubscribeAudioEngine = null;

let dataSaverToggleHandler = null;
let crossfadeToggleHandler = null;
let privateSessionToggleHandler = null;
let connectedDevicesHandler = null;
let clearCacheHandler = null;
let accountLogoutBtnHandler = null;

// Subscription Modal Handlers
let closeSubModalBtnHandler = null;
let closeManageModalBtnHandler = null;
let activateTrialBtnHandler = null;
let cancelSubBtnHandler = null;

let isModalGestureActive = false;
let planCardClickHandlers = [];
let subModalBackdropHandler = null;
let manageModalBackdropHandler = null;
let cleanupSubSheetDrag = null;
let cleanupManageSheetDrag = null;

let currentProfileData = null;
let selectedPlanData = {
    id: 'individual',
    name: 'Individual Monthly',
    price: 'Rp 29.000'
};

let previousActiveElement = null;

const openAvatarPreview = () => openAvatarPreviewModal({
    modalId: 'avatarPreviewModal',
    previewImgId: 'avatarPreviewImg',
    avatarSourceEl: document.getElementById('accountAvatar')
});

const closeAvatarPreview = () => closeAvatarPreviewModal('avatarPreviewModal');

// ==========================================================================
// Spotiwind PRO Modals (Subscription & Management)
// ==========================================================================

/**
 * Setup swipe-up (fullscreen) & swipe-down (collapse / dismiss) gesture for bottom sheet modal
 */
const setupBottomSheetDrag = (modalEl, onCloseCallback) => {
    if (!modalEl) return () => { };

    const sheet = modalEl.querySelector('.pro-modal-sheet');
    const handleBar = modalEl.querySelector('.pro-modal-handle-bar');
    const header = modalEl.querySelector('.pro-modal-header');
    const backdrop = modalEl.querySelector('.pro-modal-backdrop');

    if (!sheet) return () => { };

    let startX = 0;
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let isTouchOnHandleOrHeader = false;
    let startTime = 0;
    let initialSheetHeight = 0;
    let canExpandToFullscreen = false;
    let isListeningWindow = false;

    const resetDragStyles = () => {
        isDragging = false;
        sheet.classList.remove('is-dragging');
        sheet.style.transform = '';
        sheet.style.height = '';
        sheet.style.maxHeight = '';
        if (backdrop) {
            backdrop.style.opacity = '';
            backdrop.style.transition = '';
        }
        removeWindowListeners();
        setTimeout(() => { isModalGestureActive = false; }, 60);
    };

    const removeWindowListeners = () => {
        if (!isListeningWindow) return;
        isListeningWindow = false;
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
    };

    const onPointerMove = (e) => {
        if (e.pointerType === 'mouse' && e.buttons === 0) {
            onPointerUp(e);
            return;
        }

        const deltaX = e.clientX - startX;
        currentY = e.clientY;
        const deltaY = e.clientY - startY;

        if (Math.abs(deltaY) > 8) {
            isModalGestureActive = true;
        }

        const isFullscreen = sheet.classList.contains('is-fullscreen');

        // Ignore gesture if horizontal movement exceeds vertical threshold before drag starts
        if (!isDragging && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
            return;
        }

        // Upward pull (deltaY < 0)
        if (deltaY < -6) {
            if (isFullscreen) {
                const rubberBand = deltaY * 0.08;
                sheet.style.transform = `translateY(${rubberBand}px)`;
            } else if (canExpandToFullscreen && isTouchOnHandleOrHeader) {
                if (!isDragging) {
                    isDragging = true;
                    sheet.classList.add('is-dragging');
                }
                const pullDistance = Math.abs(deltaY);
                const targetHeight = Math.min(window.innerHeight, initialSheetHeight + pullDistance);
                sheet.style.transform = 'translateY(0)';
                sheet.style.maxHeight = '100dvh';
                sheet.style.height = `${targetHeight}px`;
                if (e.cancelable) e.preventDefault();
            }
        }
        // Downward pull (deltaY > 0)
        else if (deltaY > 0) {
            const sheetHeight = sheet.offsetHeight || 380;
            if (isTouchOnHandleOrHeader) {
                // Dragging from handle or header requires minimum 12px threshold to prevent accidental clicks
                if (deltaY > 12) {
                    if (!isDragging) {
                        isDragging = true;
                        sheet.classList.add('is-dragging');
                    }
                    sheet.style.height = '';
                    sheet.style.maxHeight = '';
                    sheet.style.transform = `translateY(${deltaY}px)`;
                    if (backdrop && !isFullscreen) {
                        const opacity = Math.max(0, 1 - (deltaY / (sheetHeight * 0.95)));
                        backdrop.style.opacity = String(opacity);
                    }
                    if (e.cancelable) e.preventDefault();
                }
            } else if (sheet.scrollTop <= 0 && deltaY > 28) {
                // Dragging content area when scrolled to the top requires intentional threshold
                if (!isDragging) {
                    isDragging = true;
                    sheet.classList.add('is-dragging');
                }
                sheet.style.height = '';
                sheet.style.maxHeight = '';
                sheet.style.transform = `translateY(${deltaY - 28}px)`;
                if (backdrop && !isFullscreen) {
                    const opacity = Math.max(0, 1 - ((deltaY - 28) / (sheetHeight * 0.95)));
                    backdrop.style.opacity = String(opacity);
                }
                if (e.cancelable) e.preventDefault();
            }
        }
    };

    const onPointerUp = (e) => {
        removeWindowListeners();

        const deltaY = (e ? e.clientY : currentY) - startY;
        const deltaTime = Math.max(1, Date.now() - startTime);
        const velocityY = deltaY / deltaTime;
        const isFullscreen = sheet.classList.contains('is-fullscreen');

        if (!isDragging && Math.abs(deltaY) < 12) {
            resetDragStyles();
            return;
        }

        isDragging = false;
        sheet.classList.remove('is-dragging');
        sheet.style.transform = '';
        sheet.style.height = '';
        sheet.style.maxHeight = '';

        // Upward threshold: expand to fullscreen if content is scrollable and initiated from header
        if (deltaY < -45 || velocityY < -0.35) {
            if (!isFullscreen && canExpandToFullscreen && isTouchOnHandleOrHeader) {
                sheet.classList.add('is-fullscreen');
                if (backdrop) backdrop.style.opacity = '1';
                setTimeout(() => { isModalGestureActive = false; }, 60);
                return;
            }
        }

        // Downward threshold: collapse fullscreen or dismiss sheet
        const dismissThreshold = isFullscreen ? 140 : 100;
        if (deltaY > dismissThreshold || velocityY > 0.42) {
            if (isFullscreen && isTouchOnHandleOrHeader && deltaY < 240 && velocityY < 0.8) {
                sheet.classList.remove('is-fullscreen');
                if (backdrop) backdrop.style.opacity = '';
                setTimeout(() => { isModalGestureActive = false; }, 60);
                return;
            }

            // Close sheet animation
            sheet.style.transition = 'transform 0.24s cubic-bezier(0.32, 1, 0.23, 1)';
            sheet.style.transform = 'translateY(100%)';
            if (backdrop) {
                backdrop.style.transition = 'opacity 0.2s ease';
                backdrop.style.opacity = '0';
            }
            setTimeout(() => {
                resetDragStyles();
                if (typeof onCloseCallback === 'function') {
                    onCloseCallback();
                }
            }, 240);
            return;
        }

        // Snap back to default resting position
        sheet.style.transition = 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), height 0.22s ease';
        sheet.style.transform = 'translateY(0)';
        if (backdrop) {
            backdrop.style.transition = 'opacity 0.2s ease';
            backdrop.style.opacity = '';
        }
        setTimeout(() => {
            sheet.style.transition = '';
            isModalGestureActive = false;
        }, 220);
    };

    const onPointerCancel = () => {
        resetDragStyles();
    };

    const onPointerDown = (e) => {
        if (e.target.closest('button') || e.target.closest('.pro-plan-card')) {
            return;
        }

        startX = e.clientX;
        startY = e.clientY;
        currentY = e.clientY;
        startTime = Date.now();
        initialSheetHeight = sheet.offsetHeight;
        isTouchOnHandleOrHeader = Boolean(e.target.closest('.pro-modal-handle-bar') || e.target.closest('.pro-modal-header'));
        canExpandToFullscreen = sheet.scrollHeight > window.innerHeight * 0.75;

        if (isTouchOnHandleOrHeader || sheet.scrollTop <= 0) {
            if (!isListeningWindow) {
                isListeningWindow = true;
                window.addEventListener('pointermove', onPointerMove, { passive: false });
                window.addEventListener('pointerup', onPointerUp);
                window.addEventListener('pointercancel', onPointerCancel);
            }
        }
    };

    sheet.addEventListener('pointerdown', onPointerDown);

    return () => {
        sheet.removeEventListener('pointerdown', onPointerDown);
        removeWindowListeners();
    };
};

const openSubscriptionModal = () => openProSubscriptionModal({
    modalId: 'proSubscriptionModal',
    onSelectPlan: (plan) => {
        selectedPlanData = plan;
    },
    onActivateTrial: async (plan) => {
        const user = auth.currentUser;
        if (!user) {
            if (typeof window.navigateToAuthPage === 'function') {
                window.navigateToAuthPage('login');
            } else {
                showToast('Silakan login terlebih dahulu');
            }
            return;
        }

        const subscribeBtn = document.getElementById('activateProTrialBtn');
        if (subscribeBtn) {
            subscribeBtn.disabled = true;
            subscribeBtn.innerHTML = `
                <span class="btn-spinner" style="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.6s linear infinite;margin-right:6px;vertical-align:middle;"></span>
                <span>Mengaktifkan...</span>
            `;
        }

        try {
            await setUserPremiumStatus(user.uid, true);
            closeSubscriptionModal();
            showToast(`Selamat! Paket ${plan.name} aktif. Nikmati fitur PRO! 🎉`);
        } catch (err) {
            console.error("Failed to activate PRO trial:", err);
            showToast('Gagal mengaktifkan paket PRO');
        } finally {
            if (subscribeBtn) {
                subscribeBtn.disabled = false;
                subscribeBtn.innerHTML = `
                    <span>Mulai Uji Coba Gratis 7 Hari</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                `;
            }
        }
    }
});

const closeSubscriptionModal = () => closeProSubscriptionModal('proSubscriptionModal');

const openManageModal = () => {
    const modal = document.getElementById('proManageModal');
    if (!modal) return;

    previousActiveElement = document.activeElement;
    modal.classList.remove('hidden');
    modal.removeAttribute('inert');
    void modal.offsetWidth;
    modal.classList.add('is-active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pro-modal-open');
    document.body.style.overflow = 'hidden';

    const sheet = modal.querySelector('.pro-modal-sheet');
    if (sheet) {
        sheet.classList.remove('is-fullscreen');
        sheet.scrollTop = 0;
    }

    const closeBtn = document.getElementById('closeManageModalBtn');
    closeBtn?.focus();
};

const closeManageModal = () => {
    const modal = document.getElementById('proManageModal');
    if (!modal || modal.classList.contains('hidden')) return;

    if (modal.contains(document.activeElement) && typeof document.activeElement.blur === 'function') {
        document.activeElement.blur();
    }

    if (previousActiveElement && typeof previousActiveElement.focus === 'function' && document.body.contains(previousActiveElement)) {
        try {
            previousActiveElement.focus();
        } catch { }
    }
    previousActiveElement = null;

    modal.classList.remove('is-active');
    modal.setAttribute('inert', '');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('pro-modal-open');
    document.body.style.overflow = '';

    setTimeout(() => {
        if (!modal.classList.contains('is-active')) {
            modal.classList.add('hidden');
        }
    }, 280);
};

const updateSleepTimerUI = () => {
    const state = audioEngine.getSleepTimerState();
    const sleepTimerValue = document.getElementById('sleepTimerValue');
    const sleepTimerBadge = document.getElementById('sleepTimerBadge');

    if (state.active) {
        if (state.minutes === 'end_of_track') {
            if (sleepTimerValue) sleepTimerValue.textContent = 'Di Akhir Lagu • Otomatis jeda musik';
            if (sleepTimerBadge) {
                sleepTimerBadge.style.display = 'inline-block';
                sleepTimerBadge.textContent = 'Lagu';
            }
        } else {
            if (sleepTimerValue) sleepTimerValue.textContent = `${state.minutes} Menit • Otomatis jeda aktif`;
            if (sleepTimerBadge) {
                sleepTimerBadge.style.display = 'inline-block';
                sleepTimerBadge.textContent = `${state.minutes}m`;
            }
        }
    } else {
        if (sleepTimerValue) sleepTimerValue.textContent = 'Mati • Otomatis jeda musik';
        if (sleepTimerBadge) sleepTimerBadge.style.display = 'none';
    }
};

const updateProBannerUI = (isPro) => {
    const titleEl = document.querySelector('.pro-banner-title');
    const descEl = document.querySelector('.pro-banner-desc');
    const btnEl = document.getElementById('managePlanBtn');

    if (!titleEl || !descEl || !btnEl) return;

    if (isPro) {
        titleEl.textContent = 'Spotiwind PRO Aktif';
        descEl.textContent = 'Status langganan aktif. Nikmati seluruh fitur ekslusif';
        btnEl.innerHTML = '<span>Kelola Langganan</span>';
        btnEl.setAttribute('aria-label', 'Kelola Langganan PRO');
    } else {
        titleEl.textContent = 'Spotiwind PRO';
        descEl.textContent = 'Banner profil eksklusif, badge PRO, dan download offline.';
        btnEl.innerHTML = '<span>Upgrade to PRO</span>';
        btnEl.setAttribute('aria-label', 'Upgrade to PRO');
    }
};

const updateAccountStats = (user) => {
    const statPlaylists = document.getElementById('statPlaylists');
    const statFollowers = document.getElementById('statFollowers');
    const statFollowing = document.getElementById('statFollowing');
    const statLikes = document.getElementById('statLikes');
    const soundStreamingTime = document.getElementById('soundStreamingTime');
    const soundTotalTracks = document.getElementById('soundTotalTracks');

    unsubscribePlaylists?.();
    unsubscribeLikedSongs?.();
    unsubscribeFollowers?.();
    unsubscribeFollowing?.();
    unsubscribeProfile?.();

    if (!user) {
        if (statPlaylists) statPlaylists.textContent = '0';
        if (statFollowers) statFollowers.textContent = '0';
        if (statFollowing) statFollowing.textContent = '0';
        if (statLikes) statLikes.textContent = '0';
        if (soundStreamingTime) soundStreamingTime.textContent = 'Baru Memulai 🎵';
        if (soundTotalTracks) soundTotalTracks.textContent = '0 Lagu Diputar';
        return;
    }

    // 1. Realtime Playlists count from Firestore subcollection
    unsubscribePlaylists = subscribeUserPlaylists(user.uid, (playlists) => {
        const count = Array.isArray(playlists) ? playlists.length : 0;
        if (statPlaylists) {
            statPlaylists.textContent = String(count);
        }
    });

    // 2. Realtime Liked Songs count from Firestore subcollection
    unsubscribeLikedSongs = subscribeLikedSongs(user.uid, (songs) => {
        const count = Array.isArray(songs) ? songs.length : 0;
        if (statLikes) {
            statLikes.textContent = String(count);
        }
    });

    // 3. Realtime Followers count from Firestore subcollection
    unsubscribeFollowers = subscribeUserFollowers(user.uid, (followers) => {
        if (statFollowers) {
            statFollowers.textContent = Array.isArray(followers) ? String(followers.length) : '0';
        }
    });

    // 4. Realtime Following count from Firestore subcollection
    unsubscribeFollowing = subscribeUserFollowing(user.uid, (following) => {
        if (statFollowing) {
            statFollowing.textContent = Array.isArray(following) ? String(following.length) : '0';
        }
    });

    // 5. Realtime Profile info (listening time, tracks played, isPremium check and userCode) from Firestore
    unsubscribeProfile = subscribeUserProfile(user.uid, (profile) => {
        if (!profile) return;
        currentProfileData = profile;

        const badge = document.getElementById('accountProBadge');
        const avatarWrapper = document.querySelector('.account-avatar-wrapper');
        const profileHeader = document.querySelector('.account-profile-header');
        const accountCode = document.getElementById('accountCode');

        if (accountCode) {
            accountCode.textContent = profile.userCode || generateUserCode(user.uid);
        }

        // Dynamic Realtime Listening Time & Tracks for THIS User
        const localSec = Number(localStorage.getItem(`spotiwind_listening_sec_${user.uid}`)) || 0;
        const totalListeningSec = Math.max(profile.totalListeningSeconds || 0, localSec);
        if (soundStreamingTime) {
            soundStreamingTime.textContent = formatListeningTime(totalListeningSec);
        }

        const totalTracks = profile.totalTracksPlayed || (statLikes ? Number(statLikes.textContent) || 0 : 0);
        if (soundTotalTracks) {
            soundTotalTracks.textContent = totalTracks > 0 ? `${totalTracks} Lagu Diputar` : 'Mulai putar lagu';
        }

        const isPro = profile.isPremium === true;
        updateProBannerUI(isPro);

        if (isPro) {
            badge?.classList.remove('hidden');
            avatarWrapper?.classList.add('is-pro');
            profileHeader?.classList.add('is-pro');
        } else {
            badge?.classList.add('hidden');
            avatarWrapper?.classList.remove('is-pro');
            profileHeader?.classList.remove('is-pro');
        }

        // Sync Data Saver preference from user profile
        if (profile.dataSaver !== undefined) {
            const dataSaverToggle = document.getElementById('dataSaverToggle');
            if (dataSaverToggle) {
                dataSaverToggle.checked = Boolean(profile.dataSaver);
            }
            localStorage.setItem('spotiwind_data_saver', String(profile.dataSaver));
        }
    });
};

const updateAccountUserInfo = (user) => {
    const accountAvatar = document.getElementById('accountAvatar');
    const accountName = document.getElementById('accountName');
    const accountEmail = document.getElementById('accountEmail');
    const accountProBadge = document.getElementById('accountProBadge');
    const avatarWrapper = document.querySelector('.account-avatar-wrapper');
    const accountCodeWrapper = document.getElementById('accountCodeWrapper');
    const accountCode = document.getElementById('accountCode');
    const logoutBtn = document.getElementById('accountLogoutBtn');
    const logoutText = document.getElementById('accountLogoutText');

    updateAccountStats(user);

    if (!user) {
        currentProfileData = null;
        if (accountName) accountName.textContent = 'Tamu (Guest)';
        if (accountEmail) accountEmail.textContent = 'Masuk untuk sinkronisasi lagu & profil';
        if (accountProBadge) accountProBadge.classList.add('hidden');
        if (accountCodeWrapper) accountCodeWrapper.classList.add('hidden');
        if (avatarWrapper) avatarWrapper.classList.remove('is-pro');
        const profileHeader = document.querySelector('.account-profile-header');
        profileHeader?.classList.remove('is-pro');
        if (accountAvatar) {
            accountAvatar.src = 'https://ui-avatars.com/api/?name=Guest&background=1e293b&color=94a3b8&bold=true&size=512';
        }
        if (logoutText) logoutText.textContent = 'Masuk / Buat Akun';
        if (logoutBtn) logoutBtn.classList.add('is-login-cta');

        // Reset Data Saver to default OFF for Guest session
        const dataSaverToggle = document.getElementById('dataSaverToggle');
        if (dataSaverToggle) dataSaverToggle.checked = false;
        localStorage.setItem('spotiwind_data_saver', 'false');
        window.dispatchEvent(new CustomEvent('spotiwind-data-saver-changed', { detail: { enabled: false } }));
        return;
    }

    if (logoutText) logoutText.textContent = 'Keluar dari Akun';
    if (logoutBtn) logoutBtn.classList.remove('is-login-cta');

    const displayName = user.displayName || user.email?.split('@')[0] || 'User';
    if (accountName) accountName.textContent = displayName;
    if (accountEmail) accountEmail.textContent = user.email || 'user@example.com';
    if (accountCodeWrapper) accountCodeWrapper.classList.remove('hidden');
    if (accountCode) accountCode.textContent = generateUserCode(user.uid);

    if (accountAvatar) {
        accountAvatar.referrerPolicy = "no-referrer";
        const avatarUrl = getHighResAvatarUrl(user.photoURL, 512) || defaultAvatar(displayName);
        accountAvatar.src = avatarUrl;
        accountAvatar.onerror = () => {
            accountAvatar.src = defaultAvatar(displayName);
        };
    }
};

const bindAccountInteractions = () => {
    // Edit Profile button
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtnHandler = () => {
            const user = auth.currentUser;
            if (!user) {
                if (typeof window.navigateToAuthPage === 'function') {
                    window.navigateToAuthPage('login');
                } else {
                    showToast('Silakan login terlebih dahulu');
                }
                return;
            }
            showToast('Edit profil akan segera hadir');
        };
        editProfileBtn.addEventListener('click', editProfileBtnHandler);
    }

    // Share Profile button
    const shareProfileBtn = document.getElementById('shareProfileBtn');
    if (shareProfileBtn) {
        shareProfileBtnHandler = async () => {
            const user = auth.currentUser;
            const name = user?.displayName || 'Pengguna Spotiwind';
            const shareData = {
                title: `${name} di Spotiwind`,
                text: `Dengarkan musik favorit & intip profil ${name} di Spotiwind! 🎵`,
                url: window.location.origin
            };

            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                } catch {
                    // Ignored / cancelled
                }
            } else if (navigator.clipboard) {
                try {
                    await navigator.clipboard.writeText(window.location.origin);
                    showToast('Tautan profil disalin ke clipboard! 🎵');
                } catch {
                    showToast('Bagikan profil Spotiwind');
                }
            } else {
                showToast('Bagikan profil Spotiwind');
            }
        };
        shareProfileBtn.addEventListener('click', shareProfileBtnHandler);
    }

    // Click account code badge to copy user code to clipboard
    const accountCodeWrapper = document.getElementById('accountCodeWrapper');
    if (accountCodeWrapper) {
        accountCodeClickHandler = () => {
            const codeEl = document.getElementById('accountCode');
            const codeText = codeEl?.textContent?.trim();
            if (!codeText) return;
            if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(codeText).then(() => {
                    showToast(`ID Akun ${codeText} disalin!`);
                }).catch(() => {
                    showToast(`ID Akun: ${codeText}`);
                });
            } else {
                showToast(`ID Akun: ${codeText}`);
            }
        };
        accountCodeWrapper.addEventListener('click', accountCodeClickHandler);
    }

    // Pro banner actions (Upgrade to PRO / Manage Plan)
    const managePlanBtn = document.getElementById('managePlanBtn');
    if (managePlanBtn) {
        managePlanBtnHandler = () => {
            const user = auth.currentUser;
            if (!user) {
                if (typeof window.navigateToAuthPage === 'function') {
                    window.navigateToAuthPage('login');
                } else {
                    showToast('Silakan login terlebih dahulu');
                }
                return;
            }

            if (currentProfileData?.isPremium === true) {
                openManageModal();
            } else {
                openSubscriptionModal();
            }
        };
        managePlanBtn.addEventListener('click', managePlanBtnHandler);
    }

    // Sleep Timer Setting Click (Cycles 15m -> 30m -> 45m -> 60m -> Di Akhir Lagu -> Off)
    const sleepTimerSetting = document.getElementById('sleepTimerSetting');
    if (sleepTimerSetting) {
        sleepTimerHandler = () => {
            const currentState = audioEngine.getSleepTimerState();
            let nextVal = 15;

            if (currentState.active) {
                if (currentState.minutes === 15) nextVal = 30;
                else if (currentState.minutes === 30) nextVal = 45;
                else if (currentState.minutes === 45) nextVal = 60;
                else if (currentState.minutes === 60) nextVal = 'end_of_track';
                else if (currentState.minutes === 'end_of_track') nextVal = 0;
            }

            if (nextVal === 0) {
                audioEngine.setSleepTimer(0);
                showToast('Timer Tidur dinonaktifkan ⏹️');
            } else if (nextVal === 'end_of_track') {
                audioEngine.setSleepTimer('end_of_track');
                showToast('Timer Tidur aktif: Otomatis jeda di akhir lagu 🎵💤');
            } else {
                audioEngine.setSleepTimer(nextVal);
                showToast(`Timer Tidur diatur ke ${nextVal} Menit 🌙💤`);
            }

            updateSleepTimerUI();
        };
        sleepTimerSetting.addEventListener('click', sleepTimerHandler);
    }

    // Subscribe to audioEngine events for automatic Sleep Timer state sync
    unsubscribeAudioEngine = audioEngine.subscribe((event) => {
        if (event === 'sleeptimer' || event === 'pause' || event === 'play') {
            updateSleepTimerUI();
        }
    });

    updateSleepTimerUI();

    // Data Saver Mode Toggle
    const dataSaverToggle = document.getElementById('dataSaverToggle');
    if (dataSaverToggle) {
        // Load saved state (default false)
        const savedDataSaver = localStorage.getItem('spotiwind_data_saver');
        if (savedDataSaver !== null) {
            dataSaverToggle.checked = savedDataSaver === 'true';
        }
        dataSaverToggleHandler = (e) => {
            const isEnabled = e.target.checked;
            localStorage.setItem('spotiwind_data_saver', String(isEnabled));
            window.dispatchEvent(new CustomEvent('spotiwind-data-saver-changed', { detail: { enabled: isEnabled } }));
            if (auth.currentUser?.uid) {
                updateProfileInfo(auth.currentUser.uid, { dataSaver: isEnabled }).catch(err => {
                    console.warn("Save dataSaver to Firestore:", err);
                });
            }
            showToast(`Mode Penghemat Data ${isEnabled ? 'Diaktifkan 📶 (Hemat Kuota)' : 'Dinonaktifkan 🚀'}`);
        };
        dataSaverToggle.addEventListener('change', dataSaverToggleHandler);
    }

    // Crossfade Toggle
    const crossfadeToggle = document.getElementById('crossfadeToggle');
    if (crossfadeToggle) {
        // Load saved state
        const savedCrossfade = localStorage.getItem('spotiwind_crossfade');
        if (savedCrossfade !== null) {
            crossfadeToggle.checked = savedCrossfade === 'true';
        }
        crossfadeToggleHandler = (e) => {
            localStorage.setItem('spotiwind_crossfade', String(e.target.checked));
            showToast(`Transisi Crossfade ${e.target.checked ? 'Diaktifkan (3s)' : 'Dinonaktifkan'}`);
        };
        crossfadeToggle.addEventListener('change', crossfadeToggleHandler);
    }

    // Private Session Toggle
    const privateSessionToggle = document.getElementById('privateSessionToggle');
    if (privateSessionToggle) {
        const savedPrivate = localStorage.getItem('spotiwind_private_session');
        if (savedPrivate !== null) {
            privateSessionToggle.checked = savedPrivate === 'true';
        }
        privateSessionToggleHandler = (e) => {
            localStorage.setItem('spotiwind_private_session', String(e.target.checked));
            showToast(`Sesi Pribadi ${e.target.checked ? 'Diaktifkan (Aktivitas disembunyikan)' : 'Dinonaktifkan'}`);
        };
        privateSessionToggle.addEventListener('change', privateSessionToggleHandler);
    }

    // Connected Devices Setting Click
    const connectedDevicesSetting = document.getElementById('connectedDevicesSetting');
    if (connectedDevicesSetting) {
        connectedDevicesHandler = () => {
            showToast('Spotiwind Mobile Web — Perangkat aktif utama saat ini 📱');
        };
        connectedDevicesSetting.addEventListener('click', connectedDevicesHandler);
    }

    // Clear Cache Button
    const clearCacheSetting = document.getElementById('clearCacheSetting');
    if (clearCacheSetting) {
        clearCacheHandler = () => {
            const storageVal = document.getElementById('storageUsageValue');
            if (storageVal) storageVal.textContent = '~1.8 MB';
            showToast('Cache aplikasi berhasil dibersihkan! Memori telah dioptimalkan. 🚀');
        };
        clearCacheSetting.addEventListener('click', clearCacheHandler);
    }

    // Account Logout / Login CTA Button
    const accountLogoutBtn = document.getElementById('accountLogoutBtn');
    if (accountLogoutBtn) {
        accountLogoutBtnHandler = async () => {
            const user = auth.currentUser;
            if (!user) {
                if (typeof window.navigateToAuthPage === 'function') {
                    window.navigateToAuthPage('login');
                } else if (typeof window.loadPageContent === 'function') {
                    window.loadPageContent('auth-mobile.html', { initialTab: 'login' });
                } else {
                    showToast('Silakan login terlebih dahulu');
                }
                return;
            }

            const confirmLogout = window.confirm("Apakah Anda yakin ingin keluar dari akun Spotiwind?");
            if (!confirmLogout) return;

            try {
                await signOut(auth);
                showToast('Berhasil keluar dari akun Spotiwind');
            } catch (err) {
                console.error("Logout error:", err);
                showToast('Gagal keluar dari akun');
            }
        };
        accountLogoutBtn.addEventListener('click', accountLogoutBtnHandler);
    }

    // Manage Active Plan Modal (For Active PRO Users)
    const closeManageModalBtn = document.getElementById('closeManageModalBtn');
    if (closeManageModalBtn) {
        closeManageModalBtnHandler = () => closeManageModal();
        closeManageModalBtn.addEventListener('click', closeManageModalBtnHandler);
    }

    const manageBackdrop = document.querySelector('#proManageModal .pro-modal-backdrop');
    if (manageBackdrop) {
        manageModalBackdropHandler = () => closeManageModal();
        manageBackdrop.addEventListener('click', manageModalBackdropHandler);
    }

    const manageModal = document.getElementById('proManageModal');
    if (manageModal) {
        cleanupManageSheetDrag = setupBottomSheetDrag(manageModal, () => closeManageModal());
    }

    // Cancel PRO Subscription
    const cancelSubscriptionBtn = document.getElementById('cancelSubscriptionBtn');
    if (cancelSubscriptionBtn) {
        cancelSubBtnHandler = async () => {
            const user = auth.currentUser;
            if (!user) return;

            const confirmCancel = window.confirm("Apakah Anda yakin ingin membatalkan langganan Spotiwind PRO?");
            if (!confirmCancel) return;

            try {
                cancelSubscriptionBtn.disabled = true;
                cancelSubscriptionBtn.textContent = 'Membatalkan...';

                await setUserPremiumStatus(user.uid, false);
                closeManageModal();
                showToast('Langganan Spotiwind PRO telah dinonaktifkan.');
            } catch (err) {
                console.error("Failed to cancel PRO:", err);
                showToast('Gagal membatalkan langganan');
            } finally {
                cancelSubscriptionBtn.disabled = false;
                cancelSubscriptionBtn.textContent = 'Batalkan Langganan PRO';
            }
        };
        cancelSubscriptionBtn.addEventListener('click', cancelSubBtnHandler);
    }

    // Stats items click handler (Playlists, Followers, Following, Likes)
    document.querySelectorAll('.account-stats-card .stat-item').forEach((item) => {
        item.addEventListener('click', () => {
            const statType = item.dataset.stat;
            const label = item.querySelector('.stat-label')?.textContent || 'Statistik';
            if (statType === 'playlists' || statType === 'likes') {
                if (typeof window.navigateToLibraryPage === 'function') {
                    window.navigateToLibraryPage(statType === 'playlists' ? 'playlists' : 'likes');
                } else {
                    showToast(`${label} dipilih`);
                }
            } else {
                showToast(`${label} akan segera hadir`);
            }
        });
    });

    // Avatar preview modal trigger
    const avatarWrapper = document.querySelector('.account-avatar-wrapper');
    if (avatarWrapper) {
        avatarClickHandler = (e) => {
            if (e.target.closest('.avatar-camera-badge')) {
                showToast('Ubah foto profil akan segera hadir');
                return;
            }
            openAvatarPreview();
        };
        avatarWrapper.addEventListener('click', avatarClickHandler);
    }

    // Back button in avatar preview
    const backBtn = document.getElementById('avatarPreviewBackBtn');
    if (backBtn) {
        previewBackBtnHandler = () => closeAvatarPreview();
        backBtn.addEventListener('click', previewBackBtnHandler);
    }

    // Edit photo button in avatar preview
    const editBtn = document.getElementById('avatarPreviewEditBtn');
    if (editBtn) {
        previewEditBtnHandler = () => {
            showToast('Ubah foto profil akan segera hadir');
        };
        editBtn.addEventListener('click', previewEditBtnHandler);
    }

    // Share photo button in avatar preview
    const shareBtn = document.getElementById('avatarPreviewShareBtn');
    if (shareBtn) {
        previewShareBtnHandler = async () => {
            const previewImg = document.getElementById('avatarPreviewImg');
            const photoUrl = previewImg?.src || window.location.href;
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'Foto Profil Spotiwind',
                        text: 'Lihat foto profil saya di Spotiwind',
                        url: photoUrl
                    });
                } catch {
                    // Ignored / user cancelled
                }
            } else if (navigator.clipboard) {
                try {
                    await navigator.clipboard.writeText(photoUrl);
                    showToast('Tautan foto profil disalin ke clipboard');
                } catch {
                    showToast('Bagikan foto profil');
                }
            } else {
                showToast('Bagikan foto profil');
            }
        };
        shareBtn.addEventListener('click', previewShareBtnHandler);
    }

    keydownHandler = (e) => {
        if (e.key === 'Escape') {
            closeAvatarPreview();
            closeSubscriptionModal();
            closeManageModal();
        }
    };
    document.addEventListener('keydown', keydownHandler);
};

export const initAccountPage = async () => {
    let user = auth.currentUser;
    if (!user && typeof auth.authStateReady === 'function') {
        try {
            await Promise.race([
                auth.authStateReady(),
                new Promise((resolve) => setTimeout(resolve, 350))
            ]);
            user = auth.currentUser;
        } catch {
            // Ignored
        }
    }

    if (user) {
        // Pre-fetch profile & PRO status immediately before dark transition screen fades out
        try {
            const profile = await Promise.race([
                getProfileByUid(user.uid),
                new Promise((resolve) => setTimeout(() => resolve(null), 800))
            ]);
            if (profile) {
                currentProfileData = profile;
                const isPro = profile.isPremium === true;
                updateProBannerUI(isPro);
                const badge = document.getElementById('accountProBadge');
                const avatarWrapper = document.querySelector('.account-avatar-wrapper');
                const profileHeader = document.querySelector('.account-profile-header');
                if (isPro) {
                    badge?.classList.remove('hidden');
                    avatarWrapper?.classList.add('is-pro');
                    profileHeader?.classList.add('is-pro');
                } else {
                    badge?.classList.add('hidden');
                    avatarWrapper?.classList.remove('is-pro');
                    profileHeader?.classList.remove('is-pro');
                }
            }
        } catch (err) {
            console.warn("Preloading user profile on account page:", err);
        }
        updateAccountUserInfo(user);
    } else {
        updateAccountUserInfo(null);
    }

    unsubscribeAccountAuth?.();
    unsubscribeAccountAuth = onAuthStateChanged(auth, updateAccountUserInfo);
    bindAccountInteractions();

    try {
        if (sessionStorage.getItem('open_pro_subscription') === 'true') {
            sessionStorage.removeItem('open_pro_subscription');
            setTimeout(() => {
                if (currentProfileData?.isPremium === true) {
                    openManageModal();
                } else {
                    openSubscriptionModal();
                }
            }, 300);
        }
    } catch {
        // Ignored
    }
};

export const cleanupAccountPage = () => {
    unsubscribeAccountAuth?.();
    unsubscribeAccountAuth = null;

    unsubscribePlaylists?.();
    unsubscribePlaylists = null;

    unsubscribeLikedSongs?.();
    unsubscribeLikedSongs = null;

    unsubscribeFollowers?.();
    unsubscribeFollowers = null;

    unsubscribeFollowing?.();
    unsubscribeFollowing = null;

    unsubscribeProfile?.();
    unsubscribeProfile = null;

    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn && editProfileBtnHandler) {
        editProfileBtn.removeEventListener('click', editProfileBtnHandler);
    }
    editProfileBtnHandler = null;

    const shareProfileBtn = document.getElementById('shareProfileBtn');
    if (shareProfileBtn && shareProfileBtnHandler) {
        shareProfileBtn.removeEventListener('click', shareProfileBtnHandler);
    }
    shareProfileBtnHandler = null;

    const managePlanBtn = document.getElementById('managePlanBtn');
    if (managePlanBtn && managePlanBtnHandler) {
        managePlanBtn.removeEventListener('click', managePlanBtnHandler);
    }
    managePlanBtnHandler = null;

    const accountCodeWrapper = document.getElementById('accountCodeWrapper');
    if (accountCodeWrapper && accountCodeClickHandler) {
        accountCodeWrapper.removeEventListener('click', accountCodeClickHandler);
    }
    accountCodeClickHandler = null;

    const sleepTimerSetting = document.getElementById('sleepTimerSetting');
    if (sleepTimerSetting && sleepTimerHandler) {
        sleepTimerSetting.removeEventListener('click', sleepTimerHandler);
    }
    sleepTimerHandler = null;

    if (unsubscribeAudioEngine) {
        unsubscribeAudioEngine();
        unsubscribeAudioEngine = null;
    }

    const dataSaverToggle = document.getElementById('dataSaverToggle');
    if (dataSaverToggle && dataSaverToggleHandler) {
        dataSaverToggle.removeEventListener('change', dataSaverToggleHandler);
    }
    dataSaverToggleHandler = null;

    const crossfadeToggle = document.getElementById('crossfadeToggle');
    if (crossfadeToggle && crossfadeToggleHandler) {
        crossfadeToggle.removeEventListener('change', crossfadeToggleHandler);
    }
    crossfadeToggleHandler = null;

    const privateSessionToggle = document.getElementById('privateSessionToggle');
    if (privateSessionToggle && privateSessionToggleHandler) {
        privateSessionToggle.removeEventListener('change', privateSessionToggleHandler);
    }
    privateSessionToggleHandler = null;

    const connectedDevicesSetting = document.getElementById('connectedDevicesSetting');
    if (connectedDevicesSetting && connectedDevicesHandler) {
        connectedDevicesSetting.removeEventListener('click', connectedDevicesHandler);
    }
    connectedDevicesHandler = null;

    const clearCacheSetting = document.getElementById('clearCacheSetting');
    if (clearCacheSetting && clearCacheHandler) {
        clearCacheSetting.removeEventListener('click', clearCacheHandler);
    }
    clearCacheHandler = null;

    const accountLogoutBtn = document.getElementById('accountLogoutBtn');
    if (accountLogoutBtn && accountLogoutBtnHandler) {
        accountLogoutBtn.removeEventListener('click', accountLogoutBtnHandler);
    }
    accountLogoutBtnHandler = null;

    const avatarWrapper = document.querySelector('.account-avatar-wrapper');
    if (avatarWrapper && avatarClickHandler) {
        avatarWrapper.removeEventListener('click', avatarClickHandler);
    }
    avatarClickHandler = null;

    const backBtn = document.getElementById('avatarPreviewBackBtn');
    if (backBtn && previewBackBtnHandler) {
        backBtn.removeEventListener('click', previewBackBtnHandler);
    }
    previewBackBtnHandler = null;

    const editBtn = document.getElementById('avatarPreviewEditBtn');
    if (editBtn && previewEditBtnHandler) {
        editBtn.removeEventListener('click', previewEditBtnHandler);
    }
    previewEditBtnHandler = null;

    const shareBtn = document.getElementById('avatarPreviewShareBtn');
    if (shareBtn && previewShareBtnHandler) {
        shareBtn.removeEventListener('click', previewShareBtnHandler);
    }
    previewShareBtnHandler = null;

    closeProSubscriptionModal();

    const closeManageModalBtn = document.getElementById('closeManageModalBtn');
    if (closeManageModalBtn && closeManageModalBtnHandler) {
        closeManageModalBtn.removeEventListener('click', closeManageModalBtnHandler);
    }
    closeManageModalBtnHandler = null;

    const manageBackdrop = document.querySelector('#proManageModal .pro-modal-backdrop');
    if (manageBackdrop && manageModalBackdropHandler) {
        manageBackdrop.removeEventListener('click', manageModalBackdropHandler);
    }
    manageModalBackdropHandler = null;

    if (cleanupManageSheetDrag) {
        cleanupManageSheetDrag();
        cleanupManageSheetDrag = null;
    }

    const cancelSubscriptionBtn = document.getElementById('cancelSubscriptionBtn');
    if (cancelSubscriptionBtn && cancelSubBtnHandler) {
        cancelSubscriptionBtn.removeEventListener('click', cancelSubBtnHandler);
    }
    cancelSubBtnHandler = null;

    if (keydownHandler) {
        document.removeEventListener('keydown', keydownHandler);
    }
    keydownHandler = null;
    previousActiveElement = null;
    currentProfileData = null;
    document.body.classList.remove('pro-modal-open');
    document.body.style.overflow = '';
};