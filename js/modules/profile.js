import { auth, db } from '../config.js';
import { signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { state } from '../state.js';

let activityChart = null; // Instance Chart.js

export function initProfile() {
    window.loadChartData = loadChartData;
    
    // Expose fungsi modal ke window
    window.openEditProfile = openEditProfile;
    window.closeEditProfile = closeEditProfile;
    
    setupLogoutListeners();
    setupEditProfileListeners();
    
    window.addEventListener('viewChanged', (e) => {
        if(e.detail.viewId === 'profileView') updateProfileUI();
    });
}

function updateProfileUI() {
    const user = state.currentUser;
    if(!user) return;
    
    // 1. Basic Info
    document.getElementById('profileNameLarge').innerText = user.displayName;
    document.getElementById('profileEmail').innerText = user.email;
    document.getElementById('lastLocation').innerText = state.lastCity || "Lokasi Tidak Dikenal";
    
    // Photo
    const img = document.getElementById('profilePhotoLarge');
    if(img) img.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=10b981&color=fff&size=128`;

    // 2. Journey Stats (Bergabung Sejak)
    if (user.metadata) {
        const joinDate = new Date(user.metadata.creationTime);
        document.getElementById('joinDate').innerText = joinDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        
        const diff = Math.ceil(Math.abs(new Date() - joinDate) / (1000 * 60 * 60 * 24)); 
        document.getElementById('statDays').innerText = `${diff} Hari`;
    }
    
    // 3. Load Chart & Advanced Stats
    setTimeout(() => loadChartData(7), 300);
}

function formatDateKey(date) { 
    const offset = date.getTimezoneOffset(); 
    const localDate = new Date(date.getTime() - (offset*60*1000)); 
    return localDate.toISOString().split('T')[0]; 
}

async function loadChartData(days) {
    if(!state.currentUser) return;
    
    updateChartToggleUI(days);

    const labels = [];
    const dataPoints = [];
    const today = new Date();
    let totalCompletedInPeriod = 0;
    
    // Loop mundur dari hari ini
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateKey = formatDateKey(d);
        
        // Label Sumbu X
        labels.push(d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        
        try {
            const docRef = doc(db, "users", state.currentUser.uid, "daily_records", dateKey);
            const docSnap = await getDoc(docRef);
            
            let count = 0;
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Hitung total checklist (Wajib + Sunnah)
                ['Subuh', 'Dhuha', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya', 'Tahajud'].forEach(p => {
                    if (data[p]) count++;
                });
            }
            dataPoints.push(count);
            totalCompletedInPeriod += count;

            // Update "Hari Ini" khusus jika i=0
            if(i === 0) {
                 const statToday = document.getElementById('statToday');
                 if(statToday) statToday.innerText = `${count}/7`; 
            }

        } catch (e) {
            console.error("Error fetching data:", e);
            dataPoints.push(0);
        }
    }

    renderChart(labels, dataPoints);
    calculateConsistency(totalCompletedInPeriod, days);
}

function calculateConsistency(totalCompleted, days) {
    // Target harian = 5 sholat wajib
    const dailyTarget = 5; 
    const maxPotential = days * dailyTarget; 
    
    let percentage = Math.round((totalCompleted / maxPotential) * 100);
    // Cap visual di 100% jika rajin sunnah
    if(percentage > 100) percentage = 100;
    
    const statEl = document.getElementById('statConsistency');
    if(statEl) {
        statEl.innerText = `${percentage}%`;
        if(percentage >= 80) statEl.className = "text-sm font-black text-emerald-500";
        else if(percentage >= 50) statEl.className = "text-sm font-black text-amber-500";
        else statEl.className = "text-sm font-black text-slate-800 dark:text-white";
    }
}

function updateChartToggleUI(days) {
    const btn7 = document.getElementById('btn7Days');
    const btn14 = document.getElementById('btn14Days');
    const activeClass = "px-3 py-1.5 text-[10px] rounded-lg font-bold transition shadow-sm bg-white dark:bg-slate-700 text-emerald-600";
    const inactiveClass = "px-3 py-1.5 text-[10px] rounded-lg font-bold transition text-slate-400 hover:text-emerald-600";
    
    if(days === 7) {
        if(btn7) btn7.className = activeClass;
        if(btn14) btn14.className = inactiveClass;
    } else {
        if(btn7) btn7.className = inactiveClass;
        if(btn14) btn14.className = activeClass;
    }
}

function renderChart(labels, data) {
    const ctx = document.getElementById('activityChart');
    if(!ctx) return;
    
    if (activityChart) activityChart.destroy();
    if (typeof Chart === 'undefined') return;

    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ibadah',
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
                tension: 0.4
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
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y + ' Ibadah';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    suggestedMax: 7,
                    display: false 
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 10, family: 'Inter' },
                        color: '#94a3b8'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
        }
    });
}

// === LOGIKA EDIT PROFILE ===
function openEditProfile() {
    const user = state.currentUser;
    if(!user) return;

    const modal = document.getElementById('editProfileModal');
    const content = document.getElementById('editProfileContent');
    const input = document.getElementById('editNameInput');

    if(input) input.value = user.displayName || "";

    if(modal) {
        modal.classList.remove('hidden-force');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            if(content) {
                content.classList.remove('translate-y-20', 'scale-95');
            }
        });
    }
}

function closeEditProfile() {
    const modal = document.getElementById('editProfileModal');
    const content = document.getElementById('editProfileContent');

    if(modal) {
        modal.classList.add('opacity-0');
        if(content) {
            content.classList.add('translate-y-20', 'scale-95');
        }
        setTimeout(() => modal.classList.add('hidden-force'), 300);
    }
}

function setupEditProfileListeners() {
    const saveBtn = document.getElementById('saveProfileBtn');
    if(saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const input = document.getElementById('editNameInput');
            const newName = input.value.trim();
            
            if(!newName) return alert("Nama tidak boleh kosong!");

            const originalText = saveBtn.innerText;
            saveBtn.innerText = "Menyimpan...";
            saveBtn.disabled = true;

            try {
                if(auth.currentUser) {
                    await updateProfile(auth.currentUser, {
                        displayName: newName
                    });
                    
                    state.currentUser.displayName = newName;
                    updateProfileUI(); 
                    
                    const homeName = document.getElementById('homeUserName');
                    if(homeName) homeName.innerText = newName;
                    
                    closeEditProfile();
                }
            } catch (error) {
                console.error("Gagal update profil:", error);
                alert("Gagal menyimpan perubahan.");
            } finally {
                saveBtn.innerText = originalText;
                saveBtn.disabled = false;
            }
        });
    }
}

// === LOGIKA LOGOUT ===
function setupLogoutListeners() {
    const logoutBtn = document.getElementById('logoutBtnProfile');
    const cancelBtn = document.getElementById('cancelLogoutBtn');
    const confirmBtn = document.getElementById('confirmLogoutBtn');

    if(logoutBtn) logoutBtn.addEventListener('click', () => toggleLogoutModal(true));
    if(cancelBtn) cancelBtn.addEventListener('click', () => toggleLogoutModal(false));
    
    if(confirmBtn) confirmBtn.addEventListener('click', async () => {
        toggleLogoutModal(false);
        try {
            await signOut(auth);
            window.location.reload(); 
        } catch(e) {
            console.error("Logout error", e);
        }
    });
}

function toggleLogoutModal(show) {
    const modal = document.getElementById('logoutModal');
    const content = document.getElementById('logoutModalContent');
    if(!modal) return;
    
    if(show) {
        modal.classList.remove('hidden-force');
        requestAnimationFrame(() => {
            modal.classList.remove('opacity-0');
            if(content) { content.classList.remove('scale-90'); content.classList.add('scale-100'); }
        });
    } else {
        modal.classList.add('opacity-0');
        if(content) { content.classList.remove('scale-100'); content.classList.add('scale-90'); }
        setTimeout(() => modal.classList.add('hidden-force'), 300);
    }
}