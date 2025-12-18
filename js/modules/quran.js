import { db } from '../config.js';
import { doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { state } from '../state.js';

let allSurahs = [];
let currentSurahNumber = 0;
let activeAudio = null;
let activeBtn = null;
let lastReadData = null;
let nextAudioPreload = null;
let searchTimeout = null;

let currentTafsirPromise = null;
let currentTafsirData = null;

export function initQuran() {
    window.handleQuranBack = handleQuranBack;
    window.searchSurah = searchSurah;
    window.openSurah = openSurah;
    window.changeSurah = changeSurah;
    window.playAudio = playAudio;
    window.toggleBookmark = toggleBookmark;
    window.toggleTafsir = toggleTafsir;

    if (allSurahs.length === 0) fetchSurahList();

    window.addEventListener('viewExit', (e) => {
        if (e.detail.viewId === 'quranView') {
            forceCloseSurahDetail();
        }
    });
}

function forceCloseSurahDetail() {
    stopCurrentAudio();
    const ayahContainer = document.getElementById('ayahListContainer');
    const searchContainer = document.getElementById('quranSearchContainer');
    const navButtons = document.getElementById('surahNavButtons');
    const title = document.getElementById('quranTitle');

    if (ayahContainer) ayahContainer.classList.add('translate-x-full');
    if (searchContainer) searchContainer.classList.remove('-translate-y-20', 'opacity-0', 'pointer-events-none');
    if (navButtons) navButtons.classList.add('translate-y-40');
    if (title) title.innerText = "Al-Qur'an";
}

async function fetchSurahList() {
    const loader = document.getElementById('quranLoading');
    if (loader && allSurahs.length === 0) loader.classList.remove('hidden');

    try {
        if (state.currentUser && !lastReadData) await fetchLastRead();

        if (allSurahs.length > 0) {
            renderSurahList(allSurahs);
        } else {
            const response = await fetch('https://equran.id/api/v2/surat');
            const result = await response.json();
            if (result.code === 200) {
                allSurahs = result.data;
                renderSurahList(allSurahs);
            }
        }
    } catch (error) {
        console.error("Gagal memuat daftar surat:", error);
    } finally {
        if (loader) loader.classList.add('hidden');
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
        const badge = isLastRead ?
            `<div class="mb-1 animate-fade-in"><span class="text-[9px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold border border-emerald-200 dark:border-emerald-800">Terakhir: Ayat ${lastReadData.ayat}</span></div>` : '';
        const borderClass = isLastRead ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-slate-200 dark:border-slate-800';
        const safeNama = surah.namaLatin.replace(/'/g, "\\'");

        const div = document.createElement('div');
        div.className = `item-surah group bg-white dark:bg-slate-900 p-3.5 rounded-2xl border ${borderClass} shadow-sm active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-between relative overflow-hidden hover:border-emerald-300 dark:hover:border-emerald-700`;
        div.setAttribute('onclick', `openSurah(${surah.nomor}, null, '${safeNama}')`);
        div.setAttribute('data-search', `${surah.namaLatin.toLowerCase()} ${surah.arti.toLowerCase()} ${surah.nomor}`);

        div.innerHTML = `
            <div class="flex items-center gap-3.5 relative z-10 w-full">
                <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/50 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-sm">${surah.nomor}</div>
                <div class="flex-1 min-w-0">
                    ${badge}
                    <h4 class="font-bold text-slate-700 dark:text-white text-sm group-hover:text-emerald-600 transition-colors truncate">${surah.namaLatin}</h4>
                    <p class="text-[10px] text-slate-400 font-medium">${surah.arti} • ${surah.jumlahAyat} Ayat</p>
                </div>
                <div class="text-right pl-2 shrink-0">
                    <span class="font-quran text-lg text-slate-300 dark:text-slate-700 group-hover:text-emerald-500/30 transition-colors">${surah.nama}</span>
                </div>
            </div>`;

        fragment.appendChild(div);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

function searchSurah(query) {
    if (searchTimeout) cancelAnimationFrame(searchTimeout);
    searchTimeout = requestAnimationFrame(() => {
        const lowerQ = query.toLowerCase();
        const items = document.querySelectorAll('.item-surah');
        items.forEach(item => {
            const searchData = item.getAttribute('data-search') || '';
            if (searchData.includes(lowerQ)) item.classList.remove('hidden');
            else item.classList.add('hidden');
        });
    });
}

function renderAyahSkeleton() {
    const container = document.getElementById('ayahsContent');
    if (!container) return;
    let skeletonHtml = '';
    for (let i = 0; i < 3; i++) {
        skeletonHtml += `
        <div class="bg-white dark:bg-slate-900 rounded-[1.8rem] p-5 shadow-sm border border-slate-200 dark:border-slate-800 animate-pulse">
            <div class="flex justify-between items-center mb-5 pb-3 border-b border-slate-50 dark:border-slate-800">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                    <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800"></div>
                </div>
                <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800"></div>
            </div>
            <div class="space-y-4 mb-6">
                <div class="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4 ml-auto"></div>
                <div class="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/2 ml-auto"></div>
            </div>
            <div class="space-y-2">
                <div class="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                <div class="h-2.5 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
            </div>
        </div>`;
    }
    container.innerHTML = skeletonHtml;
}

async function fetchTafsirData(nomorSurat) {
    try {
        const response = await fetch(`https://equran.id/api/v2/tafsir/${nomorSurat}`);
        const result = await response.json();
        return (result.code === 200 && result.data && result.data.tafsir) ? result.data.tafsir : null;
    } catch (error) {
        console.error("Gagal tafsir:", error); return null;
    }
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
                    <button onclick="vibrateSoft(); toggleBookmark(${currentSurahNumber}, ${ayat.nomorAyat}, '${safeSurahName}')" class="w-9 h-9 rounded-full bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center transition active:scale-90">
                        <i data-lucide="bookmark" class="w-4 h-4 ${bookmarkIconClass} transition-colors" id="btn-bookmark-${ayat.nomorAyat}"></i>
                    </button>
                </div>
                <button onclick="playAudio('${audioUrl}', this)" data-audio="${audioUrl}" class="play-audio-btn w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-emerald-500 shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-300 active:scale-90">
                    <i data-lucide="play" class="w-3.5 h-3.5 fill-current ml-0.5"></i>
                </button>
            </div>
            
            <div class="text-right mb-6 pl-1">
                <p class="font-quran text-[1.7rem] leading-[2.4] text-slate-800 dark:text-white" dir="rtl">${ayat.teksArab}</p>
            </div>
            
            <div class="space-y-3 bg-slate-50/50 dark:bg-slate-800/30 -mx-5 -mb-5 p-5 border-t border-slate-100 dark:border-slate-800">
                <p class="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold tracking-widest uppercase mb-0.5">Latin</p>
                <p class="text-slate-500 dark:text-slate-400 text-xs font-medium italic mb-3 leading-relaxed">"${ayat.teksLatin}"</p>
                
                <p class="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold tracking-widest uppercase mb-0.5">Artinya</p>
                <p class="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">${ayat.teksIndonesia}</p>

                <div class="pt-3 mt-3 border-t border-slate-200/50 dark:border-slate-700/50">
                    <button id="btn-tafsir-trigger-${ayat.nomorAyat}" onclick="toggleTafsir(${ayat.nomorAyat})" class="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg hover:text-emerald-600 hover:border-emerald-300 transition-all active:scale-95 shadow-sm">
                        <i data-lucide="book-open" class="w-3 h-3"></i> <span>Baca Tafsir</span>
                    </button>

                    <div id="tafsir-container-${ayat.nomorAyat}" class="hidden mt-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in">
                        <p class="text-[9px] font-bold text-emerald-600 uppercase tracking-wider mb-2">Tafsir Kemenag</p>
                        <p id="tafsir-text-${ayat.nomorAyat}" class="text-slate-600 dark:text-slate-300 text-xs leading-relaxed text-justify">
                            <span class="flex items-center gap-2 text-slate-400"><i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> Memuat...</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = html;
    if (window.lucide) lucide.createIcons();
}

async function toggleTafsir(ayatId) {
    const container = document.getElementById(`tafsir-container-${ayatId}`);
    const contentText = document.getElementById(`tafsir-text-${ayatId}`);
    const btn = document.getElementById(`btn-tafsir-trigger-${ayatId}`);
    const btnText = btn.querySelector('span');

    if (container.classList.contains('hidden')) {
        container.classList.remove('hidden');
        btnText.innerText = 'Tutup Tafsir';
        btn.classList.add('bg-emerald-50', 'text-emerald-600', 'border-emerald-200');

        if (!currentTafsirData) {
            try {
                if (!currentTafsirPromise) {
                    contentText.innerHTML = `<span class="text-red-500">Koneksi gagal.</span>`;
                    return;
                }
                currentTafsirData = await currentTafsirPromise;
            } catch (e) {
                contentText.innerHTML = `<span class="text-red-500">Gagal memuat.</span>`;
                return;
            }
        }

        if (currentTafsirData && Array.isArray(currentTafsirData)) {
            const item = currentTafsirData.find(t => t.ayat === ayatId);
            contentText.innerHTML = item ? item.teks : "Tafsir tidak tersedia.";
        }
    } else {
        container.classList.add('hidden');
        btnText.innerText = 'Baca Tafsir';
        btn.classList.remove('bg-emerald-50', 'text-emerald-600', 'border-emerald-200');
    }
}

// UPDATE LOGIC DI SINI
async function openSurah(nomor, targetAyah = null, surahName = null) {
    currentSurahNumber = nomor;
    currentTafsirData = null;
    currentTafsirPromise = null;

    const ayahContainer = document.getElementById('ayahListContainer');
    const searchContainer = document.getElementById('quranSearchContainer');
    const navButtons = document.getElementById('surahNavButtons');
    const title = document.getElementById('quranTitle');

    if (title) title.innerText = surahName || "Memuat...";
    if (navButtons) navButtons.classList.add('translate-y-40');

    renderAyahSkeleton();

    if (ayahContainer) {
        ayahContainer.classList.remove('translate-x-full');
        ayahContainer.scrollTop = 0;
    }
    if (searchContainer) searchContainer.classList.add('-translate-y-20', 'opacity-0', 'pointer-events-none');

    stopCurrentAudio();
    currentTafsirPromise = fetchTafsirData(nomor);

    try {
        const response = await fetch(`https://equran.id/api/v2/surat/${nomor}`);
        const result = await response.json();

        if (result.code === 200) {
            const data = result.data;
            if (title) title.innerText = data.namaLatin;
            renderAyahs(data.ayat, data.namaLatin);

            if (navButtons) {
                navButtons.classList.remove('translate-y-40');
                const prevBtn = navButtons.children[0];
                const nextBtn = navButtons.children[1];

                // LOGIKA BARU: Hilangkan tombol (hidden) bukan cuma disabled
                if (nomor === 1) {
                    prevBtn.classList.add('hidden');
                } else {
                    prevBtn.classList.remove('hidden');
                }

                if (nomor === 114) {
                    nextBtn.classList.add('hidden');
                } else {
                    nextBtn.classList.remove('hidden');
                }
            }

            if (targetAyah) {
                setTimeout(() => {
                    const el = document.getElementById(`ayah-${targetAyah}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('ring-2', 'ring-emerald-400');
                        setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-400'), 2000);
                    }
                }, 600);
            }
        }
    } catch (error) {
        console.error("Gagal buka surat:", error);
        if (title) title.innerText = "Error";
    }
}

function handleQuranBack() {
    const ayahContainer = document.getElementById('ayahListContainer');
    if (ayahContainer && !ayahContainer.classList.contains('translate-x-full')) {
        forceCloseSurahDetail();
    } else {
        if (window.goBack) window.goBack();
    }
}

async function toggleBookmark(surahNum, ayatNum, surahName) {
    if (!state.currentUser) { alert("Login dulu untuk bookmark."); return; }
    const isDeleting = lastReadData && lastReadData.surah === surahNum && lastReadData.ayat === ayatNum;

    if (isDeleting) {
        lastReadData = null;
        const targetIcon = document.getElementById(`btn-bookmark-${ayatNum}`);
        if (targetIcon) {
            targetIcon.classList.remove('fill-emerald-500', 'text-emerald-500');
            targetIcon.classList.add('text-slate-300');
        }
        try { await deleteDoc(doc(db, "users", state.currentUser.uid, "quran", "last_read")); window.dispatchEvent(new Event('bookmarkUpdated')); } catch (e) { }
    } else {
        document.querySelectorAll('[id^="btn-bookmark-"]').forEach(el => {
            el.classList.remove('fill-emerald-500', 'text-emerald-500');
            el.classList.add('text-slate-300');
        });
        const targetIcon = document.getElementById(`btn-bookmark-${ayatNum}`);
        if (targetIcon) {
            targetIcon.classList.remove('text-slate-300');
            targetIcon.classList.add('fill-emerald-500', 'text-emerald-500');
            targetIcon.parentElement.style.transform = "scale(1.2)";
            setTimeout(() => targetIcon.parentElement.style.transform = "scale(1)", 200);
        }
        lastReadData = { surah: surahNum, ayat: ayatNum, name: surahName, timestamp: new Date() };
        try { await setDoc(doc(db, "users", state.currentUser.uid, "quran", "last_read"), lastReadData); window.dispatchEvent(new Event('bookmarkUpdated')); } catch (e) { alert("Gagal menyimpan."); }
    }
}

function playAudio(url, btnElement) {
    if (activeAudio && activeBtn === btnElement) {
        if (activeAudio.paused) {
            activeAudio.play();
            updateButtonUI(btnElement, 'pause');
        } else {
            activeAudio.pause();
            updateButtonUI(btnElement, 'play');
        }
        return;
    }
    stopCurrentAudio();
    let audio = (nextAudioPreload && nextAudioPreload.src === url) ? nextAudioPreload : new Audio(url);
    nextAudioPreload = null;
    activeAudio = audio;
    activeBtn = btnElement;
    updateButtonUI(btnElement, 'pause');

    audio.play().catch(e => {
        console.error("Audio error:", e);
        updateButtonUI(btnElement, 'play');
    });

    const allBtns = Array.from(document.querySelectorAll('.play-audio-btn'));
    const currIndex = allBtns.indexOf(btnElement);
    if (currIndex >= 0 && currIndex < allBtns.length - 1) {
        const nextUrl = allBtns[currIndex + 1].getAttribute('data-audio');
        if (nextUrl) { nextAudioPreload = new Audio(nextUrl); nextAudioPreload.preload = 'auto'; nextAudioPreload.load(); }
    }

    audio.onended = () => {
        updateButtonUI(btnElement, 'play');
        activeAudio = null; activeBtn = null;
        if (currIndex >= 0 && currIndex < allBtns.length - 1) {
            const nextBtn = allBtns[currIndex + 1];
            nextBtn.closest('div[id^="ayah-"]').scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => nextBtn.click(), 500);
        }
    };
    audio.onerror = () => { updateButtonUI(btnElement, 'play'); activeAudio = null; activeBtn = null; };
}

function stopCurrentAudio() {
    if (activeAudio) { activeAudio.pause(); activeAudio.currentTime = 0; }
    if (activeBtn) updateButtonUI(activeBtn, 'play');
    activeAudio = null; activeBtn = null;
}

function updateButtonUI(btn, state) {
    if (state === 'pause') {
        btn.innerHTML = `<i data-lucide="pause" class="w-3.5 h-3.5 fill-current"></i>`;
        btn.classList.remove('bg-slate-50', 'dark:bg-slate-800', 'text-slate-400');
        btn.classList.add('bg-emerald-500', 'text-white', 'shadow-md', 'shadow-emerald-500/30', 'border-transparent');
    } else {
        btn.innerHTML = `<i data-lucide="play" class="w-3.5 h-3.5 fill-current ml-0.5"></i>`;
        btn.classList.add('bg-slate-50', 'dark:bg-slate-800', 'text-slate-400');
        btn.classList.remove('bg-emerald-500', 'text-white', 'shadow-md', 'shadow-emerald-500/30', 'border-transparent');
    }
    if (window.lucide) lucide.createIcons({ root: btn });
}

function changeSurah(direction) {
    const newNumber = currentSurahNumber + direction;
    if (newNumber >= 1 && newNumber <= 114) {
        stopCurrentAudio();
        openSurah(newNumber);
    }
}