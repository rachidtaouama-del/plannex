
import React, { useState, useEffect, useRef } from 'react';
import { X, User, Mail, Phone, Shield, Key, Fingerprint } from 'lucide-react';
import type { UserAccount } from '../../types';

interface UserEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (user: Omit<UserAccount, 'status' | 'id'> & { id?: number, password?: string }) => void;
    userToEdit: UserAccount | null;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({ isOpen, onClose, onSave, userToEdit }) => {
    const isEditing = !!userToEdit;
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<UserAccount['role']>('Scheduler');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (isEditing && userToEdit) {
                setFirstName(userToEdit.firstName || '');
                setLastName(userToEdit.lastName || '');
                setEmail(userToEdit.email || '');
                setPhone(userToEdit.phone || '');
                setRole(userToEdit.role);
                setUsername(userToEdit.username);
                setPassword(''); // Logic typically doesn't send existing password back
            } else {
                setFirstName('');
                setLastName('');
                setEmail('');
                setPhone('');
                setRole('Scheduler');
                setUsername('');
                setPassword('');
            }
        }
    }, [isOpen, isEditing, userToEdit]);

    // Handle default generation for username and password
    useEffect(() => {
        if (!isEditing && lastName) {
            const defaultUser = lastName.replace(/\s+/g, '').toUpperCase();
            const defaultPass = (lastName.replace(/\s+/g, '') + "@" + new Date().getFullYear()).toUpperCase();

            // Only update if current values are empty or match the previous default pattern
            setUsername(prev => (prev === '' ? defaultUser : prev));
            setPassword(prev => (prev === '' ? defaultPass : prev));
        }
    }, [lastName, isEditing]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const userPayload: Omit<UserAccount, 'status' | 'id'> & { id?: number, password?: string } = {
            firstName,
            lastName,
            email,
            phone,
            role,
            username
        };

        if (password) {
            userPayload.password = password;
        }

        if (isEditing && userToEdit) {
            userPayload.id = userToEdit.id;
        }

        onSave(userPayload);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
            <div
                className="relative w-full max-w-2xl max-h-[95vh] bg-[#0a0f18] border border-white/5 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_0_80px_-20px_rgba(16,185,129,0.3)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Tactical Header Decoration */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0 shrink-0"></div>

                <header className="px-6 sm:px-10 pt-8 sm:pt-10 pb-4 sm:pb-6 flex justify-between items-start shrink-0">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-widest uppercase mb-2 sm:mb-4">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Système d'Accès v4.0
                        </div>
                        <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tighter">
                            {isEditing ? 'Éditer Profil' : 'Nouvelle Habilitation'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="px-6 sm:px-10 pb-8 sm:pb-12 space-y-6 sm:space-y-8 overflow-y-auto scrollbar-hide">
                    {/* User Profile Info Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prénom</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                                    <User className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl sm:rounded-2xl pl-11 pr-4 py-3 sm:py-4 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                                    placeholder="Ex: Jean"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                                    <User className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl sm:rounded-2xl pl-11 pr-4 py-3 sm:py-4 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                                    placeholder="Ex: Dupont"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Professionnel</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl sm:rounded-2xl pl-11 pr-4 py-3 sm:py-4 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                                    placeholder="jean.dupont@industrial.com"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Téléphone</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                                    <Phone className="w-4 h-4" />
                                </div>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl sm:rounded-2xl pl-11 pr-4 py-3 sm:py-4 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                                    placeholder="+212 6... / +33 6..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Rôle Système</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors">
                                    <Shield className="w-4 h-4" />
                                </div>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as UserAccount['role'])}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl sm:rounded-2xl pl-11 pr-4 py-3 sm:py-4 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="Director">Directeur</option>
                                    <option value="Manager">Manager</option>
                                    <option value="Scheduler">Scheduler</option>
                                    <option value="Guest">Guest</option>
                                    <option value="admin">Administrateur Système</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Technical Credentials Section */}
                    <div className="p-4 sm:p-6 rounded-[1.5rem] sm:rounded-3xl bg-emerald-500/[0.02] border border-emerald-500/10 space-y-4 sm:space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Fingerprint className="w-5 h-5 text-emerald-500" />
                            <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Identifiants de Sécurité</h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest ml-1">Nom d'Utilisateur</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700">
                                        <Key className="w-3 h-3" />
                                    </div>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="w-full bg-black/60 border border-white/5 rounded-xl pl-10 pr-4 py-2 sm:py-3 text-emerald-400 font-mono text-sm focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest ml-1">Clé d'accès (Mot de passe)</label>
                                <div className="relative group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700">
                                        <Key className="w-3 h-3" />
                                    </div>
                                    <input
                                        type="text"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-black/60 border border-white/5 rounded-xl pl-10 pr-4 py-2 sm:py-3 text-emerald-400 font-mono text-sm focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner"
                                        placeholder={isEditing ? '•••••••• (Inchangé)' : 'Saisir une clé'}
                                        required={!isEditing}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row justify-end gap-3 sm:gap-6 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-auto px-8 py-3 sm:py-4 bg-white/5 text-slate-400 font-bold uppercase text-[10px] tracking-widest rounded-xl sm:rounded-2xl hover:bg-white/10 hover:text-white transition-all border border-white/5 order-2 sm:order-1"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="w-full sm:w-auto px-10 py-3 sm:py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest rounded-xl sm:rounded-2xl transition-all shadow-[0_20px_40px_-5px_rgba(16,185,129,0.3)] active:scale-95 order-1 sm:order-2"
                        >
                            {isEditing ? "Confirmer Changements" : "Valider Habilitation"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
