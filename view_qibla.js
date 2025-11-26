export const qiblaViewHTML = `
<div id="qiblaView" class="hidden-force flex flex-col h-full absolute inset-0 z-50 transition-all duration-300 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-xl">
    
    <div class="pt-[calc(3rem+env(safe-area-inset-top))] px-6 pb-4 flex justify-between items-center relative shrink-0">
        <button onclick="closeQibla()" class="p-2 rounded-full shadow-sm transition bg-white/50 dark:bg-slate-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-white/40 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            <i data-lucide="arrow-left" class="w-5 h-5"></i>
        </button>
        <h2 class="text-lg font-bold text-slate-800 dark:text-white tracking-wide">Arah Kiblat</h2>
        <div class="w-9"></div>
    </div>

    <div class="flex-1 flex flex-col items-center justify-center p-6 pb-[calc(6rem+env(safe-area-inset-bottom))] relative">
        
        <div class="relative w-72 h-72 flex items-center justify-center">
            
            <div class="absolute -top-6 z-20 flex flex-col items-center">
                <div class="w-1 h-4 bg-red-500 rounded-full mb-1"></div>
                <i data-lucide="smartphone" class="w-4 h-4 text-slate-400"></i>
            </div>

            <div id="compassDisc" class="w-full h-full rounded-full bg-white/60 dark:bg-slate-800/60 shadow-2xl border-4 border-white/40 dark:border-slate-700/40 backdrop-blur-sm relative transition-transform duration-100 ease-linear will-change-transform">
                
                <span class="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-bold text-red-500">U</span>
                <span class="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400">S</span>
                <span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">B</span>
                <span class="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">T</span>

                <div id="qiblaPointer" class="absolute inset-0 transition-transform duration-500">
                    <div class="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <div class="relative group">
                            <div class="absolute inset-0 bg-emerald-500 blur-md opacity-50 rounded-full animate-pulse"></div>
                            <img src="https://img.icons8.com/fluency/48/kaaba.png" class="relative w-10 h-10 drop-shadow-md z-10" alt="Kaaba">
                        </div>
                        <div class="w-0.5 h-12 bg-gradient-to-b from-emerald-500 to-transparent mt-1"></div>
                    </div>
                </div>

            </div>
        </div>

        <div class="mt-12 text-center space-y-2 z-10">
            <div class="flex items-center justify-center gap-2">
                <h3 id="qiblaDegree" class="text-4xl font-bold text-slate-800 dark:text-white font-mono tracking-tighter">--°</h3>
                <span class="text-sm text-slate-400 mt-2">ke Kiblat</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 bg-white/30 dark:bg-black/30 px-3 py-1 rounded-full inline-block">
                Jarak: <span id="qiblaDistance" class="font-medium text-slate-700 dark:text-slate-200">- km</span>
            </p>
            
            <div id="compassPermissionBtn" class="hidden pt-4">
                <button onclick="requestCompassPermission()" class="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium shadow-lg hover:bg-emerald-700 transition">
                    Izinkan Akses Kompas
                </button>
            </div>
        </div>
        
        <p class="absolute bottom-8 text-[10px] text-slate-400/70 text-center px-8 leading-relaxed">
            Akurasi bergantung pada sensor HP.<br>Gerakkan HP membentuk angka 8 untuk kalibrasi.
        </p>
    </div>
</div>
`;