// src/pages/Zakat.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator, Users, Coins, Utensils, CheckCheck, Quote } from 'lucide-react';
import { motion } from 'framer-motion';

const HARGA_EMAS_DEFAULT = 1400000;

function formatRp(val) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
}

export default function Zakat() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('maal');
    const [showModal, setShowModal] = useState(false);
    const [result, setResult] = useState(null);

    // Handle back button for Modal
    useEffect(() => {
        let isPopped = false;
        
        const handlePopState = () => {
            isPopped = true;
            setShowModal(false);
        };

        if (showModal) {
            window.history.pushState({ modal: 'zakatModal' }, '');
            window.addEventListener('popstate', handlePopState);
        }

        return () => {
            if (showModal) {
                window.removeEventListener('popstate', handlePopState);
                if (!isPopped) {
                    window.history.back();
                }
            }
        };
    }, [showModal]);

    // Form States
    // Maal
    const [maalEmas, setMaalEmas] = useState(HARGA_EMAS_DEFAULT);
    const [maalHarta, setMaalHarta] = useState('');
    
    // Fitrah
    const [fitrahJiwa, setFitrahJiwa] = useState(1);
    const [fitrahHarga, setFitrahHarga] = useState(15000);
    
    // Fidyah
    const [fidyahHari, setFidyahHari] = useState('');
    const [fidyahHarga, setFidyahHarga] = useState(45000);

    const handleCalculateMaal = () => {
        if (navigator.vibrate) navigator.vibrate(15);
        const hargaEmas = parseFloat(maalEmas) || 0;
        const harta = parseFloat(maalHarta) || 0;
        const nisab = 85 * hargaEmas;

        if (harta >= nisab) {
            const zakat = harta * 0.025;
            setResult({
                type: 'Zakat Maal (2,5%)',
                amount: zakat,
                details: `Harta simpanan Anda (Rp ${harta.toLocaleString('id-ID')}) telah mencapai/melebihi nisab sebesar Rp ${nisab.toLocaleString('id-ID')} (setara 85 gram emas). Anda wajib mengeluarkan zakat.`
            });
        } else {
            setResult({
                type: 'Belum Wajib Zakat',
                amount: 0,
                details: `Harta simpanan Anda (Rp ${harta.toLocaleString('id-ID')}) belum mencapai nisab sebesar Rp ${nisab.toLocaleString('id-ID')} (setara 85 gram emas). Anda belum diwajibkan membayar Zakat Maal saat ini, namun disunnahkan untuk berinfaq.`
            });
        }
        setShowModal(true);
    };

    const handleCalculateFitrah = () => {
        if (navigator.vibrate) navigator.vibrate(15);
        const jiwa = parseInt(fitrahJiwa) || 0;
        const harga = parseFloat(fitrahHarga) || 0;
        const zakat = jiwa * 2.5 * harga;

        setResult({
            type: 'Zakat Fitrah',
            amount: zakat,
            details: `Total kewajiban Zakat Fitrah untuk ${jiwa} jiwa dengan acuan harga beras Rp ${harga.toLocaleString('id-ID')}/kg (kadar 2,5 kg per jiwa).`
        });
        setShowModal(true);
    };

    const handleCalculateFidyah = () => {
        if (navigator.vibrate) navigator.vibrate(15);
        const hari = parseInt(fidyahHari) || 0;
        const harga = parseFloat(fidyahHarga) || 0;
        const fidyah = hari * harga;

        setResult({
            type: 'Fidyah Puasa',
            amount: fidyah,
            details: `Total fidyah untuk mengganti puasa sebanyak ${hari} hari dengan acuan harga makan 1 porsi sebesar Rp ${harga.toLocaleString('id-ID')} per hari.`
        });
        setShowModal(true);
    };

    const tabIndex = activeTab === 'maal' ? 0 : activeTab === 'fitrah' ? 1 : 2;

    return (
        <div className="app-view active flex flex-col h-full absolute inset-0 z-50 transition-all duration-300 overflow-y-auto bg-slate-100 dark:bg-slate-950 no-scrollbar">
            {/* Background Gradient */}
            <div className="fixed top-0 left-0 right-0 h-80 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none z-0"></div>

            {/* Header */}
            <div className="sticky top-0 z-50 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-3 md:px-8 md:pt-6">
                <motion.div className="glass-pill flex items-center justify-between p-2 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 shadow-sm w-full max-w-7xl mx-auto">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
                    </button>
                    <motion.h2 layoutId="navbar-title" className="text-sm font-bold text-slate-800 dark:text-white tracking-tight text-center flex-1 truncate px-2 animate-nav-title">Kalkulator Zakat</motion.h2>
                    <div className="w-10"></div> 
                </motion.div>
            </div>

            <div className="relative z-10 px-5 pt-1 pb-28 md:pb-6 w-full max-w-7xl mx-auto md:grid md:grid-cols-12 md:gap-8 md:items-start">
                
                <div className="md:col-span-12 lg:col-span-8 flex flex-col gap-6">
                    
                    {/* Tab Navigation */}
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-md z-[120] md:static md:translate-x-0 md:w-full md:max-w-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-1.5 rounded-full flex shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-white/50 dark:border-slate-700/50">
                        <div className="absolute inset-1.5 flex pointer-events-none">
                            <div className="w-[33.333%] h-full transition-transform duration-300 ease-in-out" style={{ transform: `translateX(${tabIndex * 100}%)` }}>
                                <div className="w-full h-full bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-100 dark:border-slate-700"></div>
                            </div>
                        </div>
                        
                        <button onClick={() => {if(navigator.vibrate) navigator.vibrate(5); setActiveTab('maal')}} className={`relative z-10 focus:outline-none flex-1 py-3 md:py-2 rounded-full text-xs font-black tracking-tight transition-colors duration-300 ${activeTab === 'maal' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}>Maal</button>
                        <button onClick={() => {if(navigator.vibrate) navigator.vibrate(5); setActiveTab('fitrah')}} className={`relative z-10 focus:outline-none flex-1 py-3 md:py-2 rounded-full text-xs font-black tracking-tight transition-colors duration-300 ${activeTab === 'fitrah' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}>Fitrah</button>
                        <button onClick={() => {if(navigator.vibrate) navigator.vibrate(5); setActiveTab('fidyah')}} className={`relative z-10 focus:outline-none flex-1 py-3 md:py-2 rounded-full text-xs font-black tracking-tight transition-colors duration-300 ${activeTab === 'fidyah' ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}>Fidyah</button>
                    </div>

                    {/* Zakat Maal Form */}
                    {activeTab === 'maal' && (
                        <div className="bento-card bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-sm space-y-6 animate-[fadeIn_0.35s_ease-out]">
                            <div className="flex gap-4 items-start bg-amber-50 dark:bg-amber-900/20 p-5 rounded-3xl border border-amber-100 dark:border-amber-800/30">
                                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center text-amber-600 shrink-0 shadow-sm">
                                    <Coins className="w-5 h-5" />
                                </div>
                                <div className="pt-0.5">
                                    <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed"><span className="font-bold">Nisab:</span> Setara 85 gram emas murni.</p>
                                    <p className="text-[11px] text-amber-700/70 dark:text-amber-500/70 leading-relaxed mt-1">Harta simpanan yang sudah mencapai 1 tahun (haul) wajib dizakatkan 2,5%.</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Harga Emas (Per Gram)</label>
                                    <div className="relative group">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 group-focus-within:text-emerald-500 transition-colors">Rp</span>
                                        <input type="number" value={maalEmas} onChange={e => setMaalEmas(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-emerald-500/30 rounded-[1.5rem] focus:outline-none font-mono font-bold text-slate-700 dark:text-white transition-all shadow-inner" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest ml-2">Total Harta Simpanan</label>
                                    <div className="relative group">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 group-focus-within:text-emerald-500 transition-colors">Rp</span>
                                        <input type="number" value={maalHarta} onChange={e => setMaalHarta(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-emerald-500/30 rounded-[1.5rem] focus:outline-none font-mono font-bold text-slate-700 dark:text-white transition-all shadow-inner" placeholder="0" />
                                    </div>
                                </div>
                            </div>
                            
                            <button onClick={handleCalculateMaal} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-[1.5rem] shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3">
                                <Calculator className="w-5 h-5" /> Hitung Zakat Maal
                            </button>
                        </div>
                    )}

                    {/* Zakat Fitrah Form */}
                    {activeTab === 'fitrah' && (
                        <div className="bento-card bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-sm space-y-6 animate-[fadeIn_0.35s_ease-out]">
                            <div className="flex gap-4 items-start bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-800/30">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-800/40 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div className="pt-0.5">
                                    <p className="text-xs text-emerald-800 dark:text-emerald-400 leading-relaxed"><span className="font-bold">Kadar:</span> 2,5 Kg / 3,5 Liter beras per jiwa.</p>
                                    <p className="text-[11px] text-emerald-700/70 dark:text-emerald-500/70 leading-relaxed mt-1">Gunakan harga beras per kilogram yang biasa kamu konsumsi.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Jumlah Jiwa (Orang)</label>
                                    <input type="number" value={fitrahJiwa} onChange={e => setFitrahJiwa(e.target.value)} min={1} className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-emerald-500/30 rounded-[1.5rem] focus:outline-none font-bold text-slate-700 dark:text-white transition-all shadow-inner" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Harga Beras per Kg</label>
                                    <div className="relative group">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 group-focus-within:text-emerald-500 transition-colors">Rp</span>
                                        <input type="number" value={fitrahHarga} onChange={e => setFitrahHarga(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-emerald-500/30 rounded-[1.5rem] focus:outline-none font-mono font-bold text-slate-700 dark:text-white transition-all shadow-inner" />
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleCalculateFitrah} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-[1.5rem] shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3">
                                <Calculator className="w-5 h-5" /> Hitung Zakat Fitrah
                            </button>
                        </div>
                    )}

                    {/* Fidyah Form */}
                    {activeTab === 'fidyah' && (
                        <div className="bento-card bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2.5rem] border border-white dark:border-slate-800 shadow-sm space-y-6 animate-[fadeIn_0.35s_ease-out]">
                            <div className="flex gap-4 items-start bg-blue-50 dark:bg-blue-900/20 p-5 rounded-3xl border border-blue-100 dark:border-blue-800/30">
                                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-800/40 flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
                                    <Utensils className="w-5 h-5" />
                                </div>
                                <div className="pt-0.5">
                                    <p className="text-xs text-blue-800 dark:text-blue-400 leading-relaxed"><span className="font-bold">Kadar Fidyah:</span> 1 Mud makanan pokok per hari.</p>
                                    <p className="text-[11px] text-blue-700/70 dark:text-blue-500/70 leading-relaxed mt-1">Biaya satu porsi makan lengkap yang layak untuk satu orang miskin.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Jumlah Hari Hutang Puasa</label>
                                    <input type="number" value={fidyahHari} onChange={e => setFidyahHari(e.target.value)} placeholder="0" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-emerald-500/30 rounded-[1.5rem] focus:outline-none font-bold text-slate-700 dark:text-white transition-all shadow-inner" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Biaya Makan per Hari</label>
                                    <div className="relative group">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 group-focus-within:text-emerald-500 transition-colors">Rp</span>
                                        <input type="number" value={fidyahHarga} onChange={e => setFidyahHarga(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-transparent focus:border-emerald-500/30 rounded-[1.5rem] focus:outline-none font-mono font-bold text-slate-700 dark:text-white transition-all shadow-inner" />
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleCalculateFidyah} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold rounded-[1.5rem] shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3">
                                <Calculator className="w-5 h-5" /> Hitung Fidyah
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Area (Desktop only quote) */}
                <div className="hidden lg:flex lg:col-span-4 flex-col gap-6 sticky top-24 h-fit">
                    <div className="bento-card bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-8 rounded-[2.5rem] text-center border border-white/40 dark:border-slate-800 shadow-sm">
                        <Quote className="w-8 h-8 text-emerald-500/20 mx-auto mb-4" />
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 italic leading-relaxed">"Harta tidak akan berkurang karena sedekah dan zakat, justru ia akan semakin tumbuh dan berkah."</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest">— Jurnal Ibadah</p>
                    </div>
                </div>
            </div>

            {/* Zakat Result Modal */}
            <div className={`fixed inset-0 z-[200] flex items-end sm:items-center justify-center pointer-events-none`}>
                {/* Backdrop */}
                <div 
                    className={`absolute inset-0 bg-slate-950/60 backdrop-blur-md ${showModal ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`} 
                    onClick={() => setShowModal(false)}
                    style={{ transition: 'opacity 0.4s ease-out' }}
                ></div>
                
                {/* Modal Content */}
                <div 
                    className={`relative w-full sm:w-[92%] sm:max-w-lg bg-white dark:bg-slate-950 rounded-t-[2.5rem] sm:rounded-[2.5rem] px-5 py-6 sm:p-8 shadow-2xl border-t border-white/20 dark:border-slate-800 overflow-hidden pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pb-8 ${showModal ? 'opacity-100 translate-y-0 sm:scale-100 pointer-events-auto' : 'opacity-0 translate-y-full sm:translate-y-10 sm:scale-95'}`}
                    style={{ transition: 'all 0.5s cubic-bezier(0.32,0.72,0,1)' }}
                >
                    <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-5 sm:mb-6 shrink-0"></div>
                    <div className="text-center">
                        <div className="mb-6 sm:mb-8 mt-2">
                            <p className="text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] mb-1 sm:mb-2">Total Wajib Zakat</p>
                            <div className="flex items-start justify-center gap-1">
                                <span className="text-lg sm:text-xl font-bold text-slate-400 mt-1">Rp</span>
                                <h2 className="text-4xl sm:text-5xl font-black text-slate-800 dark:text-white tracking-tighter tabular-nums">{result?.amount.toLocaleString('id-ID')}</h2>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 mb-6 text-left relative overflow-hidden">
                            <p className="text-xs sm:text-[13px] font-medium text-slate-500 dark:text-slate-300 leading-relaxed relative z-10">{result?.details}</p>
                        </div>
                        <button onClick={() => setShowModal(false)} className="w-full py-4 sm:py-5 mb-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-black uppercase tracking-widest rounded-[1.5rem] sm:rounded-[1.8rem] shadow-xl transition active:scale-[0.98] hover:opacity-90">Selesai</button>
                    </div>
                </div>
            </div>
            
        </div>
    );
}
