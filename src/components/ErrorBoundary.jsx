// src/components/ErrorBoundary.jsx
import React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-6 shadow-sm border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-10 h-10 text-rose-500" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Oops! Terjadi Kesalahan</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-8 leading-relaxed">
            Maaf, ada masalah saat memuat halaman ini. Silakan muat ulang halaman atau kembali ke Beranda.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button 
              onClick={() => window.location.reload()}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <RefreshCcw className="w-4 h-4" /> Muat Ulang
            </button>
            <button 
              onClick={() => window.location.href = '/'}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm border border-slate-200 dark:border-slate-800 shadow-sm active:scale-95 transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Home className="w-4 h-4" /> Beranda
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-900 rounded-xl text-left w-full max-w-2xl overflow-auto border border-slate-200 dark:border-slate-800">
              <p className="font-mono text-xs text-rose-500">{this.state.error.toString()}</p>
            </div>
          )}
        </div>
      );
    }

    return this.props.children; 
  }
}
