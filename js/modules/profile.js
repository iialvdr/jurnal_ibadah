import { auth, db } from '../config.js';
import { signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { state } from '../state.js';

let activityChart = null;
let isChartLibLoaded = false;

export function initProfile() {
    window.loadChartData = loadChartData;
    window.openEditProfile = openEditProfile;
    window.closeEditProfile = closeEditProfile;

    setupLogoutListeners();
    setupEditProfileListeners();

    // --- [AUTO-PATCH MODALS] ---
    const modals = [
        { id: 'editProfileModal', contentId: 'editProfileContent' },
        { id: 'logoutModal', contentId: 'logoutModalContent' }
    ];

    modals.forEach(({ id, contentId }) => {
        const m = document.getElementById(id);
        const c = document.getElementById(contentId);

        if (m) {
            m.classList.remove('hidden-force', 'backdrop-blur-sm', 'transition-all');
            m.classList.add('invisible', 'opacity-0', 'pointer-events-none', 'transition-opacity', 'duration-300', 'ease-out');
            if (m.classList.contains('bg-slate-900/60')) m.classList.remove('bg-slate-900/60');
            m.classList.add('bg-slate-900/90');
            m.addEventListener('click', (e) => {
                if (e.target === m) {
                    if (id === 'editProfileModal') closeEditProfile();
                    else toggleLogoutModal(false);
                }
            });
        }
        if (c) {
            c.classList.remove('transition-all');
            c.classList.add('transition-transform', 'duration-300', 'ease-out');
            c.style.willChange = "transform";
        }
    });

    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'profileView') updateProfileUI();
    });
}

function updateProfileUI() {
    const user = state.currentUser;
    if (!user) return;

    document.getElementById('profileNameLarge').innerText = user.displayName;
    document.getElementById('profileEmail').innerText = user.email;
    document.getElementById('lastLocation').innerText = state.lastCity || "Lokasi Tidak Dikenal";

    const img = document.getElementById('profilePhotoLarge');
    if (img) img.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=10b981&color=fff&size=128`;

    if (user.metadata) {
        const joinDate = new Date(user.metadata.creationTime);
        document.getElementById('joinDate').innerText = joinDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        const diff = Math.ceil(Math.abs(new Date() - joinDate) / (1000 * 60 * 60 * 24));
        document.getElementById('statDays').innerText = `${diff} Hari`;
    }

    // Load grafik sedikit delay agar animasi masuk halaman mulus dulu
    setTimeout(() => loadChartData(7), 300);
}

// [OPTIMASI] Lazy Load Library Chart.js (Hapus script di index.html jika pakai ini)
async function loadChartLibrary() {
    if (isChartLibLoaded || typeof Chart !== 'undefined') return true;
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => { isChartLibLoaded = true; resolve(true); };
        script.onerror = () => { console.error("Gagal load Chart.js"); resolve(false); };
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

    // Pastikan library siap sebelum lanjut
    await loadChartLibrary();

    const today = new Date();
    const tasks = [];

    // 1. Siapkan daftar request (Parallel Preparation)
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateKey = formatDateKey(d);
        const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

        // Push promise ke array, jangan await di sini!
        tasks.push(
            getDoc(doc(db, "users", state.currentUser.uid, "daily_records", dateKey))
                .then(snap => ({ snap, label, isToday: i === 0 }))
        );
    }

    try {
        // 2. Eksekusi semua request SERENTAK (Parallel Execution)
        // Ini membuat loading 7 hari sama cepatnya dengan loading 1 hari
        const results = await Promise.all(tasks);

        const labels = [];
        const dataPoints = [];
        let totalCompletedInPeriod = 0;

        results.forEach(({ snap, label, isToday }) => {
            labels.push(label);
            let count = 0;
            if (snap.exists()) {
                const data = snap.data();
                ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'].forEach(p => {
                    if (data[p]) count++;
                });
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

    } catch (e) {
        console.error("Error fetching chart data:", e);
    }
}

function calculateConsistency(totalCompleted, days) {
    const dailyTarget = 5;
    const maxPotential = days * dailyTarget;
    let percentage = Math.round((totalCompleted / maxPotential) * 100);
    if (percentage > 100) percentage = 100;
    const statEl = document.getElementById('statConsistency');
    if (statEl) {
        statEl.innerText = `${percentage}%`;
        if (percentage >= 80) statEl.className = "text-sm font-black text-emerald-500";
        else if (percentage >= 50) statEl.className = "text-sm font-black text-amber-500";
        else statEl.className = "text-sm font-black text-slate-800 dark:text-white";
    }
}

function updateChartToggleUI(days) {
    const btn7 = document.getElementById('btn7Days');
    const btn14 = document.getElementById('btn14Days');
    const activeClass = "px-3 py-1.5 text-[10px] rounded-lg font-bold transition shadow-sm bg-white dark:bg-slate-700 text-emerald-600";
    const inactiveClass = "px-3 py-1.5 text-[10px] rounded-lg font-bold transition text-slate-400 hover:text-emerald-600";
    if (days === 7) {
        if (btn7) btn7.className = activeClass;
        if (btn14) btn14.className = inactiveClass;
    } else {
        if (btn7) btn7.className = inactiveClass;
        if (btn14) btn14.className = activeClass;
    }
}

function renderChart(labels, data) {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;
    if (activityChart) activityChart.destroy();

    // Safety check kalau library gagal load
    if (typeof Chart === 'undefined') return;

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
                    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.3)');
                    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
                    return gradient;
                },
                borderWidth: 3,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#10b981',
                pointRadius: 4,
                pointHoverRadius: 6,
                pointHoverBorderWidth: 3,
                fill: true,
                tension: 0.3 // Sedikit curve biar lebih smooth
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    padding: 12,
                    cornerRadius: 12,
                    displayColors: false,
                    callbacks: { label: function (context) { return context.parsed.y + ' Wajib'; } }
                }
            },
            scales: {
                y: { beginAtZero: true, suggestedMax: 5, display: false },
                x: { grid: { display: false }, ticks: { font: { size: 10, family: 'Inter' }, color: '#94a3b8' } }
            },
            interaction: { intersect: false, mode: 'index' },
        }
    });
}

// ... (SISA KODE SAMA: openEditProfile, closeEditProfile, Listeners...) ...
function openEditProfile() {
    const user = state.currentUser;
    if (!user) return;
    const modal = document.getElementById('editProfileModal');
    const content = document.getElementById('editProfileContent');
    const input = document.getElementById('editNameInput');
    const dmToggle = document.getElementById('darkModeToggleProfile');
    if (input) input.value = user.displayName || "";
    if (dmToggle) {
        const isDark = document.documentElement.classList.contains('dark');
        dmToggle.checked = isDark;
    }
    if (modal) {
        modal.classList.remove('invisible', 'pointer-events-none');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            if (content) content.classList.remove('translate-y-20', 'scale-95');
        });
    }
}
function closeEditProfile() {
    const modal = document.getElementById('editProfileModal');
    const content = document.getElementById('editProfileContent');
    if (modal) {
        modal.classList.add('opacity-0');
        if (content) content.classList.add('translate-y-20', 'scale-95');
        setTimeout(() => { modal.classList.add('invisible', 'pointer-events-none'); }, 300);
    }
}
function setupEditProfileListeners() {
    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const input = document.getElementById('editNameInput');
            const newName = input.value.trim();
            if (!newName) return alert("Nama tidak boleh kosong!");
            const originalText = saveBtn.innerText;
            saveBtn.innerText = "Menyimpan...";
            saveBtn.disabled = true;
            try {
                if (auth.currentUser) {
                    await updateProfile(auth.currentUser, { displayName: newName });
                    state.currentUser.displayName = newName;
                    updateProfileUI();
                    const homeName = document.getElementById('homeUserName');
                    if (homeName) homeName.innerText = newName;
                    closeEditProfile();
                }
            } catch (error) { console.error("Gagal update:", error); alert("Gagal menyimpan."); }
            finally { saveBtn.innerText = originalText; saveBtn.disabled = false; }
        });
    }
    const dmToggle = document.getElementById('darkModeToggleProfile');
    if (dmToggle) { dmToggle.addEventListener('change', () => { if (window.toggleDarkMode) window.toggleDarkMode(); }); }
}
function setupLogoutListeners() {
    const logoutBtn = document.getElementById('logoutBtnProfile');
    const cancelBtn = document.getElementById('cancelLogoutBtn');
    const confirmBtn = document.getElementById('confirmLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => toggleLogoutModal(true));
    if (cancelBtn) cancelBtn.addEventListener('click', () => toggleLogoutModal(false));
    if (confirmBtn) confirmBtn.addEventListener('click', async () => {
        toggleLogoutModal(false);
        try { await signOut(auth); window.location.reload(); } catch (e) { console.error("Logout error", e); }
    });
}
function toggleLogoutModal(show) {
    const modal = document.getElementById('logoutModal');
    const content = document.getElementById('logoutModalContent');
    if (!modal) return;
    if (show) {
        modal.classList.remove('invisible', 'pointer-events-none');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            if (content) { content.classList.remove('scale-90'); content.classList.add('scale-100'); }
        });
    } else {
        modal.classList.add('opacity-0');
        if (content) { content.classList.remove('scale-100'); content.classList.add('scale-90'); }
        setTimeout(() => { modal.classList.add('invisible', 'pointer-events-none'); }, 300);
    }
}