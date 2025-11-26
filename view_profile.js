export const profileViewHTML = `
<div id="profileView" class="hidden-force flex flex-col h-full absolute inset-0 z-50 transition-all duration-300">
    
    <div class="p-6 pt-12 pb-8 rounded-b-[2.5rem] shadow-sm relative shrink-0 
        bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/20 dark:border-slate-700/30">
        
        <button onclick="closeProfile()" class="absolute top-6 left-6 p-2 rounded-full shadow-sm transition
            bg-white/50 dark:bg-slate-800/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-white/40 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            <i data-lucide="arrow-left" class="w-5 h-5"></i>
        </button>
        
        <div class="flex flex-col items-center text-center mt-4">
            <div class="relative mb-4 group">
                <div class="absolute inset-0 bg-emerald-500 blur-lg opacity-20 rounded-full group-hover:opacity-40 transition"></div>
                <img id="profilePhotoLarge" src="" class="relative w-24 h-24 rounded-full border-4 border-white/50 dark:border-slate-700/50 shadow-xl object-cover">
                <div class="absolute bottom-0 right-0 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white dark:border-slate-800 shadow-lg">
                    <i data-lucide="shield-check" class="w-4 h-4"></i>
                </div>
            </div>
            <h2 id="profileNameLarge" class="text-xl font-bold text-slate-800 dark:text-white">Nama Pengguna</h2>
            <p id="profileEmail" class="text-sm text-slate-500 dark:text-slate-400">email@example.com</p>
        </div>
    </div>

    <div class="p-6 space-y-4 overflow-y-auto flex-1">
        
        <div class="grid grid-cols-2 gap-3 mb-2">
            <div class="p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center
                bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-slate-700/30">
                <h4 class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Perjalanan</h4>
                <p id="statDays" class="text-lg font-bold text-emerald-600 mt-0.5">0 Hari</p>
            </div>
            <div class="p-4 rounded-2xl shadow-sm flex flex-col items-center justify-center
                bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-slate-700/30">
                <h4 class="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Hari Ini</h4>
                <p id="statToday" class="text-lg font-bold text-blue-600 mt-0.5">0/5</p>
            </div>
        </div>

        <div class="rounded-2xl p-5 shadow-sm 
            bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-slate-700/30">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tren Ibadah</h3>
                <div class="flex bg-slate-100/50 dark:bg-slate-700/50 rounded-lg p-1 gap-1 backdrop-blur-sm">
                    <button onclick="loadChartData(7)" id="btn7Days" class="px-2 py-1 text-[10px] rounded-md font-medium transition shadow-sm bg-white dark:bg-slate-600 text-emerald-600">7 Hari</button>
                    <button onclick="loadChartData(14)" id="btn14Days" class="px-2 py-1 text-[10px] rounded-md font-medium transition text-slate-500 hover:text-emerald-600">14 Hari</button>
                </div>
            </div>
            <div class="relative h-48 w-full">
                <canvas id="activityChart"></canvas>
            </div>
        </div>

        <div class="rounded-2xl p-5 shadow-sm 
            bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/40 dark:border-slate-700/30">
            <h3 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Informasi Akun</h3>
            <div class="space-y-3">
                <div class="flex items-center justify-between text-sm">
                    <span class="text-slate-500 dark:text-slate-400">Bergabung</span>
                    <span id="joinDate" class="font-medium text-slate-700 dark:text-slate-200">-</span>
                </div>
                <div class="flex items-center justify-between text-sm">
                    <span class="text-slate-500 dark:text-slate-400">Lokasi</span>
                    <span id="lastLocation" class="font-medium text-slate-700 dark:text-slate-200">-</span>
                </div>
            </div>
        </div>

        <button id="logoutBtnProfile" class="w-full mt-4 p-4 rounded-2xl font-medium border transition flex items-center justify-center gap-2 mb-8
            bg-red-50/50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100/50 dark:border-red-900/30 hover:bg-red-100/50 backdrop-blur-sm">
            <i data-lucide="log-out" class="w-4 h-4"></i> Keluar Aplikasi
        </button>
    </div>
</div>
`;