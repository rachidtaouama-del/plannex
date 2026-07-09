import React, { useState } from 'react';
import { Send, Mail, MapPin, Globe, MessageSquare, CheckCircle, Shield } from 'lucide-react';

const GridBackground = () => (
    <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_70%,transparent_100%)]"></div>
    </div>
);

const InputField: React.FC<{
    label: string;
    type?: string;
    name: string;
    required?: boolean;
    textarea?: boolean;
    placeholder?: string;
}> = ({ label, type = "text", name, required = true, textarea = false, placeholder = " " }) => {
    const Component = textarea ? 'textarea' : 'input';
    return (
        <div className="relative group mb-8">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-lg blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
            <div className="relative">
                <Component
                    type={type}
                    name={name}
                    id={name}
                    required={required}
                    rows={textarea ? 5 : undefined}
                    className="block w-full px-4 py-4 text-white bg-slate-900/50 border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all peer placeholder-transparent backdrop-blur-sm"
                    placeholder={placeholder}
                />
                <label
                    htmlFor={name}
                    className="absolute left-4 -top-2.5 bg-[#020202] px-2 text-xs font-mono font-bold text-emerald-500/60 uppercase tracking-widest transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-500 peer-placeholder-shown:top-4 peer-placeholder-shown:left-4 peer-focus:-top-2.5 peer-focus:left-4 peer-focus:text-emerald-400 peer-focus:text-xs"
                >
                    {label}
                </label>
            </div>
        </div>
    );
};

export const ContactUsPage: React.FC = () => {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            setIsSubmitted(true);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-[#020202] text-slate-200 relative overflow-hidden pt-40 pb-20 px-6 font-sans">
            <GridBackground />

            <div className="w-full px-6 lg:px-12 2xl:px-24 mx-auto relative z-10">
                {/* Cinematic Header */}
                <div className="flex flex-col items-center mb-24 animate-fade-in text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono tracking-[0.3em] uppercase mb-8">
                        <Shield size={12} className="animate-pulse" />
                        Secure Communication Uplink
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase mb-6 leading-none">
                        CONTACTEZ <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500">L'ÉQUIPE PLANNEX</span>
                    </h1>

                    <p className="text-slate-400 max-w-2xl text-lg leading-relaxed">
                        Pour toute demande de démonstration, partenariat stratégique ou support technique, nos ingénieurs sont à votre disposition.
                    </p>
                </div>

                <div className="grid lg:grid-cols-12 gap-16 items-start">

                    {/* Contact Sidebar */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="p-8 rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Mail size={80} />
                            </div>
                            <h3 className="text-white font-black text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                Canaux Directs
                            </h3>

                            <div className="space-y-8">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                        <Mail size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter mb-1">E-mail Officiel</p>
                                        <a href="mailto:contact@rachidtaouama.com" className="text-white font-bold hover:text-emerald-400 transition-colors">contact@rachidtaouama.com</a>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                        <MessageSquare size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter mb-1">Support Client</p>
                                        <p className="text-white font-bold">Assistance 24/7 pour Entreprises</p>
                                    </div>
                                </div>


                            </div>
                        </div>

                        {/* Security Badge */}
                        <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-4">
                            <CheckCircle className="text-emerald-500 flex-shrink-0" size={20} />
                            <p className="text-[10px] font-mono text-emerald-500/80 leading-relaxed uppercase tracking-wider">
                                Toutes les communications sont chiffrées via le protocole TLS 1.3. Vos données sont traitées conformément à notre Politique de Confidentialité.
                            </p>
                        </div>
                    </div>

                    {/* Form Component */}
                    <div className="lg:col-span-8">
                        <div className="p-1 md:p-10 rounded-[2.5rem] bg-slate-900/40 border border-white/5 backdrop-blur-xl relative overflow-hidden transition-all duration-700">

                            {isSubmitted ? (
                                <div className="py-20 flex flex-col items-center text-center animate-fade-in">
                                    <div className="w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-8 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                                        <CheckCircle size={48} />
                                    </div>
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">MESSAGE TRANSMIS</h2>
                                    <p className="text-slate-400 max-w-sm mb-10">
                                        Votre demande a été enregistrée avec succès. Un de nos ingénieurs reviendra vers vous sous 24h.
                                    </p>
                                    <button
                                        onClick={() => setIsSubmitted(false)}
                                        className="px-8 py-3 rounded-full border border-emerald-500/50 text-emerald-400 font-bold hover:bg-emerald-500/10 transition-all uppercase text-xs tracking-widest"
                                    >
                                        Envoyer une autre demande
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="relative z-10">
                                    <div className="grid md:grid-cols-2 gap-8">
                                        <InputField label="Nom Complet" name="user_name" placeholder="John Doe" />
                                        <InputField label="Adresse E-mail" name="user_email" type="email" placeholder="john@company.com" />
                                    </div>

                                    <InputField label="Sujet de votre demande" name="subject" placeholder="Démonstration PlanneX Engine" />

                                    <InputField label="votre message" name="message" textarea placeholder="Décrivez vos besoins industriels..." />

                                    <div className="flex flex-col items-center md:items-start">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className={`group relative w-full md:w-auto px-12 py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-[0_20px_40px_rgba(16,185,129,0.2)] ${loading ? 'opacity-70 cursor-wait' : 'hover:-translate-y-1 active:scale-95'}`}
                                        >
                                            {loading ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                                <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                            )}
                                            {loading ? 'TRANSMISSION EN COURS...' : 'ENVOYER L\'UPLINK'}

                                            <div className="absolute inset-0 rounded-2xl border border-white/50 animate-ping opacity-0 group-hover:opacity-20"></div>
                                        </button>

                                        <p className="mt-6 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                                            Estimation de réponse : <span className="text-emerald-500">&lt; 24 Heures</span>
                                        </p>
                                    </div>
                                </form>
                            )}

                            {/* Decorative HUD corners */}
                            <div className="absolute top-8 left-8 w-4 h-4 border-t-2 border-l-2 border-emerald-500/20"></div>
                            <div className="absolute top-8 right-8 w-4 h-4 border-t-2 border-r-2 border-emerald-500/20"></div>
                            <div className="absolute bottom-8 left-8 w-4 h-4 border-b-2 border-l-2 border-emerald-500/20"></div>
                            <div className="absolute bottom-8 right-8 w-4 h-4 border-b-2 border-r-2 border-emerald-500/20"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS ANIMATIONS */}
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 1s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default ContactUsPage;
