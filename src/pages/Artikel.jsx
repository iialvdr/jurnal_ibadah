// src/pages/Artikel.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, Search, X, ChevronRight, Loader2, RefreshCw, AlertCircle, CheckCircle2, Tag } from 'lucide-react';
import "@aejkatappaja/phantom-ui";
import { motion } from 'framer-motion';

const API_ROOT = import.meta.env.DEV ? '/api/artikel-islam' : 'https://artikel-islam.netlify.app/.netlify/functions/api';

const CACHE_TTL = 10 * 60 * 1000; // 10 menit

function getCached(key) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const { ts, data } = JSON.parse(raw);
        if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(key); return null; }
        return data;
    } catch { return null; }
}

function setCached(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

async function fetchWithTimeout(url, timeout = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

// Helper for parsing Indonesian dates
const parseIndoDate = (dateStr) => {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.getTime();

    const months = {
        'januari': 0, 'jan': 0, 'februari': 1, 'feb': 1,
        'maret': 2, 'mar': 2, 'april': 3, 'apr': 3,
        'mei': 4, 'juni': 5, 'jun': 5, 'juli': 6, 'jul': 6,
        'agustus': 7, 'agu': 7, 'ags': 7, 'september': 8, 'sep': 8,
        'oktober': 9, 'okt': 9, 'november': 10, 'nov': 10,
        'desember': 11, 'des': 11
    };
    
    const match = dateStr.toLowerCase().match(/(\d+)\s+([a-z]+)\s+(\d{4})/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = months[match[2]];
        const year = parseInt(match[3], 10);
        if (month !== undefined) return new Date(year, month, day).getTime();
    }
    return 0;
};

// --- Client-side scraper for Muslim.or.id & Muslimah.or.id (Fallback because Backend API misses thumbnail) ---
async function fetchJegThemeArticles(pageNum, query, source) {
    try {
        let url = `/proxy/${source.id}`;
        if (query) {
            url += `/page/${pageNum}/?s=${encodeURIComponent(query)}`;
        } else if (pageNum > 1) {
            url += `/page/${pageNum}/`;
        } else {
            url += `/`;
        }
        
        const res = await fetchWithTimeout(url, 15000);
        if (!res.ok) return { data: [], hasMore: false };
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');
        
        let articles = Array.from(doc.querySelectorAll('article')).map(el => {
            const titleEl = el.querySelector('h2 a, h3 a, .entry-title a');
            if (!titleEl) return null;
            const url = titleEl.href;
            const title = titleEl.textContent.trim();
            // Extract valid thumbnail by scanning imgs or thumbnail-container
            let thumbnail = '';
            const imgs = el.querySelectorAll('img');
            for (const img of imgs) {
                const src = img.getAttribute('data-src') || img.getAttribute('src');
                if (src && !src.startsWith('data:image') && src.includes('wp-content')) {
                    thumbnail = src;
                    break;
                }
            }
            if (!thumbnail) {
                const thumbContainer = el.querySelector('.thumbnail-container');
                if (thumbContainer) {
                    thumbnail = thumbContainer.getAttribute('data-src') || '';
                }
            }
            // Ensure absolute URL
            if (thumbnail.startsWith('//')) thumbnail = 'https:' + thumbnail;
            else if (thumbnail.startsWith('/')) thumbnail = source.url + thumbnail;
            
            const date = el.querySelector('.jeg_meta_date, time, .date')?.textContent.trim() || '';
            const author = el.querySelector('.jeg_meta_author a, .author')?.textContent.trim() || '';
            const category = el.querySelector('.jeg_post_category a, .category')?.textContent.trim() || '';
            
            return {
                id: btoa(url),
                title,
                url,
                thumbnail,
                date,
                author,
                categories: category ? [{ name: category }] : [],
                _sourceId: source.id,
                _sourceName: source.name
            };
        }).filter(Boolean);
        
        // Remove duplicates (e.g. from featured slider vs main list)
        const seenUrls = new Set();
        articles = articles.filter(a => {
            if (seenUrls.has(a.url)) return false;
            seenUrls.add(a.url);
            return true;
        });
        
        // Sort explicitly by date to push old pinned/sticky posts down
        articles.sort((a, b) => {
            const timeA = parseIndoDate(a.date);
            const timeB = parseIndoDate(b.date);
            if (timeB === timeA) return (a.title || '').localeCompare(b.title || '');
            return timeB - timeA;
        });
        
        // Cek apakah ada navigasi next page
        const hasMore = !!doc.querySelector('.page_nav .next, .nav-links .next');
        return { data: articles, hasMore: articles.length > 0 }; 
    } catch(e) {
        return { data: [], hasMore: false };
    }
}
// --- WP REST API scraper for Muslimafiyah (Backend API misses date) ---
async function fetchWpRestArticles(pageNum, query, source) {
    try {
        let url = `/proxy/${source.id}/wp-json/wp/v2/posts?per_page=10&page=${pageNum}&_embed=1`;
        if (query) {
            url += `&search=${encodeURIComponent(query)}`;
        }
        
        const res = await fetchWithTimeout(url, 15000);
        if (!res.ok) return { data: [], hasMore: false };
        const json = await res.json();
        
        const articles = json.map(post => {
            let thumbnail = '';
            const wpMedia = post._embedded?.['wp:featuredmedia'];
            if (wpMedia && wpMedia.length > 0) {
                thumbnail = wpMedia[0].source_url || '';
            }
            // Hapus HTML tags dari title (kadang ada spasi HTML dll di wp rest api)
            const tmpDiv = document.createElement('div');
            tmpDiv.innerHTML = post.title?.rendered || '';
            const title = tmpDiv.textContent || tmpDiv.innerText || '';
            
            return {
                id: btoa(post.link),
                title: title.trim(),
                url: post.link,
                thumbnail,
                date: post.date, // WP REST API gives ISO local string like 2026-06-03T10:55:01
                date_time: post.date_gmt,
                author: post._embedded?.author?.[0]?.name || source.name,
                categories: [],
                _sourceId: source.id,
                _sourceName: source.name
            };
        });
        
        const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);
        
        return { data: articles, hasMore: pageNum < totalPages }; 
    } catch(e) {
        return { data: [], hasMore: false };
    }
}

// Konfigurasi sumber dengan identitas visual
const SOURCES = [
    { id: 'all',  name: 'Semua',               url: '#',                             icon: '✦',   color: 'emerald', accent: '#10b981', bg: 'bg-emerald-500' },
    { id: 'fir',  name: 'Firanda',              url: 'https://firanda.com',           icon: 'F',   iconImg: '/img/firanda.png', color: 'blue',    accent: '#3b82f6', bg: 'bg-blue-500' },
    { id: 'rum',  name: 'Rumaysho',             url: 'https://rumaysho.com',          icon: 'R',   iconImg: '/img/rumaysho.png', color: 'violet',  accent: '#8b5cf6', bg: 'bg-violet-500' },
    { id: 'ks',   name: 'Konsultasi Syariah',   url: 'https://konsultasisyariah.com', icon: 'KS',  color: 'teal',    accent: '#14b8a6', bg: 'bg-teal-500' },
    { id: 'ms',   name: 'Muslim.or.id',         url: 'https://muslim.or.id',          icon: 'M',   iconImg: '/img/muslim.png', color: 'green',   accent: '#22c55e', bg: 'bg-green-500' },
    { id: 'msh',  name: 'Muslimah.or.id',       url: 'https://muslimah.or.id',        icon: 'MH',  iconImg: '/img/muslimah.png', color: 'rose',    accent: '#f43f5e', bg: 'bg-rose-500' },
    { id: 'maf',  name: 'Muslimafiyah',         url: 'https://muslimafiyah.com',      icon: 'MF',  iconImg: '/img/muslimafiyah.jpg', color: 'amber',   accent: '#f59e0b', bg: 'bg-amber-500' },
    { id: 'kj',   name: 'Khotbah Jumat',        url: 'https://khotbahjumat.com',      icon: 'KJ',  color: 'orange',  accent: '#f97316', bg: 'bg-orange-500' },
];

// Normalisasi berbagai format tanggal ke format Indonesia
function normalizeDate(dateStr) {
    if (!dateStr) return '';
    const s = dateStr.trim();
    
    // Sudah format Indonesia (misal: "1 Juli 2026")
    if (/^\d{1,2}\s+\w+\s+\d{4}$/.test(s) && /januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember/i.test(s)) {
        return s;
    }

    const monthMap = {
        jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'Mei', jun: 'Jun',
        jul: 'Jul', aug: 'Agu', sep: 'Sep', oct: 'Okt', nov: 'Nov', dec: 'Des',
        january: 'Jan', february: 'Feb', march: 'Mar', april: 'Apr', june: 'Jun',
        july: 'Jul', august: 'Agu', september: 'Sep', october: 'Okt', november: 'Nov', december: 'Des',
    };

    // Format "28-Jun-2026" atau "Jun 25, 2026"
    let match = s.match(/^(\d{1,2})[- ](\w+)[, -]+(\d{4})$/);
    if (match) {
        const [, day, mon, year] = match;
        const m = monthMap[mon.toLowerCase()];
        return m ? `${day} ${m} ${year}` : s;
    }

    // Format "June 16, 2026"
    match = s.match(/^(\w+)\s+(\d{1,2}),?\s*(\d{4})$/);
    if (match) {
        const [, mon, day, year] = match;
        const m = monthMap[mon.toLowerCase()];
        return m ? `${day} ${m} ${year}` : s;
    }

    // Coba parse dengan Date
    try {
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        }
    } catch {}

    return s;
}

// Cek apakah thumbnail valid (bukan base64 placeholder)
function isValidThumb(thumb) {
    if (!thumb) return false;
    if (thumb.startsWith('data:image') && thumb.length < 500) return false;
    if (thumb.length < 20) return false;
    if (thumb.includes('printfriendly')) return false;
    if (thumb.match(/Ads-Banner|banner|iklan|ads-/i)) return false;
    if (!thumb.startsWith('http') && !thumb.startsWith('/')) return false;
    return true;
}

function SourceBadge({ sourceInfo, small = false }) {
    if (!sourceInfo) return null;
    const size = small ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]';
    return (
        <div className={`${size} rounded-md ${sourceInfo.bg} text-white font-black flex items-center justify-center shrink-0 shadow-sm p-0.5`}>
            {sourceInfo.iconImg ? (
                <div className="w-full h-full bg-white rounded-[3px] flex items-center justify-center p-[1px] overflow-hidden">
                    <img src={sourceInfo.iconImg} alt={sourceInfo.name} className="w-full h-full object-contain" />
                </div>
            ) : (
                sourceInfo.icon
            )}
        </div>
    );
}

function FeaturedArticleCard({ article, onClick, sourceInfo }) {
    const title = article.title || '';
    const date = normalizeDate(article.date || article.date_time || '');
    const category = article.categories?.[0]?.name || '';
    const hasValidThumb = isValidThumb(article.thumbnail) && sourceInfo?.id !== 'rum';

    return (
        <button
            onClick={onClick}
            className={`w-full text-left relative rounded-[2rem] overflow-hidden group shadow-lg active:scale-[0.98] transition-transform duration-300 md:col-span-2 lg:col-span-3 min-h-[250px] md:min-h-[400px] flex items-end border border-slate-100 dark:border-slate-800 ${!hasValidThumb ? 'bg-white dark:bg-slate-900' : ''}`}
        >
            {/* Background Image (only if hasValidThumb) */}
            {hasValidThumb && (
                <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800">
                    <img
                        src={article.thumbnail}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                            e.target.onerror = null;
                            const parent = e.target.parentElement;
                            if (parent && sourceInfo) {
                                parent.className = `absolute inset-0 ${sourceInfo.bg} flex items-center justify-center`;
                                parent.innerHTML = `<span class="text-white font-black text-6xl opacity-30">${sourceInfo.icon}</span>`;
                            }
                        }}
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
                </div>
            )}

            {/* Content */}
            <div className={`relative z-10 p-5 md:p-8 w-full ${!hasValidThumb ? 'pt-8' : ''}`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500 text-white shadow-sm">
                            Terbaru
                        </span>
                        {sourceInfo && (
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${hasValidThumb ? 'text-white/80 bg-black/30 backdrop-blur-md border-white/10' : 'text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700'}`}>
                                {sourceInfo.name}
                            </span>
                        )}
                    </div>
                    {!hasValidThumb && sourceInfo && (
                        <SourceBadge sourceInfo={sourceInfo} />
                    )}
                </div>
                
                <h2 className={`text-xl md:text-3xl lg:text-4xl font-black leading-tight mb-3 line-clamp-3 md:line-clamp-2 ${!hasValidThumb ? 'text-slate-800 dark:text-white' : 'text-white'}`}>
                    {title}
                </h2>
                
                <div className={`flex items-center gap-3 text-xs font-medium ${!hasValidThumb ? 'text-slate-500 dark:text-slate-400' : 'text-white/70'}`}>
                    {date && (
                        <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {date}
                        </span>
                    )}
                    {category && category.length > 0 && category !== '' && (
                        <span className="flex items-center gap-1 before:content-['•'] before:mr-1">
                            <Tag className="w-3.5 h-3.5" />
                            {category}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}

function ArticleCard({ article, onClick, sourceInfo }) {
    const title = article.title || '';
    const date = normalizeDate(article.date || article.date_time || '');
    const category = article.categories?.[0]?.name || '';
    const hasValidThumb = isValidThumb(article.thumbnail) && sourceInfo?.id !== 'rum';

    return (
        <button
            onClick={onClick}
            className={`w-full h-full text-left bg-transparent group active:scale-[0.98] transition-transform duration-200 flex flex-col ${!hasValidThumb ? 'bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md' : ''}`}
        >
            {hasValidThumb && (
                <div className="w-full aspect-[4/3] rounded-[1.5rem] overflow-hidden relative mb-3 bg-slate-100 dark:bg-slate-800 shadow-sm group-hover:shadow-md transition-shadow">
                    <img
                        src={article.thumbnail}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                            e.target.onerror = null;
                            const parent = e.target.parentElement;
                            if (parent && sourceInfo) {
                                parent.className = `w-full h-full absolute inset-0 ${sourceInfo.bg} flex items-center justify-center`;
                                parent.innerHTML = `<span class="text-white font-black text-4xl opacity-30">${sourceInfo.icon}</span>`;
                            }
                        }}
                    />
                    {/* Source Badge overlay */}
                    {sourceInfo && (
                        <div className="absolute top-3 right-3 shadow-md rounded-md overflow-hidden">
                            <SourceBadge sourceInfo={sourceInfo} />
                        </div>
                    )}
                </div>
            )}

            <div className={`flex-1 flex flex-col px-1 ${!hasValidThumb ? 'px-0' : ''}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        {category && category.length > 0 && category !== '' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: sourceInfo ? `${sourceInfo.accent}15` : '#e2e8f0', color: sourceInfo ? sourceInfo.accent : '#64748b' }}>
                                {category}
                            </span>
                        )}
                        {date && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                <Clock className="w-3 h-3" />
                                {date}
                            </span>
                        )}
                    </div>
                    {!hasValidThumb && sourceInfo && (
                        <SourceBadge sourceInfo={sourceInfo} small={true} />
                    )}
                </div>
                
                <h3 className="text-sm md:text-[15px] font-bold text-slate-800 dark:text-white leading-snug line-clamp-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {title}
                </h3>
            </div>
        </button>
    );
}

export default function Artikel() {
    const navigate = useNavigate();
    
    // Gunakan tab terakhir yang dibuka, atau default ke SOURCES[1].id
    const [sourceId, setSourceId] = useState(() => {
        return sessionStorage.getItem('artikel_last_source') || SOURCES[1].id;
    });

    const cachedInitial = getCached(`artikel_v2_p1_${sourceId}`);
    const [articles, setArticles] = useState(() => cachedInitial ? cachedInitial.articles : []);
    const [loading, setLoading] = useState(() => !cachedInitial);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(() => cachedInitial ? cachedInitial.hasMore : true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchDebounce = useRef(null);
    const latestSourceRef = useRef(sourceId);

    useEffect(() => { 
        latestSourceRef.current = sourceId; 
        sessionStorage.setItem('artikel_last_source', sourceId);
    }, [sourceId]);

    const activeSource = SOURCES.find(s => s.id === sourceId) || SOURCES[0];

    const fetchArticles = useCallback(async (pageNum = 1, query = '', srcId = sourceId, replace = true) => {
        const cacheKey = `artikel_v2_p1_${srcId}`;

        if (pageNum === 1 && !query) {
            const cached = getCached(cacheKey);
            if (cached) {
                setArticles(cached.articles);
                setHasMore(cached.hasMore);
                setPage(1);
                setLoading(false);
                setError(null);
                setIsRefreshing(true);
            } else {
                if (replace) setLoading(true);
            }
        } else {
            if (replace) setLoading(true);
            else setLoadingMore(true);
        }

        try {
            setError(null);
            const params = new URLSearchParams({ page: pageNum });
            if (query) params.set('s', query);

            if (srcId === 'all') {
                const fetchPromises = SOURCES.filter(s => s.id !== 'all').map(async (src) => {
                    try {
                        if (src.id === 'ms' || src.id === 'msh') {
                            const res = await fetchJegThemeArticles(pageNum, query, src);
                            return res.data;
                        }
                        if (src.id === 'maf') {
                            const res = await fetchWpRestArticles(pageNum, query, src);
                            return res.data;
                        }
                        const r = await fetchWithTimeout(`${API_ROOT}/${src.id}?${params}`);
                        if (!r.ok) return [];
                        const j = await r.json();
                        if (!j.success || !j.data) return [];
                        return (j.data.data || []).map(a => ({ ...a, _sourceId: src.id, _sourceName: src.name }));
                    } catch { return []; }
                });

                const results = await Promise.allSettled(fetchPromises);
                if (srcId !== latestSourceRef.current) return;

                let combined = [];
                results.forEach(r => {
                    if (r.status === 'fulfilled' && r.value) {
                        combined = combined.concat(r.value);
                    }
                });

                combined.sort((a, b) => {
                    const timeA = parseIndoDate(a.date_time || a.date);
                    const timeB = parseIndoDate(b.date_time || b.date);
                    // Fallback to title sorting if dates are identical or missing
                    if (timeB === timeA) return (a.title || '').localeCompare(b.title || '');
                    return timeB - timeA;
                });

                let interleaved = combined;

                const newHasMore = interleaved.length > 5;
                setHasMore(newHasMore);
                setPage(pageNum);
                setArticles(prev => replace ? interleaved : [...prev, ...interleaved]);
                if (pageNum === 1 && !query) setCached(cacheKey, { articles: interleaved, hasMore: newHasMore });

            } else {
                let fetchedArticles = [];
                let newHasMore = false;
                if (srcId === 'ms' || srcId === 'msh') {
                    const res = await fetchJegThemeArticles(pageNum, query, activeSource);
                    fetchedArticles = res.data;
                    newHasMore = res.hasMore;
                } else if (srcId === 'maf') {
                    const res = await fetchWpRestArticles(pageNum, query, activeSource);
                    fetchedArticles = res.data;
                    newHasMore = res.hasMore;
                } else {
                    const res = await fetchWithTimeout(`${API_ROOT}/${srcId}?${params}`);
                    if (!res.ok) throw new Error(`Gagal mengambil artikel dari ${activeSource.name}`);

                    const json = await res.json();
                    if (srcId !== latestSourceRef.current) return;
                    if (!json.success || !json.data) throw new Error('Format data tidak valid');

                    fetchedArticles = json.data.data || [];
                    const totalPages = parseInt(json.data.pagination?.total_page || '1', 10);
                    newHasMore = pageNum < totalPages;
                }
                
                if (srcId !== latestSourceRef.current) return;

                setHasMore(newHasMore);
                setPage(pageNum);
                setArticles(prev => replace ? fetchedArticles : [...prev, ...fetchedArticles]);
                if (pageNum === 1 && !query) setCached(cacheKey, { articles: fetchedArticles, hasMore: newHasMore });
            }
        } catch (e) {
            if (srcId !== latestSourceRef.current) return;
            setArticles(prev => {
                if (prev.length > 0) return prev;
                setError(e.message);
                return prev;
            });
        } finally {
            if (srcId === latestSourceRef.current) {
                setLoading(false);
                setLoadingMore(false);
                setIsRefreshing(false);
            }
        }
    }, [sourceId, activeSource.name]);

    useEffect(() => {
        fetchArticles(1, '', sourceId, true);
    }, [sourceId, fetchArticles]);

    const handleSearch = (q) => {
        setSearchQuery(q);
        clearTimeout(searchDebounce.current);
        if (!q.trim()) {
            fetchArticles(1, '', sourceId, true);
            return;
        }
        searchDebounce.current = setTimeout(() => {
            fetchArticles(1, q.trim(), sourceId, true);
        }, 600);
    };

    const handleLoadMore = () => {
        fetchArticles(page + 1, searchQuery, sourceId, false);
    };

    const handleArticleClick = (article) => {
        if (navigator.vibrate) navigator.vibrate(8);
        const targetSource = article._sourceId || sourceId;
        navigate(`/artikel/${targetSource}/${encodeURIComponent(article.id)}`, { state: { article } });
    };

    const getArticleSourceInfo = (article) => {
        const sid = article._sourceId || sourceId;
        return SOURCES.find(s => s.id === sid) || SOURCES[1];
    };

    return (
        <div className="app-view active flex flex-col h-full absolute inset-0 z-50 transition-all duration-300 overflow-y-auto bg-slate-50 dark:bg-slate-950 no-scrollbar">
            {/* Background gradient */}
            <div className="fixed top-0 left-0 right-0 h-72 bg-gradient-to-b from-emerald-500/8 via-emerald-500/4 to-transparent pointer-events-none z-0" />

            {/* Header */}
            <div className="sticky top-0 z-[100] px-4 pt-[calc(1.25rem+env(safe-area-inset-top))] pb-3 md:px-8 md:pt-6">
                <div className="flex items-center justify-between p-2 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/50 dark:border-slate-700/50 shadow-sm w-full max-w-7xl mx-auto">
                    <button
                        onClick={() => { if (navigator.vibrate) navigator.vibrate(8); navigate(-1); }}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/10 transition active:scale-90 group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition" />
                    </button>
                    <motion.h2 layoutId="navbar-title" className="text-sm font-bold text-slate-800 dark:text-white tracking-tight text-center flex-1 truncate px-2 animate-nav-title">
                        Artikel Islami
                    </motion.h2>
                    <div className="w-10" />
                </div>
            </div>

            <div className="relative z-10 px-4 pt-3 pb-28 w-full max-w-7xl mx-auto md:px-8">
                
                {/* Source Tabs */}
                <div className="mb-4 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto no-scrollbar flex gap-2 pb-1">
                    {SOURCES.map(s => {
                        const isActive = sourceId === s.id;
                        return (
                            <button
                                key={s.id}
                                onClick={() => {
                                    if (isActive) return;
                                    if (navigator.vibrate) navigator.vibrate(8);
                                    setSourceId(s.id);
                                    setSearchQuery('');
                                    setArticles([]);
                                    setLoading(true);
                                }}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap text-[11px] font-bold transition-all ${isActive
                                    ? 'text-white shadow-md'
                                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                }`}
                                style={isActive ? { background: s.accent, boxShadow: `0 4px 12px ${s.accent}40` } : {}}
                            >
                                {isActive && !s.iconImg && <CheckCircle2 className="w-3 h-3" />}
                                {s.iconImg && (
                                    <div className={`w-4 h-4 rounded-full overflow-hidden flex items-center justify-center bg-white p-[1.5px] ${isActive ? 'ring-2 ring-white/50' : 'ring-1 ring-slate-200 dark:ring-slate-700'}`}>
                                        <img src={s.iconImg} alt={s.name} className="w-full h-full object-contain mix-blend-normal" />
                                    </div>
                                )}
                                {s.name}
                            </button>
                        );
                    })}
                </div>

                {/* Search */}
                <div className="relative mb-6 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors pointer-events-none" />
                    <input
                        type="text"
                        placeholder={`Cari artikel di ${activeSource.name}...`}
                        value={searchQuery}
                        onChange={e => handleSearch(e.target.value)}
                        className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 shadow-sm transition-all"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => handleSearch('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Label */}
                {searchQuery && !loading && (
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-3 px-1 flex items-center gap-1.5">
                        <Tag className="w-3 h-3" /> Hasil: "{searchQuery}"
                    </p>
                )}
                {!searchQuery && !loading && (
                    <div className="flex items-center justify-between mb-3 px-1">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.15em]">Artikel Terbaru</p>
                        {isRefreshing && (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin" /> Memperbarui...
                            </span>
                        )}
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 lg:gap-5">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-sm animate-pulse">
                                <div className="flex items-start gap-3.5">
                                    <div className="w-[72px] h-[72px] rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0" />
                                    <div className="flex-1 space-y-2 py-1">
                                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-4/5" />
                                        <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded-lg w-3/5" />
                                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-lg w-2/5 mt-3" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
                            <AlertCircle className="w-8 h-8 text-red-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Gagal memuat artikel</p>
                        <p className="text-xs text-slate-400 mt-1 mb-6">{error}</p>
                        <button
                            onClick={() => fetchArticles(1, searchQuery, sourceId, true)}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition shadow-sm"
                        >
                            <RefreshCw className="w-4 h-4" /> Coba Lagi
                        </button>
                    </div>
                ) : articles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                            <Search className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Tidak ada artikel ditemukan</p>
                    </div>
                ) : (
                    <>
                        {/* Featured Article */}
                        {!searchQuery && articles.length > 0 && (
                            <div className="mb-3 md:mb-4 lg:mb-5">
                                <FeaturedArticleCard
                                    article={articles[0]}
                                    sourceInfo={getArticleSourceInfo(articles[0])}
                                    onClick={() => handleArticleClick(articles[0])}
                                />
                            </div>
                        )}
                        
                        {/* Masonry Layout for the rest */}
                        <div className="columns-1 md:columns-2 lg:columns-3 gap-3 md:gap-4 lg:gap-5 space-y-3 md:space-y-4 lg:space-y-5">
                            {articles.slice(!searchQuery ? 1 : 0).map(article => (
                                <div key={article.id} className="break-inside-avoid">
                                    <ArticleCard
                                        article={article}
                                        sourceInfo={getArticleSourceInfo(article)}
                                        onClick={() => handleArticleClick(article)}
                                    />
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Load More */}
                {hasMore && articles.length > 0 && !loading && !error && (
                    <div className="mt-6 text-center">
                        <button
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-emerald-500/40 hover:text-emerald-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                        >
                            {loadingMore
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Memuat...</>
                                : <>Muat lebih banyak <ChevronRight className="w-4 h-4" /></>
                            }
                        </button>
                    </div>
                )}

                {/* Footer source info */}
                <div className="mt-8 text-center pb-4">
                    <p className="text-[10px] text-slate-400">
                        Sumber:{' '}
                        {sourceId === 'all' ? (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Gabungan 7 Sumber</span>
                        ) : (
                            <a
                                href={activeSource.url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                                {activeSource.name}
                            </a>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
