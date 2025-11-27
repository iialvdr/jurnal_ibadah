export const quranViewHTML = `
<div id="quranView" class="hidden-force flex flex-col h-full absolute inset-0 z-50 transition-all duration-300 overflow-hidden bg-slate-50 dark:bg-slate-900">
    
    <div class="px-6 pb-2 pt-[calc(2rem+env(safe-area-inset-top))] flex justify-between items-center relative shrink-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <button onclick="handleQuranBack()" class="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <i data-lucide="arrow-left" class="w-5 h-5 text-slate-600 dark:text-slate-300"></i>
        </button>
        <h2 id="quranTitle" class="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Al-Qur'an</h2>
        <div class="w-9"></div>
    </div>

    <div class="flex-1 relative overflow-hidden">
        
        <div id="quranLoading" class="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hidden">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>

        <div id="quranSearchContainer" class="absolute top-0 left-0 right-0 z-20 p-4 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm transition-transform duration-300">
            <div class="relative">
                <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                <input type="text" id="quranSearchInput" onkeyup="searchSurah(this.value)" placeholder="Cari surat..." class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-white placeholder:text-slate-400 shadow-sm">
            </div>
        </div>

        <div id="surahListContainer" class="absolute inset-0 overflow-y-auto p-4 pt-20 pb-32 space-y-3 transition-transform duration-300 scroll-smooth">
            </div>

        <div id="ayahListContainer" class="absolute inset-0 overflow-y-auto p-4 pb-40 space-y-6 bg-white dark:bg-slate-900 translate-x-full transition-transform duration-300 z-10 scroll-smooth">
            <div class="text-center py-6 mb-4 border-b border-slate-100 dark:border-slate-800">
                <span class="font-serif text-2xl text-slate-800 dark:text-white">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
            </div>
            <div id="ayahsContent" class="space-y-8"></div>
        </div>

        <div id="surahNavButtons" class="absolute bottom-6 left-6 right-6 flex justify-between gap-4 z-20 transition-transform duration-300 translate-y-32">
            <button onclick="changeSurah(-1)" class="flex-1 bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition hover:bg-slate-50 dark:hover:bg-slate-700">
                <i data-lucide="chevron-left" class="w-4 h-4"></i> Prev
            </button>
            <button onclick="changeSurah(1)" class="flex-1 bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition hover:bg-emerald-700">
                Next <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>
        </div>

    </div>
</div>
`;