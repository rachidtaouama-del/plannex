
import React, { useState, useEffect } from 'react';
import { loginUser, storeUser } from '../../services/authService';

interface LoginPageProps {
    onLoginSuccess: (user: any) => void;
    onCancel: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onCancel }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setMounted(true), 50);
        return () => clearTimeout(t);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        await new Promise(resolve => setTimeout(resolve, 1000));

        const result = await loginUser(username, password);

        if (result.success && result.user) {
            storeUser(result.user);
            onLoginSuccess(result.user);
        } else {
            setError(result.message || "Identifiants incorrects");
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 font-sans">
            <style>{`
                @keyframes loginCardIn {
                    from { opacity: 0; transform: translateY(24px) scale(0.96); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes scanBeam {
                    0%   { transform: translateY(-100%); opacity: 0.5; }
                    100% { transform: translateY(500%); opacity: 0; }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    15%, 45%, 75% { transform: translateX(-5px); }
                    30%, 60%, 90% { transform: translateX(5px); }
                }
                @keyframes pulseRing {
                    0%   { transform: scale(1.0); opacity: 0.45; }
                    60%  { transform: scale(1.6); opacity: 0; }
                    100% { transform: scale(1.0); opacity: 0; }
                }
                @keyframes floatOrb {
                    0%, 100% { transform: translate(0, 0); }
                    33%      { transform: translate(20px, -15px); }
                    66%      { transform: translate(-10px, 10px); }
                }
                .login-card  { animation: loginCardIn 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
                .scan-beam   { animation: scanBeam 4s linear infinite; }
                .shake-anim  { animation: shake 0.4s ease-in-out; }
                .pulse-ring  { animation: pulseRing 2.2s ease-out infinite; }
                .float-orb-1 { animation: floatOrb 12s ease-in-out infinite; }
                .float-orb-2 { animation: floatOrb 16s ease-in-out infinite reverse; }
                
                /* Custom datetime-local dark theme */
                input[type="datetime-local"]::-webkit-calendar-picker-indicator {
                    filter: invert(0.4);
                }
            `}</style>

            {/* ── BACKGROUND ── */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Animated orbs */}
                <div className="float-orb-1 absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full opacity-60"
                    style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)' }} />
                <div className="float-orb-2 absolute bottom-1/3 right-1/3 w-[400px] h-[400px] rounded-full opacity-60"
                    style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)' }} />
                {/* Grid */}
                <div className="absolute inset-0 opacity-30"
                    style={{ backgroundImage: 'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)', backgroundSize: '48px 48px', maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, #000 40%, transparent 100%)' }} />
            </div>

            {/* ── CARD ── */}
            <div className="login-card relative w-full max-w-[440px] overflow-hidden"
                style={{
                    background: 'linear-gradient(160deg, #070b0f 0%, #050809 100%)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '2.5rem',
                    boxShadow: '0 40px 120px -20px rgba(0,0,0,0.95), 0 0 80px -30px rgba(16,185,129,0.18)',
                }}
            >
                {/* Top glow bar */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.7), transparent)', filter: 'blur(1px)' }} />

                {/* Scan beam */}
                <div className="absolute inset-x-0 top-0 h-24 overflow-hidden pointer-events-none opacity-20">
                    <div className="scan-beam w-full h-10 bg-gradient-to-b from-transparent via-emerald-400/40 to-transparent" />
                </div>

                {/* HUD corner brackets */}
                <div className="absolute top-5 left-5 w-6 h-6 border-t-2 border-l-2 border-emerald-500/35 rounded-tl-xl pointer-events-none" />
                <div className="absolute top-5 right-5 w-6 h-6 border-t-2 border-r-2 border-emerald-500/35 rounded-tr-xl pointer-events-none" />
                <div className="absolute bottom-5 left-5 w-6 h-6 border-b-2 border-l-2 border-emerald-500/15 rounded-bl-xl pointer-events-none" />
                <div className="absolute bottom-5 right-5 w-6 h-6 border-b-2 border-r-2 border-emerald-500/15 rounded-br-xl pointer-events-none" />

                <div className="px-10 pt-12 pb-10">

                    {/* ── LOGO ── */}
                    <div className="flex justify-center mb-9">
                        <div className="relative">
                            <div className="pulse-ring absolute inset-0 rounded-2xl bg-emerald-500/15 scale-125" />
                            <div className="pulse-ring absolute inset-0 rounded-2xl bg-emerald-500/08 scale-150" style={{ animationDelay: '0.7s' }} />
                            <div className="relative w-[70px] h-[70px] rounded-2xl flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(135deg, #0d201a 0%, #050c09 100%)',
                                    border: '1px solid rgba(16,185,129,0.25)',
                                    boxShadow: '0 0 40px rgba(16,185,129,0.12), inset 0 1px 0 rgba(16,185,129,0.1)',
                                }}
                            >
                                <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#10b981" opacity="0.9" />
                                    <path d="M2 17l10 5 10-5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
                                    <path d="M2 12l10 5 10-5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* ── HEADER ── */}
                    <div className="text-center mb-9">
                        <h2 className="text-[2.1rem] font-black text-white tracking-tighter mb-1 leading-none">
                            Planne<span style={{ color: '#10b981' }}>X</span>
                        </h2>
                        <div className="flex items-center justify-center gap-3 mt-2">
                            <div className="flex-1 h-px max-w-[55px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08))' }} />
                            <div className="flex items-center gap-1.5">
                                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] whitespace-nowrap" style={{ color: '#475569' }}>Accès Sécurisé</p>
                            </div>
                            <div className="flex-1 h-px max-w-[55px]" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.08), transparent)' }} />
                        </div>
                    </div>

                    {/* ── FORM ── */}
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Username */}
                        <div className="relative">
                            <label className={`absolute -top-px left-4 px-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 z-10 ${focusedField === 'username' || username ? 'opacity-100' : 'opacity-0'}`}
                                style={{ color: '#10b981', background: 'linear-gradient(180deg, #070b0f 60%, transparent)' }}>
                                Identifiant
                            </label>
                            <div className={`absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none ${focusedField === 'username' ? 'opacity-100' : 'opacity-0'}`}
                                style={{ background: 'rgba(16,185,129,0.04)', boxShadow: '0 0 20px rgba(16,185,129,0.08)' }} />
                            <div className={`absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300`}
                                style={{ color: focusedField === 'username' ? '#10b981' : '#334155' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onFocus={() => setFocusedField('username')}
                                onBlur={() => setFocusedField(null)}
                                className="w-full rounded-2xl py-4 pl-11 pr-4 text-white text-sm placeholder-slate-700 focus:outline-none transition-all duration-300 font-medium"
                                style={{
                                    background: focusedField === 'username' ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
                                    border: `1px solid ${focusedField === 'username' ? 'rgba(16,185,129,0.45)' : 'rgba(255,255,255,0.07)'}`,
                                }}
                                placeholder="Nom d'utilisateur"
                                required
                                autoComplete="username"
                            />
                        </div>

                        {/* Password */}
                        <div className="relative">
                            <label className={`absolute -top-px left-4 px-2 text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 z-10 ${focusedField === 'password' || password ? 'opacity-100' : 'opacity-0'}`}
                                style={{ color: '#10b981', background: 'linear-gradient(180deg, #070b0f 60%, transparent)' }}>
                                Mot de passe
                            </label>
                            <div className={`absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none ${focusedField === 'password' ? 'opacity-100' : 'opacity-0'}`}
                                style={{ background: 'rgba(16,185,129,0.04)', boxShadow: '0 0 20px rgba(16,185,129,0.08)' }} />
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors duration-300"
                                style={{ color: focusedField === 'password' ? '#10b981' : '#334155' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                                className="w-full rounded-2xl py-4 pl-11 pr-12 text-white text-sm placeholder-slate-700 focus:outline-none transition-all duration-300 font-medium"
                                style={{
                                    background: focusedField === 'password' ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
                                    border: `1px solid ${focusedField === 'password' ? 'rgba(16,185,129,0.45)' : 'rgba(255,255,255,0.07)'}`,
                                }}
                                placeholder="Clé d'accès"
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center transition-colors"
                                style={{ color: focusedField === 'password' ? '#64748b' : '#1e293b' }}
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="shake-anim flex items-center gap-3 px-4 py-3 rounded-2xl"
                                style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <span className="text-red-400 text-[11px] font-bold tracking-widest uppercase">{error}</span>
                            </div>
                        )}

                        {/* ── PRIMARY BUTTON — Sign In ── */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="relative w-full group overflow-hidden rounded-2xl py-4 mt-1 font-black uppercase tracking-[0.2em] text-xs transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                            style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #06b6d4 100%)' }}
                        >
                            {/* Shimmer sweep */}
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                            {/* Glow */}
                            <div className="absolute inset-0 rounded-2xl transition-all duration-300 pointer-events-none"
                                style={{ boxShadow: '0 8px 30px rgba(16,185,129,0.35)' }} />
                            <div className="relative flex items-center justify-center gap-3 text-white">
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>Vérification en cours...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Accéder au Système</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                    </>
                                )}
                            </div>
                        </button>

                    </form>



                </div>
            </div>
        </div>
    );
};
