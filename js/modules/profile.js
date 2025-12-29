import { auth, db, provider } from '../config.js';
import { signOut, updateProfile, updatePassword, EmailAuthProvider, linkWithCredential } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { state } from '../state.js';
import { APP_VERSION } from '../version.js';
// Import fungsi satpam dari auth.js
import { handleLinkGoogle } from './auth.js';

let activityChart = null;
let isChartLibLoaded = false;
let currentConsistencyVal = 0; // Menyimpan nilai terakhir untuk animasi angka

export function initProfile() {
    window.loadChartData = loadChartData;
    window.openEditProfile = openEditProfile;
    window.closeEditProfile = closeEditProfile;

    setupLogoutListeners();
    setupEditProfileListeners();

    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'profileView') updateProfileUI();
    });

    window.addEventListener('viewExit', (e) => {
        if (e.detail.viewId === 'profileView') {
            closeEditProfile();
            toggleLogoutModal(false);
            resetPasswordChangeArea();
        }
    });
}

function showUpdateStatus(message, isError = false) {
    const statusDiv = document.getElementById('updateStatusMsg');
    if (!statusDiv) return;
    statusDiv.classList.remove('hidden', 'bg-emerald-50', 'text-emerald-600', 'border-emerald-100', 'bg-rose-50', 'text-rose-600', 'border-rose-100');

    if (isError) {
        statusDiv.classList.add('bg-rose-50', 'text-rose-600', 'border-rose-100');
    } else {
        statusDiv.classList.add('bg-emerald-50', 'text-emerald-600', 'border-emerald-100');
    }

    statusDiv.querySelector('p').innerText = message;
    statusDiv.classList.remove('hidden');
    if (!isError) {
        setTimeout(() => statusDiv.classList.add('hidden'), 3000);
    }
}

// --- BAGIAN UTAMA YANG DIOPTIMALKAN (INSTANT LOAD) ---
async function updateProfileUI() {
    const footerVer = document.getElementById('versionTextProfile');
    if (footerVer) footerVer.innerText = APP_VERSION;

    // Menggunakan state.currentUser agar instan (sudah ada di memori)
    let user = state.currentUser;

    // Fallback ke auth.currentUser jika state belum siap (jarang terjadi)
    if (!user && auth.currentUser) {
        user = auth.currentUser;
    }

    if (!user) return;

    // 1. Tampilkan Data Teks Langsung
    const nameEl = document.getElementById('profileNameLarge');
    const emailEl = document.getElementById('profileEmail');
    if (nameEl) nameEl.innerText = user.displayName || "Hamba Allah";
    if (emailEl) emailEl.innerText = user.email || "";

    const locEl = document.getElementById('lastLocation');
    if (locEl) locEl.innerText = state.lastCity || "Lokasi Anda";

    // 2. Tampilkan Foto Langsung
    const img = document.getElementById('profilePhotoLarge');
    if (img) {
        const photoUrl = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=10b981&color=fff&size=128`;
        img.src = photoUrl;
    }

    // 3. Metadata User
    if (user.metadata) {
        const joinDate = new Date(user.metadata.creationTime);
        const joinEl = document.getElementById('joinDate');
        if (joinEl) joinEl.innerText = joinDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

        const diff = Math.ceil(Math.abs(new Date() - joinDate) / (1000 * 60 * 60 * 24));
        const dayEl = document.getElementById('statDays');
        if (dayEl) dayEl.innerText = `${diff}`;
    }

    // 4. Update Status Akun (Password/Google)
    const providerData = user.providerData || [];
    const providers = providerData.map(p => p.providerId);

    const hasPassword = providers.includes('password');
    const hasGoogle = providers.includes('google.com');

    const setupPwd = document.getElementById('passwordSetupArea');
    const activePwd = document.getElementById('passwordActiveArea');
    if (setupPwd && activePwd) {
        setupPwd.classList.toggle('hidden', hasPassword);
        activePwd.classList.toggle('hidden', !hasPassword);
    }

    const btnGoogle = document.getElementById('btnLinkGoogle');
    const activeGoogle = document.getElementById('googleActiveArea');
    if (btnGoogle && activeGoogle) {
        btnGoogle.classList.toggle('hidden', hasGoogle);
        activeGoogle.classList.toggle('hidden', !hasGoogle);
    }

    // Load grafik belakangan (non-blocking) agar UI utama muncul duluan
    setTimeout(() => loadChartData(7), 100);
}

// FUNGSI BARU: Animasi angka (Counting Effect)
function animateValue(obj, start, end, duration) {
    if (start === end) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);

        // Easing function (easeOutExpo) agar melambat di akhir
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

        const current = Math.floor(easeProgress * (end - start) + start);
        obj.innerText = `${current}%`;

        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function calculateConsistency(totalCompleted, days) {
    const dailyTarget = 5;
    const maxPotential = days * dailyTarget;
    let percentage = Math.round((totalCompleted / maxPotential) * 100);
    if (percentage > 100) percentage = 100;

    const statEl = document.getElementById('statConsistency');
    if (statEl) {
        // Jalankan animasi angka dari nilai sebelumnya ke nilai baru
        animateValue(statEl, currentConsistencyVal, percentage, 1000);

        // Simpan nilai sekarang untuk animasi berikutnya
        currentConsistencyVal = percentage;

        // Update warna (tetap dilakukan agar konsisten)
        statEl.classList.remove("text-emerald-500", "text-amber-500", "text-slate-800", "dark:text-white");
        if (percentage >= 80) statEl.classList.add("text-emerald-500");
        else if (percentage >= 50) statEl.classList.add("text-amber-500");
        else statEl.classList.add("text-slate-800", "dark:text-white");
    }
}

function resetPasswordChangeArea() {
    const activePwd = document.getElementById('passwordActiveArea');
    const changePwd = document.getElementById('passwordChangeArea');
    if (activePwd && changePwd) {
        activePwd.classList.remove('hidden');
        changePwd.classList.add('hidden');
        document.getElementById('changePasswordInput').value = "";
    }
}

function setupEditProfileListeners() {
    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const input = document.getElementById('editNameInput');
            const newName = input.value.trim();
            if (!newName) return;
            saveBtn.innerHTML = "Menyimpan...";
            saveBtn.disabled = true;
            try {
                await updateProfile(auth.currentUser, { displayName: newName });
                state.currentUser.displayName = newName;
                updateProfileUI();
                showUpdateStatus("Nama berhasil diperbarui!");
                setTimeout(closeEditProfile, 1000);
            } catch (error) { showUpdateStatus("Gagal memperbarui nama.", true); }
            finally { saveBtn.disabled = false; saveBtn.innerHTML = "Simpan Perubahan"; if (window.lucide) window.lucide.createIcons(); }
        });
    }

    const enableBtn = document.getElementById('enableEmailAuthBtn');
    if (enableBtn) {
        enableBtn.addEventListener('click', async () => {
            const password = document.getElementById('linkPasswordInput').value;
            const user = auth.currentUser;
            if (!password || password.length < 6) return showUpdateStatus("Password minimal 6 karakter.", true);
            enableBtn.innerText = "MEMPROSES...";
            enableBtn.disabled = true;
            try {
                const credential = EmailAuthProvider.credential(user.email, password);
                await linkWithCredential(user, credential);
                showUpdateStatus("Akses Password Aktif!");
                updateProfileUI();
            } catch (error) { showUpdateStatus("Gagal mengaktifkan password.", true); }
            finally { enableBtn.innerText = "Aktifkan Password"; enableBtn.disabled = false; }
        });
    }

    const btnUpdatePwd = document.getElementById('btnUpdatePassword');
    if (btnUpdatePwd) {
        btnUpdatePwd.addEventListener('click', async () => {
            const newPwd = document.getElementById('changePasswordInput').value;
            if (!newPwd || newPwd.length < 6) return showUpdateStatus("Minimal 6 karakter.", true);
            btnUpdatePwd.innerText = "UPDATING...";
            btnUpdatePwd.disabled = true;
            try {
                await updatePassword(auth.currentUser, newPwd);
                showUpdateStatus("Berhasil! Keluar otomatis...");
                setTimeout(async () => {
                    await signOut(auth);
                    window.location.reload();
                }, 1500);
            } catch (error) {
                if (error.code === 'auth/requires-recent-login') {
                    showUpdateStatus("Logout & login ulang dulu demi keamanan.", true);
                } else { showUpdateStatus("Gagal update password.", true); }
            } finally { btnUpdatePwd.innerText = "Update"; btnUpdatePwd.disabled = false; }
        });
    }

    const btnLinkGoogle = document.getElementById('btnLinkGoogle');
    if (btnLinkGoogle) {
        btnLinkGoogle.addEventListener('click', async () => {
            btnLinkGoogle.innerText = "PROSES...";
            btnLinkGoogle.disabled = true;
            try {
                await handleLinkGoogle();
                showUpdateStatus("Google Berhasil Terhubung!");
                updateProfileUI();
            } catch (error) {
                showUpdateStatus(error.message, true);
            }
            finally { btnLinkGoogle.innerText = "Sambungkan Google"; btnLinkGoogle.disabled = false; }
        });
    }

    const btnShowChange = document.getElementById('btnShowChangePassword');
    if (btnShowChange) btnShowChange.addEventListener('click', () => {
        document.getElementById('passwordActiveArea').classList.add('hidden');
        document.getElementById('passwordChangeArea').classList.remove('hidden');
    });
    const btnCancelChange = document.getElementById('btnCancelChange');
    if (btnCancelChange) btnCancelChange.addEventListener('click', resetPasswordChangeArea);

    const dmToggle = document.getElementById('darkModeToggleProfile');
    if (dmToggle) dmToggle.addEventListener('change', () => { if (window.toggleDarkMode) window.toggleDarkMode(); });
}

async function loadChartLibrary() { if (isChartLibLoaded || typeof Chart !== 'undefined') return true; return new Promise((resolve) => { const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/chart.js'; script.onload = () => { isChartLibLoaded = true; resolve(true); }; script.onerror = () => resolve(false); document.head.appendChild(script); }); }
function formatDateKey(date) { const offset = date.getTimezoneOffset(); const localDate = new Date(date.getTime() - (offset * 60 * 1000)); return localDate.toISOString().split('T')[0]; }

async function loadChartData(days) {
    if (!state.currentUser) return;

    // Update UI Toggle (pindah pill)
    updateChartToggleUI(days);

    await loadChartLibrary();
    const today = new Date();
    const tasks = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateKey = formatDateKey(d);
        const label = d.toLocaleDateString('id-ID', { weekday: 'short' });
        tasks.push(getDoc(doc(db, "users", state.currentUser.uid, "daily_records", dateKey)).then(snap => ({ snap, label, isToday: i === 0 })));
    }
    try {
        const results = await Promise.all(tasks);
        const labels = [];
        const dataPoints = [];
        let totalCompletedInPeriod = 0;
        results.forEach(({ snap, label, isToday }) => {
            labels.push(label);
            let count = 0;
            if (snap.exists()) {
                const data = snap.data();
                ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'].forEach(p => { if (data[p]) count++; });
            }
            dataPoints.push(count);
            totalCompletedInPeriod += count;
            if (isToday) {
                const statToday = document.getElementById('statToday');
                if (statToday) statToday.innerText = `${count}/5`;
            }
        });

        // Render grafik dengan data baru
        renderChart(labels, dataPoints);

        // Hitung dan animasikan konsistensi
        calculateConsistency(totalCompletedInPeriod, days);
    } catch (e) { console.error(e); }
}

function updateChartToggleUI(days) {
    const indicator = document.getElementById('chartTabIndicator');
    const btn7 = document.getElementById('btn7Days');
    const btn14 = document.getElementById('btn14Days');

    if (!indicator || !btn7 || !btn14) return;

    const is7Days = days === 7;

    // Slide indicator (Animasi CSS)
    indicator.style.transform = is7Days ? 'translateX(0)' : 'translateX(100%)';

    // Update Text Classes
    const activeClass = ["text-emerald-600", "dark:text-emerald-400", "font-black"];
    const inactiveClass = ["text-slate-400", "font-bold"];

    // Reset basics
    btn7.classList.remove(...activeClass, ...inactiveClass);
    btn14.classList.remove(...activeClass, ...inactiveClass);

    if (is7Days) {
        btn7.classList.add(...activeClass);
        btn14.classList.add(...inactiveClass);
    } else {
        btn14.classList.add(...activeClass);
        btn7.classList.add(...inactiveClass);
    }
}

// UPDATE: Render Chart dengan .update() untuk animasi halus
function renderChart(labels, data) {
    const ctx = document.getElementById('activityChart');
    if (!ctx || typeof Chart === 'undefined') return;

    // Jika grafik sudah ada, kita update isinya saja (animasi morphing)
    if (activityChart) {
        activityChart.data.labels = labels;
        activityChart.data.datasets[0].data = data;
        activityChart.update({
            duration: 800, // Durasi animasi update
            easing: 'easeOutQuart'
        });
    } else {
        // Jika belum ada, buat baru
        activityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Sholat Wajib',
                    data: data,
                    borderColor: '#10b981',
                    backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 160);
                        gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
                        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
                        return gradient;
                    },
                    borderWidth: 2,
                    pointBackgroundColor: '#ffffff',
                    pointRadius: 4,
                    tension: 0.4, // Kurva halus
                    clip: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart' // Easing halus saat pertama load
                },
                layout: { padding: { top: 15, bottom: 5, left: 10, right: 10 } },
                plugins: { legend: { display: false } },
                scales: {
                    y: { min: 0, max: 5, ticks: { stepSize: 1 }, display: false },
                    x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#94a3b8' } }
                }
            }
        });
    }
}

function setupLogoutListeners() { const logoutBtn = document.getElementById('logoutBtnProfile'); const cancelBtn = document.getElementById('cancelLogoutBtn'); const confirmBtn = document.getElementById('confirmLogoutBtn'); if (logoutBtn) logoutBtn.addEventListener('click', () => toggleLogoutModal(true)); if (cancelBtn) cancelBtn.addEventListener('click', () => toggleLogoutModal(false)); if (confirmBtn) confirmBtn.addEventListener('click', async () => { toggleLogoutModal(false); try { await signOut(auth); window.location.reload(); } catch (e) { console.error(e); } }); }
function openEditProfile() { const user = state.currentUser; if (!user) return; const modal = document.getElementById('editProfileModal'); const content = document.getElementById('editProfileContent'); const input = document.getElementById('editNameInput'); const dmToggle = document.getElementById('darkModeToggleProfile'); if (input) input.value = user.displayName || ""; if (dmToggle) dmToggle.checked = document.documentElement.classList.contains('dark'); if (modal) { modal.classList.remove('invisible', 'pointer-events-none'); document.getElementById('editProfileBackdrop').classList.add('opacity-100'); content.classList.remove('translate-y-full'); } }
function closeEditProfile() { const modal = document.getElementById('editProfileModal'); const content = document.getElementById('editProfileContent'); if (modal) { document.getElementById('editProfileBackdrop').classList.remove('opacity-100'); content.classList.add('translate-y-full'); setTimeout(() => modal.classList.add('invisible', 'pointer-events-none'), 500); } }
function toggleLogoutModal(show) { const modal = document.getElementById('logoutModal'); const content = document.getElementById('logoutModalContent'); if (!modal) return; if (show) { modal.classList.remove('invisible', 'pointer-events-none'); document.getElementById('logoutBackdrop').classList.add('opacity-100'); content.classList.remove('scale-90', 'opacity-0'); } else { document.getElementById('logoutBackdrop').classList.remove('opacity-100'); content.classList.add('scale-90', 'opacity-0'); setTimeout(() => modal.classList.add('invisible', 'pointer-events-none'), 300); } }