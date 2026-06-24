// src/App.jsx
import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from '@/store/AppContext';
import { GooeyToaster } from 'goey-toast';
import 'goey-toast/styles.css';

// Lazy load pages for performance
import { lazy, Suspense } from 'react';
const Login = lazy(() => import('@/pages/Login'));
const Home = lazy(() => import('@/pages/Home'));
const Tracker = lazy(() => import('@/pages/Tracker'));
const Tasbih = lazy(() => import('@/pages/Tasbih'));
const Qibla = lazy(() => import('@/pages/Qibla'));
const Quran = lazy(() => import('@/pages/Quran'));
const Profile = lazy(() => import('@/pages/Profile'));
const Doa = lazy(() => import('@/pages/Doa'));
const AsmaulHusna = lazy(() => import('@/pages/AsmaulHusna'));
const Fasting = lazy(() => import('@/pages/Fasting'));
const Credits = lazy(() => import('@/pages/Credits'));
const Changelog = lazy(() => import('@/pages/Changelog'));
const Zakat = lazy(() => import('@/pages/Zakat'));
const Faq = lazy(() => import('@/pages/Faq'));
const Hadith = lazy(() => import('@/pages/Hadith'));

function SplashScreen({ visible }) {
  return (
    <div
      id="splashScreen"
      className={`fixed inset-0 z-[100] bg-white dark:bg-slate-950 flex flex-col items-center justify-center transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full animate-ping opacity-75"></div>
        <img src="/img/favicon/apple-touch-icon.png" className="w-10 h-10 rounded-full object-cover shadow-lg relative z-10" alt="Logo" />
      </div>
      <p className="mt-6 text-[10px] font-bold text-slate-400 dark:text-slate-600 tracking-[0.3em] uppercase">Memuat...</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { currentUser } = useApp();
  if (currentUser === undefined) return null; // loading
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { currentUser } = useApp();
  if (currentUser === undefined) return null; // loading
  if (currentUser) return <Navigate to="/" replace />;
  return children;
}

function AppShell() {
  const { currentUser } = useApp();
  const [showSplash, setShowSplash] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  useEffect(() => {
    if (currentUser !== undefined) {
      const timer = setTimeout(() => setShowSplash(false), 500);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  // Update theme-color meta tag and toast theme
  useEffect(() => {
    const updateThemeColor = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkTheme(isDark);
      const color = isDark ? '#020617' : '#f8fafc';
      let metaThemeColor = document.querySelector('meta[name="theme-color"]:not([media])');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.name = 'theme-color';
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute('content', color);
    };

    const observer = new MutationObserver(updateThemeColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    updateThemeColor();
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e) => {
        const theme = localStorage.getItem('jurnal_theme') || 'system';
        if (theme === 'system') {
            if (e.matches) document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
        }
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
        observer.disconnect();
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  return (
    <div className="bg-slate-50 dark:bg-slate-950 block h-[100dvh] text-slate-800 dark:text-slate-200 overflow-hidden relative selection:bg-emerald-500 selection:text-white">
      <SplashScreen visible={showSplash} />

      {/* Background Decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute inset-0 z-[1] opacity-[0.04] dark:opacity-[0.06]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22 opacity=%221%22/%3E%3C/svg%3E')" }}></div>
        <div className="blob w-[60vh] h-[60vh] bg-emerald-400/20 dark:bg-emerald-600/10 rounded-full -top-20 -left-20 mix-blend-multiply dark:mix-blend-normal"></div>
        <div className="blob w-[50vh] h-[50vh] bg-blue-400/20 dark:bg-blue-600/10 rounded-full top-1/2 -right-20 mix-blend-multiply dark:mix-blend-normal"></div>
        <div className="blob w-[40vh] h-[40vh] bg-purple-400/20 dark:bg-purple-600/10 rounded-full -bottom-20 left-1/2 mix-blend-multiply dark:mix-blend-normal"></div>
      </div>

      {/* Main App Container */}
      <div className="relative z-10 w-full h-full md:max-w-[95%] xl:max-w-[1400px] md:mx-auto md:h-[95vh] md:mt-[2.5vh] md:rounded-3xl md:border md:border-white/50 md:dark:border-slate-800 md:shadow-2xl md:backdrop-blur-2xl bg-white/40 dark:bg-slate-900/40 overflow-hidden flex flex-col transition-all duration-500">
        <div className="flex-1 relative h-full overflow-hidden flex flex-col" id="appContainer">
          <Suspense fallback={null}>
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/tracker" element={<ProtectedRoute><Tracker /></ProtectedRoute>} />
              <Route path="/tasbih" element={<ProtectedRoute><Tasbih /></ProtectedRoute>} />
              <Route path="/qibla" element={<ProtectedRoute><Qibla /></ProtectedRoute>} />
              <Route path="/quran" element={<ProtectedRoute><Quran /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/doa" element={<ProtectedRoute><Doa /></ProtectedRoute>} />
              <Route path="/asmaul-husna" element={<ProtectedRoute><AsmaulHusna /></ProtectedRoute>} />
              <Route path="/fasting" element={<ProtectedRoute><Fasting /></ProtectedRoute>} />
              <Route path="/credits" element={<ProtectedRoute><Credits /></ProtectedRoute>} />
              <Route path="/changelog" element={<ProtectedRoute><Changelog /></ProtectedRoute>} />
              <Route path="/zakat" element={<ProtectedRoute><Zakat /></ProtectedRoute>} />
              <Route path="/faq" element={<ProtectedRoute><Faq /></ProtectedRoute>} />
              <Route path="/hadith" element={<ProtectedRoute><Hadith /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
        
        {/* Global Toast (Constrained to container) */}
        <div className="absolute inset-0 pointer-events-none z-[9999] app-toast-container">
            <GooeyToaster position="top-center" showTimestamp={false} theme={isDarkTheme ? 'dark' : 'light'} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AppProvider>
  );
}
