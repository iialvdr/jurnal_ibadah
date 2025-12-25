export function initZakat() {
    window.switchZakatTab = switchZakatTab;
    window.calculateMaal = calculateMaal;
    window.calculateFitrah = calculateFitrah;
    window.calculateFidyah = calculateFidyah;
    window.copyResult = copyResult;

    // PERBAIKAN: Daftarkan fungsi helper ke window agar bisa dipanggil HTML
    window.adjustNumber = adjustNumber;
    window.closeResult = closeResult;

    // Reset view saat dibuka
    window.addEventListener('viewChanged', (e) => {
        if (e.detail.viewId === 'zakatView') {
            document.getElementById('zakatResult').classList.add('hidden');
        }
    });
}

// --- FUNGSI HELPER BARU (DIPINDAHKAN DARI HTML) ---

function adjustNumber(id, delta) {
    const el = document.getElementById(id);
    if (!el) return;

    let val = parseInt(el.value) || 0;
    val += delta;

    if (val < 1) val = 1;
    el.value = val;

    // Efek getar sedikit untuk feedback
    if (window.vibrateSoft) window.vibrateSoft();
    else if (navigator.vibrate) navigator.vibrate(5);
}

function closeResult() {
    const el = document.getElementById('zakatResult');
    if (el) {
        el.classList.add('hidden');
    }
}

// --- FUNGSI UTAMA LAINNYA ---

function switchZakatTab(tab) {
    const tabs = ['maal', 'fitrah', 'fidyah'];

    const activeClass = [
        'bg-white',
        'dark:bg-slate-800',
        'text-emerald-600',
        'border',
        'border-slate-100',
        'dark:border-slate-700',
        'shadow-sm'
    ];

    const inactiveClass = [
        'text-slate-400',
        'hover:text-emerald-600',
        'hover:bg-white/50',
        'dark:hover:bg-slate-800/50',
        'border-transparent'
    ];

    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        const view = document.getElementById(`view-${t}`);

        if (t === tab) {
            btn.classList.remove(...inactiveClass);
            btn.classList.add(...activeClass);
            view.classList.remove('hidden');
        } else {
            btn.classList.remove(...activeClass);
            btn.classList.add(...inactiveClass);
            view.classList.add('hidden');
        }
    });

    closeResult(); // Tutup hasil jika pindah tab
}

function formatRupiah(num) {
    return 'Rp ' + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function showResult(amount, desc) {
    const resDiv = document.getElementById('zakatResult');
    const resAmount = document.getElementById('resultAmount');
    const resDesc = document.getElementById('resultDesc');

    resAmount.innerText = formatRupiah(Math.ceil(amount));
    resDesc.innerText = desc;
    resDiv.classList.remove('hidden');
}

function calculateMaal() {
    const goldPrice = parseFloat(document.getElementById('inputGoldPrice').value) || 0;
    const assets = parseFloat(document.getElementById('inputAssets').value) || 0;

    const nisab = 85 * goldPrice; // Nisab 85 gram emas

    if (assets >= nisab) {
        const zakat = assets * 0.025;
        showResult(zakat, `Harta Anda mencapai Nisab (Rp ${formatRupiah(nisab)}). Wajib Zakat.`);
    } else {
        showResult(0, `Harta belum mencapai Nisab (Rp ${formatRupiah(nisab)}). Tidak wajib zakat, tapi disarankan sedekah.`);
    }
}

function calculateFitrah() {
    const people = parseFloat(document.getElementById('inputFitrahPeople').value) || 0;
    const ricePrice = parseFloat(document.getElementById('inputRicePrice').value) || 0;

    const zakatPerPerson = 3.5 * ricePrice;
    const total = people * zakatPerPerson;

    showResult(total, `Zakat Fitrah untuk ${people} orang (setara 3.5 Liter beras/orang).`);
}

function calculateFidyah() {
    const days = parseFloat(document.getElementById('inputFidyahDays').value) || 0;
    const cost = parseFloat(document.getElementById('inputMealCost').value) || 0;

    const total = days * cost;
    showResult(total, `Fidyah untuk ${days} hari tidak berpuasa.`);
}

function copyResult() {
    const text = document.getElementById('resultAmount').innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("Nominal disalin: " + text);
    });
}