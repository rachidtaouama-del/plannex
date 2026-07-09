import React from 'react';
import { MultiSelectDropdown } from './MultiSelectDropdown';

interface GanttFilterPanelProps {
    dateFilter: { start: string; end: string } | null;
    setDateFilter: (filter: { start: string; end: string } | null) => void;
    disciplineFilter: string[];
    setDisciplineFilter: (filter: string[]) => void;
    familyFilter: string[];
    setFamilyFilter: (filter: string[]) => void;
    equipmentFilter: string[];
    setEquipmentFilter: (filter: string[]) => void;
    teamFilter: string[];
    setTeamFilter: (filter: string[]) => void;
    uniqueDisciplines: string[];
    uniqueFamilies: string[];
    uniqueEquipments: string[];
    uniqueTeams: string[];
    onClearAll: () => void;
    onClose: () => void;
    taskCount: { visible: number; total: number };
}

export const GanttFilterPanel: React.FC<GanttFilterPanelProps> = ({
    dateFilter, setDateFilter,
    disciplineFilter, setDisciplineFilter,
    familyFilter, setFamilyFilter,
    equipmentFilter, setEquipmentFilter,
    teamFilter, setTeamFilter,
    uniqueDisciplines, uniqueFamilies, uniqueEquipments, uniqueTeams,
    onClearAll, onClose, taskCount
}) => {

    const handleDateChange = (field: 'start' | 'end', value: string) => {
        const newFilterState = {
            start: dateFilter?.start || '',
            end: dateFilter?.end || '',
            [field]: value
        };

        if (newFilterState.start && newFilterState.end) {
            setDateFilter(newFilterState);
        } else {
            setDateFilter(null);
        }
    };

    const activeCount = [disciplineFilter, familyFilter, equipmentFilter, teamFilter].filter(f => f.length > 0).length + (dateFilter ? 1 : 0);
    const filterRatio = taskCount.total > 0 ? taskCount.visible / taskCount.total : 1;
    const isFiltered = taskCount.visible < taskCount.total;

    const selectors = [
        { label: 'Discipline', icon: '◈', current: disciplineFilter, options: uniqueDisciplines, setter: setDisciplineFilter, color: '#22d3ee' },
        { label: 'Famille', icon: '⬡', current: familyFilter, options: uniqueFamilies, setter: setFamilyFilter, color: '#a78bfa' },
        { label: 'Équipement', icon: '⬟', current: equipmentFilter, options: uniqueEquipments, setter: setEquipmentFilter, color: '#34d399' },
        { label: 'Équipe', icon: '◉', current: teamFilter, options: uniqueTeams, setter: setTeamFilter, color: '#f59e0b' },
    ];

    return (
        <div
            className="relative overflow-hidden rounded-[2rem] animate-in fade-in slide-in-from-top-3 duration-300"
            style={{
                background: 'linear-gradient(160deg, rgba(6,10,20,0.98) 0%, rgba(4,8,16,0.99) 100%)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 0 80px rgba(0,0,0,0.8), 0 0 30px rgba(16,185,129,0.05)',
            }}
        >
            {/* Top shimmer */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
            {/* Ambient glow */}
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] pointer-events-none" style={{ background: 'rgba(16,185,129,0.06)' }} />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full blur-[60px] pointer-events-none" style={{ background: 'rgba(6,182,212,0.04)' }} />

            {/* ── HEADER ── */}
            <div className="relative z-10 flex items-center justify-between px-7 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-4">
                    {/* Icon */}
                    <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 rounded-xl blur-lg opacity-50" style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)' }} />
                        <div className="relative w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.2),rgba(6,182,212,0.15))', border: '1px solid rgba(16,185,129,0.3)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                            </svg>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-3 mb-0.5">
                            <h3 className="text-lg font-black text-white uppercase italic tracking-tight leading-none">Paramètres de Filtrage</h3>
                            {activeCount > 0 && (
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-in fade-in"
                                    style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
                                    {activeCount} Actif{activeCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.35em]">Configuration des protocoles d'affichage</p>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)';
                        (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)';
                        (e.currentTarget as HTMLButtonElement).style.color = '#475569';
                    }}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
            </div>

            {/* ── FILTER CONTROLS ── */}
            <div className="relative z-10 px-7 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">

                    {/* Date range */}
                    <div className="lg:col-span-2">
                        <label className="flex items-center gap-2 mb-3">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,0.6)' }} />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Segment Temporel</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="datetime-local"
                                    value={dateFilter?.start || ''}
                                    onChange={e => handleDateChange('start', e.target.value)}
                                    className="w-full text-[10px] font-black font-mono text-white px-3 py-2.5 rounded-xl outline-none transition-all"
                                    style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        colorScheme: 'dark',
                                    }}
                                    onFocus={e => (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(16,185,129,0.4)'}
                                    onBlur={e => (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.08)'}
                                />
                            </div>
                            <div className="flex-shrink-0 w-4 flex items-center">
                                <div className="w-full h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
                            </div>
                            <div className="relative flex-1">
                                <input
                                    type="datetime-local"
                                    value={dateFilter?.end || ''}
                                    onChange={e => handleDateChange('end', e.target.value)}
                                    className="w-full text-[10px] font-black font-mono text-white px-3 py-2.5 rounded-xl outline-none transition-all"
                                    style={{
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        colorScheme: 'dark',
                                    }}
                                    onFocus={e => (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(16,185,129,0.4)'}
                                    onBlur={e => (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.08)'}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dynamic selectors */}
                    {selectors.map(sel => (
                        <div key={sel.label} className="space-y-3">
                            <label className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all"
                                    style={{
                                        backgroundColor: sel.current.length > 0 ? sel.color : '#334155',
                                        boxShadow: sel.current.length > 0 ? `0 0 8px ${sel.color}80` : 'none',
                                    }}
                                />
                                <span className="text-[9px] font-black uppercase tracking-[0.3em] transition-colors"
                                    style={{ color: sel.current.length > 0 ? sel.color : '#475569' }}>
                                    {sel.label}
                                </span>
                                {sel.current.length > 0 && (
                                    <span className="ml-auto text-[8px] font-black px-1.5 py-0.5 rounded-full"
                                        style={{ background: `${sel.color}18`, border: `1px solid ${sel.color}35`, color: sel.color }}>
                                        {sel.current.length}
                                    </span>
                                )}
                            </label>
                            <div className={`rounded-xl transition-all ${sel.current.length > 0 ? 'ring-1' : ''}`}
                                style={{ ringColor: sel.current.length > 0 ? `${sel.color}30` : 'transparent' }}
                            >
                                <MultiSelectDropdown
                                    options={sel.options}
                                    selected={sel.current}
                                    onChange={sel.setter}
                                    placeholder="Tous les éléments"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── FOOTER ── */}
            <div className="relative z-10 px-7 py-4 flex flex-col sm:flex-row items-center justify-between gap-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
            >
                {/* Mission counter + progress bar */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 px-4 py-2 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Missions Actives</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-base font-black tabular-nums" style={{ color: isFiltered ? '#10b981' : '#e2e8f0' }}>
                                {taskCount.visible}
                            </span>
                            <span className="text-[10px] font-black text-slate-700">/</span>
                            <span className="text-sm font-black tabular-nums text-slate-500">{taskCount.total}</span>
                        </div>
                    </div>
                    {/* Progress bar */}
                    <div className="w-28 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${filterRatio * 100}%`,
                                background: isFiltered
                                    ? 'linear-gradient(90deg,#10b981,#06b6d4)'
                                    : 'rgba(255,255,255,0.15)',
                            }}
                        />
                    </div>
                    {isFiltered && (
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#10b981' }}>
                            {Math.round(filterRatio * 100)}%
                        </span>
                    )}
                </div>

                {/* Reset button */}
                <button
                    onClick={onClearAll}
                    className="group flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-200"
                    style={{ border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', background: 'rgba(239,68,68,0.04)' }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.45)';
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(239,68,68,0.15)';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.04)';
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.2)';
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                    }}
                >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                        className="group-hover:rotate-90 transition-transform duration-300"
                    >
                        <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                    Réinitialiser les Protocoles
                </button>
            </div>
        </div>
    );
};