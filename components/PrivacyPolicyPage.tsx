import React from 'react';
import { Shield, Lock, Eye, Server, RefreshCw, UserCheck, FileText, ChevronRight, Scale, Check, Cpu } from 'lucide-react';

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

const PolicySection = ({ title, children, icon: Icon }: { title: string, children: React.ReactNode, icon?: any }) => (
    <section className="group relative p-8 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 hover:border-emerald-500/20 transition-all duration-500 overflow-hidden">
        <div className="absolute -inset-1 bg-emerald-500/5 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative z-10">
            {Icon && <SectionIcon icon={Icon} />}
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

export const PrivacyPolicyPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#020202] relative overflow-hidden font-sans selection:bg-emerald-500/30 pb-32">
            <GridBg />
            <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            <main className="relative z-10 pt-32 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-24">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono tracking-[0.3em] uppercase mb-8">
                            <Lock className="w-3 h-3" />
                            Data Governance Protocol
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 uppercase leading-none">
                            Privacy <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Policy</span>
                        </h1>
                        <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-mono text-slate-500 uppercase tracking-widest pt-4">
                            <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md">Version 1.2</span>
                            <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md">Effective: March 25, 2026</span>
                            <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md">Updated: March 25, 2026</span>
                        </div>
                    </div>

                    <div className="space-y-12">
                        <div className="p-8 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 relative overflow-hidden">
                            <Shield className="absolute -bottom-4 -right-4 w-32 h-32 text-emerald-500/5 rotate-12" />
                            <p className="text-lg text-slate-200 leading-relaxed font-semibold italic">
                                "In a high-criticality industrial environment, data integrity and confidentiality are not options — they are operational imperatives."
                            </p>
                        </div>

                        <PolicySection title="1. Introduction and Scope" icon={FileText}>
                            <p>
                                Welcome to **PlanneX** ("the Application," "we," or "our"). PlanneX is a specialized project planning and industrial maintenance management platform, designed to optimize operational efficiency through AI-powered task classification, automated report generation, and document analysis.
                            </p>
                            <p>
                                This Privacy Policy constitutes the definitive statement regarding our practices for collecting, using, storing, and protecting data. We recognize that in an industrial context — specifically within sectors involving heavy machinery and large-scale project management (such as environments encountered by JESA Group) — data security is paramount.
                            </p>
                        </PolicySection>

                        <PolicySection title="2. Controller and Processor Roles" icon={RefreshCw}>
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <strong className="text-emerald-400 block mb-1">PlanneX as Processor:</strong>
                                    When you upload enterprise data (e.g., SAP extracts, maintenance logs, technical manuals), PlanneX acts as a Data Processor. Ownership of this data remains with you or your employer.
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <strong className="text-emerald-400 block mb-1">PlanneX as Controller:</strong>
                                    We act as Data Controller for basic account information (name, email, credentials) necessary for maintaining the service and technical support.
                                </div>
                            </div>
                        </PolicySection>

                        <PolicySection title="3. Categories of Data Collected" icon={Eye}>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                        <ChevronRight className="w-4 h-4 text-emerald-500" /> User Profile
                                    </h4>
                                    <ul className="text-sm list-disc list-inside space-y-2 pl-2">
                                        <li>Full name, professional email</li>
                                        <li>Job title (e.g., Planner, Shutdown Manager)</li>
                                        <li>Encrypted authentication data (Supabase/PostgreSQL)</li>
                                    </ul>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                        <ChevronRight className="w-4 h-4 text-emerald-500" /> Industrial Data
                                    </h4>
                                    <ul className="text-sm list-disc list-inside space-y-2 pl-2">
                                        <li>Maintenance metadata (equipment IDs, priorities)</li>
                                        <li>ERP system exports (SAP, CMMS)</li>
                                        <li>Technical documentation (PDF, Excel, Diagrams)</li>
                                    </ul>
                                </div>
                            </div>
                        </PolicySection>

                        <PolicySection title="4. Processing Mechanisms" icon={Cpu}>
                            <p>
                                PlanneX uses advanced computational methods to transform raw data into actionable insights.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                    <p><strong className="text-slate-200">Artificial Intelligence:</strong> Using LLMs and Vision models to extract operating procedures and classify tasks.</p>
                                </li>
                                <li className="flex gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                    <p><strong className="text-slate-200">Automated Reporting:</strong> Generating Excel files for SAP re-upload and PDF/PowerPoint presentations for executive committees.</p>
                                </li>
                            </ul>
                        </PolicySection>

                        <PolicySection title="6. Storage and Infrastructure Security" icon={Server}>
                            <div className="grid sm:grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 text-center">
                                    <div className="text-emerald-400 font-bold mb-1">TLS 1.3</div>
                                    <div className="text-[10px] uppercase font-mono text-slate-500 tracking-tighter">In Transit</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 text-center">
                                    <div className="text-emerald-400 font-bold mb-1">AES-256</div>
                                    <div className="text-[10px] uppercase font-mono text-slate-500 tracking-tighter">At Rest</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 text-center">
                                    <div className="text-emerald-400 font-bold mb-1">RBAC</div>
                                    <div className="text-[10px] uppercase font-mono text-slate-500 tracking-tighter">Role-Based Access</div>
                                </div>
                            </div>
                            <p className="mt-6 text-sm">
                                Your data is hosted on high-availability cloud servers (using Supabase and PostgreSQL) with automated daily backups to ensure the continuity of your operations.
                            </p>
                        </PolicySection>

                        <PolicySection title="10. User Rights" icon={UserCheck}>
                            <div className="grid md:grid-cols-2 gap-4">
                                {[
                                    { t: "Right of Access", d: "Request a complete summary of your data." },
                                    { t: "Right of Rectification", d: "Correct any inaccurate project data." },
                                    { t: "Portability", d: "Export your schedules in Excel, PDF, or JSON." },
                                    { t: "Right to Erasure", d: "Permanent deletion of your data upon request." }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-white/5">
                                        <Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                                        <div>
                                            <div className="text-white font-bold text-xs uppercase tracking-wider mb-1">{item.t}</div>
                                            <div className="text-[11px] text-slate-500">{item.d}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </PolicySection>

                        <PolicySection title="15. Contact and Complaints" icon={Scale}>
                            <p>
                                For any questions regarding data protection or to exercise your rights, please contact our Data Privacy Officer:
                            </p>
                            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 mt-6">
                                <p className="text-white font-black uppercase tracking-widest text-sm mb-2">PlanneX Technical Team</p>
                                <p className="text-emerald-400 font-mono text-xs mb-4">support@planex.ai</p>
                                <p className="text-slate-500 text-[11px] uppercase tracking-widest">Attention: Data Privacy Office</p>
                            </div>
                        </PolicySection>
                    </div>
                </div>
            </main>
        </div>
    );
};
