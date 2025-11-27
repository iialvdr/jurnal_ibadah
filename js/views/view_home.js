export const homeViewHTML = `
<div id="homeView" class="hidden-force flex flex-col h-full absolute inset-0 z-40 transition-all duration-300 overflow-y-auto pb-20 pt-[calc(2rem+env(safe-area-inset-top))]">
    
    <div class="px-6 pb-6">
        <div class="flex justify-between items-center">
            <div>
                <p class="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Assalamu'alaikum</p>
                <h1 id="homeUserName" class="text-2xl font-bold text-slate-800 dark:text-white leading-tight">Hamba Allah</h1>
            </div>
            
            <div class="flex items-center gap-3">
                <button onclick="toggleDarkMode()" class="p-2 rounded-full bg-slate-200/50 dark:bg-white/10 hover:bg-slate-300/50 dark:hover:bg-white/20 backdrop-blur-md border border-slate-200/50 dark:border-white/10 text-slate-600 dark:text-white transition active:scale-90 shadow-sm">
                    <i data-lucide="moon" class="w-5 h-5"></i>
                </button>

                <div onclick="openProfile()" class="relative group cursor-pointer">
                    <div class="absolute inset-0 bg-emerald-500/20 dark:bg-white/20 rounded-full blur-md group-hover:blur-lg transition"></div>
                    <img id="homeUserPhoto" src="" referrerpolicy="no-referrer" class="relative w-10 h-10 rounded-full border-2 border-white/50 dark:border-white/30 object-cover shadow-sm">
                </div>
            </div>
        </div>
    </div>

    <div class="px-6 mb-8">
        <div class="bg-gradient-to-br from-emerald-500/90 to-teal-600/90 backdrop-blur-md rounded-3xl p-6 text-white shadow-lg border border-white/20 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-white/20 transition"></div>
            
            <div class="relative z-10">
                <p class="text-xs font-medium text-emerald-100 mb-1">Waktu Sholat Berikutnya</p>
                <h2 id="nextPrayerName" class="text-4xl font-bold tracking-tight mt-2">...</h2>
                <p id="nextPrayerTime" class="text-xl opacity-90 font-mono mt-1">--:--</p>
                
                <div class="mt-6 flex items-center gap-2 text-[10px] bg-black/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                    <i data-lucide="map-pin" class="w-3 h-3"></i>
                    <span id="homeLocationText">Mencari Lokasi...</span>
                </div>
            </div>
        </div>
    </div>

    <div class="px-6 grid grid-cols-2 gap-3">
        
        <button onclick="openTracker()" class="text-left bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/30 shadow-sm hover:shadow-md hover:scale-[1.02] transition active:scale-95 group">
            <div class="bg-emerald-100 dark:bg-emerald-900/30 w-10 h-10 rounded-xl flex items-center justify-center text-emerald-600 mb-3 group-hover:rotate-6 transition">
                <i data-lucide="list-checks" class="w-5 h-5"></i>
            </div>
            <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm">Jurnal</h3>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Catatan Harian</p>
        </button>

        <button onclick="openTasbih()" class="text-left bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/30 shadow-sm hover:shadow-md hover:scale-[1.02] transition active:scale-95 group">
            <div class="bg-blue-100 dark:bg-blue-900/30 w-10 h-10 rounded-xl flex items-center justify-center text-blue-600 mb-3 group-hover:rotate-6 transition">
                <i data-lucide="grip" class="w-5 h-5"></i>
            </div>
            <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm">Tasbih</h3>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Counter Dzikir</p>
        </button>

        <button onclick="openQibla()" class="text-left bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/30 shadow-sm hover:shadow-md hover:scale-[1.02] transition active:scale-95 group">
            <div class="bg-teal-100 dark:bg-teal-900/30 w-10 h-10 rounded-xl flex items-center justify-center text-teal-600 mb-3 group-hover:rotate-6 transition">
                <i data-lucide="compass" class="w-5 h-5"></i>
            </div>
            <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm">Arah Kiblat</h3>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Cari Ka'bah</p>
        </button>

        <button onclick="openProfile()" class="text-left bg-white dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/30 shadow-sm hover:shadow-md hover:scale-[1.02] transition active:scale-95 group">
            <div class="bg-amber-100 dark:bg-amber-900/30 w-10 h-10 rounded-xl flex items-center justify-center text-amber-600 mb-3 group-hover:rotate-6 transition">
                <i data-lucide="user" class="w-5 h-5"></i>
            </div>
            <h3 class="font-bold text-slate-800 dark:text-slate-100 text-sm">Profil</h3>
            <p class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Statistik Saya</p>
        </button>

    </div>
    
    <p class="text-center text-[10px] text-slate-400 mt-8">Jurnal Ibadah v1.0</p>
</div>
`;