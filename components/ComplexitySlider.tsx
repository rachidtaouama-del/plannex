import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Shield, Cpu, Activity, Database, Layers, Sparkles } from 'lucide-react';

const mockRawData = [
    { tsk_id: 1001, action: "Inspecter et nettoyer la pompe", durn_h: 8, eq_name: "Pompe P-101A", res_code: "MEC-01", pred_str: "", is_crit: false },
    { tsk_id: 1002, action: "Réaligner l'accouplement", durn_h: 12, eq_name: "Compresseur C-205", res_code: "MEC-02", pred_str: "1001", is_crit: false },
    { tsk_id: 1003, action: "Calibrer le transmetteur de pression", durn_h: 4, eq_name: "Vanne V-302", res_code: "INST-01", pred_str: "", is_crit: false },
    { tsk_id: 1004, action: "Nettoyer les tubes", durn_h: 16, eq_name: "Échangeur E-410", res_code: "CHAUD-01", pred_str: "1002", is_crit: false },
    { tsk_id: 1005, action: "Remplacer le joint", durn_h: 8, eq_name: "Tuyauterie T-15", res_code: "MEC-01", pred_str: "1003", is_crit: false },
    { tsk_id: 1006, action: "Changer le catalyseur", durn_h: 24, eq_name: "Réacteur R-501", res_code: "MEC-03", pred_str: "1004", is_crit: true },
    { tsk_id: 1007, action: "Vérifier les connexions", durn_h: 6, eq_name: "Analyseur A-600", res_code: "INST-02", pred_str: "1004", is_crit: false },
    { tsk_id: 1008, action: "Tester les soupapes de sécurité", durn_h: 10, eq_name: "Ballon V-102", res_code: "MEC-01", pred_str: "1006", is_crit: false },
];

const teamMap: Record<string, string> = {
    "MEC-01": "Mécanique Équipe 1",
    "MEC-02": "Mécanique Équipe 2",
    "MEC-03": "Mécanique Équipe 3",
    "INST-01": "Instrumentation Équipe 1",
    "INST-02": "Instrumentation Équipe 2",
    "CHAUD-01": "Chaudronnerie",
};

const ComplexitySlider: React.FC = () => {
    const [revealX, setRevealX] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        setRevealX(Math.min(Math.max(x, 0), 100));

        // Update custom cursor variables
        containerRef.current.style.setProperty('--mouseX', `${e.clientX - rect.left}px`);
        containerRef.current.style.setProperty('--mouseY', `${e.clientY - rect.top}px`);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
        setRevealX(Math.min(Math.max(x, 0), 100));
    };

    return (
        <section className="py-32 px-4 bg-black overflow-hidden relative">
            <style>{`
                @keyframes scanline {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100vh); }
                }
                @keyframes flicker {
                    0%, 19.999%, 22%, 62.999%, 64%, 64.999%, 70%, 100% { opacity: 0.99; filter: contrast(110%) brightness(110%); }
                    20%, 21.999%, 63%, 63.999%, 65%, 69.999% { opacity: 0.4; filter: contrast(130%) brightness(150%); }
                }
                @keyframes marquee {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-50%); }
                }
                .scanline {
                    height: 8px;
                    background: linear-gradient(to bottom, transparent, rgba(16, 185, 129, 0.1), transparent);
                    animation: scanline 4s linear infinite;
                    pointer-events: none;
                }
                .glitch-terminal {
                    animation: flicker 4s infinite;
                }
                .marquee-data {
                    animation: marquee 40s linear infinite;
                }
                .glass-premium {
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(24px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    box-shadow: 
                        inset 0 0 40px rgba(16, 185, 129, 0.05),
                        0 20px 40px -15px rgba(0,0,0,0.5);
                }
                .glass-premium:hover {
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    transform: translateY(-5px);
                }
                .hud-corners::before {
                    content: '';
                    position: absolute;
                    top: -1px; left: -1px; width: 20px; height: 20px;
                    border-top: 2px solid #10b981; border-left: 2px solid #10b981;
                }
                .hud-corners::after {
                    content: '';
                    position: absolute;
                    bottom: -1px; right: -1px; width: 20px; height: 20px;
                    border-bottom: 2px solid #10b981; border-right: 2px solid #10b981;
                }
            `}</style>

            <div className="max-w-[1400px] mx-auto">
                <div className="text-center mb-20 scroll-reveal">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                        <Sparkles className="w-3 h-3" />
                        Data Synthesis Engine
                    </div>
                    <h2 className="text-5xl md:text-8xl font-black text-white tracking-tighter uppercase leading-[0.85] mb-6">
                        From Raw Chaos <br />
                        To <span className="text-emerald-400">Total Clarity.</span>
                    </h2>
                    <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-3xl mx-auto">
                        Scan the noise. Transform machine-level complexity into actionable radiation-hardened mission plans instantly.
                    </p>
                </div>

                <div
                    ref={containerRef}
                    onMouseMove={handleMouseMove}
                    onTouchMove={handleTouchMove}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className="relative w-full h-[700px] rounded-3xl border border-white/5 bg-[#020202] overflow-hidden cursor-none shadow-[0_0_100px_-20px_rgba(16,185,129,0.15)] group"
                >
                    {/* Zone Badges */}
                    <div className="absolute top-8 left-8 z-40 px-4 py-2 rounded-lg bg-red-600/10 border border-red-500/30 backdrop-blur-md transition-opacity duration-300 pointer-events-none">
                        <div className="flex items-center gap-3">
                            <Database className="w-4 h-4 text-red-500 animate-pulse" />
                            <span className="text-red-500 text-[10px] font-black uppercase tracking-[0.2em]">Entropy Environment</span>
                        </div>
                    </div>
                    <div className="absolute top-8 right-8 z-40 px-4 py-2 rounded-lg bg-emerald-600/10 border border-emerald-500/30 backdrop-blur-md transition-opacity duration-300 pointer-events-none">
                        <div className="flex items-center gap-3">
                            <Shield className="w-4 h-4 text-emerald-500 animate-pulse" />
                            <span className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">PlanneX Clarity Node</span>
                        </div>
                    </div>

                    {/* Left side: Terminal Chaos */}
                    <div className="absolute inset-0 p-12 pt-24 font-mono select-none overflow-hidden opacity-40 glitch-terminal z-0">
                        <div className="marquee-data space-y-2">
                            {Array.from({ length: 40 }).map((_, i) => (
                                <div key={i} className="flex gap-6 text-[10px] whitespace-nowrap text-emerald-500/20">
                                    <span className="text-emerald-500/40 font-bold">[{Math.random().toString(16).substr(2, 6).toUpperCase()}]</span>
                                    <span>SYSTEM_INTERNALS_V12.INF // FETCHING SECTOR_OFFSET_{i * 8}</span>
                                    <span className="hidden sm:inline">BUFFER_ALLOCATION: {Math.random().toFixed(4)}ms</span>
                                    <span className="hidden lg:inline text-emerald-800">TRX_REF_{Math.floor(Math.random() * 99999)}</span>
                                    <span className="animate-pulse opacity-50">_</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right side: High-Fidelity Reveal */}
                    <div
                        className="absolute inset-0 z-20 pointer-events-none transition-all duration-75"
                        style={{ clipPath: `inset(0 0 0 ${revealX}%)` }}
                    >
                        {/* Revealed BG: Holographic Grid */}
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-slate-950">
                            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:30px_30px]"></div>
                            <div className="absolute inset-0 bg-radial-gradient(circle at 100% 100%, rgba(16,185,129,0.1) 0%, transparent 50%)"></div>
                        </div>

                        {/* High-Fidelity Cards */}
                        <div className="absolute inset-0 p-10 pt-28 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 overflow-y-auto no-scrollbar">
                            {mockRawData.map((task, idx) => (
                                <div
                                    key={task.tsk_id}
                                    className="glass-premium p-6 rounded-2xl flex flex-col h-full relative transition-all duration-500 group/card scroll-reveal"
                                    style={{ transitionDelay: `${idx * 0.05}s` }}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                                            <Layers className="w-4 h-4" />
                                        </div>
                                        {task.is_crit && (
                                            <div className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-[8px] font-black text-red-500 uppercase tracking-widest">
                                                Critical
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="text-white font-bold text-[13px] leading-tight mb-2 group-hover/card:text-emerald-400 transition-colors uppercase tracking-tight">{task.action}</h4>
                                    <p className="text-slate-500 text-[9px] font-mono font-bold uppercase tracking-widest">{task.eq_name}</p>

                                    <div className="mt-8 pt-5 border-t border-white/5 flex justify-between items-end">
                                        <div>
                                            <span className="block text-[8px] text-slate-500 uppercase font-bold tracking-widest mb-1">Resource</span>
                                            <span className="text-[11px] text-white font-bold">{teamMap[task.res_code].split(' ')[0]} {teamMap[task.res_code].split(' ')[2] || ''}</span>
                                        </div>
                                        <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded">
                                            <Activity className="w-3 h-3 text-emerald-500" />
                                            <span className="text-xs text-emerald-400 font-mono font-black">{task.durn_h}h</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tactical Slider Bar */}
                    <div
                        className="absolute top-0 bottom-0 w-px bg-emerald-500/40 z-30 pointer-events-none"
                        style={{ left: `${revealX}%` }}
                    >
                        <div className="absolute inset-y-0 -left-[1px] w-[2px] bg-gradient-to-b from-transparent via-emerald-500 to-transparent shadow-[0_0_20px_rgba(16,185,129,0.5)]"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 pointer-events-auto cursor-none flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.6)] border border-white/20 relative animate-pulse">
                                <div className="absolute -inset-2 bg-emerald-500/20 rounded-full animate-ping"></div>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 8 4 4-4 4M6 8l-4 4 4 4" /></svg>
                            </div>
                        </div>
                        {/* HUD vertical indicators */}
                        <div className="absolute top-0 bottom-0 w-8 -left-4 flex flex-col justify-between py-12 pointer-events-none opacity-20">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="w-2 h-[1px] bg-emerald-400 self-center"></div>
                            ))}
                        </div>
                    </div>

                    {/* Custom Mouse Cursor / Scanner */}
                    {isHovered && (
                        <div
                            className="absolute z-[100] w-24 h-24 rounded-full border border-emerald-500/30 pointer-events-none mix-blend-screen flex items-center justify-center bg-emerald-500/5 backdrop-blur-[2px]"
                            style={{
                                left: `var(--mouseX)`,
                                top: `var(--mouseY)`,
                                transform: `translate(-50%, -50%)`
                            }}
                        >
                            <div className="w-1 h-32 bg-emerald-500/20 absolute rotate-45"></div>
                            <div className="w-1 h-32 bg-emerald-500/20 absolute -rotate-45"></div>
                            <div className="text-[8px] font-mono text-emerald-400 absolute -bottom-8 whitespace-nowrap opacity-50">SCANNING_SPECTRUM...</div>
                        </div>
                    )}
                </div>

                {/* Meta data footer */}
                <div className="mt-8 flex justify-between items-center text-[10px] font-mono text-slate-600 uppercase tracking-[0.3em]">
                    <span>Analysis Complete // Indexing Succeeded</span>
                    <div className="flex gap-8">
                        <span>Mode: Spectral_Clarity</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ComplexitySlider;