import { auth, db } from '../config.js';
import { signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { state } from '../state.js';
import { APP_VERSION } from '../version.js';

let activityChart = null;
let isChartLibLoaded = false;

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
        }
    });
}

function updateProfileUI() {
    const footerVer = document.getElementById('versionTextProfile');
    if (footerVer) footerVer.innerText = APP_VERSION;

    const user = state.currentUser;
    if (!user) return;

    const nameEl = document.getElementById('profileNameLarge');
    const emailEl = document.getElementById('profileEmail');
    if (nameEl) nameEl.innerText = user.displayName;
    if (emailEl) emailEl.innerText = user.email;

    const locEl = document.getElementById('lastLocation');
    if (locEl) locEl.innerText = state.lastCity || "Lokasi Anda";

    const img = document.getElementById('profilePhotoLarge');
    if (img) img.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=10b981&color=fff&size=128`;

    if (user.metadata) {
        const joinDate = new Date(user.metadata.creationTime);
        const joinEl = document.getElementById('joinDate');
        if (joinEl) joinEl.innerText = joinDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

        const diff = Math.ceil(Math.abs(new Date() - joinDate) / (1000 * 60 * 60 * 24));
        const dayEl = document.getElementById('statDays');
        if (dayEl) dayEl.innerText = `${diff}`;
    }

    setTimeout(() => loadChartData(7), 300);
}

function openEditProfile() {
    const user = state.currentUser;
    if (!user) return;
    const modal = document.getElementById('editProfileModal');
    const backdrop = document.getElementById('editProfileBackdrop');
    const content = document.getElementById('editProfileContent');
    const input = document.getElementById('editNameInput');
    const dmToggle = document.getElementById('darkModeToggleProfile');

    if (input) input.value = user.displayName || "";
    if (dmToggle) dmToggle.checked = document.documentElement.classList.contains('dark');

    if (modal && content && backdrop) {
        modal.classList.remove('invisible', 'pointer-events-none');
        requestAnimationFrame(() => {
            backdrop.classList.add('opacity-100');
            content.classList.remove('translate-y-full');
        });
    }
}

function closeEditProfile() {
    const modal = document.getElementById('editProfileModal');
    const backdrop = document.getElementById('editProfileBackdrop');
    const content = document.getElementById('editProfileContent');
    if (modal && content && backdrop) {
        backdrop.classList.remove('opacity-100');
        content.classList.add('translate-y-full');
        setTimeout(() => modal.classList.add('invisible', 'pointer-events-none'), 500);
    }
}

function toggleLogoutModal(show) {
    const modal = document.getElementById('logoutModal');
    const backdrop = document.getElementById('logoutBackdrop');
    const content = document.getElementById('logoutModalContent');
    if (!modal) return;
    if (show) {
        modal.classList.remove('invisible', 'pointer-events-none');
        requestAnimationFrame(() => {
            backdrop.classList.add('opacity-100');
            content.classList.remove('scale-90', 'opacity-0');
        });
    } else {
        backdrop.classList.remove('opacity-100');
        content.classList.add('scale-90', 'opacity-0');
        setTimeout(() => modal.classList.add('invisible', 'pointer-events-none'), 300);
    }
}

function setupEditProfileListeners() {
    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const input = document.getElementById('editNameInput');
            const newName = input.value.trim();
            if (!newName) return;
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = "Menyimpan...";
            saveBtn.disabled = true;
            try {
                if (auth.currentUser) {
                    await updateProfile(auth.currentUser, { displayName: newName });
                    state.currentUser.displayName = newName;
                    updateProfileUI();
                    // Update nama di home juga
                    const homeName = document.getElementById('homeUserName');
                    if (homeName) homeName.innerText = newName;
                    closeEditProfile();
                }
            } catch (error) { console.error(error); }
            finally { saveBtn.disabled = false; saveBtn.innerHTML = originalText; if (window.lucide) window.lucide.createIcons(); }
        });
    }
    const dmToggle = document.getElementById('darkModeToggleProfile');
    if (dmToggle) {
        dmToggle.addEventListener('change', () => { if (window.toggleDarkMode) window.toggleDarkMode(); });
    }
}

async function loadChartLibrary() {
    if (isChartLibLoaded || typeof Chart !== 'undefined') return true;
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => { isChartLibLoaded = true; resolve(true); };
        script.onerror = () => resolve(false);
        document.head.appendChild(script);
    });
}

function formatDateKey(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}

async function loadChartData(days) {
    if (!state.currentUser) return;
    updateChartToggleUI(days);
    await loadChartLibrary();

    const today = new Date();
    const tasks = [];

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateKey = formatDateKey(d);
        const label = d.toLocaleDateString('id-ID', { weekday: 'short' });

        tasks.push(
            getDoc(doc(db, "users", state.currentUser.uid, "daily_records", dateKey))
                .then(snap => ({ snap, label, isToday: i === 0 }))
        );
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

        renderChart(labels, dataPoints);
        calculateConsistency(totalCompletedInPeriod, days);
    } catch (e) { console.error(e); }
}

function calculateConsistency(totalCompleted, days) {
    const dailyTarget = 5;
    const maxPotential = days * dailyTarget;
    let percentage = Math.round((totalCompleted / maxPotential) * 100);
    if (percentage > 100) percentage = 100;
    const statEl = document.getElementById('statConsistency');
    if (statEl) {
        statEl.innerText = `${percentage}%`;
        statEl.className = "block text-sm font-black leading-none";
        if (percentage >= 80) statEl.classList.add("text-emerald-500");
        else if (percentage >= 50) statEl.classList.add("text-amber-500");
        else statEl.classList.add("text-slate-800", "dark:text-white");
    }
}

function updateChartToggleUI(days) {
    const btn7 = document.getElementById('btn7Days');
    const btn14 = document.getElementById('btn14Days');
    const activeClass = ["bg-white", "dark:bg-slate-700", "text-emerald-600", "shadow-sm"];
    const inactiveClass = ["text-slate-400", "hover:text-emerald-600"];
    if (btn7 && btn14) {
        btn7.classList.remove(...activeClass, ...inactiveClass);
        btn14.classList.remove(...activeClass, ...inactiveClass);
        if (days === 7) { btn7.classList.add(...activeClass); btn14.classList.add(...inactiveClass); }
        else { btn7.classList.add(...inactiveClass); btn14.classList.add(...activeClass); }
    }
}

function renderChart(labels, data) {
    const ctx = document.getElementById('activityChart');
    if (!ctx || typeof Chart === 'undefined') return;
    if (activityChart) activityChart.destroy();

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
                pointBorderColor: '#10b981',
                pointRadius: 3,
                pointHoverRadius: 5,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: true } },
            scales: {
                y: { beginAtZero: true, max: 5, display: false },
                x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#94a3b8' } }
            },
            interaction: { intersect: false, mode: 'index' },
        }
    });
}

function setupLogoutListeners() {
    const logoutBtn = document.getElementById('logoutBtnProfile');
    const cancelBtn = document.getElementById('cancelLogoutBtn');
    const confirmBtn = document.getElementById('confirmLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => toggleLogoutModal(true));
    if (cancelBtn) cancelBtn.addEventListener('click', () => toggleLogoutModal(false));
    if (confirmBtn) confirmBtn.addEventListener('click', async () => {
        toggleLogoutModal(false);
        try { await signOut(auth); window.location.reload(); } catch (e) { console.error(e); }
    });
}