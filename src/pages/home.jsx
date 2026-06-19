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