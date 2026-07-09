import React, { useState, useEffect } from 'react';
import { Shield, Edit, Trash2, Clock, MessageSquare, Send, Calendar, PauseCircle, Ban, PlayCircle, X, UserPlus, Eye, EyeOff } from 'lucide-react';
import type { UserAccount } from '../../types';
import { UserEditModal } from './UserEditModal';
import {
    getMockUsers,
    saveMockUser,
    deleteMockUser,
    updateMockUserStatus,
    updateMockUserExpiry,
    sendNotification,
    broadcastNotification,
} from '../../services/mockUserService';


const StatusBadge: React.FC<{ status: UserAccount['status'] }> = ({ status }) => {
    const statusInfo = {
        Active: { text: 'ACTIF', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text_color: 'text-emerald-400', dot: 'bg-emerald-500' },
        Suspended: { text: 'SUSPENDU', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text_color: 'text-amber-400', dot: 'bg-amber-500' },
        Blocked: { text: 'BLOQUÉ', bg: 'bg-rose-500/10', border: 'border-rose-500/20', text_color: 'text-rose-400', dot: 'bg-rose-500' },
    };
    const { text, bg, border, text_color, dot } = statusInfo[status];
    return (
        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${bg} ${text_color} border ${border} shadow-sm transition-all hover:scale-105`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`}></span>
            {text}
        </span>
    );
};

// ─── New User Creation Form ─────────────────────────────────────────────────
interface NewUserFormProps { onSuccess: () => void; onClose: () => void; }
const NewUserForm: React.FC<NewUserFormProps> = ({ onSuccess, onClose }) => {
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'user' | 'admin'>('user');
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !firstName.trim() || !password.trim()) { setError('Nom d\'utilisateur, prénom et mot de passe sont requis.'); return; }
        if (password.length < 6) { setError('Le mot de passe doit avoir au moins 6 caractères.'); return; }
        setLoading(true);
        setError('');
        try {
            saveMockUser({
                username: username.trim().toUpperCase(),
                firstName: firstName.trim().toUpperCase(),
                lastName: lastName.trim().toUpperCase(),
                email: email.trim(),
                phone: '',
                password,
                role: role as any,
                notifications: [],
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erreur inconnue');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#0a0f18] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-[0_0_80px_-20px_rgba(16,185,129,0.2)]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <UserPlus className="text-emerald-500 w-6 h-6" />
                        Nouvel Utilisateur
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Prénom *</label>
                            <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Ex: Jean"
                                className="w-full bg-black/50 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500/50 text-sm" />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Nom</label>
                            <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Ex: Dupont"
                                className="w-full bg-black/50 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500/50 text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Identifiant (Username) *</label>
                        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Ex: JEAN01"
                            className="w-full bg-black/50 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500/50 text-sm" />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean.dupont@company.com"
                            className="w-full bg-black/50 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500/50 text-sm" />
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Mot de Passe *</label>
                        <div className="relative">
                            <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 caractères"
                                className="w-full bg-black/50 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500/50 text-sm pr-10" />
                            <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Rôle Système</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['user', 'admin'] as const).map(r => (
                                <button key={r} type="button" onClick={() => setRole(r)}
                                    className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${role === r ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'}`}>
                                    {r === 'user' ? 'Utilisateur' : 'Admin'}
                                </button>
                            ))}
                        </div>
                    </div>
                    {error && <p className="text-rose-400 text-xs font-bold">{error}</p>}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase tracking-widest">Annuler</button>
                        <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            Créer l'Utilisateur
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UserManagementPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [users, setUsers] = useState<UserAccount[]>([]);
    const [isNewUserOpen, setIsNewUserOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

    // Messaging State
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [messageUserId, setMessageUserId] = useState<number | null>(null);
    const [messageText, setMessageText] = useState('');

    // Duration State
    const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
    const [durationUserId, setDurationUserId] = useState<number | null>(null);
    const [daysToAdd, setDaysToAdd] = useState(30);

    const refreshUsers = () => {
        setUsers(getMockUsers());
    };

    useEffect(() => { refreshUsers(); }, []);

    const handleOpenModal = (user: UserAccount | null) => { setEditingUser(user); setIsModalOpen(true); };
    const handleSaveUser = () => { setIsModalOpen(false); refreshUsers(); };

    const handleChangeStatus = (userId: number, status: UserAccount['status']) => {
        updateMockUserStatus(userId, status);
        refreshUsers();
    };

    const handleDeleteUser = (userId: number) => {
        if (userId === 1) return; // Protect admin
        deleteMockUser(userId);
        refreshUsers();
    };

    const handleOpenMessage = (id: number | null) => { setMessageUserId(id); setMessageText(''); setIsMessageModalOpen(true); };
    const handleSendMessage = () => {
        if (messageText.trim()) {
            if (messageUserId) {
                sendNotification(messageUserId, messageText.trim());
            } else {
                broadcastNotification(messageText.trim());
            }
        }
        setIsMessageModalOpen(false);
        setMessageText('');
    };

    const handleOpenDuration = (id: number) => { setDurationUserId(id); setDaysToAdd(30); setIsDurationModalOpen(true); };
    const handleAddDuration = () => {
        if (durationUserId) {
            updateMockUserExpiry(durationUserId, daysToAdd);
            refreshUsers();
        }
        setIsDurationModalOpen(false);
    };

    const calculateDaysLeft = (expiresAt: string | null | undefined): { text: string; color: string } => {
        if (!expiresAt) return { text: 'ILLIMITÉ', color: 'text-emerald-400' };

        // Strip time from current date for accurate day calculation
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const exp = new Date(expiresAt);
        exp.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));

        if (diffDays <= 0) return { text: 'EXPIRÉ', color: 'text-rose-500' };
        if (diffDays <= 5) return { text: `${diffDays} JOURS`, color: 'text-amber-500 animate-pulse' };
        return { text: `${diffDays} JOURS`, color: 'text-emerald-400' };
    };

    return (
        <div className="relative min-h-screen bg-black text-slate-200">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            <UserEditModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveUser as any}
                userToEdit={editingUser}
            />

            {/* NEW USER FORM MODAL */}
            {isNewUserOpen && (
                <NewUserForm
                    onSuccess={refreshUsers}
                    onClose={() => setIsNewUserOpen(false)}
                />
            )}

            {/* MESSAGE MODAL */}
            {isMessageModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm shadow-2xl animate-in fade-in duration-200" onClick={() => setIsMessageModalOpen(false)}>
                    <div className="bg-[#0a0f18] border border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-[0_0_80px_-20px_rgba(16,185,129,0.2)]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                                {messageUserId ? <MessageSquare className="text-emerald-500 w-6 h-6" /> : <Send className="text-emerald-500 w-6 h-6" />}
                                {messageUserId ? 'Message Privé' : 'Notification Globale'}
                            </h3>
                            <button onClick={() => setIsMessageModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-slate-400 text-sm mb-6">
                            {messageUserId ? "Ce message sera affiché dans le centre de notifications de l'utilisateur concerné." : "Ce message sera envoyé à tous les utilisateurs actifs de la plateforme."}
                        </p>
                        <textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            className="w-full bg-black/50 border border-white/5 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 resize-none h-32 mb-6"
                            placeholder="Saisissez votre message système..."
                        ></textarea>
                        <div className="flex justify-end gap-4">
                            <button onClick={() => setIsMessageModalOpen(false)} className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase tracking-widest transition-colors">Annuler</button>
                            <button onClick={handleSendMessage} disabled={!messageText.trim()} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center gap-2">
                                <Send className="w-4 h-4" /> Envoyer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DURATION MODAL */}
            {isDurationModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm shadow-2xl animate-in fade-in duration-200" onClick={() => setIsDurationModalOpen(false)}>
                    <div className="bg-[#0a0f18] border border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-[0_0_80px_-20px_rgba(16,185,129,0.2)]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                                <Clock className="text-emerald-500 w-6 h-6" />
                                Renouveler Accès
                            </h3>
                            <button onClick={() => setIsDurationModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-slate-400 text-sm mb-6">
                            Augmentez la durée d'accès de ce compte. Si le compte est expiré, il sera réactivé avec cette durée.
                        </p>
                        <div className="mb-8">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Jours à ajouter</label>
                            <input
                                type="number"
                                value={daysToAdd}
                                onChange={(e) => setDaysToAdd(parseInt(e.target.value) || 0)}
                                className="w-full bg-black/50 border border-white/5 rounded-2xl p-4 text-white text-center text-xl font-black focus:outline-none focus:border-emerald-500/50"
                                min="1"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsDurationModalOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase tracking-widest transition-colors">Annuler</button>
                            <button onClick={handleAddDuration} className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-colors shadow-[0_10px_20px_-5px_rgba(16,185,129,0.3)] flex justify-center items-center">
                                Valider
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative z-10 w-full mx-auto px-6 lg:px-12 2xl:px-24 py-12 animate-[fadeIn_0.5s_ease-out]">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={onBack}
                            className="group w-12 h-12 rounded-full border border-slate-800 bg-slate-900/50 flex items-center justify-center text-slate-400 hover:text-white hover:border-emerald-500/50 transition-all shadow-lg"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tighter mb-1">Gestion des Utilisateurs</h1>
                            <p className="text-slate-500 font-mono text-xs uppercase tracking-[0.2em]">Habilitations & Contrôle d'Accès</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <button
                            onClick={() => handleOpenMessage(null)}
                            className="w-full sm:w-auto px-6 py-3 bg-white/5 text-slate-300 font-bold uppercase text-[10px] tracking-widest rounded-xl hover:bg-emerald-500/20 hover:text-emerald-400 border border-white/5 hover:border-emerald-500/30 transition-all flex items-center justify-center gap-3"
                        >
                            <Send className="w-4 h-4" />
                            <span>Notification à Tous</span>
                        </button>

                        <button
                            onClick={() => setIsNewUserOpen(true)}
                            className="group relative w-full sm:w-auto px-6 py-3 bg-white text-black font-black uppercase text-xs tracking-widest rounded-xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 active:scale-95 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-shimmer transition-transform"></div>
                            <UserPlus className="h-4 w-4" />
                            <span>Nouvel Utilisateur</span>
                        </button>
                    </div>
                </header>

                <div className="bg-[#0a0f18]/60 backdrop-blur-xl rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#0f1520]/80">
                                <tr className="border-b border-white/5">
                                    <th className="px-6 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Utilisateur</th>
                                    <th className="px-4 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Rôle & Accès</th>
                                    <th className="px-4 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Durée Active</th>
                                    <th className="px-4 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Statut</th>
                                    <th className="px-6 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Contrôle Admin</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {users.map((user) => {
                                    const daysInfo = calculateDaysLeft(user.expiresAt);

                                    return (
                                        <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors duration-200">
                                            {/* User Info Col */}
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative shrink-0">
                                                        {user.picture ? (
                                                            <img src={user.picture} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/10 group-hover:border-emerald-500/50 transition-colors" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-black shadow-inner">
                                                                {user.firstName?.charAt(0) || user.username.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col min-w-[120px]">
                                                        <span className="text-slate-200 font-bold group-hover:text-white transition-colors text-sm">
                                                            {user.firstName} {user.lastName}
                                                        </span>
                                                        <span className="text-[10px] font-mono text-slate-500 uppercase mt-0.5">ID: {user.username}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role Col */}
                                            <td className="px-4 py-5">
                                                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/40 border border-white/5 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                                                    <Shield className="w-3 h-3 text-emerald-500" />
                                                    {user.role}
                                                </div>
                                            </td>

                                            {/* Active Days Col */}
                                            <td className="px-4 py-5">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                                        <span className={`text-[11px] font-bold tracking-widest ${daysInfo.color}`}>
                                                            {daysInfo.text}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status Col */}
                                            <td className="px-4 py-5">
                                                <StatusBadge status={user.status} />
                                            </td>

                                            {/* Actions Col */}
                                            <td className="px-6 py-5">
                                                <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                                                    {/* Comms & Duration */}
                                                    <button
                                                        onClick={() => handleOpenMessage(user.id)}
                                                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                                                        title="Envoyer un Message"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                    </button>

                                                    {user.id !== 1 && (
                                                        <button
                                                            onClick={() => handleOpenDuration(user.id)}
                                                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                                                            title="Ajouter Durée"
                                                        >
                                                            <Clock className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    <div className="w-[1px] h-5 bg-white/10 mx-1"></div>

                                                    {/* Editing */}
                                                    <button
                                                        onClick={() => handleOpenModal(user)}
                                                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                        title="Modifier"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>

                                                    {/* Sanctions & Removal (Exclude Admin ID 1) */}
                                                    {user.id !== 1 && (
                                                        <>
                                                            {user.status === 'Active' ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleChangeStatus(user.id, 'Suspended')}
                                                                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                                                                        title="Suspendre Temporairement"
                                                                    >
                                                                        <PauseCircle className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleChangeStatus(user.id, 'Blocked')}
                                                                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                                                        title="Bloquer Définitivement"
                                                                    >
                                                                        <Ban className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleChangeStatus(user.id, 'Active')}
                                                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"
                                                                    title="Réactiver"
                                                                >
                                                                    <PlayCircle className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all ml-1"
                                                                title="Supprimer"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    {users.length === 0 && (
                        <div className="py-24 text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-800 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <p className="text-slate-500 font-medium">Aucun utilisateur enregistré dans le système.</p>
                        </div>
                    )}
                </div>

                <div className="mt-12 p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-6">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-white font-bold mb-1 italic">Notes de Modération</h4>
                        <ul className="text-slate-400 text-sm leading-relaxed list-disc list-inside">
                            <li><strong>Durée d'Accès :</strong> Contrôle du nombre de jours restant. À l'expiration, le compte est automatiquement suspendu.</li>
                            <li><strong>Statuts :</strong> Un compte peut être Suspendu (durée ou décision temporaire) ou Bloqué (décision punitive).</li>
                            <li><strong>Notifications :</strong> Les messages envoyés seront affichés dans le panneau de contrôle de l'utilisateur concerné.</li>
                        </ul>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 1.5s infinite;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default UserManagementPage;
