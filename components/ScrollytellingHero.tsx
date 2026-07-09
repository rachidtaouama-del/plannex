import React, { useEffect, useRef, useState } from 'react';

const angles = [
    {
        line1: "Plan Smarter.",
        line2: "Execute Faster.",
        sub: "The all-in-one workspace designed to eliminate bottlenecks and accelerate your team's output."
    },
    {
        line1: "Built for",
        line2: "What's Next.",
        sub: "Scalable planning infrastructure for teams that refuse to settle for \"good enough.\""
    },
    {
        line1: "Complexity,",
        line2: "Simplified.",
        sub: "Turn chaotic workflows into streamlined roadmaps with Plannex’s intuitive project engine."
    },
    {
        line1: "From Vision",
        line2: "to Velocity.",
        sub: "Stop managing tasks and start hitting milestones. Experience the new standard in strategic execution."
    }
];

const ScrollytellingHero: React.FC<{ onEnterApp: () => void; setPage: (page: any) => void }> = ({ onEnterApp, setPage }) => {
    const heroRef = useRef<HTMLDivElement>(null);
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            if (!heroRef.current) return;
            const scrolled = window.scrollY;
            const val = Math.max(0, 1 - (scrolled / 500));
            const yPos = -(scrolled * 0.1);
            heroRef.current.style.setProperty('--hero-opacity', `${val}`);
            heroRef.current.style.setProperty('--hero-parallax', `${yPos}px`);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Slider Interval
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % angles.length);
        }, 5500);
        return () => clearInterval(timer);
    }, []);

    return (
        <section
            id="hero"
            className="relative w-full min-h-[100vh] overflow-hidden flex flex-col items-center justify-center pt-24 pb-32"
            ref={heroRef}
        >
            <style>{`
                .hero-bg {
                    transform: translateY(var(--hero-parallax, 0));
                    transition: transform 0.1s ease-out;
                }
                
                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float {
                    animation: float 5s ease-in-out infinite;
                }

                /* Ultra Premium Mask Reveal Animation (Fortescue-style) */
                @keyframes maskRevealUp {
                    0% { transform: translateY(120%); opacity: 0; }
                    15% { opacity: 1; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                
                .mask-hidden {
                    transform: translateY(120%);
                    opacity: 0;
                }

                .animate-mask-up {
                    animation: maskRevealUp 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                
                /* Ensure crisp text rendering for transforms */
                .crisp-text {
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                    transform: translateZ(0);
                    will-change: transform, opacity;
                }
            `}</style>

            {/* Cinematic Background */}
            <div className="absolute inset-0 z-0">
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="hero-bg w-full h-[110%] object-cover opacity-60 grayscale-[0.2]"
                >
                    <source src="https://media.rachidtaouama.com/wp-content/uploads/2026/03/PlanneX-hero-section.mp4" type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black transition-opacity duration-1000"></div>
                {/* Tactical Grid Overlay */}
                <div className="absolute inset-0 opacity-10 pointer-events-none bg-[linear-gradient(rgba(16,185,129,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            </div>

            <div
                className="relative z-10 w-full px-6 md:px-12 2xl:px-24 flex flex-col items-center justify-center mx-auto"
                style={{ opacity: 'var(--hero-opacity, 1)' }}
            >
                {/* Intro Tagline (Static, animates once) */}
                <div className="overflow-hidden mb-8 md:mb-12">
                    <div className="mask-hidden animate-mask-up crisp-text" style={{ animationDelay: '200ms' }}>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-[0.25em] animate-float">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-[pulse_2s_infinite]"></span>
                            Industrial Planning Engine 2.0
                        </div>
                    </div>
                </div>

                {/* Rotating Titles Container */}
                <div className="relative w-full h-[280px] sm:h-[350px] md:h-[450px] lg:h-[500px]">
                    {angles.map((angle, idx) => {
                        const isActive = currentSlide === idx;

                        return (
                            <div
                                key={idx}
                                className={`absolute inset-0 flex flex-col items-center justify-start text-center transition-opacity duration-[1200ms] ${isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}
                            >
                                {/* Heading Lines */}
                                <div className="flex flex-col items-center w-full">
                                    <div className="overflow-hidden w-full pb-2">
                                        <h1 className={`text-[4rem] sm:text-[5.5rem] md:text-[8rem] lg:text-[9rem] xl:text-[10rem] font-black text-white leading-[0.9] tracking-tighter crisp-text ${isActive ? 'mask-hidden animate-mask-up' : ''}`} style={{ animationDelay: '100ms' }}>
                                            {angle.line1}
                                        </h1>
                                    </div>
                                    <div className="overflow-visible w-full px-4 mt-2 sm:mt-4 pb-8">
                                        <div className="overflow-hidden w-full pb-6">
                                            <h1 className={`text-[3.2rem] sm:text-[4.5rem] md:text-[6.5rem] lg:text-[7.5rem] xl:text-[8rem] font-black leading-[0.9] tracking-tighter crisp-text ${isActive ? 'mask-hidden animate-mask-up' : ''}`} style={{ animationDelay: '300ms' }}>
                                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                                                    {angle.line2}
                                                </span>
                                            </h1>
                                        </div>
                                    </div>
                                </div>

                                {/* Subtext */}
                                <div className="overflow-hidden mt-2 sm:mt-6 max-w-4xl px-4">
                                    <p className={`text-lg sm:text-2xl md:text-3xl text-slate-400 leading-[1.3] md:leading-relaxed font-medium crisp-text ${isActive ? 'mask-hidden animate-mask-up' : ''}`} style={{ animationDelay: '600ms' }}>
                                        {angle.sub}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>                {/* Buttons (Static, animates once) */}
                <div className="overflow-hidden mt-6 md:-mt-8 z-20">
                    <div className="mask-hidden animate-mask-up flex flex-col sm:flex-row items-center justify-center gap-6 crisp-text" style={{ animationDelay: '900ms' }}>
                        <button
                            onClick={onEnterApp}
                            className="group relative px-10 py-5 bg-emerald-600 text-white rounded-full font-bold text-lg overflow-hidden transition-all duration-500 hover:scale-[1.03] active:scale-[0.97] shadow-[0_0_40px_-5px_rgba(16,185,129,0.6)] hover:shadow-[0_0_60px_-10px_rgba(16,185,129,0.8)]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-white/20 to-emerald-400/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                            <span className="relative z-10 tracking-[0.2em] uppercase">INITIATE MISSION</span>
                        </button>

                        <button
                            onClick={() => document.getElementById('comparison')?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-10 py-5 bg-white/5 hover:bg-white/10 text-white rounded-full font-bold text-lg border border-white/10 transition-all duration-300 backdrop-blur-sm hover:border-white/20 tracking-[0.2em] uppercase"
                        >
                            LEARN MORE
                        </button>
                    </div>
                </div>

            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30 select-none animate-bounce">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white">Scroll to Scan</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M7 13l5 5 5-5M7 6l5 5 5-5" /></svg>
            </div>
        </section>
    );
};

export default ScrollytellingHero;

