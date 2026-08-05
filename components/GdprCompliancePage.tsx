import React from 'react';
import { ShieldAlert, Scale, Fingerprint, Database, Globe, Bell, UserCheck, FileText, Check, ChevronRight, Lock } from 'lucide-react';

const GridBg = () => (
    <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_60%,transparent_100%)]"></div>
    </div>
);

const SectionIcon = ({ icon: Icon, color = "emerald" }: { icon: any, color?: string }) => (
    <div className={`w-12 h-12 rounded-xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center text-${color}-400 mb-6 shadow-xl shadow-${color}-500/5`}>
        <Icon className="w-6 h-6" />
    </div>
);

const GdprSection = ({ title, children, icon: Icon, badge }: { title: string, children: React.ReactNode, icon?: any, badge?: string }) => (
    <section className="group relative p-8 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 hover:border-emerald-500/20 transition-all duration-500 overflow-hidden">
        <div className="absolute -inset-1 bg-emerald-500/5 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
                {Icon && <SectionIcon icon={Icon} />}
                {badge && (
                    <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-mono text-emerald-400 uppercase tracking-widest">
                        {badge}
                    </span>
                )}
            </div>
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                {title}
            </h2>
            <div className="prose prose-invert prose-emerald max-w-none text-slate-400 leading-relaxed font-medium space-y-4">
                {children}
            </div>
        </div>
    </section>
);

export const GdprCompliancePage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#020202] relative overflow-hidden font-sans selection:bg-emerald-500/30 pb-32">
            <GridBg />
            <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            <main className="relative z-10 pt-32 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-24">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono tracking-[0.3em] uppercase mb-8">
                            <ShieldAlert className="w-3 h-3" />
                            European Union Regulatory Standards
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 uppercase leading-none">
                            GDPR <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 leading-tight">Compliance</span>
                        </h1>
                        <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-mono text-slate-500 uppercase tracking-widest pt-4">
                            <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md">Version 1.2</span>
                            <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md text-emerald-400/60 font-black">March 25, 2026</span>
                        </div>
                    </div>

                    <div className="space-y-12">
                        <GdprSection title="1. Compliance Commitment" icon={Fingerprint} badge="EU 2016/679">
                            <p>
                                The **PlanneX** platform is committed to respecting the fundamental principles of Regulation (EU) 2016/679 of the European Parliament and Council of April 27, 2016 (GDPR). We integrate privacy protection by design (**Privacy by Design**) and by default (**Privacy by Default**).
                            </p>
                        </GdprSection>

                        <GdprSection title="2. Legal Bases for Processing" icon={Scale} badge="Article 6">
                            <p>In accordance with Article 6 of the GDPR, **PlanneX** processes data on the following bases:</p>
                            <div className="grid sm:grid-cols-2 gap-4 mt-6">
                                {[
                                    { t: "Contractual Performance", d: "Providing planning and maintenance services." },
                                    { t: "Legitimate Interest", d: "Network security, fraud prevention, and AI algorithm optimization." },
                                    { t: "Legal Obligation", d: "Meeting industrial reporting and safety requirements." },
                                    { t: "Consent", d: "Specific processing such as voice analysis." }
                                ].map((item, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-emerald-500/10">
                                        <div className="text-emerald-400 font-bold text-xs uppercase mb-1">{item.t}</div>
                                        <div className="text-[11px] text-slate-500 leading-relaxed">{item.d}</div>
                                    </div>
                                ))}
                            </div>
                        </GdprSection>

                        <GdprSection title="3. Data Subject Rights" icon={UserCheck}>
                            <div className="space-y-4">
                                {[
                                    { id: "3.1", t: "Right of Access (Art. 15)", d: "Confirmation of processing and obtaining a readable copy." },
                                    { id: "3.2", t: "Right of Rectification (Art. 16)", d: "Immediate correction of inaccurate data concerning your schedules." },
                                    { id: "3.3", t: "Right to Erasure (Art. 17)", d: "Deletion of data when no longer necessary." },
                                    { id: "3.4", t: "Right to Portability (Art. 20)", d: "Export in CSV, JSON, or Excel for transfer to other IS (e.g., SAP)." },
                                    { id: "3.5", t: "Right to Object (Art. 21)", d: "Objection to processing for reasons related to your particular situation." }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4 p-4 rounded-2xl border border-white/5 bg-slate-800/20">
                                        <div className="text-emerald-500 font-mono text-[10px] font-black">{item.id}</div>
                                        <div>
                                            <div className="text-white font-bold text-sm uppercase tracking-wider mb-1">{item.t}</div>
                                            <div className="text-xs text-slate-400">{item.d}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GdprSection>

                        <GdprSection title="4. Data Security and Integrity" icon={Lock} badge="Article 32">
                            <ul className="space-y-4">
                                <li className="flex gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                    <p><strong className="text-slate-200">Pseudonymization:</strong> Identifiers may be pseudonymized during AI model training phases.</p>
                                </li>
                                <li className="flex gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                    <p><strong className="text-slate-200">Encryption:</strong> Systematic use of HTTPS/TLS protocol and SQL database encryption.</p>
                                </li>
                                <li className="flex gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                    <p><strong className="text-slate-200">Monitoring:</strong> Regular audits, penetration testing, and vulnerability analysis across the entire infrastructure.</p>
                                </li>
                            </ul>
                        </GdprSection>

                        <GdprSection title="5. Record of Activities" icon={Database} badge="Article 30">
                            <p>**PlanneX** maintains an internal register detailing:</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-center">
                                {["HR Data", "Technical Data", "Anomaly Analysis", "System Logs"].map((item, i) => (
                                    <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </GdprSection>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="p-8 rounded-3xl bg-slate-900/40 border border-white/5 space-y-4">
                                <Globe className="w-8 h-8 text-cyan-400 mb-4" />
                                <h3 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-2">
                                    <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                                    7. International Transfers
                                </h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    In case of transfer outside the EEA (e.g., server in Morocco or USA), **PlanneX** ensures the signing of **Standard Contractual Clauses (SCCs)** for an equivalent level of protection.
                                </p>
                            </div>
                            <div className="p-8 rounded-3xl bg-slate-900/40 border border-white/5 space-y-4">
                                <Bell className="w-8 h-8 text-amber-500 mb-4" />
                                <h3 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-2">
                                    <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                                    8. Breach Notification
                                </h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Notification to authorities (e.g., CNDP or CNIL) within **72 hours** in case of unauthorized access. Users are immediately informed if the risk is high.
                                </p>
                            </div>
                        </div>

                        <GdprSection title="9. Data Protection Officer (DPO)" icon={ShieldAlert}>
                            <p>Given the importance of the industrial data processed, **PlanneX** has appointed a dedicated data protection officer.</p>
                            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                <div>
                                    <p className="text-white font-black uppercase tracking-widest text-sm mb-1 italic">Subject: Exercise of GDPR rights</p>
                                    <p className="text-emerald-400 font-mono text-xs">dpo@planex.ai</p>
                                </div>
                                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] px-4 py-2 border border-white/5 rounded-lg bg-white/5">
                                    DPO Appointed
                                </div>
                            </div>
                        </GdprSection>
                    </div>
                </div>
            </main>
        </div>
    );
};
