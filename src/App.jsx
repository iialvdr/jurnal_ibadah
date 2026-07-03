// src/App.jsx
import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AppProvider, useApp } from '@/store/AppContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import BottomNav from '@/components/BottomNav';
import { GooeyToaster } from 'goey-toast';
import { AnimatePresence, motion } from 'framer-motion';
import 'goey-toast/styles.css';
import TopNav from '@/components/TopNav';

// Flag global: set ke true saat animasi View Transition sedang berjalan.
// Ini mencegah MutationObserver memicu React re-render di tengah animasi yang menyebabkan kelap-kelip.
export let viewTransitionActive = false;
export function setViewTransitionActive(val) { viewTransitionActive = val; }

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
const Artikel = lazy(() => import('@/pages/Artikel'));
const ArtikelDetail = lazy(() => import('@/pages/ArtikelDetail'));

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

function ThemeAwareToaster() {
  const [isDarkTheme, setIsDarkTheme] = useState(
    () => document.documentElement.classList.contains('dark')
  );
  const pendingRef = useRef(null);

  useEffect(() => {
    const updateTheme = () => {
      // Jangan update state saat animasi View Transition sedang berjalan!
      // Mutasi DOM di tengah animasi akan membatalkan/merusak animasi (kelap-kelip).
      if (viewTransitionActive) {
        // Tandai bahwa ada update yang tertunda, akan dieksekusi setelah animasi selesai
        pendingRef.current = document.documentElement.classList.contains('dark');
        return;
      }
      setIsDarkTheme(document.documentElement.classList.contains('dark'));
    };
    
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    updateTheme();
    
    return () => observer.disconnect();
  }, []);

  return <GooeyToaster position="top-center" showTimestamp={false} theme={isDarkTheme ? 'dark' : 'light'} />;
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

function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 w-full h-full z-10"
    >
      {children}
    </motion.div>
  );
}

function AppShell() {
  const { currentUser } = useApp();
  const [showSplash, setShowSplash] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser !== undefined) {
      const timer = setTimeout(() => setShowSplash(false), 500);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  // Update theme-color meta tag
  useEffect(() => {
    const updateThemeColor = () => {
      const isDark = document.documentElement.classList.contains('dark');
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

  useEffect(() => {
    const container = document.getElementById('appContainer');
    if (!container) return;

    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;

    const handleTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe(e);
    };

    const handleSwipe = (e) => {
      const xDiff = touchStartX - touchEndX;
      const yDiff = Math.abs(touchStartY - touchEndY);
      
      // Jika usapan lebih banyak ke arah vertikal, abaikan (itu adalah scroll biasa)
      if (yDiff > 40) return;

      // Cek apakah target atau parent-nya bisa di-scroll secara horizontal (misal list kategori)
      let node = e.target;
      let isScrollable = false;
      while (node && node !== container) {
        if (node.scrollWidth > node.clientWidth) {
          const style = window.getComputedStyle(node);
          if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
            isScrollable = true;
            break;
          }
        }
        node = node.parentNode;
      }
      if (isScrollable) return;

      const MAIN_TABS = ['/', '/tracker', '/quran', '/artikel', '/profile'];
      const currentPath = location.pathname === '/' ? '/' : '/' + location.pathname.split('/')[1];
      const currentIndex = MAIN_TABS.indexOf(currentPath);
      
      // Hanya aktif jika pengguna berada tepat di salah satu root tab
      if (currentIndex === -1 || location.pathname !== currentPath) return;

      if (xDiff > 60) {
        // Swipe ke kiri -> Next tab
        if (currentIndex < MAIN_TABS.length - 1) {
          if (navigator.vibrate) navigator.vibrate(10);
          navigate(MAIN_TABS[currentIndex + 1], { 
            replace: currentPath !== '/', 
            state: { fromHome: true } 
          });
        }
      } else if (xDiff < -60) {
        // Swipe ke kanan -> Prev tab
        if (currentIndex > 0) {
          if (navigator.vibrate) navigator.vibrate(10);
          navigate(MAIN_TABS[currentIndex - 1], { 
            replace: currentPath !== '/', 
            state: { fromHome: true } 
          });
        }
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [location.pathname, navigate]);

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
      <div className="relative z-10 w-full h-full md:max-w-[95%] xl:max-w-[1400px] md:mx-auto md:h-[95vh] md:mt-[2.5vh] md:rounded-3xl md:border md:border-white/50 md:dark:border-slate-800 md:shadow-2xl md:backdrop-blur-2xl bg-white/40 dark:bg-slate-900/40 overflow-hidden flex flex-col">
        <TopNav />
        <div className="flex-1 relative h-full overflow-hidden flex flex-col" id="appContainer">
          <ErrorBoundary>
            <Suspense fallback={null}>
              <AnimatePresence mode="popLayout">
                <Routes location={location} key={location.pathname}>
                  <Route path="/login" element={<PublicRoute><PageWrapper><Login /></PageWrapper></PublicRoute>} />
                  <Route path="/" element={<ProtectedRoute><PageWrapper><Home /></PageWrapper></ProtectedRoute>} />
                  <Route path="/tracker" element={<ProtectedRoute><PageWrapper><Tracker /></PageWrapper></ProtectedRoute>} />
                  <Route path="/tasbih" element={<ProtectedRoute><PageWrapper><Tasbih /></PageWrapper></ProtectedRoute>} />
                  <Route path="/qibla" element={<ProtectedRoute><PageWrapper><Qibla /></PageWrapper></ProtectedRoute>} />
                  <Route path="/quran" element={<ProtectedRoute><PageWrapper><Quran /></PageWrapper></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><PageWrapper><Profile /></PageWrapper></ProtectedRoute>} />
                  <Route path="/doa" element={<ProtectedRoute><PageWrapper><Doa /></PageWrapper></ProtectedRoute>} />
                  <Route path="/asmaul-husna" element={<ProtectedRoute><PageWrapper><AsmaulHusna /></PageWrapper></ProtectedRoute>} />
                  <Route path="/fasting" element={<ProtectedRoute><PageWrapper><Fasting /></PageWrapper></ProtectedRoute>} />
                  <Route path="/credits" element={<ProtectedRoute><PageWrapper><Credits /></PageWrapper></ProtectedRoute>} />
                  <Route path="/changelog" element={<ProtectedRoute><PageWrapper><Changelog /></PageWrapper></ProtectedRoute>} />
                  <Route path="/zakat" element={<ProtectedRoute><PageWrapper><Zakat /></PageWrapper></ProtectedRoute>} />
                  <Route path="/faq" element={<ProtectedRoute><PageWrapper><Faq /></PageWrapper></ProtectedRoute>} />
                  <Route path="/hadith" element={<ProtectedRoute><PageWrapper><Hadith /></PageWrapper></ProtectedRoute>} />
                  <Route path="/artikel" element={<ProtectedRoute><PageWrapper><Artikel /></PageWrapper></ProtectedRoute>} />
                  <Route path="/artikel/:sourceId/:articleId" element={<ProtectedRoute><PageWrapper><ArtikelDetail /></PageWrapper></ProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AnimatePresence>
            </Suspense>
          </ErrorBoundary>
        </div>
        
        <BottomNav />
        
        {/* Global Toast (Constrained to container) */}
        <div className="absolute inset-0 pointer-events-none z-[9999] app-toast-container">
            <ThemeAwareToaster />
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
