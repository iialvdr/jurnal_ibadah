// src/modules/fasting.js
// Exposes getFastingInfo() as a pure utility function (no DOM dependencies)
import { getHijriDate } from '@/utils/dateUtils';

export const NIAT_DATA = {
    'senin': { judul: 'Puasa Senin', arab: 'نَوَيْتُ صَوْمَ يَوْمِ الاِثْنَيْنِ سُنَّةً لِلهِ تَعَالَى', latin: "Nawaitu sauma yaumil itsnaini sunnatan lillahi ta'ala.", arti: "Saya niat puasa hari Senin, sunnah karena Allah Ta'ala." },
    'kamis': { judul: 'Puasa Kamis', arab: 'نَوَيْتُ صَوْمَ يَوْمِ الْخَمِيْسِ سُنَّةً لِلهِ تَعَالَى', latin: "Nawaitu sauma yaumil khamisi sunnatan lillahi ta'ala.", arti: "Saya niat puasa hari Kamis, sunnah karena Allah Ta'ala." },
    'ayyamul_bidh': { judul: 'Puasa Ayyamul Bidh', arab: 'نَوَيْتُ صَوْمَ أَيَّامِ الْبِيْضِ سُنَّةً لِلهِ تَعَالَى', latin: "Nawaitu sauma ayyamil bidhi sunnatan lillahi ta'ala.", arti: "Saya niat puasa ayyamul bidh, sunnah karena Allah Ta'ala." },
    'ramadhan': { judul: 'Puasa Ramadhan', arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ فَرْضِ شَهْرِ رَمَضَانَ هَذِهِ السَّنَةِ لِلهِ تَعَالَى', latin: "Nawaitu sauma ghadin 'an ada'i fardhi syahri ramadhana hadzihis sanati lillahi ta'ala.", arti: "Saya niat puasa esok hari untuk menunaikan fardhu di bulan Ramadhan tahun ini, karena Allah Ta'ala." },
    'syawal': { judul: 'Puasa Syawal', arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ الشَّوَّالِ لِلهِ تَعَالَى', latin: "Nawaitu sauma ghadin 'an ada'i sunnatis syawwali lillahi ta'ala.", arti: "Saya niat puasa sunnah Syawal esok hari karena Allah Ta'ala." },
    'arafah': { judul: 'Puasa Arafah', arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ يَوْمِ عَرَفَةَ لِلهِ تَعَالَى', latin: "Nawaitu sauma ghadin 'an ada'i sunnati yaumi 'arafata lillahi ta'ala.", arti: "Saya niat puasa sunnah Arafah esok hari karena Allah Ta'ala." },
    'tarwiyah': { judul: 'Puasa Tarwiyah', arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ يَوْمِ التَّرْوِيَةِ لِلهِ تَعَالَى', latin: "Nawaitu sauma ghadin 'an ada'i sunnati yaumit tarwiyati lillahi ta'ala.", arti: "Saya niat puasa sunnah Tarwiyah esok hari karena Allah Ta'ala." },
    'asyura': { judul: 'Puasa Asyura', arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ عَاشُورَاءَ لِلهِ تَعَالَى', latin: "Nawaitu sauma ghadin 'an ada'i sunnati 'asyura-a lillahi ta'ala.", arti: "Saya niat puasa sunnah Asyura esok hari karena Allah Ta'ala." },
    'tasua': { judul: "Puasa Tasu'a", arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ تَاسُوعَاءَ لِلهِ تَعَالَى', latin: "Nawaitu sauma ghadin 'an ada'i sunnati tasu'a-a lillahi ta'ala.", arti: "Saya niat puasa sunnah Tasu'a esok hari karena Allah Ta'ala." },
    'dzulhijjah': { judul: 'Puasa Dzulhijjah', arab: 'نَوَيْتُ صَوْمَ شَهْرِ ذِيْ الْحِجَّةِ سُنَّةً لِلّٰهِ تَعَالَى', latin: "Nawaitu shauma syahri dzil hijjah sunnatan lillahi ta'ala.", arti: "Saya niat puasa sunnah di bulan Dzulhijjah karena Allah Ta'ala." },
    'nisfu_syaban': { judul: "Puasa Nisfu Sya'ban", arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ أَدَاءِ سُنَّةِ نِصْفِ شَعْبَانَ لِلّٰهِ تَعَالَى', latin: "Nawaitu shauma ghadin 'an ada'i sunnati nishfi sya'baana lillahi ta'ala.", arti: "Saya niat puasa sunnah Nisfu Sya'ban esok hari karena Allah Ta'ala." },
    'daud': { judul: 'Puasa Daud', arab: 'نَوَيْتُ صَوْمَ دَاوُدَ سُنَّةً لِلهِ تَعَالَى', latin: "Nawaitu shauma dawuda sunnatan lillahi ta'ala.", arti: "Saya niat puasa Daud, sunnah karena Allah Ta'ala." },
    'qadha': { judul: 'Puasa Qadha Ramadhan', arab: 'نَوَيْتُ صَوْمَ غَدٍ عَنْ قَضَاءِ فَرْضِ شَهْرِ رَمَضَانَ لِلهِ تَعَالَى', latin: "Nawaitu shauma ghadin 'an qadha'i fardhi syahri ramadhana lillahi ta'ala.", arti: "Saya niat puasa esok hari karena mengganti fardhu Ramadhan karena Allah Ta'ala." },
    'nadzar': { judul: 'Puasa Nadzar', arab: 'نَوَيْتُ صَوْمَ النَّذَرِ لِلهِ تَعَالَى', latin: "Nawaitu shauman nadzari lillahi ta'ala.", arti: "Saya niat puasa nadzar karena Allah Ta'ala." },
    'kifarat': { judul: 'Puasa Kifarat', arab: 'نَوَيْتُ صَوْمَ الْكَفَّارَةِ لِلهِ تَعَالَى', latin: "Nawaitu shaumal kaffarati lillahi ta'ala.", arti: "Saya niat puasa kifarat karena Allah Ta'ala." },
    'mutlaq': { judul: 'Puasa Mutlaq', arab: 'نَوَيْتُ الصَّوْمَ سُنَّةً لِلهِ تَعَالَى', latin: "Nawaitush shauma sunnatan lillahi ta'ala.", arti: "Saya niat puasa sunnah karena Allah Ta'ala." }
};

export const NIAT_CATALOG = {
    'ramadhan': { category: 'wajib', icon: 'sun', color: 'amber', desc: 'Puasa wajib di bulan Ramadhan', tags: ['wajib', 'ramadhan', 'fardhu'] },
    'qadha': { category: 'wajib', icon: 'rotate-ccw', color: 'amber', desc: 'Mengganti puasa Ramadhan yang tertinggal', tags: ['wajib', 'qadha', 'ganti'] },
    'nadzar': { category: 'wajib', icon: 'hand', color: 'amber', desc: 'Puasa karena janji atau kaul', tags: ['wajib', 'nadzar', 'janji'] },
    'kifarat': { category: 'wajib', icon: 'scale', color: 'amber', desc: 'Puasa sebagai tebusan atas pelanggaran', tags: ['wajib', 'kifarat', 'tebusan'] },
    'senin': { category: 'reguler', icon: 'calendar-check', color: 'emerald', desc: 'Sunnah setiap hari Senin', tags: ['sunnah', 'mingguan', 'senin'] },
    'kamis': { category: 'reguler', icon: 'calendar-check', color: 'emerald', desc: 'Sunnah setiap hari Kamis', tags: ['sunnah', 'mingguan', 'kamis'] },
    'ayyamul_bidh': { category: 'reguler', icon: 'moon', color: 'blue', desc: 'Tanggal 13, 14, 15 Hijriyah setiap bulan', tags: ['sunnah', 'bulanan', 'pertengahan'] },
    'daud': { category: 'reguler', icon: 'zap', color: 'violet', desc: 'Puasa sehari, berbuka sehari (selang-seling)', tags: ['sunnah', 'harian', 'daud', 'selang'] },
    'syawal': { category: 'khusus', icon: 'gift', color: 'teal', desc: '6 hari di bulan Syawal setelah Idul Fitri', tags: ['sunnah', 'syawal', 'setelah ramadhan'] },
    'arafah': { category: 'khusus', icon: 'mountain', color: 'rose', desc: '9 Dzulhijjah, bagi yang tidak sedang haji', tags: ['sunnah', 'arafah', 'dzulhijjah', 'haji'] },
    'tarwiyah': { category: 'khusus', icon: 'droplets', color: 'sky', desc: '8 Dzulhijjah, sehari sebelum Arafah', tags: ['sunnah', 'tarwiyah', 'dzulhijjah'] },
    'asyura': { category: 'khusus', icon: 'star', color: 'orange', desc: '10 Muharram, menghapus dosa setahun', tags: ['sunnah', 'asyura', 'muharram'] },
    'tasua': { category: 'khusus', icon: 'sparkles', color: 'orange', desc: '9 Muharram, sehari sebelum Asyura', tags: ['sunnah', 'tasua', 'muharram'] },
    'dzulhijjah': { category: 'khusus', icon: 'calendar-range', color: 'indigo', desc: '1-7 Dzulhijjah, bulan penuh berkah', tags: ['sunnah', 'dzulhijjah'] },
    'nisfu_syaban': { category: 'khusus', icon: 'cloud-moon', color: 'purple', desc: "15 Sya'ban, malam pengampunan", tags: ['sunnah', 'syaban', 'nisfu'] },
    'mutlaq': { category: 'lainnya', icon: 'heart', color: 'rose', desc: 'Niat puasa sunnah tanpa waktu tertentu', tags: ['sunnah', 'umum', 'mutlaq', 'bebas'] }
};

export const COLOR_MAP = {
    amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-800/30', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-800/30', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-800/30', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    violet:  { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-100 dark:border-violet-800/30', badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
    teal:    { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-100 dark:border-teal-800/30', badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
    rose:    { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-800/30', badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    sky:     { bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-100 dark:border-sky-800/30', badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
    orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-800/30', badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
    indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-800/30', badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
    purple:  { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-800/30', badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
};

export const CATEGORY_LABELS = {
    'wajib': 'Wajib',
    'reguler': 'Sunnah Rutin',
    'khusus': 'Sunnah Khusus',
    'lainnya': 'Lainnya'
};

/**
 * Pure function — returns fasting info for a given date and hijri date object.
 * No DOM or state dependencies.
 */
export function getFastingInfo(date, hijri) {
    const day = date.getDay();
    const hDay = hijri.day;
    const hMonth = hijri.month;

    if (hMonth === 10 && hDay === 1) return { type: "Idul Fitri", category: "haram" };
    if (hMonth === 12 && hDay === 10) return { type: "Idul Adha", category: "haram" };
    if (hMonth === 12 && (hDay === 11 || hDay === 12 || hDay === 13)) return { type: "Hari Tasyriq", category: "haram" };

    if (hMonth === 9) return { type: "Puasa Ramadhan", category: "wajib", niatKey: "ramadhan" };
    if (hMonth === 10 && hDay >= 2 && hDay <= 7) return { type: "Puasa Syawal", category: "sunnah", niatKey: "syawal" };
    if (hMonth === 12 && hDay >= 1 && hDay <= 7) return { type: "Puasa Dzulhijjah", category: "sunnah", niatKey: "dzulhijjah" };
    if (hMonth === 12 && hDay === 8) return { type: "Puasa Tarwiyah", category: "sunnah", niatKey: "tarwiyah" };
    if (hMonth === 12 && hDay === 9) return { type: "Puasa Arafah", category: "sunnah", niatKey: "arafah" };
    if (hMonth === 1 && hDay === 9) return { type: "Puasa Tasu'a", category: "sunnah", niatKey: "tasua" };
    if (hMonth === 1 && hDay === 10) return { type: "Puasa Asyura", category: "sunnah", niatKey: "asyura" };
    if (hMonth === 8 && hDay === 15) return { type: "Puasa Nisfu Sya'ban", category: "sunnah", niatKey: "nisfu_syaban" };
    if (hDay === 13 || hDay === 14 || hDay === 15) return { type: "Puasa Ayyamul Bidh", category: "sunnah", niatKey: "ayyamul_bidh" };
    if (day === 1) return { type: "Puasa Senin", category: "sunnah", niatKey: "senin" };
    if (day === 4) return { type: "Puasa Kamis", category: "sunnah", niatKey: "kamis" };
    return null;
}

export function getUpcomingFasting(days = 30) {
    const result = [];
    const startDate = new Date();
    for (let i = 1; i <= days; i++) {
        const nextDate = new Date(startDate);
        nextDate.setDate(startDate.getDate() + i);
        const nextHijri = getHijriDate(nextDate);
        const info = getFastingInfo(nextDate, nextHijri);
        if (info) result.push({ date: nextDate, hijri: nextHijri, info });
    }
    return result;
}
