// jurnal_ibadah/js/modules/quran.js

let allSurahs = [];
let currentSurahNumber = 0;
let activeAudio = null;
let activeBtn = null;

export function initQuran() {
    window.handleQuranBack = handleQuranBack;
    window.searchSurah = searchSurah;
    window.openSurah = openSurah;
    window.changeSurah = changeSurah;
    window.playAudio = playAudio;

    fetchSurahList();
}

async function fetchSurahList() {
    const loader = document.getElementById('quranLoading');
    if(loader) loader.classList.remove('hidden');

    try {
        const response = await fetch('https://equran.id/api/v2/surat');
        const result = await response.json();
        
        if (result.code === 200) {
            allSurahs = result.data;
            renderSurahList(allSurahs);
        }
    } catch (error) {
        console.error("Gagal memuat daftar surat:", error);
    } finally {
        if(loader) loader.classList.add('hidden');
    }
}

function renderSurahList(data) {
    const container = document.getElementById('surahListContainer');
    if (!container) return;

    let html = '';
    data.forEach(surah => {
        // [UPDATED] Card Style: Rounded Aesthetic
        html += `
        <div onclick="openSurah(${surah.nomor})" class="group bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 cursor-pointer active:scale-[0.98] flex items-center gap-4 relative overflow-hidden">
            
            <div class="absolute right-0 top-0 w-24 h-24 bg-emerald-50 dark:bg-emerald-900/10 rounded-full blur-2xl -mr-10 -mt-10 opacity-0 group-hover:opacity-100 transition duration-500"></div>

            <div class="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-black rounded-2xl border border-slate-100 dark:border-slate-700 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-inner">
                ${surah.nomor}
            </div>
            
            <div class="flex-1 relative z-10">
                <h4 class="font-bold text-slate-800 dark:text-white text-lg leading-tight group-hover:text-emerald-600 transition-colors">${surah.namaLatin}</h4>
                <p class="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">${surah.arti} • <span class="text-emerald-500">${surah.jumlahAyat} Ayat</span></p>
            </div>
            
            <div class="text-right relative z-10 pl-2">
                <span class="font-quran text-2xl text-slate-300 dark:text-slate-600 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors duration-300">${surah.nama}</span>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

function searchSurah(query) {
    const lowerQ = query.toLowerCase();
    const filtered = allSurahs.filter(s => 
        s.namaLatin.toLowerCase().includes(lowerQ) || 
        s.arti.toLowerCase().includes(lowerQ)
    );
    renderSurahList(filtered);
}

async function openSurah(nomor) {
    currentSurahNumber = nomor;
    
    const loader = document.getElementById('quranLoading');
    const ayahContainer = document.getElementById('ayahListContainer');
    const searchContainer = document.getElementById('quranSearchContainer');
    const navButtons = document.getElementById('surahNavButtons');
    const title = document.getElementById('quranTitle');

    if(loader) loader.classList.remove('hidden');
    
    if(navButtons) {
        Array.from(navButtons.children).forEach(btn => btn.disabled = true);
    }
    
    stopCurrentAudio();

    try {
        const response = await fetch(`https://equran.id/api/v2/surat/${nomor}`);
        const result = await response.json();
        
        if (result.code === 200) {
            const data = result.data;
            
            if(title) title.innerText = data.namaLatin;
            renderAyahs(data.ayat);
            
            if(ayahContainer) {
                ayahContainer.classList.remove('translate-x-full');
                ayahContainer.scrollTop = 0;
            }
            // Sembunyikan Search Bar saat baca ayat agar bersih
            if(searchContainer) searchContainer.classList.add('-translate-y-24', 'opacity-0', 'pointer-events-none');
            
            if(navButtons) {
                navButtons.classList.remove('translate-y-40');
                const prevBtn = navButtons.children[0];
                const nextBtn = navButtons.children[1];
                
                if(prevBtn) prevBtn.disabled = nomor === 1;
                if(nextBtn) nextBtn.disabled = nomor === 114;
            }
        }
    } catch (error) {
        console.error("Gagal membuka surat:", error);
    } finally {
        if(loader) loader.classList.add('hidden');
    }
}

function renderAyahs(ayatList) {
    const container = document.getElementById('ayahsContent');
    if (!container) return;

    let html = '';
    ayatList.forEach(ayat => {
        const audioUrl = ayat.audio['05'] || ayat.audio['01']; 

        // [UPDATED] Ayah Card Style
        html += `
        <div class="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
            
            <div class="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div class="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-200/50">
                    ${ayat.nomorAyat}
                </div>
                <button onclick="playAudio('${audioUrl}', this)" class="play-audio-btn w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-emerald-500 shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-300 active:scale-90 group-btn">
                    <i data-lucide="play" class="w-4 h-4 fill-current translate-x-0.5"></i>
                </button>
            </div>
            
            <div class="text-right mb-6 pl-2">
                <p class="font-quran text-3xl leading-[2.6] text-slate-800 dark:text-white" dir="rtl">
                    ${ayat.teksArab}
                </p>
            </div>
            
            <div class="space-y-3 bg-slate-50 dark:bg-slate-800/50 -mx-6 -mb-6 p-6 border-t border-slate-100 dark:border-slate-800">
                <p class="text-emerald-600 dark:text-emerald-400 text-sm font-bold tracking-wide mb-1">
                    Latin
                </p>
                <p class="text-slate-500 dark:text-slate-400 text-sm font-medium italic mb-4 leading-relaxed">
                    "${ayat.teksLatin}"
                </p>
                 <p class="text-emerald-600 dark:text-emerald-400 text-sm font-bold tracking-wide mb-1">
                    Terjemahan
                </p>
                <p class="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                    ${ayat.teksIndonesia}
                </p>
            </div>
        </div>`;
    });

    container.innerHTML = html;
    if(window.lucide) lucide.createIcons();
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

    const audio = new Audio(url);
    activeAudio = audio;
    activeBtn = btnElement;
    
    updateButtonUI(btnElement, 'pause');
    audio.play();
    
    audio.onended = () => {
        updateButtonUI(btnElement, 'play');
        activeAudio = null;
        activeBtn = null;

        const allBtns = Array.from(document.querySelectorAll('.play-audio-btn'));
        const currIndex = allBtns.indexOf(btnElement);
        
        // Auto-play next ayah
        if (currIndex >= 0 && currIndex < allBtns.length - 1) {
            const nextBtn = allBtns[currIndex + 1];
            nextBtn.closest('.bg-white').scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => nextBtn.click(), 500); // Delay dikit biar enak
        }
    };
    
    audio.onerror = () => {
        alert("Gagal memutar audio. Cek koneksi internet.");
        updateButtonUI(btnElement, 'play');
        activeAudio = null;
        activeBtn = null;
    };
}

function stopCurrentAudio() {
    if (activeAudio) {
        activeAudio.pause();
        activeAudio.currentTime = 0;
    }
    if (activeBtn) {
        updateButtonUI(activeBtn, 'play');
    }
    activeAudio = null;
    activeBtn = null;
}

function updateButtonUI(btn, state) {
    if (state === 'pause') {
        btn.innerHTML = `<i data-lucide="pause" class="w-4 h-4 fill-current"></i>`;
        // Style Active
        btn.classList.remove('bg-slate-50', 'dark:bg-slate-800', 'text-slate-400');
        btn.classList.add('bg-emerald-500', 'text-white', 'scale-110', 'shadow-lg', 'shadow-emerald-500/40', 'border-transparent');
    } else {
        btn.innerHTML = `<i data-lucide="play" class="w-4 h-4 fill-current translate-x-0.5"></i>`;
        // Style Inactive (Reset)
        btn.classList.add('bg-slate-50', 'dark:bg-slate-800', 'text-slate-400');
        btn.classList.remove('bg-emerald-500', 'text-white', 'scale-110', 'shadow-lg', 'shadow-emerald-500/40', 'border-transparent');
    }

    if (window.lucide) {
        lucide.createIcons({ root: btn });
    }
}

function changeSurah(direction) {
    const newNumber = currentSurahNumber + direction;
    if (newNumber >= 1 && newNumber <= 114) {
        stopCurrentAudio(); 
        openSurah(newNumber);
    }
}

function handleQuranBack() {
    const ayahContainer = document.getElementById('ayahListContainer');
    const searchContainer = document.getElementById('quranSearchContainer');
    const navButtons = document.getElementById('surahNavButtons');
    const title = document.getElementById('quranTitle');
    
    if (ayahContainer && !ayahContainer.classList.contains('translate-x-full')) {
        ayahContainer.classList.add('translate-x-full');
        
        // Munculkan kembali Search Bar
        if(searchContainer) searchContainer.classList.remove('-translate-y-24', 'opacity-0', 'pointer-events-none');
        
        if(navButtons) navButtons.classList.add('translate-y-40');
        if(title) title.innerText = "Al-Qur'an";
        
        stopCurrentAudio(); 
    } else {
        if(window.goHome) window.goHome();
    }
}