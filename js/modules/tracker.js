import { state, setCurrentRecords } from '../state.js';
import { db } from '../config.js';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getHijriDate } from '../utils/date-utils.js';
import { getFastingInfo } from './fasting.js';

const PRAYER_CONFIG = [
    {
        id: 'Subuh', type: 'wajib', icon: 'sunrise',
        bgGradient: 'from-sky-400 to-blue-500',
        activeBg: 'bg-sky-50 dark:bg-sky-900/20',
        activeBorder: 'border-sky-200 dark:border-sky-800',
        textActive: 'text-sky-700 dark:text-sky-300'
    },
    {
        id: 'Dhuha', type: 'sunnah', icon: 'sun',
        bgGradient: 'from-amber-300 to-orange-400',
        activeBg: 'bg-amber-50 dark:bg-amber-900/20',
        activeBorder: 'border-amber-200 dark:border-amber-800',
        textActive: 'text-amber-700 dark:text-amber-300'
    },
    {
        id: 'Dzuhur', type: 'wajib', icon: 'sun-medium',
        bgGradient: 'from-yellow-400 to-amber-500',
        activeBg: 'bg-yellow-50 dark:bg-yellow-900/20',
        activeBorder: 'border-yellow-200 dark:border-yellow-800',
        textActive: 'text-yellow-700 dark:text-yellow-300'
    },
    {
        id: 'Ashar', type: 'wajib', icon: 'cloud-sun',
        bgGradient: 'from-orange-400 to-red-400',
        activeBg: 'bg-orange-50 dark:bg-orange-900/20',
        activeBorder: 'border-orange-200 dark:border-orange-800',
        textActive: 'text-orange-700 dark:text-orange-300'
    },
    {
        id: 'Maghrib', type: 'wajib', icon: 'sunset',
        bgGradient: 'from-indigo-400 to-purple-500',
        activeBg: 'bg-indigo-50 dark:bg-indigo-900/20',
        activeBorder: 'border-indigo-200 dark:border-indigo-800',
        textActive: 'text-indigo-700 dark:text-indigo-300'
    },
    {
        id: 'Isya', type: 'wajib', icon: 'moon',
        bgGradient: 'from-slate-600 to-slate-800',
        activeBg: 'bg-slate-100 dark:bg-slate-800',
        activeBorder: 'border-slate-200 dark:border-slate-700',
        textActive: 'text-slate-700 dark:text-slate-300'
    },
    {
        id: 'Tahajud', type: 'sunnah', icon: 'star',
        bgGradient: 'from-violet-500 to-fuchsia-600',
        activeBg: 'bg-violet-50 dark:bg-violet-900/20',
        activeBorder: 'border-violet-200 dark:border-violet-800',
        textActive: 'text-violet-700 dark:text-violet-300'
    }
];

const EXTRA_IBADAH = [
    { id: 'Tilawah', label: 'Baca Al-Qur\'an', icon: 'book-open', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { id: 'Sedekah', label: 'Sedekah Harian', icon: 'heart', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { id: 'Sholawat', label: 'Sholawat Nabi', icon: 'sparkles', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { id: 'Dzikir', label: 'Dzikir Pagi/Petang', icon: 'zap', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' }
];

let trackerSchedule = {};
let historyDate = new Date();
const PRAYER_SETTINGS_KEY = 'jurnal_prayer_settings_v1';
const DEFAULT_PRAYER_SETTINGS = { tahajudTime: '03:00' };
const PRAYER_SETTINGS_PANEL_KEY = 'jurnal_prayer_settings_panel';
const PRAYER_SETTINGS_PROMPT = "Silakan atur jam Tahajud. Waktu harus sebelum Subuh.";

export function initTracker() {
    window.changeDate = changeDate;
    window.resetToToday = resetToToday;
    window.togglePrayer = togglePrayer;
    window.changeTrackerTab = changeTrackerTab;
    window.changeMonth = changeMonth;
    window.goToDate = goToDate;
    window.saveManualNote = saveManualNote; // Daftarkan fungsi simpan manual baru
    window.savePrayerSettings = savePrayerSettings;
    window.getPrayerSettings = getPrayerSettings;
    window.savePrayerSettingsForm = savePrayerSettingsForm;
    window.togglePrayerSettingsPanel = togglePrayerSettingsPanel;

    state.trackerDate = new Date();

    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'trackerView') {
            updateTrackerUI();
            loadRecordsFromCloud();
        }
    });
}

function formatDateKey(date) {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split('T')[0];
}

function normalizeTimeString(timeStr, fallback) {
    if (typeof timeStr !== 'string') return fallback;
    const match = timeStr.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
    return match ? timeStr : fallback;
}

function parseTimeToMinutes(timeStr) {
    const valid = normalizeTimeString(timeStr, null);
    if (!valid) return null;
    const [h, m] = valid.split(':').map(Number);
    return (h * 60) + m;
}

function getSubuhMinutesForValidation() {
    const subuhTime = (trackerSchedule && trackerSchedule.Subuh) ? trackerSchedule.Subuh : state.prayerTimes.Subuh;
    const minutes = parseTimeToMinutes(subuhTime);
    return minutes !== null ? minutes : (5 * 60);
}

function setPrayerSettingsMessage(message, type = 'error') {
    const help = document.getElementById('prayerSettingsHelp');
    if (!help) return;
    if (!message) {
        help.classList.add('hidden');
        return;
    }
    help.innerText = message;
    help.classList.remove('hidden');
    help.classList.toggle('text-rose-500', type === 'error');
    help.classList.toggle('bg-rose-50', type === 'error');
    help.classList.toggle('dark:bg-rose-900/20', type === 'error');
    help.classList.toggle('border-rose-100', type === 'error');
    help.classList.toggle('dark:border-rose-800/40', type === 'error');

    help.classList.toggle('text-amber-600', type === 'info');
    help.classList.toggle('bg-amber-50', type === 'info');
    help.classList.toggle('dark:bg-amber-900/20', type === 'info');
    help.classList.toggle('border-amber-100', type === 'info');
    help.classList.toggle('dark:border-amber-800/40', type === 'info');
}

export function getPrayerSettings() {
    try {
        const raw = localStorage.getItem(PRAYER_SETTINGS_KEY);
        if (!raw) return { ...DEFAULT_PRAYER_SETTINGS };
        const parsed = JSON.parse(raw);
        return {
            tahajudTime: normalizeTimeString(parsed.tahajudTime, DEFAULT_PRAYER_SETTINGS.tahajudTime)
        };
    } catch (e) {
        return { ...DEFAULT_PRAYER_SETTINGS };
    }
}

export function savePrayerSettings(settings = {}) {
    const current = getPrayerSettings();
    const next = {
        tahajudTime: normalizeTimeString(settings.tahajudTime, current.tahajudTime)
    };
    try {
        localStorage.setItem(PRAYER_SETTINGS_KEY, JSON.stringify(next));
    } catch (e) { }
    calculateTrackerSchedule();
    renderPrayers();
    return next;
}

function syncPrayerSettingsForm() {
    const inputTahajud = document.getElementById('prayerTahajudTime');
    if (!inputTahajud) return;
    const settings = getPrayerSettings();
    inputTahajud.value = settings.tahajudTime;
}

function togglePrayerSettingsPanel(forceOpen = null) {
    const panel = document.getElementById('prayerSettingsPanel');
    const chevron = document.getElementById('prayerSettingsChevron');
    if (!panel || !chevron) return;
    const isOpen = forceOpen !== null ? forceOpen : panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !isOpen);
    chevron.classList.toggle('rotate-180', isOpen);
    if (isOpen) setPrayerSettingsMessage(PRAYER_SETTINGS_PROMPT, 'info');
    else setPrayerSettingsMessage('');
    try {
        localStorage.setItem(PRAYER_SETTINGS_PANEL_KEY, isOpen ? 'open' : 'closed');
    } catch (e) { }
    if (window.lucide) lucide.createIcons({ root: chevron });
}

function savePrayerSettingsForm() {
    const inputTahajud = document.getElementById('prayerTahajudTime');
    if (!inputTahajud) return;

    setPrayerSettingsMessage('');

    const tahajudMinutes = parseTimeToMinutes(inputTahajud.value);
    const subuhMinutes = getSubuhMinutesForValidation();
    if (tahajudMinutes === null || tahajudMinutes >= subuhMinutes) {
        const msg = "Waktu Tahajud harus sebelum waktu Subuh.";
        setPrayerSettingsMessage(msg, 'error');
        if (typeof window.showAppToast === 'function') window.showAppToast(msg, "error");
        const current = getPrayerSettings();
        inputTahajud.value = current.tahajudTime;
        return;
    }

    const next = savePrayerSettings({
        tahajudTime: inputTahajud.value
    });
    inputTahajud.value = next.tahajudTime;
    if (typeof window.showAppToast === 'function') window.showAppToast("Pengaturan tersimpan", "success");
}

function calculateTrackerSchedule() {
    const prayerSettings = getPrayerSettings();
    if (typeof adhan === 'undefined' || !window.lastLat || !window.lastLng) {
        trackerSchedule = { ...state.prayerTimes };
        trackerSchedule.Tahajud = prayerSettings.tahajudTime;
        if (!trackerSchedule.Dhuha || trackerSchedule.Dhuha === '--:--') {
            trackerSchedule.Dhuha = '--:--';
        }
        return;
    }
    const coordinates = new adhan.Coordinates(window.lastLat, window.lastLng);
    const date = state.trackerDate;
    const params = adhan.CalculationMethod.Singapore();
    const prayerTimes = new adhan.PrayerTimes(coordinates, date, params);
    const timeFormat = (t) => t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');
    const dhuhaTime = new Date(prayerTimes.sunrise.getTime() + (20 * 60000));

    trackerSchedule = {
        Subuh: timeFormat(prayerTimes.fajr),
        Dhuha: timeFormat(dhuhaTime),
        Dzuhur: timeFormat(prayerTimes.dhuhr),
        Ashar: timeFormat(prayerTimes.asr),
        Maghrib: timeFormat(prayerTimes.maghrib),
        Isya: timeFormat(prayerTimes.isha),
        Tahajud: prayerSettings.tahajudTime
    };
}

async function updateTrackerUI() {
    const elDate = document.getElementById('dateDisplay');
    if (elDate) {
        elDate.innerText = state.trackerDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
    }
    const today = new Date();
    const isToday = state.trackerDate.getDate() === today.getDate() &&
        state.trackerDate.getMonth() === today.getMonth() &&
        state.trackerDate.getFullYear() === today.getFullYear();

    const resetBtn = document.getElementById('resetDateContainer');
    const hijriDisplay = document.getElementById('trackerHijriDisplay');
    if (resetBtn) { if (isToday) resetBtn.classList.add('hidden'); else resetBtn.classList.remove('hidden'); }
    calculateTrackerSchedule();

    if (hijriDisplay) {
        const h = getHijriDate(state.trackerDate);
        hijriDisplay.innerText = h.full;
    }
    syncPrayerSettingsForm();
    try {
        const savedPanel = localStorage.getItem(PRAYER_SETTINGS_PANEL_KEY);
        togglePrayerSettingsPanel(savedPanel === 'open');
    } catch (e) {
        togglePrayerSettingsPanel(false);
    }
    if (window.lucide) lucide.createIcons();
}

export async function loadRecordsFromCloud() {
    if (!state.currentUser) return;
    const dateKey = formatDateKey(state.trackerDate);
    const noteEl = document.getElementById('trackerNote');
    
    try {
        const docSnap = await getDoc(doc(db, "users", state.currentUser.uid, "daily_records", dateKey));
        const data = docSnap.exists() ? docSnap.data() : {};
        setCurrentRecords(data);
        if (noteEl) noteEl.value = data.notes || "";
    } catch (e) { console.error(e); }
    finally { renderPrayers(); renderExtraIbadah(); }
}

function changeDate(days) {
    state.trackerDate.setDate(state.trackerDate.getDate() + days);
    updateTrackerUI();
    loadRecordsFromCloud();
}

function resetToToday() {
    state.trackerDate = new Date();
    updateTrackerUI();
    loadRecordsFromCloud();
}

function togglePrayer(id, locked) {
    if (locked) { if (navigator.vibrate) navigator.vibrate(200); return; }
    if (navigator.vibrate) navigator.vibrate(50);

    const newState = !state.currentRecords[id];
    state.currentRecords[id] = newState;

    updateProgressBar();
    saveToCloud();
    
    const card = document.getElementById(`prayer-card-${id}`);
    const p = PRAYER_CONFIG.find(x => x.id === id);
    if (card && p) updateCardVisuals(card, p, newState);
    else renderExtraIbadah(); 
}

/**
 * Fungsi untuk menyimpan catatan secara manual
 */
async function saveManualNote() {
    const noteEl = document.getElementById('trackerNote');
    const btnEl = document.getElementById('saveNoteBtn');
    const statusEl = document.getElementById('noteStatus');
    
    if (!noteEl || !btnEl) return;

    btnEl.innerText = "PROSES...";
    btnEl.disabled = true;

    try {
        state.currentRecords.notes = noteEl.value;
        await saveToCloud();
        
        // Berikan feedback visual
        if (statusEl) {
            statusEl.classList.remove('opacity-0');
            setTimeout(() => statusEl.classList.add('opacity-0'), 2500);
        }
        if (typeof window.showAppToast === 'function') window.showAppToast("Catatan tersimpan", "success");
    } catch (e) {
        console.error("Gagal simpan catatan:", e);
        if (typeof window.showAppToast === 'function') {
            window.showAppToast("Gagal menyimpan catatan. Periksa koneksi.", "error");
        } else {
            alert("Gagal menyimpan catatan. Periksa koneksi internet Anda.");
        }
    } finally {
        btnEl.innerText = "SIMPAN";
        btnEl.disabled = false;
    }
}

function saveToCloud() {
    if (!state.currentUser) return;
    const dateKey = formatDateKey(state.trackerDate);
    return setDoc(doc(db, "users", state.currentUser.uid, "daily_records", dateKey), { 
        ...state.currentRecords, 
        last_updated: new Date() 
    }, { merge: true });
}

function checkTimeAvailability(prayerTimeStr) {
    if (!prayerTimeStr || prayerTimeStr === '--:--') return { locked: true };
    const [h, m] = prayerTimeStr.split(':').map(Number);
    const pDate = new Date(state.trackerDate.getTime());
    pDate.setHours(h, m, 0, 0);
    const now = new Date();
    const todayZero = new Date(); todayZero.setHours(0, 0, 0, 0);
    const currentZero = new Date(state.trackerDate.getTime()); currentZero.setHours(0, 0, 0, 0);
    if (currentZero.getTime() < todayZero.getTime()) return { locked: false };
    if (currentZero.getTime() > todayZero.getTime()) return { locked: true };
    if (now.getTime() < pDate.getTime()) return { locked: true };
    return { locked: false };
}

function updateCardVisuals(card, p, isDone) {
    if (isDone) {
        card.className = `group relative flex items-center justify-between p-3.5 md:p-4 rounded-[1.5rem] md:rounded-[1.8rem] border transition-all duration-300 shadow-sm ${p.activeBg} ${p.activeBorder}`;
    } else {
        card.className = `group relative flex items-center justify-between p-3.5 md:p-4 rounded-[1.5rem] md:rounded-[1.8rem] border transition-all duration-300 bg-white dark:bg-slate-900 border-white dark:border-slate-800 shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer`;
    }

    const iconWrap = card.querySelector('.icon-wrapper');
    if (isDone) {
        iconWrap.className = `icon-wrapper w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 scale-105 bg-gradient-to-br ${p.bgGradient} text-white shadow-lg shadow-emerald-500/20`;
    } else {
        iconWrap.className = `icon-wrapper w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500`;
    }

    const title = card.querySelector('.prayer-title');
    if (isDone) title.className = `prayer-title text-sm md:text-base font-bold transition-colors duration-300 ${p.textActive}`;
    else title.className = `prayer-title text-sm md:text-base font-bold transition-colors duration-300 text-slate-700 dark:text-slate-200`;

    const checkContainer = card.querySelector('.check-container');
    if (isDone) {
        checkContainer.className = "check-container relative z-10 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all duration-300 bg-emerald-500 shadow-lg shadow-emerald-500/40 scale-110";
        checkContainer.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 md:w-4 md:h-4 text-white font-bold animate-[zoomIn_0.2s_ease-out]"></i>`;
    } else {
        checkContainer.className = "check-container relative z-10 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all duration-300 bg-transparent border-2 border-slate-100 dark:border-slate-700 group-hover:border-emerald-300";
        checkContainer.innerHTML = ``;
    }
    if (window.lucide && isDone) lucide.createIcons({ root: checkContainer });
}

export function renderPrayers() {
    const container = document.getElementById('trackerList');
    if (!container) return;
    let html = '';
    PRAYER_CONFIG.forEach((p) => { html += createPrayerCardHTML(p); });
    container.innerHTML = html;
    if (window.lucide) lucide.createIcons({ root: container });
    updateProgressBar();
}

function renderExtraIbadah() {
    const container = document.getElementById('extraIbadahList');
    if (!container) return;
    let html = '';
    EXTRA_IBADAH.forEach(item => {
        const isDone = state.currentRecords[item.id] === true;
        const activeClass = isDone ? `${item.bg} border-emerald-500/30` : 'bg-white dark:bg-slate-900 border-white dark:border-slate-800';
        const iconColor = isDone ? item.color : 'text-slate-400';

        html += `
        <div onclick="vibrateSoft(); togglePrayer('${item.id}', false)" class="bento-card p-3 rounded-2xl border flex items-center gap-3 cursor-pointer active:scale-95 transition-all ${activeClass}">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDone ? 'bg-white/50 dark:bg-white/10' : 'bg-slate-50 dark:bg-slate-800'}">
                <i data-lucide="${item.icon}" class="w-4 h-4 ${iconColor}"></i>
            </div>
            <div class="flex-1 overflow-hidden">
                <p class="text-[10px] font-bold truncate ${isDone ? 'text-slate-800 dark:text-white' : 'text-slate-500'}">${item.label}</p>
            </div>
            ${isDone ? '<i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-500 shrink-0"></i>' : ''}
        </div>`;
    });
    container.innerHTML = html;
    if (window.lucide) lucide.createIcons({ root: container });
}

function createPrayerCardHTML(p) {
    const isDone = state.currentRecords[p.id] || false;
    const time = trackerSchedule[p.id] || '--:--';
    const status = checkTimeAvailability(time);
    const isLocked = status.locked;

    if (isLocked) {
        return `
        <div id="prayer-card-${p.id}" class="group relative flex items-center justify-between p-3.5 md:p-4 rounded-[1.5rem] md:rounded-[1.8rem] border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 opacity-60 cursor-not-allowed" onclick="togglePrayer('${p.id}', true)">
            <div class="flex items-center gap-3.5 md:gap-4 grayscale">
                <div class="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center bg-slate-200 dark:bg-slate-800 text-slate-400">
                    <i data-lucide="${p.icon}" class="w-5 h-5 md:w-6 md:h-6"></i>
                </div>
                <div>
                    <h3 class="text-sm md:text-base font-bold text-slate-400 dark:text-slate-600">${p.id}</h3>
                    <div class="flex items-center gap-1.5 mt-0.5">
                        <i data-lucide="lock" class="w-2.5 h-2.5 text-slate-400"></i>
                        <span class="text-[9px] font-mono font-bold text-slate-400">${time}</span>
                    </div>
                </div>
            </div>
        </div>`;
    }

    const wrapperClass = isDone ? `${p.activeBg} ${p.activeBorder} shadow-sm` : `bg-white dark:bg-slate-900 border-white dark:border-slate-800 shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer`;
    const iconWrapClass = isDone ? `bg-gradient-to-br ${p.bgGradient} text-white shadow-lg` : `bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-emerald-500`;
    const titleClass = isDone ? p.textActive : `text-slate-700 dark:text-slate-200`;
    const checkContainerClass = isDone ? "bg-emerald-500 shadow-lg" : "bg-transparent border-2 border-slate-100 dark:border-slate-700 group-hover:border-emerald-300";

    return `
    <div id="prayer-card-${p.id}" onclick="togglePrayer('${p.id}', false)" class="group relative flex items-center justify-between p-3.5 md:p-4 rounded-[1.5rem] md:rounded-[1.8rem] border transition-all duration-300 ${wrapperClass}">
        <div class="flex items-center gap-3.5 md:gap-4">
            <div class="icon-wrapper w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 ${iconWrapClass}">
                <i data-lucide="${p.icon}" class="w-5 h-5 md:w-6 md:h-6"></i>
            </div>
            <div>
                <h3 class="prayer-title text-sm md:text-base font-bold transition-colors duration-300 ${titleClass}">${p.id}</h3>
                <div class="flex items-center gap-1.5 mt-0.5">
                    <span class="text-[9px] font-mono px-1.5 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">${time}</span>
                    ${p.type === 'sunnah' ? '<span class="text-[8px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-md border border-amber-100 dark:border-amber-800/30 font-black uppercase">Sunnah</span>' : ''}
                </div>
            </div>
        </div>
        <div class="check-container relative z-10 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all duration-300 ${checkContainerClass}">
            ${isDone ? '<i data-lucide="check" class="w-3.5 h-3.5 md:w-4 md:h-4 text-white font-bold"></i>' : ''}
        </div>
    </div>`;
}

export function updateProgressBar() {
    let wT = 0, wD = 0;
    PRAYER_CONFIG.forEach(p => { if (p.type === 'wajib') { wT++; if (state.currentRecords[p.id]) wD++; } });
    const pct = wT === 0 ? 0 : Math.round((wD / wT) * 100);

    const pbText = document.getElementById('progressText');
    const pb = document.getElementById('progressBar');
    if (pbText) pbText.innerText = pct + '%';
    if (pb) pb.style.width = pct + '%';

    const pbTextMobile = document.getElementById('progressTextMobile');
    const pbMobile = document.getElementById('progressBarMobile');
    if (pbTextMobile) pbTextMobile.innerText = pct + '%';
    if (pbMobile) pbMobile.style.width = pct + '%';
}

function changeTrackerTab(tab) {
    const btnDaily = document.getElementById('tabDaily');
    const btnHistory = document.getElementById('tabHistory');
    const indicator = document.getElementById('tabIndicator');
    const viewDaily = document.getElementById('viewDaily');
    const viewHistory = document.getElementById('viewHistory');

    if (tab === 'daily') {
        if (indicator) indicator.style.transform = 'translateX(0)';
        btnDaily.classList.replace('text-slate-400', 'text-emerald-600');
        btnHistory.classList.replace('text-emerald-600', 'text-slate-400');
        viewDaily.classList.remove('hidden');
        viewHistory.classList.add('hidden');
    } else {
        if (indicator) indicator.style.transform = 'translateX(100%)';
        btnHistory.classList.replace('text-slate-400', 'text-emerald-600');
        btnDaily.classList.replace('text-emerald-600', 'text-slate-400');
        viewHistory.classList.remove('hidden');
        viewDaily.classList.add('hidden');
        renderHistory();
    }
}

function changeMonth(dir) {
    historyDate.setMonth(historyDate.getMonth() + dir);
    renderHistory();
}

function renderHistory() {
    const elMonth = document.getElementById('monthDisplay');
    if (elMonth) {
        elMonth.innerText = historyDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }
    loadHistoryFromCloud();
}

async function loadHistoryFromCloud() {
    if (!state.currentUser) return;
    const year = historyDate.getFullYear();
    const month = historyDate.getMonth();
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const end = `${year}-${String(month + 1).padStart(2, '0')}-31`;

    const q = query(
        collection(db, "users", state.currentUser.uid, "daily_records"),
        where("__name__", ">=", start),
        where("__name__", "<=", end)
    );

    const monthData = {};
    try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => { monthData[doc.id] = doc.data(); });
        renderHistoryGrid(monthData);
        updateHistorySummary(monthData);
    } catch (e) { console.error("Gagal load riwayat:", e); }
}

function updateHistorySummary(monthData) {
    const perfectDaysEl = document.getElementById('monthPerfectDays');
    if (!perfectDaysEl) return;
    
    let perfectCount = 0;
    Object.values(monthData).forEach(record => {
        let wajibCount = 0;
        ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'].forEach(p => { if (record[p]) wajibCount++; });
        if (wajibCount === 5) perfectCount++;
    });
    perfectDaysEl.innerText = perfectCount;
}

function renderHistoryGrid(monthData) {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const year = historyDate.getFullYear();
    const month = historyDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    for (let i = 0; i < firstDay; i++) { grid.innerHTML += '<div></div>'; }

    const todayKey = new Date().toISOString().split('T')[0];

    for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = monthData[dateKey];
        let wajibCount = 0;
        if (record) { ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'].forEach(p => { if (record[p]) wajibCount++; }); }

        let bgClass = "bg-slate-50 dark:bg-slate-800/50 text-slate-400";
        if (wajibCount === 5) bgClass = "bg-emerald-500 text-white shadow-sm";
        else if (wajibCount > 0) bgClass = "bg-amber-400 text-white shadow-sm";
        
        const isToday = dateKey === todayKey;
        const borderClass = isToday ? "ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-950" : "";

        const h = getHijriDate(new Date(dateKey));
        const gDate = new Date(dateKey);
        const fastingInfo = getFastingInfo(gDate, h);
        let badge = '';
        if (fastingInfo) {
            let color = 'bg-sky-500';
            if (fastingInfo.category === 'haram') color = 'bg-rose-500';
            else if (fastingInfo.type === 'Puasa Ramadhan') color = 'bg-amber-500';
            else if (fastingInfo.type === 'Puasa Syawal') color = 'bg-purple-500';
            else if (fastingInfo.type === 'Puasa Arafah') color = 'bg-emerald-500';
            else if (fastingInfo.type === 'Puasa Asyura') color = 'bg-cyan-500';
            else if (fastingInfo.type === 'Puasa Ayyamul Bidh') color = 'bg-violet-500';
            badge = `<span title="${fastingInfo.type}" class="absolute -top-1 -right-1 w-2 h-2 rounded-full ${color}"></span>`;
        }

        grid.innerHTML += `
            <div onclick="vibrateSoft(); goToDate('${dateKey}')" class="relative aspect-square flex items-center justify-center rounded-xl text-[10px] md:text-[11px] font-black cursor-pointer transition-all active:scale-90 ${bgClass} ${borderClass} hover:opacity-80" title="${fastingInfo ? fastingInfo.type : ''}">
                ${day}
                ${badge}
            </div>`;
    }
}

function goToDate(dateKey) {
    state.trackerDate = new Date(dateKey);
    changeTrackerTab('daily');
    updateTrackerUI();
    loadRecordsFromCloud();
}
