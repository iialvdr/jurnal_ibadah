const DHIKR_DATA = [
    { id: 0, title: "Tasbih", arabic: "سُبْحَانَ الله", latin: "Subhanallah", target: 33 },
    { id: 1, title: "Tahmid", arabic: "الْحَمْدُ لِلَّهِ", latin: "Alhamdulillah", target: 33 },
    { id: 2, title: "Takbir", arabic: "اللهُ أَكْبَرُ", latin: "Allahu Akbar", target: 33 },
    { id: 3, title: "Tahlil", arabic: "لَا إِلَهَ إِلَّا اللهُ", latin: "Laa ilaaha illallah", target: 33 },
    { id: 4, title: "Istighfar", arabic: "أَسْتَغْفِرُ اللهَ", latin: "Astaghfirullah", target: 100 },
    { id: 5, title: "Sholawat", arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ", latin: "Allahumma sholli 'ala Muhammad", target: 100 }
];

let tasbihCount = 0;
let tasbihTarget = 33;
let isVibroOn = true;
let currentDhikrIndex = -1;

export function initTasbih() {
    window.countTasbih = countTasbih;
    window.resetTasbih = resetTasbih;
    window.setTasbihTarget = setTasbihTarget;
    window.toggleVibro = toggleVibro;
    window.openDhikrMenu = openDhikrMenu;
    window.closeDhikrMenu = () => document.getElementById('dhikrMenuModal').classList.add('hidden');
    window.chooseDhikr = chooseDhikr;
}

function countTasbih() {
    tasbihCount++;
    document.getElementById('tasbihCount').innerText = tasbihCount;
    if(isVibroOn && navigator.vibrate) {
        if(tasbihTarget > 0 && tasbihCount % tasbihTarget === 0) navigator.vibrate([50, 50, 50]);
        else navigator.vibrate(15);
    }
}

function resetTasbih() {
    tasbihCount = 0;
    document.getElementById('tasbihCount').innerText = '0';
}

function setTasbihTarget(target) {
    tasbihTarget = target;
    document.getElementById('tasbihTargetDisplay').innerText = target === 0 ? "Target: ∞" : `Target: ${target}`;
    resetTasbih();
}

function toggleVibro() {
    isVibroOn = !isVibroOn;
    const txt = document.getElementById('vibroText');
    if(txt) txt.innerText = isVibroOn ? "Getar On" : "Getar Off";
}

function openDhikrMenu() {
    const list = document.getElementById('dhikrListContainer');
    if(!list) return;
    let html = '';
    DHIKR_DATA.forEach((item, index) => {
        html += `<div onclick="chooseDhikr(${index})" class="p-4 rounded-2xl border flex items-center justify-between cursor-pointer mb-2 bg-slate-50 dark:bg-slate-800/50">
            <div><h4 class="font-bold text-slate-800 dark:text-white">${item.title}</h4><p class="text-xs text-slate-500">${item.latin}</p></div>
        </div>`;
    });
    list.innerHTML = html;
    document.getElementById('dhikrMenuModal').classList.remove('hidden');
}

function chooseDhikr(index) {
    currentDhikrIndex = index;
    if(index >= 0) {
        const data = DHIKR_DATA[index];
        setTasbihTarget(data.target);
        document.getElementById('dhikrArabicDisplay').innerText = data.arabic;
        document.getElementById('dhikrLatinDisplay').innerText = data.latin;
        document.getElementById('dhikrDisplayArea').classList.remove('hidden');
    }
    document.getElementById('dhikrMenuModal').classList.add('hidden');
    resetTasbih();
}