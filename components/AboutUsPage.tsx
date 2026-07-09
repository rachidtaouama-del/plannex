import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ExternalLink, Code, Database, Smartphone, Globe, Mail } from 'lucide-react';

const GridBackground = () => (
    <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_70%)]"></div>
    </div>
);

const GlassCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
    <div className={`backdrop-blur-xl bg-slate-900/40 border border-white/10 rounded-3xl p-8 relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-700 ${className}`}>
        <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/5 blur-3xl rounded-full -translate-x-12 -translate-y-12 group-hover:bg-emerald-500/10 transition-colors"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full translate-x-16 translate-y-16 group-hover:bg-blue-500/10 transition-colors"></div>
        <div className="relative z-10">{children}</div>
    </div>
);

const ProjectCard: React.FC<{ title: string; type: string; desc: string; link: string; icon: React.ReactNode; color: string }> = ({ title, type, desc, link, icon, color }) => (
    <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block rounded-2xl overflow-hidden bg-slate-900/60 border border-white/5 hover:border-emerald-500/30 transition-all duration-500 hover:-translate-y-2 p-6"
    >
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity`}>
            {icon}
        </div>
        <div className="flex items-start gap-4 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border border-${color}-500/20 bg-${color}-500/5 text-${color}-400 group-hover:scale-110 transition-transform duration-500`}>
                {icon}
            </div>
            <div>
                <h4 className="text-white font-bold text-lg group-hover:text-emerald-400 transition-colors">{title}</h4>
                <p className={`text-[10px] font-mono tracking-widest text-${color}-500 uppercase font-bold`}>{type}</p>
            </div>
        </div>
        <p className="text-slate-400 text-sm leading-relaxed mb-4">{desc}</p>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 group-hover:text-emerald-400 transition-colors">
            <span>VISIT PLATFORM</span>
            <ExternalLink size={12} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </div>
    </a>
);

export const AboutUsPage: React.FC = () => {
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll);

        audioRef.current = new Audio('https://media.rachidtaouama.com/wp-content/uploads/2026/01/rash.mp3');
        audioRef.current.loop = true;
        audioRef.current.volume = 0.4;

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const toggleMusic = () => {
        if (!audioRef.current) return;
        if (isMusicPlaying) audioRef.current.pause();
        else audioRef.current.play().catch(e => console.log("Audio error:", e));
        setIsMusicPlaying(!isMusicPlaying);
    };

    return (
        <div className="min-h-screen bg-[#020202] text-slate-200 relative overflow-hidden font-sans">
            <GridBackground />

            {/* Cinematic Hero Section */}
            <div className="relative z-10 pt-40 pb-20 px-6 lg:px-12 2xl:px-24 w-full mx-auto flex flex-col items-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono tracking-[0.3em] uppercase mb-8 animate-fade-in">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>
                    Founder & Visionaries
                </div>

                <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter text-center uppercase leading-none mb-6">
                    L'EXPERT DERRIÈRE <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 animate-gradient-x underline decoration-emerald-500/20 underline-offset-8">L'INNOVATION</span>
                </h1>

                <p className="text-slate-400 text-center max-w-2xl text-lg leading-relaxed animate-fade-in-up">
                    Fusionner l'expertise métier de terrain avec la puissance du développement moderne pour redéfinir l'ordonnancement industriel.
                </p>
            </div>

            {/* Profile Section with 3D-like Effect */}
            <section className="relative z-10 py-20 px-6 lg:px-12 2xl:px-24 w-full mx-auto">
                <div className="grid lg:grid-cols-12 gap-16 items-center">

                    {/* Visual Side */}
                    <div className="lg:col-span-5 relative group">
                        <div className="absolute inset-0 bg-emerald-500/20 blur-[120px] rounded-full scale-75 group-hover:scale-100 transition-transform duration-1000"></div>

                        {/* Audio Interactive Container */}
                        <div className="relative aspect-square md:aspect-[4/5] rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl group cursor-none" onClick={toggleMusic}>
                            <img
                                src="https://media.rachidtaouama.com/wp-content/uploads/2026/02/ChatGPT-Image-Feb-15-2026-12_53_40-PM-1.png"
                                alt="Rachid Taouama"
                                className={`w-full h-full object-cover transition-all duration-1000 ease-out group-hover:scale-105 ${isMusicPlaying ? 'brightness-125' : 'grayscale-[20%] group-hover:grayscale-0 contrast-125'}`}
                            />

                            {/* Animated Scanner Overaly */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-transparent opacity-60 group-hover:opacity-30 transition-opacity"></div>

                            <div className="absolute bottom-8 left-8 right-8 z-20">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-[0_0_30px_#10b981] group-hover:scale-110 transition-all active:scale-95">
                                        {isMusicPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} className="ml-1" fill="currentColor" />}
                                    </div>
                                    <div>
                                        <p className="text-white font-black text-xs uppercase tracking-widest mb-1">Interactive Sync</p>
                                        <div className="flex gap-1 h-3 items-end">
                                            {[...Array(6)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-1 bg-emerald-500/60 rounded-full transition-all duration-300 ${isMusicPlaying ? 'animate-audio-bar' : 'h-1'}`}
                                                    style={{ animationDelay: `${i * 0.15}s` }}
                                                ></div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Corner HUD Brackets */}
                            <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-emerald-500/40 rounded-tl-lg"></div>
                            <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-emerald-500/40 rounded-br-lg"></div>
                        </div>

                        {/* Floating Signature/Title */}
                        <div className="absolute -bottom-6 -right-6 px-8 py-4 bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl z-20 hidden md:block group-hover:-translate-y-2 transition-transform">
                            <h4 className="text-white font-black text-sm tracking-widest uppercase">Rachid Taouama</h4>
                            <p className="text-emerald-500 font-mono text-[10px] font-black uppercase">Project Architect & Founder</p>
                        </div>
                    </div>

                    {/* Content Side */}
                    <div className="lg:col-span-7">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="h-px w-12 bg-emerald-500/50"></span>
                            <span className="text-emerald-500 font-mono text-[10px] font-black tracking-[0.4em] uppercase">Biography</span>
                        </div>

                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight mb-8">
                            DU TERRAIN À LA <span className="italic text-emerald-400 underline decoration-emerald-500/20">TRANSFORMATION</span> DIGITALE
                        </h2>

                        <div className="space-y-6 text-slate-400 text-lg leading-relaxed">
                            <p className="relative">
                                <span className="absolute -left-10 top-0 text-7xl font-serif text-emerald-500/10 leading-none">"</span>
                                Fort d'une expérience significative en tant que planificateur dans des environnements industriels critiques, j'ai été confronté aux limites des outils traditionnels. La frustration née de rapports incohérents et du manque de visibilité stratégique n'était plus acceptable.
                            </p>
                            <p>
                                J'ai vu des décisions capitales retardées par des données confuses et des équipes de terrain désorientées. <strong className="text-white">PlanneX est la réponse directe à ces échecs</strong> — une plateforme conçue par un expert de terrain pour les experts de terrain.
                            </p>

                            <blockquote className="bg-emerald-500/5 border-l-4 border-emerald-500 p-8 rounded-tr-3xl rounded-br-3xl my-10 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(16,185,129,0.05),transparent)]"></div>
                                <p className="text-white text-xl md:text-2xl font-bold font-serif italic mb-2 relative z-10">
                                    "PlanneX n'est pas juste un logiciel. C'est l'outil que j'aurais rêvé d'avoir : traduire la complexité brute en clarté stratégique absolue."
                                </p>
                            </blockquote>

                            <p>
                                En fusionnant ingénierie de planification et développement Full-Stack, j'ai bâti un écosystème qui ne se contente pas de gérer des tâches, mais qui <strong className="text-emerald-400">pilote la performance réelle</strong>.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Tactical Ecosystem Section */}
            <section className="relative z-10 py-32 px-6 lg:px-12 2xl:px-24 w-full mx-auto">
                <div className="text-center mb-20">
                    <h3 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase mb-6">L'ÉCOSYSTÈME <span className="text-emerald-500">RACHID</span></h3>
                    <div className="h-1 w-24 bg-emerald-500 mx-auto rounded-full mb-8"></div>
                    <p className="text-slate-500 max-w-2xl mx-auto text-lg">Une suite d'outils industriels conçus pour la précision maximale, de la sécurité à la maintenance préventive.</p>
                </div>

                <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
                    <ProjectCard
                        title="PlanneX Engine"
                        type="Enterprise Platform"
                        desc="Le moteur d'ordonnancement ultime pour les arrêts techniques à haute complexité et les grands projets industriels."
                        link="#"
                        icon={<Database strokeWidth={1.5} />}
                        color="emerald"
                    />
                    <ProjectCard
                        title="AI Predictor"
                        type="ML Analytics"
                        desc="Moteur d'analyse prédictive utilisant le machine learning pour anticiper les dérives de planning avant qu'elles ne surviennent."
                        link="https://predictor.plannex.ai/"
                        icon={<Code strokeWidth={1.5} />}
                        color="purple"
                    />
                    <ProjectCard
                        title="PlanneX SHIELD"
                        type="Mobile Tactical App"
                        desc="Créez et exportez des rapports d'observation de sécurité critiques en quelques minutes directement du terrain."
                        link="https://shield.plannex.ai/"
                        icon={<Smartphone strokeWidth={1.5} />}
                        color="blue"
                    />
                    <ProjectCard
                        title="PM Generator"
                        type="Cloud Scheduling Tool"
                        desc="Génération automatisée de plannings de maintenance préventive avec exportations PDF/Excel prêtes à l'emploi."
                        link="https://pm.rachidtaouama.com/"
                        icon={<Globe strokeWidth={1.5} />}
                        color="amber"
                    />
                </div>
            </section>





            {/* CSS ANIMATIONS */}
            <style>{`
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 6s ease infinite;
                }
                @keyframes audio-bar {
                    0%, 100% { h: 4px; }
                    50% { h: 100%; }
                }
                .animate-audio-bar {
                    animation: audio-bar 0.8s ease-in-out infinite;
                }
                .animate-fade-in {
                    animation: fadeIn 1s ease-out forwards;
                }
                .animate-fade-in-up {
                    animation: fadeInUp 1s ease-out 0.2s forwards;
                    opacity: 0;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default AboutUsPage;
