import { LogOut } from 'lucide-react';

export function LogoutModal({ showLogoutModal, setShowLogoutModal, handleSignOut }) {
    return (
        <div className={`fixed inset-0 z-[250] flex items-center justify-center pointer-events-none`}>
            <div 
                className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm ${showLogoutModal ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}
                onClick={() => setShowLogoutModal(false)}
                style={{ transition: 'opacity 0.4s ease-in-out' }}
            ></div>
            <div 
                className={`relative w-[85%] max-w-[320px] bg-white dark:bg-slate-950 p-8 rounded-[3rem] shadow-2xl border border-white/10 dark:border-slate-800 transform text-center ${showLogoutModal ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0'}`}
                style={{ transition: 'all 0.4s cubic-bezier(0.32,0.72,0,1)' }}
            >
                <div className="relative w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center border border-red-100 mx-auto mb-6">
                    <LogOut className="w-6 h-6 ml-1" />
                </div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2">Ingin Keluar?</h3>
                <p className="text-[10px] text-slate-500 mb-8 leading-relaxed">Pastikan ibadah hari ini sudah tercatat ya!</p>
                <div className="flex flex-col gap-3">
                    <button onClick={handleSignOut} className="w-full py-4 rounded-2xl bg-red-500 text-white font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/30 active:scale-95 transition">
                        Ya, Keluar
                    </button>
                    <button onClick={() => setShowLogoutModal(false)} className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-[10px] uppercase tracking-widest active:scale-95 transition">
                        Batal
                    </button>
                </div>
            </div>
        </div>
    );
}
