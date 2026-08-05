import React, { useState } from 'react';
import { Shield, Zap, Globe, Cpu, Lock, Server, Mail, User, ChevronDown, ChevronRight, Check, AlertTriangle, Building2, Sparkles, Star } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const Pill: React.FC<{ children: React.ReactNode; color?: 'emerald' | 'blue' | 'amber' | 'red' }> = ({ children, color = 'emerald' }) => {
    const colors = {
        emerald: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
        blue: 'bg-blue-500/10 border-blue-500/25 text-blue-400',
        amber: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
        red: 'bg-red-500/10 border-red-500/25 text-red-400',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-[0.3em] ${colors[color]}`}>
            <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
            {children}
        </span>
    );
};

const FeatureRow: React.FC<{ children: React.ReactNode; accent?: string }> = ({ children, accent = 'emerald' }) => (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0">
        <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-${accent}-500/10 border border-${accent}-500/20`}>
            <Check className={`w-3 h-3 text-${accent}-400`} />
        </div>
        <span className="text-sm text-slate-300 font-medium leading-snug">{children}</span>
    </div>
);

const ContactLink: React.FC<{ href: string; label: string; sub?: string }> = ({ href, label, sub }) => (
    <a href={href}
        className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/25 hover:bg-emerald-500/[0.04] transition-all duration-300">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-all">
            <Mail className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
            <p className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors truncate">{label}</p>
            {sub && <p className="text-[10px] text-slate-600 font-medium uppercase tracking-widest">{sub}</p>}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-emerald-500 ml-auto flex-shrink-0 transition-all group-hover:translate-x-0.5" />
    </a>
);

// ─── FAQ Accordion ────────────────────────────────────────────────────────────

const faqs = [
    {
        q: "How is PlanneX priced?",
        a: "PlanneX uses a 100% customized pricing model. Every company has unique needs in terms of team size, project volume, customization, and internal integrations. We evaluate your operational context and propose an offer tailored to your industrial reality."
    },
    {
        q: "Why doesn't PlanneX integrate with SAP or other ERPs?",
        a: "PlanneX is a sovereign platform with its own proprietary database. We deliberately prevent any third-party integrations (SAP, Oracle, etc.) to guarantee maximum security for your sensitive data, prevent synchronization vulnerabilities, and ensure optimal performance. Your projects remain exclusively on our secure servers."
    },
    {
        q: "Where is our project data hosted?",
        a: "All your industrial data is exclusively hosted on PlanneX servers. No project, no task, no resource passes through third-party cloud services. We control the infrastructure from A to Z to guarantee absolute confidentiality and maximum availability."
    },
    {
        q: "Can PlanneX be customized for our organization?",
        a: "Absolutely. That's our core value proposition. PlanneX is delivered as a fully turnkey solution adapted to your organization: internal nomenclature, validation workflows, business logic, company-branded reports, and much more. No compromises. A tool that speaks your industrial language."
    },
    {
        q: "What is the process to become a client?",
        a: "Contact us via our official email addresses. Our team analyzes your context (shutdown size, disciplines, task volume, number of users), performs an audit of your needs, and submits a detailed commercial proposal with a personalized demonstration on your own environment."
    },
    {
        q: "Is there a trial or pilot period?",
        a: "Yes. Depending on your profile, we offer a structured pilot program on your real data, supported by our technical team, so you can measure PlanneX's value on an actual shutdown before any final commitment."
    },
    {
        q: "Does PlanneX offer commercial partnerships?",
        a: "We are open to strategic partnerships with engineering firms, industrial consultants, or solution integrators. Any partnership request must be addressed directly to our founding team via contact@rachidtaouama.com."
    },
];

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${open ? 'border-emerald-500/20 bg-emerald-500/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
            <button className="w-full flex items-center justify-between p-6 text-left gap-4" onClick={() => setOpen(!open)}>
                <span className={`text-sm font-black tracking-tight transition-colors ${open ? 'text-emerald-300' : 'text-white'}`}>{q}</span>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-emerald-400' : 'text-slate-600'}`} />
            </button>
            {open && (
                <div className="px-6 pb-6 -mt-1">
                    <p className="text-sm text-slate-400 leading-relaxed font-medium">{a}</p>
                </div>
            )}
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const PricingPage: React.FC<{ setPage?: (page: any) => void }> = ({ setPage }) => {
    return (
        <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden">
            {/* ── Background ── */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.018)_1px,transparent_1px)] bg-[size:52px_52px]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[160px]" />
                <div className="absolute bottom-1/4 right-0 w-[600px] h-[500px] bg-indigo-500/[0.03] rounded-full blur-[160px]" />
            </div>

            <div className="relative z-10">
                {/* ── HERO ── */}
                <section className="w-full mx-auto px-6 lg:px-12 2xl:px-24 pt-40 pb-28 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/8 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-[0.4em] mb-10">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Industrial Platform · Custom Pricing
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>

                    <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase leading-[0.85] mb-8">
                        One Single<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 via-emerald-300 to-cyan-400">
                            Solution.
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed mb-6">
                        PlanneX is not a generic SaaS subscription. It is an industrial planning platform deployed <span className="text-white font-black">exclusively within your organization</span>, configured to your processes, and protected on our sovereign servers.
                    </p>
                    <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                        Every contract is unique. Every deployment is custom-built. Every dollar invested generates measurable ROI from the very first shutdown.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
                        <a href="mailto:membership@plannex.ai"
                            className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] text-black overflow-hidden transition-all active:scale-95 shadow-[0_20px_60px_rgba(16,185,129,0.3)]"
                            style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            <Mail className="w-4 h-4 relative z-10" />
                            <span className="relative z-10">Request a Quote</span>
                        </a>
                        <button onClick={() => setPage?.('contact')}
                            className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] text-slate-300 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all active:scale-95">
                            <Building2 className="w-4 h-4" />
                            Talk to an Expert
                        </button>
                    </div>
                </section>

                {/* ── DATA SOVEREIGNTY BANNER ── */}
                <section className="w-full mx-auto px-6 lg:px-12 2xl:px-24 mb-28">
                    <div className="relative rounded-[2rem] overflow-hidden border border-red-500/15 bg-gradient-to-r from-red-950/20 via-[#0a0614]/50 to-red-950/20 p-8 md:p-10">
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center flex-shrink-0 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <Pill color="red">Official Policy</Pill>
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight mb-2">
                                    No Third-Party Integration Allowed
                                </h3>
                                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                    PlanneX <span className="text-white font-black">does not integrate with any external system</span> — not SAP, not Oracle, not Salesforce, nor any ERP, CMMS, or third-party cloud. This decision is deliberate and non-negotiable. Your industrial database remains exclusively on our secure servers, out of reach of any external application. Zero exposure vectors. Zero compromises on data sovereignty.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── THREE VALUE PILLARS ── */}
                <section className="w-full mx-auto px-6 lg:px-12 2xl:px-24 mb-28">
                    <div className="text-center mb-16">
                        <Pill>Acquisition Model</Pill>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white mt-4 mb-4">
                            Why a Fully<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Customized Model?</span>
                        </h2>
                        <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">
                            Because no maintenance shutdown is the same. Because no industrial team deserves a generic tool.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: <Cpu className="w-6 h-6" />,
                                accent: '16,185,129',
                                color: '#10b981',
                                tag: 'Deployment',
                                title: 'Tailored to Your Organization',
                                text: 'PlanneX is delivered as a true turnkey product: internal nomenclature, validation workflows, company-branded reports, sector-specific business rules. It\'s not a template. It\'s your tool.',
                                items: ['Internal discipline configuration', 'Custom business logic', 'Company-branded reports', 'Custom team training'],
                            },
                            {
                                icon: <Server className="w-6 h-6" />,
                                accent: '99,102,241',
                                color: '#6366f1',
                                tag: 'Security',
                                title: 'Your Data. Our Servers. Nobody Else.',
                                text: 'Every project, every task, every resource is hosted exclusively on PlanneX infrastructure. We control the entire data chain. No third parties. No leaks. No compromises.',
                                items: ['Dedicated servers per client', 'End-to-end AES-256 encryption', 'Automated secure backups', 'Security audit on request'],
                            },
                            {
                                icon: <Star className="w-6 h-6" />,
                                accent: '245,158,11',
                                color: '#f59e0b',
                                tag: 'Partnership',
                                title: 'A Contract Built for You',
                                text: 'PlanneX pricing reflects your deployment reality: shutdown size, number of users, level of customization, required support. No generic plans. No checkboxes. A conversation. A proposal. An agreement.',
                                items: ['Context-based pricing', 'Pilot on real data available', 'Progressive engagement possible', 'Measurable ROI from day 1'],
                            },
                        ].map(card => (
                            <div key={card.tag} className="relative rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-8 flex flex-col hover:border-white/10 transition-all duration-500 group overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                    style={{ background: `linear-gradient(90deg, transparent, ${card.color}, transparent)` }} />
                                <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                                    style={{ background: `rgba(${card.accent},0.06)`, transform: 'translate(30%,-30%)' }} />

                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 flex-shrink-0"
                                    style={{ background: `rgba(${card.accent},0.1)`, border: `1.5px solid rgba(${card.accent},0.25)`, color: card.color }}>
                                    {card.icon}
                                </div>
                                <div className="mb-1">
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: card.color }}>{card.tag}</span>
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight leading-snug mb-4">{card.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed font-medium mb-6 flex-1">{card.text}</p>
                                <div className="pt-6 border-t border-white/[0.05] space-y-2">
                                    {card.items.map(item => (
                                        <div key={item} className="flex items-center gap-2.5">
                                            <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: card.color }} />
                                            <span className="text-xs text-slate-400 font-medium">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── WHAT'S INCLUDED ── */}
                <section className="w-full mx-auto px-6 lg:px-12 2xl:px-24 mb-28">
                    <div className="rounded-[2rem] border border-white/[0.06] bg-white/[0.015] overflow-hidden">
                        <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
                            <div className="p-10 lg:p-14">
                                <div className="mb-8">
                                    <Pill>Included in Every Deployment</Pill>
                                    <h2 className="text-3xl font-black text-white tracking-tight mt-4 mb-3">What PlanneX Delivers</h2>
                                    <p className="text-slate-500 text-sm font-medium">Regardless of your contract, these capabilities are part of the platform's core.</p>
                                </div>
                                <div className="space-y-0 divide-y divide-white/[0.04]">
                                    {[
                                        'Dynamic Gantt Planning 3.0 — Interactive, real-time',
                                        'NeuralPath AI Scheduler Engine — Automated scheduling',
                                        'Critical Path Analysis — Visualization and alerts',
                                        'Mission Control 4K Dashboard — Complete operational view',
                                        'Board-Ready PDF & PPTX Exports — Decision-level presentations',
                                        'Industrial Co-Activity Management — Conflict prevention',
                                        'Real-Time Slippage Alerts — Proactive detection',
                                        'Spare Parts Tracking (PDR) — Integrated logistics',
                                        'Post-Shutdown Hot Evaluation — Performance analysis',
                                        'Map & QR Navigation — Field team guidance',
                                        'Readiness Dashboard — Overall preparation rate',
                                        'Dedicated Technical Support — Continuous assistance',
                                    ].map(f => (
                                        <FeatureRow key={f}>{f}</FeatureRow>
                                    ))}
                                </div>
                            </div>
                            <div className="p-10 lg:p-14">
                                <div className="mb-8">
                                    <Pill color="blue">Advanced Customization</Pill>
                                    <h2 className="text-3xl font-black text-white tracking-tight mt-4 mb-3">What We Configure for You</h2>
                                    <p className="text-slate-500 text-sm font-medium">Elements specifically adapted to your organization as part of the enterprise deployment.</p>
                                </div>
                                <div className="space-y-0 divide-y divide-white/[0.04]">
                                    {[
                                        'Internal nomenclature (disciplines, units, zones)',
                                        'Custom business rules and validation workflows',
                                        'Company-branded PDF reports with your logo',
                                        'Unlimited user accounts with role management',
                                        'Exclusive domain and optional white-label',
                                        'Dedicated servers — no shared resources',
                                        'Custom planning team training',
                                        'Integration with your own internal CMMS references',
                                        'Periodic backups and project archiving',
                                        'Contractually guaranteed SLA availability',
                                        'Multi-shutdown historical analytics dashboard',
                                        'Internal API access (on request, per contract)',
                                    ].map(f => (
                                        <FeatureRow key={f} accent="blue">{f}</FeatureRow>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── RULES & TERMS ── */}
                <section className="w-full mx-auto px-6 lg:px-12 2xl:px-24 mb-28">
                    <div className="text-center mb-14">
                        <Pill color="amber">Rules & Commercial Terms</Pill>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white mt-4 mb-3">
                            Transparency<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">as a Principle</span>
                        </h2>
                        <p className="text-slate-500 text-lg font-medium max-w-xl mx-auto">What you need to know before any engagement with PlanneX.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                            {
                                icon: <Building2 className="w-5 h-5" />,
                                title: 'Enterprise Only',
                                text: 'PlanneX is an exclusively B2B solution. It is designed for industrial organizations, engineering firms, maintenance teams, and specialized contractors. Individual subscriptions are not available.',
                                color: '16,185,129',
                            },
                            {
                                icon: <Lock className="w-5 h-5" />,
                                title: 'No Third-Party Integration',
                                text: 'PlanneX is not connected to any external system. SAP, Oracle, Maximo, MS Project, or any other third-party software cannot interact directly with the platform. Total data segregation is a non-negotiable condition.',
                                color: '239,68,68',
                            },
                            {
                                icon: <Shield className="w-5 h-5" />,
                                title: 'Data Hosted by PlanneX',
                                text: 'All your projects, resources, tasks, schedules, and reports are hosted on our servers. You can export your data at any time. No third party can access your space without your explicit consent.',
                                color: '99,102,241',
                            },
                            {
                                icon: <Sparkles className="w-5 h-5" />,
                                title: 'Always Custom Pricing',
                                text: 'There is no fixed public pricing grid for PlanneX. The price is established based on the size of your organization, shutdown volume, required customization level, and desired support commitments.',
                                color: '245,158,11',
                            },
                            {
                                icon: <User className="w-5 h-5" />,
                                title: 'Selective Partnerships',
                                text: 'PlanneX carefully selects its commercial partners. Companies wishing to resell, integrate, or recommend PlanneX to their clients must submit a formal request to the founding team. Unsolicited partnerships are not accepted.',
                                color: '6,182,212',
                            },
                            {
                                icon: <Zap className="w-5 h-5" />,
                                title: 'Protected Intellectual Property',
                                text: 'The codebase, algorithms, AI models, and PlanneX database are the exclusive property of Rachid Taouama. Any reproduction, extraction, or reverse engineering is formally prohibited and will be subject to legal action.',
                                color: '236,72,153',
                            },
                        ].map(rule => (
                            <div key={rule.title} className="group p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-all duration-300 flex flex-col">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 flex-shrink-0"
                                    style={{ background: `rgba(${rule.color},0.08)`, border: `1.5px solid rgba(${rule.color},0.2)`, color: `rgb(${rule.color})` }}>
                                    {rule.icon}
                                </div>
                                <h4 className="font-black text-white text-sm tracking-tight mb-2">{rule.title}</h4>
                                <p className="text-slate-500 text-xs leading-relaxed font-medium flex-1">{rule.text}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── FAQ ── */}
                <section className="max-w-4xl mx-auto px-6 mb-28">
                    <div className="text-center mb-14">
                        <Pill>Frequently Asked Questions</Pill>
                        <h2 className="text-4xl font-black tracking-tighter text-white mt-4 mb-3">
                            Everything you<br />need to know.
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {faqs.map(faq => <FaqItem key={faq.q} {...faq} />)}
                    </div>
                </section>

                {/* ── CONTACT SECTION ── */}
                <section className="max-w-5xl mx-auto px-6 mb-28">
                    <div className="relative rounded-[2.5rem] overflow-hidden border border-emerald-500/15 p-12 lg:p-20 text-center">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/30 via-[#020617] to-indigo-950/20" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/[0.06] rounded-full blur-[100px] pointer-events-none" />
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/15 to-transparent" />

                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/8 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-[0.4em] mb-8">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Let's Discuss Your Project
                            </div>
                            <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-white mb-6 leading-[0.9]">
                                Ready to Transform
                                <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400">
                                    Your Shutdowns?
                                </span>
                            </h2>
                            <p className="text-lg text-slate-400 font-medium max-w-2xl mx-auto mb-14 leading-relaxed">
                                Contact our team for a personalized analysis of your needs. We respond within 24 business hours with a proposal tailored to your industrial reality.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-3xl mx-auto text-left mb-12">
                                <div>
                                    <p className="text-[9px] font-black text-emerald-500/70 uppercase tracking-[0.4em] mb-4">Sales Team & Support</p>
                                    <div className="space-y-3">
                                        <ContactLink href="mailto:membership@plannex.ai" label="membership@plannex.ai" sub="Partnerships & Subscriptions" />
                                        <ContactLink href="mailto:support@plannex.ai" label="support@plannex.ai" sub="Technical Support & Questions" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-indigo-400/70 uppercase tracking-[0.4em] mb-4">Founder & Leadership</p>
                                    <div className="space-y-3">
                                        <ContactLink href="mailto:contact@rachidtaouama.com" label="contact@rachidtaouama.com" sub="Rachid Taouama — Founder" />
                                        <ContactLink href="mailto:rachid.taouama@gmail.com" label="rachid.taouama@gmail.com" sub="Founder Direct Contact" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <a href="mailto:membership@plannex.ai"
                                    className="group relative flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] text-black overflow-hidden transition-all active:scale-95 shadow-[0_20px_60px_rgba(16,185,129,0.35)]"
                                    style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                    <Mail className="w-4 h-4 relative z-10" />
                                    <span className="relative z-10">Contact PlanneX</span>
                                </a>
                                <button onClick={() => setPage?.('contact')}
                                    className="px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] text-slate-300 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all active:scale-95">
                                    Contact Page
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── TRUST BAR ── */}
                <section className="w-full mx-auto px-6 lg:px-12 2xl:px-24 pb-24">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { icon: <Shield className="w-5 h-5" />, label: '100% Secure Data', sub: 'AES-256 Encryption', color: '16,185,129' },
                            { icon: <Server className="w-5 h-5" />, label: 'Sovereign Servers', sub: 'Dedicated hosting', color: '99,102,241' },
                            { icon: <Globe className="w-5 h-5" />, label: 'Zero Third-Party Integration', sub: 'Closed & secure architecture', color: '245,158,11' },
                            { icon: <Zap className="w-5 h-5" />, label: 'Responsive Support', sub: 'Response < 24 business hours', color: '6,182,212' },
                        ].map(t => (
                            <div key={t.label} className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                                    style={{ background: `rgba(${t.color},0.08)`, border: `1.5px solid rgba(${t.color},0.2)`, color: `rgb(${t.color})` }}>
                                    {t.icon}
                                </div>
                                <p className="text-white font-black text-xs tracking-tight mb-0.5">{t.label}</p>
                                <p className="text-slate-600 text-[10px] font-medium uppercase tracking-widest">{t.sub}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};
