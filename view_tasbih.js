export const tasbihViewHTML = `
<div id="tasbihView" class="hidden-force flex flex-col h-full absolute inset-0 z-50 transition-all duration-300 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-xl">
    
    <div class="pt-[calc(3rem+env(safe-area-inset-top))] px-6 pb-4 flex justify-between items-center relative shrink-0">
        <button onclick="closeTasbih()" class="p-2 rounded-full shadow-sm transition bg-white/50 dark:bg-slate-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-white/40 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            <i data-lucide="arrow-left" class="w-5 h-5"></i>
        </button>
        <h2 class="text-lg font-bold text-slate-800 dark:text-white tracking-wide">Tasbih Digital</h2>
        <div class="w-9"></div> </div>

    <div class="flex-1 flex flex-col items-center justify-center p-6 pb-[calc(6rem+env(safe-area-inset-bottom))] space-y-10">
        
        <div class="flex bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-xl p-1 border border-white/40 dark:border-slate-700/30 shadow-sm">
            <button onclick="setTasbihTarget(33)" id="btnTarget33" class="px-4 py-2 text-xs font-bold rounded-lg transition bg-emerald-500 text-white shadow-md">33</button>
            <button onclick="setTasbihTarget(100)" id="btnTarget100" class="px-4 py-2 text-xs font-bold rounded-lg transition text-slate-500 dark:text-slate-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30">100</button>
            <button onclick="setTasbihTarget(0)" id="btnTargetInf" class="px-4 py-2 text-xs font-bold rounded-lg transition text-slate-500 dark:text-slate-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30">∞</button>
        </div>

        <div onclick="countTasbih()" class="relative group cursor-pointer select-none tap-highlight-transparent">
            <div class="absolute inset-0 bg-emerald-500 rounded-full blur-3xl opacity-20 group-active:opacity-50 transition duration-150 scale-90 group-active:scale-110"></div>
            
            <div class="relative w-72 h-72 rounded-full bg-gradient-to-br from-white to-slate-100 dark:from-slate-800 dark:to-slate-900 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border border-white/50 dark:border-slate-600/50 flex flex-col items-center justify-center transition-all duration-100 group-active:scale-95 active:shadow-inner">
                <span id="tasbihCount" class="text-8xl font-black text-slate-800 dark:text-white tracking-tighter tabular-nums leading-none">0</span>
                <span id="tasbihTargetDisplay" class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mt-4">Target: 33</span>
            </div>
        </div>

        <div class="flex gap-6">
            <button onclick="resetTasbih()" class="flex flex-col items-center gap-2 group">
                <div class="p-4 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-slate-700/30 text-slate-500 group-hover:text-red-500 group-active:scale-90 transition shadow-sm backdrop-blur-md">
                    <i data-lucide="rotate-ccw" class="w-6 h-6"></i>
                </div>
                <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Reset</span>
            </button>

            <button onclick="toggleVibro()" id="vibroBtn" class="flex flex-col items-center gap-2 group">
                <div class="p-4 rounded-2xl bg-emerald-100/80 dark:bg-emerald-900/50 border border-emerald-200/50 dark:border-emerald-800/50 text-emerald-600 group-active:scale-90 transition shadow-sm backdrop-blur-md">
                    <i data-lucide="vibrate" class="w-6 h-6"></i>
                </div>
                <span id="vibroText" class="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium uppercase tracking-wider">Getar On</span>
            </button>
        </div>

    </div>
</div>
`;