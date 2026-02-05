/* */
import { getHijriDate } from '../utils/date-utils.js';

export function initZakat() {
    window.switchZakatTab = switchZakatTab;
    window.calculateMaal = calculateMaal;
    window.calculateFitrah = calculateFitrah;
    window.calculateFidyah = calculateFidyah;
    window.closeZakatResult = closeZakatResult;

    window.addEventListener('viewExit', (e) => {
        if (e.detail.viewId === 'zakatView') {
            switchZakatTab('maal');
            closeZakatResult();
        }
    });
}

function switchZakatTab(tab) {
    const tabs = ['maal', 'fitrah', 'fidyah'];
    const indicator = document.getElementById('zakatTabIndicator');

    if (indicator) {
        const index = tabs.indexOf(tab);
        indicator.style.transform = `translateX(${index * 100}%)`;
    }

    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        const view = document.getElementById(`view-${t}`);
        if (btn) {
            if (t === tab) {
                btn.classList.remove('text-slate-400');
                btn.classList.add('text-emerald-600', 'font-black');
                view?.classList.remove('hidden');
            } else {
                btn.classList.remove('text-emerald-600', 'font-black');
                btn.classList.add('text-slate-400', 'font-bold');
                view?.classList.add('hidden');
            }
        }
    });
}

function showZakatResult(title, amount, details) {
    const amountEl = document.getElementById('resAmount');
    const dateEl = document.getElementById('resDate');

    document.getElementById('resTitle').innerText = title;
    document.getElementById('resDetails').innerText = details;

    const today = new Date();
    const hijri = getHijriDate(today);
    const masehi = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    if (dateEl) dateEl.innerText = `${hijri.full} • ${masehi}`;

    amountEl.innerText = amount.replace('Rp ', '');

    const modal = document.getElementById('zakatResultModal');
    modal.classList.remove('invisible', 'pointer-events-none');

    requestAnimationFrame(() => {
        document.getElementById('zakatResultBackdrop').classList.add('opacity-100');
        document.getElementById('zakatResultContent').classList.remove('translate-y-full');
    });

    if (window.lucide) lucide.createIcons({ root: modal });
    if (typeof window.showAppToast === 'function') window.showAppToast("Perhitungan selesai", "success");
}

function closeZakatResult() {
    const modal = document.getElementById('zakatResultModal');
    if (!modal) return;
    document.getElementById('zakatResultBackdrop').classList.remove('opacity-100');
    document.getElementById('zakatResultContent').classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('invisible', 'pointer-events-none'), 500);
}

function calculateMaal() {
    const goldPrice = parseFloat(document.getElementById('inputGoldPrice').value) || 0;
    const assets = parseFloat(document.getElementById('inputAssets').value) || 0;
    if (assets <= 0) return;
    const nisab = goldPrice * 85;

    if (assets < nisab) {
        showZakatResult("HASIL ANALISA", "0", `Total harta simpanan kamu senilai Rp ${assets.toLocaleString()} belum mencapai batas minimum nisab emas (Rp ${nisab.toLocaleString()}). Kamu belum memiliki kewajiban zakat maal.`);
    } else {
        const zakat = assets * 0.025;
        showZakatResult("WAJIB ZAKAT MAAL", zakat.toLocaleString(), `Alhamdulillah, harta kamu telah mencapai nisab. Kewajiban zakat maal kamu sebesar 2,5% dari total aset adalah seperti yang tertera di atas.`);
    }
}

function calculateFitrah() {
    const people = parseInt(document.getElementById('inputFitrahPeople').value) || 0;
    const price = parseFloat(document.getElementById('inputFitrahPrice').value) || 0;
    if (people <= 0) return;
    const totalMoney = people * price * 2.5;
    const totalWeight = people * 2.5;
    showZakatResult("WAJIB ZAKAT FITRAH", totalMoney.toLocaleString(), `Kewajiban zakat fitrah untuk ${people} jiwa adalah setara dengan ${totalWeight.toLocaleString()} Kg beras. Jika diuangkan, totalnya adalah nilai yang tertera di atas.`);
}

function calculateFidyah() {
    const days = parseInt(document.getElementById('inputFidyahDays').value) || 0;
    const rate = parseFloat(document.getElementById('inputFidyahRate').value) || 0;
    if (days <= 0 || rate <= 0) return;
    const total = days * rate;
    showZakatResult("FIDYAH PUASA", total.toLocaleString(), `Total fidyah yang harus dibayarkan untuk pengganti ${days} hari hutang puasa dengan estimasi biaya porsi makan per hari sebesar Rp ${rate.toLocaleString()}.`);
}
