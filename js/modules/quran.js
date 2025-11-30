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
        html += `
        <div onclick="openSurah(${surah.nomor})" class="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition active:scale-98">
            <div class="w-10 h-10 flex items-center justify-center bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold rounded-full text-sm border border-emerald-200/50">
                ${surah.nomor}
            </div>
            <div class="flex-1">
                <h4 class="font-bold text-slate-800 dark:text-white text-base">${surah.namaLatin}</h4>
                <p class="text-xs text-slate-500 dark:text-slate-400">${surah.arti} • ${surah.jumlahAyat} Ayat</p>
            </div>
            <div class="text-right">
                <span class="font-quran text-xl text-slate-700 dark:text-slate-200">${surah.nama}</span>
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
    
    // [UPDATE] Matikan tombol sementara saat loading biar nggak bisa dispam
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
            if(searchContainer) searchContainer.classList.add('-translate-y-full');
            
            // [UPDATE] Tampilkan dan aktifkan kembali tombol sesuai logika
            if(navButtons) {
                navButtons.classList.remove('translate-y-32');
                const prevBtn = navButtons.children[0];
                const nextBtn = navButtons.children[1];
                
                // Aktifkan kembali (kecuali jika di ujung surat)
                if(prevBtn) prevBtn.disabled = nomor === 1;   // Disabled jika Al-Fatihah
                if(nextBtn) nextBtn.disabled = nomor === 114; // Disabled jika An-Nas
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

        html += `
        <div class="border-b border-slate-100 dark:border-slate-800 pb-6 last:border-0">
            <div class="flex justify-between items-start mb-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                <div class="flex items-center gap-3">
                    <span class="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-lg text-sm font-bold border border-emerald-200/50">
                        ${ayat.nomorAyat}
                    </span>
                </div>
                <div class="flex gap-2">
                    <button onclick="playAudio('${audioUrl}', this)" class="play-audio-btn w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-emerald-600 shadow-sm border border-slate-200 dark:border-slate-600 transition group">
                        <i data-lucide="play" class="w-4 h-4 fill-current group-hover:fill-emerald-600"></i>
                    </button>
                </div>
            </div>
            
            <div class="text-right mb-4 px-2">
                <p class="font-quran text-3xl leading-[2.5] text-slate-800 dark:text-slate-100" dir="rtl">
                    ${ayat.teksArab}
                </p>
            </div>
            
            <div class="space-y-2 px-2">
                <p class="text-emerald-600 dark:text-emerald-400 text-sm font-medium italic mb-1">
                    ${ayat.teksLatin}
                </p>
                <p class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
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
        
        if (currIndex >= 0 && currIndex < allBtns.length - 1) {
            const nextBtn = allBtns[currIndex + 1];
            nextBtn.closest('.border-b').scrollIntoView({ behavior: 'smooth', block: 'center' });
            nextBtn.click();
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
    btn.innerHTML = `<i data-lucide="${state}" class="w-4 h-4 fill-current"></i>`;
    
    if (state === 'pause') {
        btn.classList.add('text-emerald-600', 'border-emerald-500', 'bg-emerald-50', 'dark:bg-emerald-900/20');
        btn.classList.add('animate-pulse');
    } else {
        btn.classList.remove('text-emerald-600', 'border-emerald-500', 'bg-emerald-50', 'dark:bg-emerald-900/20');
        btn.classList.remove('animate-pulse');
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
        if(searchContainer) searchContainer.classList.remove('-translate-y-full');
        if(navButtons) navButtons.classList.add('translate-y-32');
        if(title) title.innerText = "Al-Qur'an";
        
        stopCurrentAudio(); 
    } else {
        if(window.goHome) window.goHome();
    }
}