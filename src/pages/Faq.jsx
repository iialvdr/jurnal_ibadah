// src/pages/Faq.jsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Search, ChevronDown, ChevronUp, HelpCircle, 
    Sparkles, Shield, Calculator, ListChecks, BookOpenCheck, Clock3 
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { motion } from 'framer-motion';
import TopNavConfig from '@/components/TopNavConfig';

const FAQ_CATEGORIES = [
    {
        id: 'umum',
        title: 'Aplikasi & Umum',
        icon: Sparkles,
        color: 'emerald',
        faqs: [
            { q: 'Apa itu Jurnal Ibadah?', a: 'Asisten digital modern untuk membantu mencatat aktivitas ibadah, membaca Al-Qur\'an, melihat jadwal sholat, hingga menghitung zakat dalam satu aplikasi ringan.' },
            { q: 'Apakah aplikasi ini gratis?', a: 'Iya, sepenuhnya gratis dan dikembangkan untuk membantu sesama umat Muslim dalam mengelola rutinitas ibadah harian.' },
            { q: 'Apakah saya perlu mengunduh aplikasi di Play Store?', a: 'Tidak perlu, Anda bisa langsung mengaksesnya melalui browser. Namun, Anda bisa menyimpannya ke layar utama (Add to Home Screen) agar muncul seperti aplikasi biasa di menu HP Anda.' }
        ]
    },
    {
        id: 'akun',
        title: 'Akun & Sinkronisasi',
        icon: Shield,
        color: 'blue',
        faqs: [
            { q: 'Kenapa harus login Google?', a: 'Dengan login via Google, seluruh progres ibadah dan bacaan Al-Qur\'an kamu tersimpan aman. Data tidak akan hilang meskipun kamu mengganti perangkat.' },
            { q: 'Apakah data saya aman?', a: 'Tentu. Kami menggunakan infrastruktur Google Firebase untuk memastikan keamanan akun dan privasi data pribadi kamu tetap terlindungi.' },
            { q: 'Bagaimana cara mengganti foto profil?', a: 'Aplikasi mengambil data profil langsung dari akun Google Anda. Jika Anda mengubah foto di akun Google, maka tampilan di aplikasi Jurnal Ibadah akan ikut berubah.' }
        ]
    },
    {
        id: 'zakat',
        title: 'Zakat, Doa & Fitur Lainnya',
        icon: Calculator,
        color: 'amber',
        faqs: [
            { q: 'Bagaimana cara hitung Zakat Maal?', a: 'Cukup masukkan harga emas saat ini dan total harta simpananmu. Aplikasi akan menghitung apakah hartamu sudah mencapai nisab dan berapa nominal yang wajib dikeluarkan.' },
            { q: 'Bagaimana akurasi Kiblat?', a: 'Akurasi bergantung pada sensor magnetik perangkatmu. Pastikan kalibrasi GPS aktif dan jauhkan dari benda logam/magnet saat digunakan.' },
            { q: 'Apakah ada fitur Tasbih?', a: 'Ya, tersedia fitur Tasbih Digital dengan mode getar yang memungkinkan Anda berdzikir tanpa perlu melihat layar HP secara terus-menerus.' },
            { q: 'Apa itu fitur Asmaul Husna?', a: 'Fitur ini menyajikan 99 nama Allah yang mulia, lengkap dengan tulisan Arab, cara baca (latin), serta maknanya dalam bahasa Indonesia.' },
            { q: 'Bagaimana jika saya menemukan kesalahan atau ingin memberi saran?', a: 'Anda dapat melihat informasi pengembang dan atribusi sumber data melalui menu "Kredit" atau melihat riwayat perubahan di menu "Changelog".' }
        ]
    },
    {
        id: 'ibadah',
        title: 'Pencatat Ibadah',
        icon: ListChecks,
        color: 'emerald',
        faqs: [
            { q: 'Cara mengisi Jurnal Harian?', a: 'Navigasikan ke halaman **Jurnal Harian**. Kamu bisa memberikan centang pada sholat Fardhu maupun Sunnah yang telah diselesaikan.' },
            { q: 'Tombol centang tidak bisa diklik?', a: 'Fitur *Smart Calculation* memastikan tombol hanya aktif setelah waktu sholat tersebut tiba, membantu kamu mencatat sesuai waktu aslinya.' },
            { q: 'Dapatkah saya melihat pencapaian ibadah saya?', a: 'Tentu. Di halaman profil, Anda dapat melihat statistik ringkas mengenai aktivitas ibadah yang telah Anda catat melalui fitur tracker.' },
            { q: 'Apakah saya bisa melihat catatan hari kemarin?', a: 'Ya, Anda bisa mengganti tanggal pada halaman Jurnal Harian untuk meninjau atau mengisi catatan ibadah pada hari-hari sebelumnya.' }
        ]
    },
    {
        id: 'quran',
        title: 'Al-Qur\'an & Hadits',
        icon: BookOpenCheck,
        color: 'purple',
        faqs: [
            { q: 'Apa itu Perpustakaan Hadits?', a: 'Fitur baru yang memungkinkan kamu menjelajahi ribuan hadits dari 9 perawi besar seperti Bukhari, Muslim, hingga Tirmidzi secara lengkap dengan teks Indonesia.' },
            { q: 'Cara mencari nomor hadits?', a: 'Buka kitab pilihanmu, lalu gunakan kotak pencarian di bagian atas untuk memasukkan nomor hadits yang spesifik.' },
            { q: 'Bagaimana cara mencari surah tertentu?', a: 'Pada daftar surah Al-Qur\'an, tersedia fitur pencarian yang memudahkan Anda menemukan surah berdasarkan nama dengan cepat.' },
            { q: 'Bagaimana jika saya lupa ayat terakhir yang dibaca?', a: 'Aplikasi secara otomatis menyimpan ayat terakhir yang Anda buka. Informasi ini ditampilkan di bagian "Terakhir Dibaca" pada halaman beranda.' },
            { q: 'Dari mana sumber haditsnya?', a: 'Data hadits disuplai secara real-time melalui **MyQuran API (Ensiklopedia Hadis)** untuk memastikan keakuratan nomor dan teks hadits yang ditampilkan.' }
        ]
    },
    {
        id: 'jadwal',
        title: 'Jadwal & Waktu Ibadah',
        icon: Clock3,
        color: 'teal',
        faqs: [
            { q: 'Bagaimana cara melihat jadwal puasa?', a: 'Aplikasi menyediakan menu "Jadwal Puasa" yang menampilkan informasi hari-hari disunnahkan berpuasa, seperti Ayyamul Bidh, Senin-Kamis, dan hari besar Islam lainnya.' },
            { q: 'Dari mana sumber jadwal sholatnya?', a: 'Aplikasi ini menggunakan **Jadwal Sholat Resmi Kementerian Agama RI (Kemenag)** secara real-time berdasarkan titik lokasi Anda, sehingga dijamin sama dengan kalender resmi masjid setempat.' },
            { q: 'Mengapa jadwal sholat saya berbeda dengan masjid sekitar?', a: 'Karena menggunakan standar Kemenag, jadwal ini sangat akurat. Jika masih ada perbedaan, pastikan izin lokasi GPS (Lokasi Anda) sudah menyala agar aplikasi bisa menyesuaikan waktu dengan kota Anda secara persis.' }
        ]
    }
];

function FaqItem({ item, isOpen, onClick }) {
    return (
        <div className="rounded-[1.5rem] bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 transition-all duration-300">
            <button onClick={onClick} className="w-full flex items-center justify-between gap-4 p-4 active:scale-[0.98] transition-transform">
                <h5 className="text-sm font-bold text-slate-800 dark:text-white text-left">{item.q}</h5>
                <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-emerald-500' : ''}`} />
            </button>
            <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out`}
                style={{ maxHeight: isOpen ? '500px' : '0', opacity: isOpen ? 1 : 0 }}
            >
                <div className="px-4 pb-4">
                    <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.a.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\*(.*?)\*/g, '<i>$1</i>')) }} />
                </div>
            </div>
        </div>
    );
}

export default function Faq() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all'); // 'all', 'akun', 'ibadah', etc.
    const [openItems, setOpenItems] = useState({});
    const [isAllOpen, setIsAllOpen] = useState(false);

    // Filter Logic
    const displayData = useMemo(() => {
        return FAQ_CATEGORIES.map(category => {
            if (filter !== 'all' && category.id !== filter) return null;
            
            const filteredFaqs = category.faqs.filter(faq => 
                faq.q.toLowerCase().includes(search.toLowerCase()) || 
                faq.a.toLowerCase().includes(search.toLowerCase())
            );

            if (filteredFaqs.length === 0) return null;

            return {
                ...category,
                faqs: filteredFaqs
            };
        }).filter(Boolean);
    }, [search, filter]);

    const toggleItem = (catId, faqIdx) => {
        if (navigator.vibrate) navigator.vibrate(10);
        const key = `${catId}-${faqIdx}`;
        setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleAll = () => {
        if (navigator.vibrate) navigator.vibrate(10);
        if (isAllOpen) {
            setOpenItems({});
        } else {
            const all = {};
            displayData.forEach(cat => {
                cat.faqs.forEach((_, idx) => {
                    all[`${cat.id}-${idx}`] = true;
                });
            });
            setOpenItems(all);
        }
        setIsAllOpen(!isAllOpen);
    };

    return (
        <div id="faqView" className="app-view active flex flex-col h-full absolute inset-0 z-50 transition-all duration-300 overflow-y-auto bg-slate-100 dark:bg-slate-950 no-scrollbar">
            
            <div className="fixed top-0 left-0 right-0 h-64 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none z-0"></div>

            {/* Header */}
            <TopNavConfig 
                leftNode={
                    <button onClick={() => { if (navigator.vibrate) navigator.vibrate(10); navigate(-1); }} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
                    </button>
                }
                titleNode="Pusat Bantuan"
                rightNode={<div className="w-10" />}
            />
            <div className="h-[5.5rem] md:h-[7rem] shrink-0 w-full" />

            <div className="relative z-10 px-5 pt-5 pb-32 md:pb-12 w-full max-w-7xl mx-auto md:px-8">
                
                {/* Hero Banner */}
                <div className="mb-5 relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 p-5 shadow-lg shadow-emerald-500/20">
                    <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full" />
                    <div className="absolute -right-2 -bottom-8 w-20 h-20 bg-white/5 rounded-full" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner shrink-0">
                            <HelpCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-white tracking-tight">Pusat Bantuan</h3>
                            <p className="text-[11px] text-emerald-100/80 mt-0.5 max-w-[250px]">Panduan ringkas untuk memakai seluruh fitur Jurnal Ibadah.</p>
                        </div>
                    </div>
                </div>

                {/* Filter Chips */}
                <div className="mb-4 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto no-scrollbar flex gap-2 pb-1">
                    <button onClick={() => setFilter('all')} 
                        className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-bold tracking-wide transition-colors ${filter === 'all' ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}`}>Semua</button>
                    <button onClick={() => setFilter('akun')} 
                        className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-bold tracking-wide transition-colors ${filter === 'akun' ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}`}>Akun</button>
                    <button onClick={() => setFilter('ibadah')} 
                        className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-bold tracking-wide transition-colors ${filter === 'ibadah' ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}`}>Ibadah</button>
                    <button onClick={() => setFilter('zakat')} 
                        className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-bold tracking-wide transition-colors ${filter === 'zakat' ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}`}>Zakat</button>
                    <button onClick={() => setFilter('quran')} 
                        className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-bold tracking-wide transition-colors ${filter === 'quran' ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}`}>Al-Qur'an & Hadits</button>
                    <button onClick={() => setFilter('jadwal')} 
                        className={`shrink-0 px-4 py-2 rounded-full text-[11px] font-bold tracking-wide transition-colors ${filter === 'jadwal' ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'}`}>Jadwal</button>
                </div>

                {/* Search Bar */}
                <div className="mb-6 md:mb-8">
                    <div className="relative bento-card bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-[1.6rem] border border-white dark:border-slate-800 flex items-center px-5 py-4 transition-all duration-300 shadow-sm focus-within:ring-4 focus-within:ring-emerald-500/10">
                        <Search className="w-5 h-5 text-slate-400 focus-within:text-emerald-500" />
                        <input 
                            type="text" 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari pertanyaan atau kata kunci..." 
                            className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 dark:text-white placeholder:text-slate-400 ml-4 outline-none" 
                        />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-2">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ketik untuk memfilter pertanyaan.</p>
                        <button onClick={toggleAll} className="px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest active:scale-95 transition">
                            {isAllOpen ? 'Tutup Semua' : 'Buka Semua'}
                        </button>
                    </div>
                </div>

                {/* FAQ List Content */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-start">
                    {displayData.length === 0 ? (
                        <div className="col-span-full py-10 text-center opacity-50">
                            <p className="text-sm font-bold">Tidak ada FAQ yang cocok.</p>
                        </div>
                    ) : (
                        <>
                            {/* Kiri */}
                            <div className="md:col-span-6 space-y-5">
                                {displayData
                                    .filter(c => ['umum', 'akun', 'zakat'].includes(c.id))
                                    .map((category, catIndex) => (
                                    <div key={category.id} className="bento-card bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-white dark:border-slate-800 shadow-sm faq-section animate-fade-in-up" style={{ animationDelay: `${catIndex * 0.1}s` }}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`w-9 h-9 rounded-xl bg-${category.color}-50 dark:bg-${category.color}-900/20 text-${category.color}-600 flex items-center justify-center`}>
                                                <category.icon className="w-4 h-4" />
                                            </div>
                                            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-500">{category.title}</h4>
                                        </div>
                                        <div className="space-y-4">
                                            {category.faqs.map((faq, faqIndex) => (
                                                <FaqItem 
                                                    key={`${category.id}-${faqIndex}`} 
                                                    item={faq} 
                                                    isOpen={!!openItems[`${category.id}-${faqIndex}`]}
                                                    onClick={() => toggleItem(category.id, faqIndex)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Kanan */}
                            <div className="md:col-span-6 space-y-5">
                                {displayData
                                    .filter(c => ['ibadah', 'quran', 'jadwal'].includes(c.id))
                                    .map((category, catIndex) => (
                                    <div key={category.id} className="bento-card bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-white dark:border-slate-800 shadow-sm faq-section animate-fade-in-up" style={{ animationDelay: `${catIndex * 0.1}s` }}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`w-9 h-9 rounded-xl bg-${category.color}-50 dark:bg-${category.color}-900/20 text-${category.color}-600 flex items-center justify-center`}>
                                                <category.icon className="w-4 h-4" />
                                            </div>
                                            <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-500">{category.title}</h4>
                                        </div>
                                        <div className="space-y-4">
                                            {category.faqs.map((faq, faqIndex) => (
                                                <FaqItem 
                                                    key={`${category.id}-${faqIndex}`} 
                                                    item={faq} 
                                                    isOpen={!!openItems[`${category.id}-${faqIndex}`]}
                                                    onClick={() => toggleItem(category.id, faqIndex)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="mt-10 text-center p-6 md:p-8 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jurnal Ibadah</p>
                    <p className="text-[11px] text-slate-500 mt-2">Dibuat untuk memudahkan umat dalam memonitoring kualitas ibadah harian.</p>
                </div>
                <div className="h-4"></div>
            </div>
        </div>
    );
}
