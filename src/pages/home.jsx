import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Search, Sun, Moon, Star, GitFork, Eye, AlertCircle, AlertTriangle,
    X, ExternalLink, ArrowUpDown, Users as UsersIcon, BookMarked,
    RefreshCw, Inbox, Link as LinkIcon,
} from 'lucide-react';

// KONSTANTA & HELPER
const REPO_SORTS = [
    { value: 'best', label: 'Paling relevan' },
    { value: 'stars', label: 'Bintang terbanyak' },
    { value: 'forks', label: 'Fork terbanyak' },
    { value: 'updated', label: 'Baru diperbarui' },
];

const USER_SORTS = [
    { value: 'best', label: 'Paling relevan' },
    { value: 'followers', label: 'Pengikut terbanyak' },
    { value: 'repositories', label: 'Repositori terbanyak' },
    { value: 'joined', label: 'Baru bergabung' },
];

const LANGUAGES = [
    'JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java', 'C++', 'C',
    'C#', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'HTML', 'CSS', 'Shell', 'Dart',
];

const EXAMPLES_REPO = ['react', 'tensorflow', 'vercel/next.js', 'rust-lang/rust', 'vuejs/vue'];
const EXAMPLES_USER = ['torvalds', 'gaearon', 'sindresorhus', 'addyosmani'];

function formatNumber(n) {
    if (n === null || n === undefined) return '0';
    if (n < 1000) return String(n);
    if (n < 1000000) {
        const v = n / 1000;
        return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}rb`;
    }
    const v = n / 1000000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}jt`;
}

function timeAgo(dateStr) {
    if (!dateStr) return '-';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'baru saja';
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins} menit lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} hari lalu`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} bulan lalu`;
    return `${Math.floor(months / 12)} tahun lalu`;
}

function formatDate(d) {
    if (!d) return '-';
    try {
        return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) {
        return d;
    }
}

function formatSize(kb) {
    if (kb === null || kb === undefined) return '-';
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
}

function buildQuery(kind, q, language) {
    let query = q.trim();
    if (kind === 'repo' && language && language !== 'all') {
        query += ` language:${language}`;
    }
    return query;
}

function formatError(e) {
    if (e && e.status === 403) return 'Batas permintaan GitHub API tercapai. Tunggu sebentar lalu coba lagi.';
    if (e && e.status === 422) return 'Kata kunci pencarian tidak valid. Coba kata kunci lain.';
    if (e && e.message === 'Failed to fetch') return 'Tidak dapat terhubung ke GitHub API. Periksa koneksi internet Anda.';
    return (e && e.message) || 'Terjadi kesalahan tak terduga.';
}

const SEARCH_PATH = { repo: 'repositories', user: 'users' };

async function searchGitHub(kind, q, sort, order, page, signal) {
    const params = new URLSearchParams();
    params.set('q', q);
    if (sort && sort !== 'best') params.set('sort', sort);
    params.set('order', order);
    params.set('per_page', '20');
    params.set('page', String(page));
    const url = `https://api.github.com/search/${SEARCH_PATH[kind]}?${params.toString()}`;
    const res = await fetch(url, {
        signal,
        headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* body kosong/non-JSON */ }
    if (!res.ok) {
        const err = new Error((data && data.message) || `Permintaan gagal (${res.status})`);
        err.status = res.status;
        throw err;
    }
    return data;
}

// HOOKS
function useDebouncedValue(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

function useTheme() {
    const [theme, setTheme] = useState('light');

    useEffect(() => {
        try {
            const savedTheme = localStorage.getItem('rx:theme');

            if (savedTheme === 'light' || savedTheme === 'dark') {
                setTheme(savedTheme);
            }
        } catch (e) { }
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme((prev) => {
            const next = prev === 'light' ? 'dark' : 'light';

            try {
                localStorage.setItem('rx:theme', next);
            } catch (e) { }

            return next;
        });
    }, []);

    return [theme, toggleTheme];
}

function useFavorites() {
    const [favorites, setFavorites] = useState({});

    useEffect(() => {
        try {
            const savedFavorites = localStorage.getItem('rx:favorites');

            if (savedFavorites) {
                setFavorites(JSON.parse(savedFavorites));
            }
        } catch (e) { }
    }, []);

    const toggleFavorite = useCallback((item, kind) => {
        setFavorites((prev) => {
            const id = `${kind}:${item.id}`;
            const next = { ...prev };

            if (next[id]) {
                delete next[id];
            } else {
                next[id] = {
                    ...item,
                    kind,
                    savedAt: Date.now(),
                };
            }

            try {
                localStorage.setItem(
                    'rx:favorites',
                    JSON.stringify(next)
                );
            } catch (e) { }

            return next;
        });
    }, []);

    return { favorites, toggleFavorite };
}

// KOMPONEN KECIL UNTUK FAVOURITE DAN GANTI THEME
function IconButton({ icon: Icon, onClick, active, label, title }) {
    return (
        <button
            onClick={onClick}
            aria-label={label}
            title={title || label}
            aria-pressed={!!active}
            className={`relative p-2.5 border-2 border-rx flex-shrink-0 transition-colors ${active ? 'invert-active' : 'invert-hover'}`}
        >
            <Icon className="w-4 h-4" />
        </button>
    );
}

function SkeletonCard() {
    return (
        <div className="border-2 border-rx p-4 mb-3">
            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rx-skeleton flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                    <div className="h-3 w-2/3 rx-skeleton" />
                    <div className="h-3 w-full rx-skeleton" />
                    <div className="h-3 w-1/3 rx-skeleton" />
                </div>
            </div>
        </div>
    );
}

function EmptyState({ icon: Icon, title, description }) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4">
            <Icon className="w-7 h-7 text-dim-rx mb-3" />
            <p className="font-mono-rx text-sm font-semibold mb-1">{title}</p>
            {description && <p className="text-sm text-dim-rx max-w-sm">{description}</p>}
        </div>
    );
}

function ErrorState({ message, onRetry }) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 border-2 border-rx">
            <AlertTriangle className="w-7 h-7 text-dim-rx mb-3" />
            <p className="font-mono-rx text-sm font-semibold mb-1">Gagal memuat data</p>
            <p className="text-sm text-dim-rx max-w-sm mb-4">{message}</p>
            <button onClick={onRetry} className="flex items-center gap-2 font-mono-rx text-xs uppercase tracking-wide border-2 border-rx px-4 py-2 invert-hover">
                <RefreshCw className="w-3.5 h-3.5" /> Coba lagi
            </button>
        </div>
    );
}

function InitialState({ kind, onPick }) {
    const examples = kind === 'repo' ? EXAMPLES_REPO : EXAMPLES_USER;
    return (
        <div className="flex flex-col items-center justify-center text-center py-16 px-4">
            <p className="font-mono-rx text-sm text-dim-rx mb-4">{'>'} ketik kata kunci untuk mulai mencari, atau coba:</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
                {examples.map((ex) => (
                    <button key={ex} onClick={() => onPick(ex)} className="font-mono-rx text-xs border-2 border-rx px-3 py-1.5 invert-hover">
                        {ex}
                    </button>
                ))}
            </div>
        </div>
    );
}

function StatBlock({ icon: Icon, label, value }) {
    return (
        <div className="border-2 border-rx p-3">
            <div className="flex items-center gap-1.5 text-dim-rx mb-1">
                <Icon className="w-3 h-3" />
                <span className="font-mono-rx text-xs uppercase tracking-wide">{label}</span>
            </div>
            <p className="font-mono-rx text-lg font-bold">{value}</p>
        </div>
    );
}

function DetailRow({ label, children }) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-rx py-1.5">
            <span className="text-dim-rx uppercase tracking-wide flex-shrink-0">{label}</span>
            <span className="text-right break-words">{children}</span>
        </div>
    );
}

function RepoCard({ repo, index, isSelected, onSelect, isFavorite, onToggleFavorite }) {
    return (
        <div
            onClick={() => onSelect(repo)}
            style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
            className={`rx-fade-up cursor-pointer border-2 ${isSelected ? 'border-current' : 'border-rx'} bg-surface-rx p-4 mb-3 transition-colors hover:border-current`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <img src={repo.owner && repo.owner.avatar_url} alt="" className="w-9 h-9 border-2 border-rx flex-shrink-0" />
                    <div className="min-w-0">
                        <p className="font-mono-rx text-sm font-semibold truncate">{repo.full_name}</p>
                        {repo.description && <p className="text-sm text-dim-rx mt-1 rx-clamp-2">{repo.description}</p>}
                    </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleFavorite(repo); }}
                    aria-label="Tandai favorit"
                    aria-pressed={isFavorite}
                    className={`flex-shrink-0 p-1.5 border-2 ${isFavorite ? 'invert-active border-current' : 'border-rx text-dim-rx hover:text-current hover:border-current'}`}
                >
                    <Star className="w-3.5 h-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 font-mono-rx text-xs text-dim-rx">
                {repo.language && (
                    <span className="flex items-center gap-1">
                        <span className="inline-block w-2 h-2 bg-current" />{repo.language}
                    </span>
                )}
                <span className="flex items-center gap-1"><Star className="w-3 h-3" />{formatNumber(repo.stargazers_count)}</span>
                <span className="flex items-center gap-1"><GitFork className="w-3 h-3" />{formatNumber(repo.forks_count)}</span>
                <span>{timeAgo(repo.updated_at)}</span>
            </div>
        </div>
    );
}

function UserCard({ user, index, isSelected, onSelect, isFavorite, onToggleFavorite }) {
    return (
        <div
            onClick={() => onSelect(user)}
            style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
            className={`rx-fade-up cursor-pointer border-2 ${isSelected ? 'border-current' : 'border-rx'} bg-surface-rx p-4 mb-3 flex items-center gap-3 transition-colors hover:border-current`}
        >
            <img src={user.avatar_url} alt="" className="w-11 h-11 border-2 border-rx flex-shrink-0" />
            <div className="min-w-0 flex-1">
                <p className="font-mono-rx text-sm font-semibold truncate">{user.login}</p>
                <p className="text-xs text-dim-rx font-mono-rx uppercase tracking-wide">{user.type === 'Organization' ? 'Organisasi' : 'Pengguna'}</p>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(user); }}
                aria-label="Tandai favorit"
                aria-pressed={isFavorite}
                className={`flex-shrink-0 p-1.5 border-2 ${isFavorite ? 'invert-active border-current' : 'border-rx text-dim-rx hover:text-current hover:border-current'}`}
            >
                <Star className="w-3.5 h-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
        </div>
    );
}

// PANEL DETAIL
function DetailPanel({ selected, isFavorite, onToggleFavorite, onClose, userDetail, userDetailLoading, userDetailError }) {
    if (!selected) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-20 px-4 border-2 border-rx h-full">
                <BookMarked className="w-7 h-7 text-dim-rx mb-3" />
                <p className="font-mono-rx text-sm text-dim-rx">Pilih repositori atau pengguna untuk melihat detail.</p>
            </div>
        );
    }

    const { kind, item } = selected;
    const fav = isFavorite(item, kind);

    return (
        <div className="border-2 border-rx bg-surface-rx">
            <div className="flex items-center justify-between px-5 py-3 border-b-2 border-rx">
                <span className="font-mono-rx text-xs uppercase tracking-wide text-dim-rx">Detail {kind === 'repo' ? 'Repositori' : 'Pengguna'}</span>
                <button onClick={onClose} aria-label="Tutup detail" className="p-1.5 border-2 border-rx invert-hover">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {kind === 'repo' ? (
                <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4 mb-5">
                        <img src={item.owner && item.owner.avatar_url} alt="" className="w-14 h-14 border-2 border-rx flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="font-mono-rx text-base sm:text-lg font-bold break-words">{item.full_name}</p>
                            {item.owner && (
                                <a href={item.owner.html_url} target="_blank" rel="noreferrer" className="text-xs text-dim-rx hover:text-current font-mono-rx">
                                    @{item.owner.login}
                                </a>
                            )}
                        </div>
                        <button
                            onClick={() => onToggleFavorite(item, kind)}
                            aria-pressed={fav}
                            className={`flex-shrink-0 p-2 border-2 ${fav ? 'invert-active border-current' : 'border-rx hover:border-current'}`}
                        >
                            <Star className="w-4 h-4" fill={fav ? 'currentColor' : 'none'} />
                        </button>
                    </div>

                    {item.description && <p className="text-sm mb-5 leading-relaxed">{item.description}</p>}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                        <StatBlock icon={Star} label="Star" value={formatNumber(item.stargazers_count)} />
                        <StatBlock icon={GitFork} label="Fork" value={formatNumber(item.forks_count)} />
                        <StatBlock icon={Eye} label="Watching" value={formatNumber(item.watchers_count !== undefined ? item.watchers_count : item.stargazers_count)} />
                        <StatBlock icon={AlertCircle} label="Issues" value={formatNumber(item.open_issues_count)} />
                    </div>

                    <div className="space-y-0 mb-5 font-mono-rx text-xs">
                        {item.language && <DetailRow label="Language">{item.language}</DetailRow>}
                        {item.license && item.license.name && <DetailRow label="License">{item.license.name}</DetailRow>}
                        {item.created_at && <DetailRow label="Created">{formatDate(item.created_at)}</DetailRow>}
                        {item.updated_at && <DetailRow label="Updated">{formatDate(item.updated_at)}</DetailRow>}
                        {item.pushed_at && <DetailRow label="Last Push">{formatDate(item.pushed_at)}</DetailRow>}
                        {item.size !== undefined && <DetailRow label="Size">{formatSize(item.size)}</DetailRow>}
                        {item.default_branch && <DetailRow label="Default Branch">{item.default_branch}</DetailRow>}
                    </div>

                    {item.topics && item.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-5">
                            {item.topics.slice(0, 12).map((t) => (
                                <span key={t} className="font-mono-rx text-xs bg-surface2-rx border border-rx px-2 py-1">{t}</span>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <a href={item.html_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-mono-rx text-xs uppercase tracking-wide border-2 border-rx px-4 py-2 invert-hover">
                            <ExternalLink className="w-3.5 h-3.5" /> Buka di GitHub
                        </a>
                        {item.homepage && (
                            <a href={item.homepage} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-mono-rx text-xs uppercase tracking-wide border-2 border-rx px-4 py-2 invert-hover">
                                <LinkIcon className="w-3.5 h-3.5" /> Situs proyek
                            </a>
                        )}
                    </div>
                </div>
            ) : (
                <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4 mb-5">
                        <img src={item.avatar_url} alt="" className="w-16 h-16 border-2 border-rx flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="font-mono-rx text-base sm:text-lg font-bold break-words">{(userDetail && userDetail.name) || item.login}</p>
                            <p className="text-xs text-dim-rx font-mono-rx">@{item.login}</p>
                        </div>
                        <button
                            onClick={() => onToggleFavorite(item, kind)}
                            aria-pressed={fav}
                            className={`flex-shrink-0 p-2 border-2 ${fav ? 'invert-active border-current' : 'border-rx hover:border-current'}`}
                        >
                            <Star className="w-4 h-4" fill={fav ? 'currentColor' : 'none'} />
                        </button>
                    </div>

                    {userDetailLoading && (
                        <div className="space-y-2 mb-5">
                            <div className="h-3 w-full rx-skeleton" />
                            <div className="h-3 w-2/3 rx-skeleton" />
                        </div>
                    )}

                    {userDetailError && <p className="text-sm text-dim-rx mb-5">{userDetailError}</p>}

                    {userDetail && !userDetailLoading && (
                        <>
                            {userDetail.bio && <p className="text-sm mb-5 leading-relaxed">{userDetail.bio}</p>}
                            <div className="grid grid-cols-3 gap-3 mb-5">
                                <StatBlock icon={UsersIcon} label="Pengikut" value={formatNumber(userDetail.followers)} />
                                <StatBlock icon={UsersIcon} label="Mengikuti" value={formatNumber(userDetail.following)} />
                                <StatBlock icon={BookMarked} label="Repositori" value={formatNumber(userDetail.public_repos)} />
                            </div>
                            <div className="space-y-0 mb-5 font-mono-rx text-xs">
                                {userDetail.company && <DetailRow label="Perusahaan">{userDetail.company}</DetailRow>}
                                {userDetail.location && <DetailRow label="Lokasi">{userDetail.location}</DetailRow>}
                                {userDetail.created_at && <DetailRow label="Bergabung">{formatDate(userDetail.created_at)}</DetailRow>}
                            </div>
                        </>
                    )}

                    <a href={item.html_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-mono-rx text-xs uppercase tracking-wide border-2 border-rx px-4 py-2 invert-hover">
                        <ExternalLink className="w-3.5 h-3.5" /> Buka di GitHub
                    </a>
                </div>
            )}
        </div>
    );
}

// MAIN APP
export default function App() {
    const initialParams = (() => {
        try { return new URLSearchParams(window.location.search); } catch (e) { return new URLSearchParams(); }
    })();

    const [theme, toggleTheme] = useTheme();
    const { favorites, toggleFavorite } = useFavorites();

    const [rawQuery, setRawQuery] = useState(initialParams.get('q') || '');
    const [kind, setKind] = useState(initialParams.get('kind') === 'user' ? 'user' : 'repo');
    const [sort, setSort] = useState(initialParams.get('sort') || 'best');
    const [order, setOrder] = useState(initialParams.get('order') || 'desc');
    const [language, setLanguage] = useState(initialParams.get('lang') || 'all');
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(initialParams.get('fav') === '1');

    const [results, setResults] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [loadMoreError, setLoadMoreError] = useState(null);
    const [hasMore, setHasMore] = useState(false);

    const [selected, setSelected] = useState(null); // { kind, item }
    const [userDetail, setUserDetail] = useState(null);
    const [userDetailLoading, setUserDetailLoading] = useState(false);
    const [userDetailError, setUserDetailError] = useState(null);

    const debouncedQuery = useDebouncedValue(rawQuery, 500);
    const cache = useRef(new Map());
    const userDetailCache = useRef(new Map());
    const controllerRef = useRef(null);
    const sentinelRef = useRef(null);

    const isFavoriteFn = useCallback((item, k) => !!favorites[`${k}:${item.id}`], [favorites]);

    // sinkronisasi URL (query params)
    useEffect(() => {
        try {
            const params = new URLSearchParams();
            if (rawQuery) params.set('q', rawQuery);
            if (kind !== 'repo') params.set('kind', kind);
            if (sort !== 'best') params.set('sort', sort);
            if (order !== 'desc') params.set('order', order);
            if (language !== 'all') params.set('lang', language);
            if (showFavoritesOnly) params.set('fav', '1');
            const qs = params.toString();
            const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
            window.history.replaceState(null, '', newUrl);
        } catch (e) { /* lingkungan sandbox mungkin membatasi History API */ }
    }, [rawQuery, kind, sort, order, language, showFavoritesOnly]);

    // pencarian halaman pertama
    const fetchPage1 = useCallback(async () => {
        if (showFavoritesOnly) return;
        const q = debouncedQuery.trim();
        if (!q) {
            setResults([]); setTotalCount(0); setHasMore(false); setError(null); setLoading(false);
            return;
        }
        if (controllerRef.current) controllerRef.current.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        setLoading(true);
        setError(null);
        setLoadMoreError(null);
        const fullQuery = buildQuery(kind, q, language);
        const cacheKey = `${kind}|${fullQuery}|${sort}|${order}|1`;
        try {
            let data = cache.current.get(cacheKey);
            if (!data) {
                data = await searchGitHub(kind, fullQuery, sort, order, 1, controller.signal);
                if (cache.current.size > 150) cache.current.clear();
                cache.current.set(cacheKey, data);
            }
            setResults(data.items || []);
            setTotalCount(data.total_count || 0);
            setPage(1);
            setHasMore((data.items || []).length === 20 && (data.total_count || 0) > 20);
        } catch (e) {
            if (e.name === 'AbortError') return;
            setError(formatError(e));
            setResults([]); setTotalCount(0); setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, [kind, debouncedQuery, sort, order, language, showFavoritesOnly]);

    useEffect(() => { fetchPage1(); }, [fetchPage1]);

    // infinite scroll: halaman berikutnya
    const loadMore = useCallback(async () => {
        if (showFavoritesOnly || loading || loadingMore || !hasMore) return;
        const q = debouncedQuery.trim();
        if (!q) return;
        const nextPage = page + 1;
        setLoadingMore(true);
        setLoadMoreError(null);
        const fullQuery = buildQuery(kind, q, language);
        const cacheKey = `${kind}|${fullQuery}|${sort}|${order}|${nextPage}`;
        try {
            let data = cache.current.get(cacheKey);
            if (!data) {
                data = await searchGitHub(kind, fullQuery, sort, order, nextPage);
                if (cache.current.size > 150) cache.current.clear();
                cache.current.set(cacheKey, data);
            }
            setResults((prev) => [...prev, ...(data.items || [])]);
            setPage(nextPage);
            const loadedCount = nextPage * 20;
            setHasMore(loadedCount < Math.min(data.total_count || 0, 1000) && (data.items || []).length === 20);
        } catch (e) {
            if (e.name !== 'AbortError') setLoadMoreError(formatError(e));
        } finally {
            setLoadingMore(false);
        }
    }, [showFavoritesOnly, loading, loadingMore, hasMore, debouncedQuery, page, kind, language, sort, order]);

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || showFavoritesOnly) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) loadMore();
        }, { rootMargin: '300px 0px' });
        observer.observe(el);
        return () => observer.disconnect();
    }, [loadMore, showFavoritesOnly]);

    // detail pengguna
    useEffect(() => {
        if (!selected || selected.kind !== 'user') { setUserDetail(null); setUserDetailError(null); return; }
        const login = selected.item.login;
        if (userDetailCache.current.has(login)) {
            setUserDetail(userDetailCache.current.get(login));
            setUserDetailError(null);
            return;
        }
        let cancelled = false;
        setUserDetail(null);
        setUserDetailLoading(true);
        setUserDetailError(null);
        fetch(`https://api.github.com/users/${login}`, { headers: { Accept: 'application/vnd.github+json' } })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) { const err = new Error(data.message || `Gagal memuat profil (${res.status})`); err.status = res.status; throw err; }
                return data;
            })
            .then((data) => {
                if (cancelled) return;
                userDetailCache.current.set(login, data);
                setUserDetail(data);
            })
            .catch((e) => { if (!cancelled) setUserDetailError(formatError(e)); })
            .finally(() => { if (!cancelled) setUserDetailLoading(false); });
        return () => { cancelled = true; };
    }, [selected]);

    // tutup detail dengan tombol Escape & kunci scroll mobile
    useEffect(() => {
        if (!selected) return;
        const onKey = (e) => { if (e.key === 'Escape') setSelected(null); };
        window.addEventListener('keydown', onKey);
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [selected]);

    const handleKindChange = (k) => {
        setKind(k);
        setSelected(null);
        if (k === 'user') setLanguage('all');
    };

    const favList = Object.values(favorites)
        .filter((f) => f.kind === kind)
        .sort((a, b) => b.savedAt - a.savedAt);

    const sortOptions = kind === 'repo' ? REPO_SORTS : USER_SORTS;
    const favoritesCount = Object.keys(favorites).length;

    return (
        <div className={`rx-root ${theme === 'dark' ? 'theme-dark' : ''} min-h-screen flex flex-col`}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

        :root {
          --bg: #fafafa; --surface: #ffffff; --surface-2: #efefef;
          --border: #cfcfcf; --text: #0a0a0a; --text-dim: #6b6b6b;
          --invert-bg: #0a0a0a; --invert-text: #fafafa;
        }
        .theme-dark {
          --bg: #0a0a0a; --surface: #131313; --surface-2: #1d1d1d;
          --border: #303030; --text: #fafafa; --text-dim: #969696;
          --invert-bg: #fafafa; --invert-text: #0a0a0a;
        }
        .rx-root { background: var(--bg); color: var(--text); font-family: 'IBM Plex Sans', sans-serif; transition: background-color .35s ease, color .35s ease; }
        .font-mono-rx { font-family: 'JetBrains Mono', monospace; }
        .bg-surface-rx { background: var(--surface); }
        .bg-surface2-rx { background: var(--surface-2); }
        .bg-bg-rx { background: var(--bg); }
        .border-rx { border-color: var(--border); }
        .text-dim-rx { color: var(--text-dim); }
        .invert-hover:hover { background: var(--invert-bg); color: var(--invert-text); }
        .invert-active { background: var(--invert-bg); color: var(--invert-text); }
        select.invert-hover, select.invert-hover:hover { color: var(--text); background: var(--surface); }

        *:focus-visible { outline: 2px dashed var(--text); outline-offset: 2px; }

        .rx-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        @keyframes rx-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        .rx-cursor { animation: rx-blink 1s step-start infinite; }

        @keyframes rx-fade-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .rx-fade-up { animation: rx-fade-up .4s ease both; }

        @keyframes rx-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .rx-skeleton { background-image: linear-gradient(90deg, var(--surface-2) 25%, var(--border) 37%, var(--surface-2) 63%); background-size: 200% 100%; animation: rx-shimmer 1.6s linear infinite; }

        @keyframes rx-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .rx-sheet-enter { animation: rx-slide-up .35s cubic-bezier(.32,.72,0,1) both; }

        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); }

        @media (prefers-reduced-motion: reduce) {
          .rx-fade-up, .rx-cursor, .rx-skeleton, .rx-sheet-enter { animation: none !important; transition: none !important; }
        }
      `}</style>

                
        </div>
    );
}