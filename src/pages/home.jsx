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
