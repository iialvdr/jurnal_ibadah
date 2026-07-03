// src/pages/Credits.jsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, BookOpen, Quote, Clock, Flame, MapPin, Feather, Heart, ExternalLink } from 'lucide-react';
import { APP_VERSION } from '@/utils/version';
import { motion } from 'framer-motion';
import TopNavConfig from '@/components/TopNavConfig';

export default function Credits() {
    const navigate = useNavigate();

    return (
        <div className="app-view active flex flex-col h-full absolute inset-0 z-50 transition-all duration-300 overflow-y-auto bg-slate-100 dark:bg-slate-950 no-scrollbar">
            <div className="fixed top-0 left-0 right-0 h-80 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent pointer-events-none z-0"></div>

            <TopNavConfig 
                leftNode={
                    <button onClick={() => { if (navigator.vibrate) navigator.vibrate(10); navigate(-1); }} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
                    </button>
                }
                titleNode="Tentang Aplikasi"
                rightNode={<div className="w-10"></div>}
            />
            <div className="h-[5.5rem] md:h-[7rem] shrink-0 w-full" />

            <div className="relative z-10 px-5 pt-4 pb-12 w-full max-w-7xl mx-auto md:px-8">
                
                {/* Hero Banner */}
                <div className="mb-5 relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 p-5 shadow-lg shadow-emerald-500/20">
                    <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full" />
                    <div className="absolute -right-2 -bottom-8 w-20 h-20 bg-white/5 rounded-full" />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner shrink-0">
                            <Info className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-base font-black text-white tracking-tight">Tentang Aplikasi</h3>
                            <p className="text-[11px] text-emerald-100/80 mt-0.5 max-w-[250px]">Profil, pembuat, dan sumber daya aplikasi.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 md:gap-8 md:items-start">
                    
                    {/* Left Column */}
                    <div className="md:col-span-5 lg:col-span-4 flex flex-col gap-5">
                        
                        {/* App Logo & Version */}
                        <div className="bento-card bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-white dark:border-slate-800 shadow-xl flex flex-col items-center text-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-12 -mt-12 opacity-50"></div>
                            
                            <div className="relative mb-6">
                                <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full shadow-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-center relative overflow-hidden">
                                    <img src="/img/favicon/android-chrome-192x192.png" alt="Logo" className="w-full h-full object-contain" />
                                </div>
                            </div>
                            
                            <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">Jurnal Ibadah</h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-3 leading-relaxed max-w-[220px]">
                                Teman setia dalam perjalanan spiritualmu untuk menjaga istiqomah setiap hari.
                            </p>
                            <div className="mt-4 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">
                                    v{APP_VERSION}
                                </p>
                            </div>
                        </div>

                        {/* Developer Info */}
                        <div className="bento-card bg-white dark:bg-slate-900 p-5 rounded-[2rem] border border-white dark:border-slate-800 shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-lg font-black shadow-md shrink-0">
                                    V
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Developer</p>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-sm truncate">Rivaldi Aditya Maulana</h4>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                <a href="https://linkedin.com/in/rivaldi-aditya-maulana" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:text-blue-500 transition-colors border border-transparent hover:border-blue-500/20">
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                                    LinkedIn
                                </a>
                                <a href="https://github.com/iialvdr" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-500 transition-colors border border-transparent hover:border-emerald-500/20">
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                                    GitHub
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="md:col-span-7 lg:col-span-8 flex flex-col gap-4 mt-5 md:mt-0">
                        <h3 className="px-1 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Sumber Daya & API</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            
                        {[
                                { title: 'EQuran.id API', desc: 'Al-Qur\'an & Doa', icon: BookOpen, color: 'emerald', url: 'https://equran.id' },
                                { title: 'MyQuran Hadis API', desc: 'Ensiklopedia Hadis', icon: Quote, color: 'rose', url: 'https://myquran.com' },
                                { title: 'Kemenag API', desc: 'Jadwal Sholat Resmi', icon: Clock, color: 'amber', url: 'https://bimasislam.kemenag.go.id' },
                                { title: 'BigDataCloud', desc: 'Satelit Geocoder', icon: MapPin, color: 'blue', url: 'https://www.bigdatacloud.com' },
                                { title: 'Adhan.js', desc: 'Jadwal (Offline)', icon: Clock, color: 'indigo', url: 'https://github.com/batoulapps/adhan-js' },
                                { title: 'Lucide Icons', desc: 'Visual Assets', icon: Feather, color: 'sky', url: 'https://lucide.dev' },
                                { title: 'Firebase', desc: 'Database & Auth', icon: Flame, color: 'orange', url: 'https://firebase.google.com' }
                            ].map((api, idx) => {
                                const Icon = api.icon;
                                return (
                                    <a key={idx} href={api.url} target="_blank" rel="noreferrer" className="bento-card bg-white dark:bg-slate-900 p-4 rounded-2xl border border-white dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-emerald-500/30 hover:shadow-md transition-all duration-200 cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl bg-${api.color}-50 dark:bg-${api.color}-900/20 text-${api.color}-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                                                <Icon className="w-4.5 h-4.5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-700 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{api.title}</p>
                                                <p className="text-[9px] text-slate-400 font-medium mt-0.5">{api.desc}</p>
                                            </div>
                                        </div>
                                        <ExternalLink className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors shrink-0 ml-2" />
                                    </a>
                                );
                            })}

                        </div>

                        <div className="mt-4 pt-6 text-center border-t border-slate-200 dark:border-slate-800">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em]">&copy; 2026 Jurnal Ibadah • By Valdi</p>
                            <div className="flex items-center justify-center gap-2 text-slate-400 text-[10px] mt-2">
                                <span>Dibuat dengan</span>
                                <Heart className="w-3 h-3 text-rose-500 fill-rose-500 animate-pulse" />
                                <span>untuk umat Muslim</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
