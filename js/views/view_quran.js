export const quranViewHTML = `
<div id="quranView" class="hidden-force flex flex-col h-full absolute inset-0 z-50 transition-all duration-300 overflow-hidden bg-slate-50 dark:bg-slate-900">
    
    <div class="px-6 pb-2 pt-[calc(2rem+env(safe-area-inset-top))] flex justify-between items-center relative shrink-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <button onclick="handleQuranBack()" class="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition">
            <i data-lucide="arrow-left" class="w-5 h-5 text-slate-600 dark:text-slate-300"></i>
        </button>
        <h2 id="quranTitle" class="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Al-Qur'an</h2>
        <div class="w-9"></div> </div>

    <div class="flex-1 relative overflow-hidden">
        
        <div id="quranLoading" class="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hidden">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>

        <div id="surahListContainer" class="absolute inset-0 overflow-y-auto p-4 pb-32 space-y-3 transition-transform duration-300">
            </div>

        <div id="ayahListContainer" class="absolute inset-0 overflow-y-auto p-4 pb-32 space-y-6 bg-white dark:bg-slate-900 translate-x-full transition-transform duration-300 z-10">
            <div class="text-center py-6 mb-4 border-b border-slate-100 dark:border-slate-800">
                <span class="font-serif text-2xl text-slate-800 dark:text-white">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</span>
            </div>
            <div id="ayahsContent" class="space-y-8"></div>
        </div>
    </div>
</div>
`;