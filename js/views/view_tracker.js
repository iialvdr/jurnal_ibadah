export const trackerViewHTML = `
<div id="trackerView" class="hidden-force flex flex-col h-full absolute inset-0 z-40 transition-all duration-300 overflow-hidden">
    
    <div class="px-6 pb-4 pt-[calc(2rem+env(safe-area-inset-top))] shrink-0 relative z-20">
        
        <div class="flex justify-between items-center mb-6">
            <button onclick="goHome()" class="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition group p-2 -ml-2 rounded-xl hover:bg-white/20">
                <div class="bg-white/40 dark:bg-slate-700/40 p-2 rounded-full backdrop-blur-md shadow-sm border border-white/20 group-hover:border-emerald-500/30 transition">
                    <i data-lucide="arrow-left" class="w-5 h-5"></i>
                </div>
                <span class="text-sm font-bold tracking-wide">Kembali</span>
            </button>
            <h2 class="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Jurnal Harian</h2>
        </div>

        <div class="flex flex-col gap-3">
            <div class="flex justify-between items-center bg-white/40 dark:bg-slate-800/40 p-2 rounded-2xl backdrop-blur-md border border-white/40 dark:border-slate-700/30 shadow-sm">
                <button onclick="changeDate(-1)" class="p-2 hover:bg-white/30 rounded-xl transition text-slate-600 dark:text-slate-300"><i data-lucide="chevron-left" class="w-5 h-5"></i></button>
                <div class="text-center">
                    <span id="dateDisplay" class="font-bold text-slate-800 dark:text-white text-sm block">Loading...</span>
                    <span id="hijriDisplay" class="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">...</span>
                </div>
                <button onclick="changeDate(1)" class="p-2 hover:bg-white/30 rounded-xl transition text-slate-600 dark:text-slate-300"><i data-lucide="chevron-right" class="w-5 h-5"></i></button>
            </div>
            
            <button id="resetDateBtn" onclick="resetToToday()" class="hidden mx-auto text-[10px] bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 py-1.5 px-4 rounded-full border border-emerald-200/50 backdrop-blur-sm font-medium shadow-sm">
                Kembali ke Hari Ini
            </button>
        </div>

        <div id="progressContainer" class="mt-4">
            <div class="flex justify-between text-xs mb-1.5 text-slate-600 dark:text-slate-300 font-medium px-1">
                <span>Capaian Harian</span>
                <span id="progressText">0%</span>
            </div>
            <div class="w-full bg-slate-200/50 dark:bg-slate-700/50 rounded-full h-2.5 overflow-hidden backdrop-blur-sm border border-white/20">
                <div id="progressBar" class="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" style="width: 0%"></div>
            </div>
        </div>
    </div>

    <div class="flex-1 px-6 py-2 overflow-y-auto relative scroll-smooth" id="trackerContent">
        <div id="dataLoading" class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hidden">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
        
        <div id="prayerList" class="space-y-3 pb-32"></div>
    </div>
</div>
`;