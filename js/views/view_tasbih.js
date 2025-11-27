export const tasbihViewHTML = `
<div id="tasbihView" class="hidden-force flex flex-col h-full absolute inset-0 z-50 transition-all duration-300 overflow-hidden">
    
    <div class="px-6 pb-4 pt-[calc(2rem+env(safe-area-inset-top))] flex justify-between items-center relative shrink-0 z-20">
        <button onclick="closeTasbih()" class="p-2 -ml-2 rounded-xl hover:bg-white/20 transition group">
            <div class="bg-white/40 dark:bg-slate-700/40 p-2 rounded-full backdrop-blur-md shadow-sm border border-white/20 group-hover:border-emerald-500/30 transition">
                <i data-lucide="arrow-left" class="w-5 h-5 text-slate-600 dark:text-slate-300"></i>
            </div>
        </button>
        <h2 class="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Tasbih Digital</h2>
        <div class="w-9"></div>
    </div>

    <div class="flex-1 flex flex-col items-center justify-center p-6 pb-20 space-y-10">
        
        <div class="flex bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-2xl p-1.5 border border-white/40 dark:border-slate-700/30 shadow-sm">
            <button onclick="setTasbihTarget(33)" id="btnTarget33" class="px-4 py-2 text-xs font-bold rounded-xl transition bg-white dark:bg-slate-600 text-emerald-600 shadow-sm">33</button>
            <button onclick="setTasbihTarget(100)" id="btnTarget100" class="px-4 py-2 text-xs font-bold rounded-xl transition text-slate-500 dark:text-slate-400 hover:bg-white/20">100</button>
            <button onclick="setTasbihTarget(0)" id="btnTargetInf" class="px-4 py-2 text-xs font-bold rounded-xl transition text-slate-500 dark:text-slate-400 hover:bg-white/20">∞</button>
        </div>

        <div onclick="countTasbih()" class="relative group cursor-pointer select-none tap-highlight-transparent">
            <div class="absolute inset-0 bg-emerald-500 rounded-full blur-3xl opacity-20 group-active:opacity-40 transition duration-150 scale-90 group-active:scale-105"></div>
            
            <div class="relative w-72 h-72 rounded-full bg-gradient-to-br from-white/80 to-slate-100/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/50 dark:border-slate-600/50 flex flex-col items-center justify-center transition-all duration-100 group-active:scale-95 active:shadow-inner">
                <span id="tasbihCount" class="text-8xl font-black text-slate-800 dark:text-white tracking-tighter tabular-nums leading-none">0</span>
                <span id="tasbihTargetDisplay" class="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-4 opacity-80">Target: 33</span>
            </div>
        </div>

        <div class="flex gap-6">
            <button onclick="resetTasbih()" class="flex flex-col items-center gap-2 group">
                <div class="p-4 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-slate-700/30 text-slate-500 group-hover:text-red-500 group-active:scale-90 transition shadow-sm backdrop-blur-md">
                    <i data-lucide="rotate-ccw" class="w-6 h-6"></i>
                </div>
                <span class="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Reset</span>
            </button>

            <button onclick="toggleVibro()" id="vibroBtn" class="flex flex-col items-center gap-2 group">
                <div class="p-4 rounded-2xl bg-emerald-100/50 dark:bg-emerald-900/30 border border-emerald-200/50 dark:border-emerald-800/50 text-emerald-600 group-active:scale-90 transition shadow-sm backdrop-blur-md">
                    <i data-lucide="vibrate" class="w-6 h-6"></i>
                </div>
                <span id="vibroText" class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Getar On</span>
            </button>
        </div>
    </div>
</div>
`;