import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('darren');
    const [password, setPassword] = useState('123');
    const [showPassword, setShowPassword] = useState(false);
    const [focusedField, setFocusedField] = useState(null);
    const [status, setStatus] = useState('idle'); // idle | loading | success | error
    const [errorMsg, setErrorMsg] = useState('');
    const [savedData, setSavedData] = useState(null);
    const [showDebug, setShowDebug] = useState(false);

    // Muat font display
    useEffect(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href =
            'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap';
        document.head.appendChild(link);
        return () => document.head.removeChild(link);
    }, []);

    const isLabelUp = (value) => value.length > 0;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setErrorMsg('Username dan password wajib diisi.');
            setStatus('error');
            setTimeout(() => setStatus('idle'), 550);
            return;
        }

        setStatus('loading');
        setTimeout(() => {
            const payload = {
                username: username.trim(),
                password,
                loggedInAt: new Date().toISOString(),
            };
            try {
                localStorage.setItem('auth_session', JSON.stringify(payload));
                setSavedData(payload);
                setStatus('success');
                 // Arahkan user ke /home sesaat setelah login berhasil
                setTimeout(() => {
                    navigate('/home');
                }, 900);
            } catch (err) {
                setErrorMsg('Gagal menyimpan ke localStorage (storage penuh/diblokir browser).');
                setStatus('error');
            }
        }, 650);
    };

    const handleReset = () => {
        localStorage.removeItem('auth_session');
        setUsername('');
        setPassword('');
        setSavedData(null);
        setShowDebug(false);
        setStatus('idle');
    };

    const serif = { fontFamily: "'Instrument Serif', Georgia, serif" };
    const mono = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" };

    return (
        <div
            className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-black px-4 py-10 sm:py-16"
            style={{
                backgroundImage:
                    'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
            }}
        >
            <style>{`
        @keyframes loginFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loginShake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
        @keyframes loginPop {
          0% { opacity: 0; transform: scale(0.85); }
          60% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        .login-fade-up { animation: loginFadeUp 0.7s cubic-bezier(0.16,1,0.3,1) backwards; }
        .login-shake { animation: loginShake 0.5s ease-in-out; }
        .login-pop { animation: loginPop 0.5s cubic-bezier(0.34,1.56,0.64,1) backwards; }
      `}</style>

            {/* vignette halus */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        'radial-gradient(circle at 50% 30%, transparent 0%, rgba(0,0,0,0.6) 75%)',
                }}
            />

            {/* brand mark (disembunyikan di mobile supaya layout tidak sesak) */}
            <div
                className="login-fade-up absolute left-4 top-4 hidden text-xs uppercase tracking-[0.3em] text-neutral-500 sm:left-6 sm:top-6 sm:block"
                style={mono}
            >
                Darren Christian
            </div>
            <div
                className="login-fade-up absolute bottom-4 right-4 hidden text-right text-xs uppercase tracking-[0.2em] text-neutral-600 sm:bottom-6 sm:right-6 sm:block"
                style={{ ...mono, animationDelay: '120ms' }}
            >
                Repository Explorer
            </div>

            {/* card */}
            <div
                className={`login-fade-up relative w-full max-w-md border-2 border-black bg-white px-6 py-8 shadow-2xl sm:px-10 sm:py-10 ${status === 'error' ? 'login-shake' : ''
                    }`}
                style={{ animationDelay: '60ms' }}
            >
                {status !== 'success' ? (
                    <>
                        <div className="login-fade-up mb-8" style={{ animationDelay: '120ms' }}>
                            <p
                                className="mb-1 text-xs uppercase tracking-[0.25em] text-neutral-400"
                                style={mono}
                            >
                                Welcome!
                            </p>
                            <h1 className="text-4xl text-black sm:text-5xl" style={serif}>
                                Login
                            </h1>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-6 sm:gap-7">
                            {/* username */}
                            <div
                                className="login-fade-up relative"
                                style={{ animationDelay: '180ms' }}
                            >
                                <input
                                    id="login-username"
                                    type="text"
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onFocus={() => setFocusedField('username')}
                                    onBlur={() => setFocusedField(null)}
                                    className="peer w-full border-b-2 border-neutral-300 bg-transparent pb-2 pt-6 text-base text-black outline-none transition-colors duration-300 focus:border-black"
                                />
                                <label
                                    htmlFor="login-username"
                                    className={`pointer-events-none absolute left-0 transition-all duration-300 ${focusedField === 'username' || isLabelUp(username)
                                            ? 'top-0 text-xs tracking-wide text-black'
                                            : 'top-6 text-base text-neutral-400'
                                        }`}
                                >
                                    Username
                                </label>
                                <span
                                    className={`absolute bottom-0 left-0 h-0.5 bg-black transition-all duration-300 ${focusedField === 'username' ? 'w-full' : 'w-0'
                                        }`}
                                />
                            </div>

                            {/* password */}
                            <div
                                className="login-fade-up relative"
                                style={{ animationDelay: '240ms' }}
                            >
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                    className="peer w-full border-b-2 border-neutral-300 bg-transparent pb-2 pr-9 pt-6 text-base text-black outline-none transition-colors duration-300 focus:border-black"
                                />
                                <label
                                    htmlFor="login-password"
                                    className={`pointer-events-none absolute left-0 transition-all duration-300 ${focusedField === 'password' || isLabelUp(password)
                                            ? 'top-0 text-xs tracking-wide text-black'
                                            : 'top-6 text-base text-neutral-400'
                                        }`}
                                >
                                    Password
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((s) => !s)}
                                    className="cursor-pointer absolute right-0 top-4 flex h-9 w-9 items-center justify-center text-neutral-400 transition-colors duration-200 hover:text-black"
                                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                >
                                    {showPassword ? (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                            <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.5 5.3A10.4 10.4 0 0112 5c5 0 9 4 11 7-0.6 1-1.5 2.2-2.7 3.3M6.5 6.6C4.4 8 2.9 9.9 1 12c2 3 6 7 11 7 1.4 0 2.7-.3 3.9-.8" />
                                        </svg>
                                    ) : (
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                                <span
                                    className={`absolute bottom-0 left-0 h-0.5 bg-black transition-all duration-300 ${focusedField === 'password' ? 'w-full' : 'w-0'
                                        }`}
                                />
                            </div>

                            {status === 'error' && (
                                <p className="-mt-3 text-xs text-neutral-600" style={mono}>
                                    {errorMsg}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="cursor-pointer login-fade-up group relative mt-2 w-full overflow-hidden border-2 border-black bg-black py-4 text-sm font-medium uppercase tracking-[0.25em] text-white transition-colors duration-300 hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                                style={{ animationDelay: '300ms' }}
                            >
                                {status === 'loading' ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                                        </svg>
                                        Loading...
                                    </span>
                                ) : (
                                    'Login'
                                )}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="flex flex-col items-center text-center">
                        <div className="login-pop mb-5 flex h-16 w-16 items-center justify-center rounded-full border-2 border-black">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.2">
                                <path d="M4 12.5l5 5L20 6.5" />
                            </svg>
                        </div>
                        <h2 className="text-3xl text-black" style={serif}>
                            Login successful!
                        </h2>
                        <p className="mt-2 text-sm text-neutral-500">
                            Hello, <span className="font-medium text-black">{savedData?.username}</span>
                        </p>

                        {/* <button
                            onClick={() => setShowDebug((s) => !s)}
                            className="mt-6 text-xs uppercase tracking-[0.2em] text-neutral-500 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-black"
                            style={mono}
                        >
                            {showDebug ? 'Sembunyikan' : 'Lihat'} data localStorage
                        </button>

                        {showDebug && (
                            <pre
                                className="login-fade-up mt-4 w-full overflow-x-auto border border-neutral-200 bg-neutral-50 p-4 text-left text-xs text-neutral-700"
                                style={mono}
                            >
                                {JSON.stringify(savedData, null, 2)}
                            </pre>
                        )}

                        <button
                            onClick={handleReset}
                            className="mt-8 w-full border-2 border-black bg-white py-3 text-sm font-medium uppercase tracking-[0.25em] text-black transition-colors duration-300 hover:bg-black hover:text-white"
                        >
                            Keluar &amp; reset
                        </button> */}
                    </div>
                )}
            </div>
        </div>
    );
}