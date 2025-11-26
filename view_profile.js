export const profileViewHTML = `
<div id="profileView" class="hidden-force flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-300 absolute inset-0 z-50">
    
    <div class="bg-slate-100 dark:bg-slate-900 p-6 pt-12 pb-8 rounded-b-[2.5rem] shadow-sm relative shrink-0">
        <button onclick="closeProfile()" class="absolute top-6 left-6 p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition">
            <i data-lucide="arrow-left" class="w-5 h-5"></i>
        </button>
        
        <div class="flex flex-col items-center text-center mt-4">
            <div class="relative mb-4">
                <img id="profilePhotoLarge" src="" class="w-24 h-24 rounded-full border-4 border-white dark:border-slate-800 shadow-lg object-cover">
                <div class="absolute bottom-0 right-0 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white dark:border-slate-800">
                    <i data-lucide="shield-check" class="w-4 h-4"></i>
                </div>
            </div>
            <h2 id="profileNameLarge" class="text-xl font-bold text-slate-800 dark:text-white">Nama Pengguna</h2>
            <p id="profileEmail" class="text-sm text-slate-500 dark:text-slate-400">email@example.com</p>
        </div>
    </div>

    <div class="p-6 space-y-4 overflow-y-auto flex-1">
        
        <div class="grid grid-cols-2 gap-3 mb-2">
            <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
                <h4 class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Perjalanan</h4>
                <p id="statDays" class="text-lg font-bold text-emerald-600 mt-0.5">0 Hari</p>
            </div>
            <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center">
                <h4 class="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Hari Ini</h4>
                <p id="statToday" class="text-lg font-bold text-blue-600 mt-0.5">0/5</p>
            </div>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider">Tren Ibadah</h3>
                <div class="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
                    <button onclick="loadChartData(7)" id="btn7Days" class="px-2 py-1 text-[10px] rounded-md font-medium transition bg-white dark:bg-slate-700 text-emerald-600 shadow-sm">7 Hari</button>
                    <button onclick="loadChartData(14)" id="btn14Days" class="px-2 py-1 text-[10px] rounded-md font-medium transition text-slate-500 hover:text-emerald-600">14 Hari</button>
                </div>
            </div>
            
            <div class="relative h-48 w-full">
                <canvas id="activityChart"></canvas>
            </div>
            <p class="text-[10px] text-center text-slate-400 mt-2 italic">Menampilkan jumlah sholat wajib yang dikerjakan.</p>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Informasi Akun</h3>
            <div class="space-y-3">
                <div class="flex items-center justify-between text-sm">
                    <span class="text-slate-500">Bergabung</span>
                    <span id="joinDate" class="font-medium dark:text-slate-200">-</span>
                </div>
                <div class="flex items-center justify-between text-sm">
                    <span class="text-slate-500">Lokasi</span>
                    <span id="lastLocation" class="font-medium dark:text-slate-200">-</span>
                </div>
            </div>
        </div>

        <button id="logoutBtnProfile" class="w-full mt-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl font-medium border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 transition flex items-center justify-center gap-2 mb-8">
            <i data-lucide="log-out" class="w-4 h-4"></i> Keluar Aplikasi
        </button>
    </div>
</div>
`;