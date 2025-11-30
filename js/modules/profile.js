import { auth, db } from '../config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { state } from '../state.js';

let activityChart = null; // Variabel untuk menyimpan instance chart

export function initProfile() {
    window.loadChartData = loadChartData;
    setupLogoutListeners();
    
    window.addEventListener('viewChanged', (e) => {
        if(e.detail.viewId === 'profileView') updateProfileUI();
    });
}

function updateProfileUI() {
    const user = state.currentUser;
    if(!user) return;
    
    document.getElementById('profileNameLarge').innerText = user.displayName;
    document.getElementById('profileEmail').innerText = user.email;
    document.getElementById('lastLocation').innerText = state.lastCity;
    const img = document.getElementById('profilePhotoLarge');
    if(img) img.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=10b981&color=fff`;

    if (user.metadata) {
        const joinDate = new Date(user.metadata.creationTime);
        document.getElementById('joinDate').innerText = joinDate.toLocaleDateString('id-ID');
        const diff = Math.ceil(Math.abs(new Date() - joinDate) / (1000 * 60 * 60 * 24)); 
        document.getElementById('statDays').innerText = `${diff} Hari`;
    }
    
    // Load chart default 7 hari terakhir
    setTimeout(() => loadChartData(7), 300);
}

// Helper untuk format tanggal key (sama kayak di tracker.js)
function formatDateKey(date) { 
    const offset = date.getTimezoneOffset(); 
    const localDate = new Date(date.getTime() - (offset*60*1000)); 
    return localDate.toISOString().split('T')[0]; 
}

async function loadChartData(days) {
    if(!state.currentUser) return;
    
    // Update Tampilan Tombol (Aktif/Nonaktif)
    const btn7 = document.getElementById('btn7Days');
    const btn14 = document.getElementById('btn14Days');
    
    if(days === 7) {
        if(btn7) btn7.className = "px-2 py-1 text-[10px] rounded-md font-medium transition shadow-sm bg-white dark:bg-slate-600 text-emerald-600";
        if(btn14) btn14.className = "px-2 py-1 text-[10px] rounded-md font-medium transition text-slate-500 hover:text-emerald-600";
    } else {
        if(btn7) btn7.className = "px-2 py-1 text-[10px] rounded-md font-medium transition text-slate-500 hover:text-emerald-600";
        if(btn14) btn14.className = "px-2 py-1 text-[10px] rounded-md font-medium transition shadow-sm bg-white dark:bg-slate-600 text-emerald-600";
    }

    const labels = [];
    const dataPoints = [];
    const today = new Date();
    
    // Loop mundur dari hari ini ke belakang
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateKey = formatDateKey(d);
        
        // Label Sumbu X (Tgl)
        labels.push(d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        
        try {
            const docRef = doc(db, "users", state.currentUser.uid, "daily_records", dateKey);
            const docSnap = await getDoc(docRef);
            
            let count = 0;
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Hitung ibadah yang bernilai 'true'
                ['Subuh', 'Dhuha', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya', 'Tahajud'].forEach(p => {
                    if (data[p]) count++;
                });
            }
            dataPoints.push(count);

            // Bonus: Update statistik "Hari Ini" di kartu profil
            if(i === 0) {
                 const statToday = document.getElementById('statToday');
                 if(statToday) statToday.innerText = `${count}`; 
            }
        } catch (e) {
            console.error("Error fetching chart data:", e);
            dataPoints.push(0);
        }
    }

    renderChart(labels, dataPoints);
}

function renderChart(labels, data) {
    const ctx = document.getElementById('activityChart');
    if(!ctx) return;
    
    // Hancurkan chart lama jika ada agar tidak numpuk/glitch
    if (activityChart) {
        activityChart.destroy();
    }
    
    // Pastikan library Chart.js sudah load
    if (typeof Chart === 'undefined') return;

    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ibadah Selesai',
                data: data,
                borderColor: '#10b981', // Warna Emerald
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
                    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
                    gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
                    return gradient;
                },
                borderWidth: 2,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#10b981',
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.4 // Garis lengkung halus
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    padding: 10,
                    cornerRadius: 10,
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
                    suggestedMax: 7, // 5 Wajib + 2 Sunnah
                    display: false // Sembunyikan label Y biar bersih
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 9 },
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
            // Router akan handle auth state change otomatis di app.js
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