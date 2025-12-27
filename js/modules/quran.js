import { db } from '../config.js';
import { doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { state } from '../state.js';

let allSurahs = [];
let currentSurahNumber = 0;
let activeAudio = null;
let activeBtn = null;
let lastReadData = null;
let lastScrollTop = 0;
let currentTafsirData = null;

/**
 * HOISTING FIX: Fungsi pencarian di atas agar tidak ReferenceError
 */
function searchSurah(query) {
    const lowerQ = query.toLowerCase();
    const items = document.querySelectorAll('.item-surah');
    items.forEach(item => {
        const searchData = item.getAttribute('data-search') || '';
        if (searchData.includes(lowerQ)) item.classList.remove('hidden');
        else item.classList.add('hidden');
    });
}

export function initQuran() {
    window.handleQuranBack = handleQuranBack;
    window.searchSurah = searchSurah;
    window.openSurah = openSurah;
    window.changeSurah = changeSurah;
    window.playAudio = playAudio;
    window.toggleBookmark = toggleBookmark;
    window.toggleTafsir = toggleTafsir;

    renderSkeleton();

    const view = document.getElementById('quranView');
    const searchContainer = document.getElementById('quranSearchContainer');

    if (view && searchContainer) {
        view.addEventListener('scroll', () => {
            let st = view.scrollTop;
            const ayahContainer = document.getElementById('ayahListContainer');
            const isDetailOpen = ayahContainer && !ayahContainer.classList.contains('translate-x-full');

            if (!isDetailOpen) {
                if (st > lastScrollTop && st > 150) {
                    searchContainer.style.transform = 'translateY(-250px)';
                } else if (st < lastScrollTop) {
                    searchContainer.style.transform = 'translateY(0)';
                }
            }
            lastScrollTop = st <= 0 ? 0 : st;
        }, { passive: true });
    }

    if (allSurahs.length === 0) {
        fetchSurahList();
    } else {
        renderSurahList(allSurahs);
    }

    window.addEventListener('viewExit', (e) => {
        if (e.detail.viewId === 'quranView') {
            forceCloseSurahDetail();
        }
    });
}

function renderSkeleton() {
    const container = document.getElementById('quranLoading');
    if (!container) return;
    const item = `
    <div class="animate-pulse bg-white dark:bg-slate-900 p-3.5 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3.5 md:gap-5 md:min-h-[100px] shadow-sm">
        <div class="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0"></div>
        <div class="flex-1 space-y-2">
            <div class="h-3 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
            <div class="h-2 bg-slate-200 dark:bg-slate-800 rounded w-16"></div>
        </div>
    </div>`;
    container.innerHTML = item.repeat(12);
}

function forceCloseSurahDetail() {
    stopCurrentAudio();
    const ayahContainer = document.getElementById('ayahListContainer');
    const searchContainer = document.getElementById('quranSearchContainer');
    const navButtons = document.getElementById('surahNavButtons');
    const title = document.getElementById('quranTitle');

    if (ayahContainer) ayahContainer.classList.add('translate-x-full');
    if (searchContainer) {
        searchContainer.style.transform = 'translateY(0)';
    }
    if (navButtons) navButtons.classList.add('translate-y-40');
    if (title) title.innerText = "Al-Qur'an";
}

async function fetchSurahList() {
    const loader = document.getElementById('quranLoading');
    if (loader && allSurahs.length === 0) loader.classList.remove('hidden-force');

    try {
        if (state.currentUser && !lastReadData) await fetchLastRead();
        const response = await fetch('https://equran.id/api/v2/surat');
        const result = await response.json();
        if (result.code === 200) {
            allSurahs = result.data;
            renderSurahList(allSurahs);
        }
    } catch (error) {
        console.error("Fetch surah error:", error);
    } finally {
        if (loader) loader.classList.add('hidden-force');
    }
}

async function fetchLastRead() {
    if (!state.currentUser) return;
    try {
        const docRef = doc(db, "users", state.currentUser.uid, "quran", "last_read");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) lastReadData = docSnap.data();
    } catch (e) { console.error("Bookmark error:", e); }
}

function renderSurahList(data) {
    const container = document.getElementById('surahListContainer');
    if (!container) return;
    const fragment = document.createDocumentFragment();
    data.forEach(surah => {
        const isLastRead = lastReadData && lastReadData.surah === surah.nomor;
        const badge = isLastRead ? `<div class="mb-1 animate-fade-in"><span class="text-[9px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold border border-emerald-200 dark:border-emerald-800">Terakhir: Ayat ${lastReadData.ayat}</span></div>` : '';
        const borderClass = isLastRead ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800';
        const safeNama = surah.namaLatin.replace(/'/g, "\\'");
        const div = document.createElement('div');
        div.className = `item-surah group bg-white dark:bg-slate-900 p-3.5 md:py-5 md:px-5 rounded-2xl border ${borderClass} shadow-sm active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-between relative overflow-hidden hover:border-emerald-300 dark:hover:border-emerald-700 md:min-h-[90px]`;
        div.setAttribute('onclick', `openSurah(${surah.nomor}, null, '${safeNama}')`);
        div.setAttribute('data-search', `${surah.namaLatin.toLowerCase()} ${surah.arti.toLowerCase()} ${surah.nomor}`);
        div.innerHTML = `
            <div class="flex items-center gap-3.5 md:gap-5 relative z-10 w-full">
                <div class="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm md:text-base flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/50 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-sm">${surah.nomor}</div>
                <div class="flex-1 min-w-0">
                    ${badge}
                    <h4 class="font-bold text-slate-700 dark:text-white text-sm md:text-base group-hover:text-emerald-600 transition-colors truncate">${surah.namaLatin}</h4>
                    <p class="text-[10px] md:text-xs text-slate-400 font-medium">${surah.arti} • ${surah.jumlahAyat} Ayat</p>
                </div>
                <div class="text-right pl-2 shrink-0">
                    <span class="font-quran text-lg md:text-2xl text-slate-300 dark:text-slate-700 group-hover:text-emerald-500/30 transition-colors">${surah.nama}</span>
                </div>
            </div>`;
        fragment.appendChild(div);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
}

function renderAyahSkeleton() {
    const container = document.getElementById('ayahsContent');
    if (!container) return;
    let skeletonHtml = `
    <div class="bg-white dark:bg-slate-900 rounded-[1.8rem] p-5 shadow-sm border border-slate-200 dark:border-slate-800 animate-pulse">
        <div class="flex justify-between items-center mb-5 pb-3 border-b border-slate-50 dark:border-slate-800">
            <div class="flex items-center gap-3"><div class="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800"></div></div>
        </div>
        <div class="space-y-4 mb-6"><div class="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4 ml-auto"></div></div>
    </div>`;
    container.innerHTML = skeletonHtml.repeat(3);
}

function renderAyahs(ayatList, surahName) {
    const container = document.getElementById('ayahsContent');
    if (!container) return;
    const safeSurahName = surahName.replace(/'/g, "\\'");
    const html = ayatList.map(ayat => {
        const audioUrl = ayat.audio['05'] || ayat.audio['01'];
        const isBookmarked = lastReadData && lastReadData.surah === currentSurahNumber && lastReadData.ayat === ayat.nomorAyat;
        const bookmarkIconClass = isBookmarked ? "fill-emerald-500 text-emerald-500" : "text-slate-300 hover:text-emerald-500";
        return `
        <div id="ayah-${ayat.nomorAyat}" class="bg-white dark:bg-slate-900 rounded-[1.8rem] p-5 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden group transition-all duration-300">
            <div class="flex justify-between items-center mb-6 border-b border-slate-50 dark:border-slate-800/50 pb-3">
                <div class="flex items-center gap-2">
                    <div class="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-100 dark:border-emerald-800/30">${ayat.nomorAyat}</div>
                    <button onclick="vibrateSoft(); toggleBookmark(${currentSurahNumber}, ${ayat.nomorAyat}, '${safeSurahName}')" class="w-9 h-9 rounded-full flex items-center justify-center transition active:scale-90">
                        <i data-lucide="bookmark" class="w-4 h-4 ${bookmarkIconClass} transition-colors" id="btn-bookmark-${ayat.nomorAyat}"></i>
                    </button>
                </div>
                <button onclick="playAudio('${audioUrl}', this)" class="play-audio-btn w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-emerald-500 transition-all duration-300">
                    <i data-lucide="play" class="w-3.5 h-3.5 fill-current ml-0.5"></i>
                </button>
            </div>
            <div class="text-right mb-6"><p class="font-quran text-[1.7rem] leading-[2.4] text-slate-800 dark:text-white" dir="rtl">${ayat.teksArab}</p></div>
            <div class="space-y-3 bg-slate-50/50 dark:bg-slate-800/30 -mx-5 -mb-5 p-5 border-t border-slate-100 dark:border-slate-800">
                <p class="text-emerald-600 text-[10px] font-bold tracking-widest uppercase">Latin</p>
                <p class="text-slate-500 dark:text-slate-400 text-xs italic mb-2 leading-relaxed">"${ayat.teksLatin}"</p>
                <p class="text-emerald-600 text-[10px] font-bold tracking-widest uppercase">Artinya</p>
                <p class="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">${ayat.teksIndonesia}</p>
                <div class="pt-3 mt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                    <button onclick="toggleTafsir(${ayat.nomorAyat})" class="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg hover:text-emerald-600 transition-all">
                        <i data-lucide="book-open" class="w-3 h-3"></i> <span>Tafsir</span>
                    </button>
                    <div id="tafsir-container-${ayat.nomorAyat}" class="hidden mt-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
                        <p id="tafsir-text-${ayat.nomorAyat}" class="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">Memuat...</p>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}

async function openSurah(nomor, targetAyah = null, surahName = null) {
    currentSurahNumber = nomor;
    currentTafsirData = null;
    const ayahContainer = document.getElementById('ayahListContainer');
    const searchContainer = document.getElementById('quranSearchContainer');
    const title = document.getElementById('quranTitle');
    const navButtons = document.getElementById('surahNavButtons');

    if (title) title.innerText = surahName || "Memuat...";
    renderAyahSkeleton();

    if (ayahContainer) { ayahContainer.classList.remove('translate-x-full'); ayahContainer.scrollTop = 0; }

    if (searchContainer) {
        searchContainer.style.transform = 'translateY(-250px)';
        searchContainer.style.pointerEvents = 'none';
    }

    // Navigasi Tombol
    const prevBtn = document.getElementById('btnPrevSurah');
    const nextBtn = document.getElementById('btnNextSurah');
    if (prevBtn) prevBtn.style.display = (nomor === 1) ? 'none' : 'flex';
    if (nextBtn) nextBtn.style.display = (nomor === 114) ? 'none' : 'flex';

    stopCurrentAudio();
    try {
        const response = await fetch(`https://equran.id/api/v2/surat/${nomor}`);
        const result = await response.json();
        if (result.code === 200) {
            const data = result.data;
            if (title) title.innerText = data.namaLatin;
            renderAyahs(data.ayat, data.namaLatin);
            if (navButtons) navButtons.classList.remove('translate-y-40');
        }
    } catch (error) { console.error(error); }
}

function handleQuranBack() {
    const ayahContainer = document.getElementById('ayahListContainer');
    if (ayahContainer && !ayahContainer.classList.contains('translate-x-full')) {
        forceCloseSurahDetail();
    } else {
        if (window.goBack) window.goBack();
    }
}

function playAudio(url, btnElement) {
    const icon = btnElement.querySelector('i');

    // Jika tombol yang sama diklik (Toggle Play/Pause)
    if (activeAudio && activeBtn === btnElement) {
        if (activeAudio.paused) {
            activeAudio.play();
            icon.setAttribute('data-lucide', 'pause');
        } else {
            activeAudio.pause();
            icon.setAttribute('data-lucide', 'play');
        }
        lucide.createIcons();
        return;
    }

    // Reset ikon tombol sebelumnya jika ada yang sedang berputar
    if (activeBtn) {
        const prevIcon = activeBtn.querySelector('i');
        if (prevIcon) {
            prevIcon.setAttribute('data-lucide', 'play');
            lucide.createIcons();
        }
    }

    stopCurrentAudio();

    let audio = new Audio(url);
    activeAudio = audio;
    activeBtn = btnElement;

    audio.play();
    icon.setAttribute('data-lucide', 'pause');
    lucide.createIcons();

    audio.onended = () => {
        stopCurrentAudio();
        icon.setAttribute('data-lucide', 'play');
        lucide.createIcons();
    };
}

function stopCurrentAudio() {
    if (activeAudio) { activeAudio.pause(); activeAudio.currentTime = 0; }
    activeAudio = null; activeBtn = null;
}

function changeSurah(direction) {
    const newNumber = currentSurahNumber + direction;
    if (newNumber >= 1 && newNumber <= 114) {
        stopCurrentAudio();
        openSurah(newNumber);
    }
}

async function toggleBookmark(surahNum, ayatNum, surahName) {
    if (!state.currentUser) return;
    const isDeleting = lastReadData && lastReadData.surah === surahNum && lastReadData.ayat === ayatNum;
    if (isDeleting) {
        lastReadData = null;
        try { await deleteDoc(doc(db, "users", state.currentUser.uid, "quran", "last_read")); } catch (e) { }
    } else {
        lastReadData = { surah: surahNum, ayat: ayatNum, name: surahName, timestamp: new Date() };
        try { await setDoc(doc(db, "users", state.currentUser.uid, "quran", "last_read"), lastReadData); } catch (e) { }
    }
    renderSurahList(allSurahs);
}

async function toggleTafsir(ayatId) {
    const container = document.getElementById(`tafsir-container-${ayatId}`);
    const content = document.getElementById(`tafsir-text-${ayatId}`);
    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        if (!currentTafsirData) {
            currentTafsirData = await fetchTafsirData(currentSurahNumber);
        }
        if (currentTafsirData) {
            const item = currentTafsirData.find(t => t.ayat === ayatId);
            content.innerHTML = item ? item.teks : "Tafsir tidak tersedia.";
        }
    } else {
        container.classList.add('hidden');
    }
}

async function fetchTafsirData(nomorSurat) {
    try {
        const response = await fetch(`https://equran.id/api/v2/tafsir/${nomorSurat}`);
        const result = await response.json();
        return (result.code === 200) ? result.data.tafsir : null;
    } catch (e) { return null; }
}