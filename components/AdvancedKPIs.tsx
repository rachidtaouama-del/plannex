import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Line, ComposedChart, LabelList, Label, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { SchedulingTaskData, ShutdownParams } from '../types';

interface AdvancedKPIsProps {
    tasks: SchedulingTaskData[];
    shutdownParams: ShutdownParams;
}

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f43f5e', '#3b82f6', '#d946ef', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900 border border-slate-700/50 p-4 rounded-xl shadow-2xl text-sm backdrop-blur-md bg-opacity-95">
                <p className="font-bold text-white mb-3 tracking-wide">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={`item-${index}`} className="flex items-center gap-3 mb-1.5">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }}></span>
                        <span className="text-slate-300 font-medium">{entry.name}:</span>
                        <span className="text-white font-bold font-mono ml-auto">
                            {typeof entry.value === 'number' && !Number.isInteger(entry.value) ? entry.value.toFixed(2) : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const KpiCardExpert = ({ title, children, showTable, data, columns, className = "" }: any) => (
    <div className={`bg-[#0D0F14] backdrop-blur-xl p-5 md:p-6 rounded-3xl border border-slate-700/50 shadow-2xl hover:border-cyan-500/30 hover:shadow-cyan-500/10 transition-all duration-500 flex flex-col h-full ring-1 ring-white/5 relative group overflow-hidden ${className}`}>
        {/* Subtle glowing effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-colors pointer-events-none"></div>

        <h3 className="text-slate-200 font-black text-sm md:text-[13px] tracking-widest mb-6 uppercase flex items-center gap-3 relative z-10">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
            {title}
        </h3>

        <div className="flex-1 min-h-[280px] w-full relative z-10 flex flex-col">
            {children}
        </div>

        {showTable && data && columns && data.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-xl border border-slate-700/50 shadow-inner relative z-10 animate-fade-up-fast">
                <div className="overflow-x-auto max-h-48 custom-scrollbar">
                    <table className="w-full text-xs text-left text-slate-300">
                        <thead className="bg-slate-800/80 sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                {columns.map((c: any) => (
                                    <th key={c.key} className="px-4 py-3 font-bold text-cyan-500/80 uppercase tracking-wider">{c.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                            {data.map((row: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                                    {columns.map((c: any) => (
                                        <td key={c.key} className="px-4 py-2.5 font-medium whitespace-nowrap">
                                            {typeof row[c.key] === 'number' && !Number.isInteger(row[c.key]) ? row[c.key].toFixed(2) : row[c.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
);

const ToggleOption = ({ label, checked, onChange, colorClass = "cyan" }: { label: string, checked: boolean, onChange: (c: boolean) => void, colorClass?: string }) => {
    const focusColors: Record<string, string> = {
        emerald: 'peer-checked:bg-emerald-500 peer-checked:border-emerald-500 group-hover:text-emerald-400',
        cyan: 'peer-checked:bg-cyan-500 peer-checked:border-cyan-500 group-hover:text-cyan-400',
        indigo: 'peer-checked:bg-indigo-500 peer-checked:border-indigo-500 group-hover:text-indigo-400',
    };

    return (
        <label className="flex items-center space-x-3 cursor-pointer group bg-slate-800/50 hover:bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700/50 transition-all shadow-inner">
            <div className="relative flex items-center justify-center">
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
                <div className={`w-5 h-5 bg-slate-900 border-2 border-slate-600 rounded transition-all shadow-inner ${focusColors[colorClass].split(' ').slice(0, 2).join(' ')}`}></div>
                <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className={`text-slate-300 font-bold text-xs uppercase tracking-wider transition-colors ${focusColors[colorClass].split(' ').pop()}`}>{label}</span>
        </label>
    );
};

export const AdvancedKPIs: React.FC<AdvancedKPIsProps> = ({ tasks, shutdownParams }) => {
    const [showLegend, setShowLegend] = useState(true);
    const [showTable, setShowTable] = useState(false);
    const [showLabels, setShowLabels] = useState(false);

    // KPI 1 & 2: TOTAL TASKS & TOTAL TASKS PAR DICIPLINE


    const { totalTasks, tasksByDiscipline } = useMemo(() => {
        const counts: Record<string, number> = {};
        tasks.forEach(t => {
            const d = t.DISCIPLINE || 'Sans Discipline';
            counts[d] = (counts[d] || 0) + 1;
        });
        const data = Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        return { totalTasks: tasks.length, tasksByDiscipline: data };
    }, [tasks]);

    // KPI 3: DUREE DE L'ARRET
    const dureeArretHours = useMemo(() => {
        const start = new Date(shutdownParams.shutdownStart);
        const end = new Date(shutdownParams.shutdownEnd);
        return ((end.getTime() - start.getTime()) / (1000 * 60 * 60)) || 0;
    }, [shutdownParams]);

    // KPI 4 & 5: AVANCEMENT & AVANCEMENT PAR DISCIPLINE
    const { globalAdvancement, advancementByDiscipline } = useMemo(() => {
        const scheduled = tasks.filter(t => t.isScheduled && t['START DATE'] && t['END DATE']);
        const global = tasks.length > 0 ? (scheduled.length / tasks.length) * 100 : 0;

        const stats: Record<string, { total: number, sched: number }> = {};
        tasks.forEach(t => {
            const d = t.DISCIPLINE || 'Sans Discipline';
            if (!stats[d]) stats[d] = { total: 0, sched: 0 };
            stats[d].total++;
            if (t.isScheduled && t['START DATE'] && t['END DATE']) stats[d].sched++;
        });
        const data = Object.entries(stats).map(([name, s]) => ({
            name,
            Avancement: s.total > 0 ? Number(((s.sched / s.total) * 100).toFixed(1)) : 0
        })).sort((a, b) => b.Avancement - a.Avancement);

        return { globalAdvancement: global, advancementByDiscipline: data };
    }, [tasks]);

    // KPI 6 & 7: EQUIPE CREEES & EQUIPE CREEES PAR DISIPLINE
    const { totalTeamsCreated, teamsByDiscipline } = useMemo(() => {
        const uniqueTeams = new Set<string>();
        const teamStats: Record<string, Set<string>> = {};

        tasks.forEach(t => {
            if (t.isScheduled && t['TYPE D\'EQUIPE']) {
                const teamId = `${t.DISCIPLINE} ${t['TYPE D\'EQUIPE']}`;
                uniqueTeams.add(teamId);

                const d = t.DISCIPLINE || 'Sans Discipline';
                if (!teamStats[d]) teamStats[d] = new Set();
                teamStats[d].add(t['TYPE D\'EQUIPE']!);
            }
        });

        const data = Object.entries(teamStats).map(([name, set]) => ({
            name,
            Equipes: set.size
        })).sort((a, b) => b.Equipes - a.Equipes);

        return { totalTeamsCreated: uniqueTeams.size, teamsByDiscipline: data };
    }, [tasks]);

    // KPI 8: Heures-Homme par discipline
    const manHoursByDiscipline = useMemo(() => {
        const stats: Record<string, number> = {};
        tasks.forEach(t => {
            const d = t.DISCIPLINE || 'Sans Discipline';
            stats[d] = (stats[d] || 0) + (t['Heures-Homme'] || (t.DUREE * t.EFFECTIF));
        });
        return Object.entries(stats).map(([name, value]) => ({ name, HH: Number(value.toFixed(1)) })).sort((a, b) => b.HH - a.HH);
    }, [tasks]);

    // KPI 9: REQUIREMENTS per discipline — all 10 prérequis
    const requirementsByDiscipline = useMemo(() => {
        const stats: Record<string, {
            sparePart: number, scaf: number, hand: number,
            handPermit: number, heightPermit: number, hotWork: number,
            confined: number, excavation: number, workInstruction: number, safetyRisk: number
        }> = {};
        tasks.forEach(t => {
            const d = t.DISCIPLINE || 'Sans Discipline';
            if (!stats[d]) stats[d] = { sparePart: 0, scaf: 0, hand: 0, handPermit: 0, heightPermit: 0, hotWork: 0, confined: 0, excavation: 0, workInstruction: 0, safetyRisk: 0 };
            if (t.pdrItems && t.pdrItems.length > 0) stats[d].sparePart++;
            if (t['Scaffolding Required'] === 1) stats[d].scaf++;
            if (t['Handling required'] === 1) stats[d].hand++;
            // Permits — use single flag to avoid double-counting
            if (t.permisPenetration === 1 || t['permis Penetration'] === 1) stats[d].handPermit++;
            if (t.permisTravailHauteur === 1 || t['permis Travail Hauteur'] === 1) stats[d].heightPermit++;
            if (t.permisFeu === 1 || t['permis Feu'] === 1) stats[d].hotWork++;
            if (t.permisLevage === 1 || t['permis Levage'] === 1) stats[d].confined++;
            if (t.permisExcavation === 1 || t['permis Excavation'] === 1) stats[d].excavation++;
            if (t['THR'] === 1 || t['COMMENTAIRE HSE'] === 1) stats[d].workInstruction++;
            if (t['MO Required'] === 1) stats[d].safetyRisk++;
        });

        return Object.entries(stats).map(([name, s]) => ({
            name,
            'Spare Part': s.sparePart,
            Échafaudage: s.scaf,
            Manutention: s.hand,
            'Permis Pénétration': s.handPermit,
            'Travail Hauteur': s.heightPermit,
            'Travail à Feu': s.hotWork,
            Levage: s.confined,
            Excavation: s.excavation,
            'Instruction Travail': s.workInstruction,
            'Éval. Risque': s.safetyRisk,
        }));
    }, [tasks]);

    // KPI 10: SOMME DE DUREE FOR EACH DISCIPLINE
    const durationByDiscipline = useMemo(() => {
        const stats: Record<string, number> = {};
        tasks.forEach(t => {
            const d = t.DISCIPLINE || 'Sans Discipline';
            stats[d] = (stats[d] || 0) + (t.DUREE || 0);
        });
        return Object.entries(stats).map(([name, value]) => ({ name, Duree: Number(value.toFixed(1)) })).sort((a, b) => b.Duree - a.Duree);
    }, [tasks]);

    // KPI 11: NOMBRE DES EQUIPE PAR DISCIPLINE ET TYPE
    const teamsByTypeAndDiscipline = useMemo(() => {
        const stats: Record<string, Record<string, Set<string>>> = {};
        tasks.forEach(t => {
            if (t.isScheduled && t['TYPE D\'EQUIPE']) {
                const d = t.DISCIPLINE || 'Sans Discipline';
                const type = `${t.EFFECTIF} Personne(s)`;
                if (!stats[d]) stats[d] = {};
                if (!stats[d][type]) stats[d][type] = new Set();
                stats[d][type].add(t['TYPE D\'EQUIPE']!);
            }
        });

        return Object.entries(stats).map(([discipline, types]) => {
            const res: any = { name: discipline };
            Object.entries(types).forEach(([type, set]) => {
                res[type] = set.size;
            });
            return res;
        });
    }, [tasks]);

    const teamTypesKeys = useMemo(() => {
        const keys = new Set<string>();
        teamsByTypeAndDiscipline.forEach(t => {
            Object.keys(t).forEach(k => { if (k !== 'name') keys.add(k); });
        });
        return Array.from(keys).sort();
    }, [teamsByTypeAndDiscipline]);

    // KPI 12: COMPARAISON ENTRE LES TRAVAUX PREVENTIVE ET CORRECTIVE
    const prevVsCorr = useMemo(() => {
        let p = 0;
        let c = 0;
        tasks.forEach(t => {
            const type = t['Type de Maintenance']?.toString().toLowerCase() || '';
            if (type.includes('prev') || type.includes('préventiv')) p++;
            else if (type.includes('corr')) c++;
        });
        return [{ name: 'Préventive', value: p }, { name: 'Corrective', value: c }];
    }, [tasks]);

    // KPI 13 & 14: par famille
    const statsByFamille = useMemo(() => {
        const stats: Record<string, { duration: number, count: number, teamSizes: Map<string, number>, teams: Set<string> }> = {};
        tasks.forEach(t => {
            const f = t.FAMILLE || 'Sans Famille';
            if (!stats[f]) stats[f] = { duration: 0, count: 0, teamSizes: new Map(), teams: new Set() };
            stats[f].duration += t.DUREE;
            stats[f].count++;
            if (t.isScheduled && t['TYPE D\'EQUIPE']) {
                const teamKey = `${t.DISCIPLINE}_${t['TYPE D\'EQUIPE']}`;
                stats[f].teams.add(teamKey);
                // Track the max EFFECTIF seen for each team (team size)
                const currentMax = stats[f].teamSizes.get(teamKey) || 0;
                if (t.EFFECTIF > currentMax) {
                    stats[f].teamSizes.set(teamKey, t.EFFECTIF);
                }
            }
        });

        return Object.entries(stats).map(([name, s]) => {
            // Personnes = sum of unique team sizes
            let totalPersonnes = 0;
            s.teamSizes.forEach(size => { totalPersonnes += size; });
            return {
                name,
                Duree: Number(s.duration.toFixed(1)),
                Taches: s.count,
                Personnes: totalPersonnes,
                Equipes: s.teams.size
            };
        }).sort((a, b) => b.Taches - a.Taches).slice(0, 15);
    }, [tasks]);

    // KPI 15: PREPARATIFS & THR & SCAFFOLDING & HANDLING & PERMITS
    const {
        prepCount, prepPct, thrCount, thrPct, scafCount, scafPct, handCount, handPct,
        pthCount, pthPct, pfCount, pfPct, ppCount, ppPct, plCount, plPct, peCount, pePct,
        prepByType, thrByType, scafByType, handByType,
        pthByType, pfByType, ppByType, plByType, peByType,
        pdrItemsCount, pdrByType
    } = useMemo(() => {
        let pCount = 0; let tCount = 0; let sCount = 0; let hCount = 0;
        let pthCount = 0; let pfCount = 0; let ppCount = 0; let plCount = 0; let peCount = 0;

        // Deduplicate PDR items globally by their unique ID
        const seenPdrIds = new Set<string | number>();
        const pdrTypeStats: Record<string, number> = {};

        const pTypes: Record<string, number> = {};
        const tTypes: Record<string, number> = {};
        const sTypes: Record<string, number> = {};
        const hTypes: Record<string, number> = {};
        const pthTypes: Record<string, number> = {};
        const pfTypes: Record<string, number> = {};
        const ppTypes: Record<string, number> = {};
        const plTypes: Record<string, number> = {};
        const peTypes: Record<string, number> = {};

        tasks.forEach(t => {
            const hasPdr = t.pdrItems && t.pdrItems.length > 0;
            const isPrep = (t['Préparatifs'] && String(t['Préparatifs']).trim() !== '0') || hasPdr;
            const isThr = (t['THR'] === 1 || t['COMMENTAIRE HSE'] === 1);
            const isScaf = t['Scaffolding Required'] === 1;
            const isHand = t['Handling required'] === 1;
            // Use strict OR to avoid double-counting when both fields are set
            const isPth = t.permisTravailHauteur === 1 || (!t.permisTravailHauteur && t['permis Travail Hauteur'] === 1);
            const isPf = t.permisFeu === 1 || (!t.permisFeu && t['permis Feu'] === 1);
            const isPp = t.permisPenetration === 1 || (!t.permisPenetration && t['permis Penetration'] === 1);
            const isPl = t.permisLevage === 1 || (!t.permisLevage && t['permis Levage'] === 1);
            const isPe = t.permisExcavation === 1 || (!t.permisExcavation && t['permis Excavation'] === 1);

            const rawType = String(t['Type de Maintenance'] || 'Non spécifié').trim();
            const mType = rawType.length > 0 ? (rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase()) : 'Non spécifié';

            if (isPrep) {
                if (hasPdr) {
                    t.pdrItems!.forEach(p => {
                        const pdrId = p.id ?? `${t.OT}_${p.sparePart}`;
                        if (!seenPdrIds.has(pdrId)) {
                            seenPdrIds.add(pdrId);
                            const pt = p.type || 'PDR';
                            pdrTypeStats[pt] = (pdrTypeStats[pt] || 0) + 1;
                        }
                    });
                }
                pCount++;
                pTypes[mType] = (pTypes[mType] || 0) + 1;
            }
            if (isThr) { tCount++; tTypes[mType] = (tTypes[mType] || 0) + 1; }
            if (isScaf) { sCount++; sTypes[mType] = (sTypes[mType] || 0) + 1; }
            if (isHand) { hCount++; hTypes[mType] = (hTypes[mType] || 0) + 1; }
            if (isPth) { pthCount++; pthTypes[mType] = (pthTypes[mType] || 0) + 1; }
            if (isPf) { pfCount++; pfTypes[mType] = (pfTypes[mType] || 0) + 1; }
            if (isPp) { ppCount++; ppTypes[mType] = (ppTypes[mType] || 0) + 1; }
            if (isPl) { plCount++; plTypes[mType] = (plTypes[mType] || 0) + 1; }
            if (isPe) { peCount++; peTypes[mType] = (peTypes[mType] || 0) + 1; }
        });

        const total = tasks.length || 1;
        return {
            prepCount: pCount, prepPct: (pCount / total) * 100,
            thrCount: tCount, thrPct: (tCount / total) * 100,
            scafCount: sCount, scafPct: (sCount / total) * 100,
            handCount: hCount, handPct: (hCount / total) * 100,
            pthCount, pthPct: (pthCount / total) * 100,
            pfCount, pfPct: (pfCount / total) * 100,
            ppCount, ppPct: (ppCount / total) * 100,
            plCount, plPct: (plCount / total) * 100,
            peCount, pePct: (peCount / total) * 100,
            prepByType: Object.entries(pTypes).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            thrByType: Object.entries(tTypes).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            scafByType: Object.entries(sTypes).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            handByType: Object.entries(hTypes).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            pthByType: Object.entries(pthTypes).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            pfByType: Object.entries(pfTypes).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            ppByType: Object.entries(ppTypes).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            plByType: Object.entries(plTypes).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            peByType: Object.entries(peTypes).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
            pdrItemsCount: seenPdrIds.size,
            pdrByType: Object.entries(pdrTypeStats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
        };
    }, [tasks]);

    // State for Famille — Équipes & Personnes
    const [familleSearch, setFamilleSearch] = useState('');
    const [familleSort, setFamilleSort] = useState<'Taches' | 'Equipes' | 'Personnes'>('Taches');
    const filteredFamilleData = useMemo(() => {
        const q = familleSearch.toLowerCase();
        return statsByFamille
            .filter(f => !q || f.name.toLowerCase().includes(q))
            .sort((a, b) => b[familleSort] - a[familleSort]);
    }, [statsByFamille, familleSearch, familleSort]);

    // State for Famille — Durée & Tâches
    const [dureeSearch, setDureeSearch] = useState('');
    const [dureeSort, setDureeSort] = useState<'Duree' | 'Taches'>('Duree');
    const filteredDureeData = useMemo(() => {
        const q = dureeSearch.toLowerCase();
        return statsByFamille
            .filter(f => !q || f.name.toLowerCase().includes(q))
            .sort((a, b) => b[dureeSort] - a[dureeSort]);
    }, [statsByFamille, dureeSearch, dureeSort]);

    return (
        <div className="space-y-8 bg-[#06080C] p-6 sm:p-8 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-800 relative z-0">
            {/* ── HEADER ── */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-12 gap-6 border-b border-white/[0.04] pb-8">

                {/* Left: Brand */}
                <div className="relative pl-5">
                    <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-gradient-to-b from-emerald-400 via-cyan-400 to-indigo-500 shadow-[0_0_12px_rgba(34,211,238,0.4)]"></div>
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] mb-1">PlanneX · Analyse Expert</div>
                    <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-indigo-400 tracking-tight uppercase">
                        Tableau de Bord Expert
                    </h2>
                    <p className="text-slate-600 font-black text-[9px] tracking-[0.35em] uppercase mt-1.5">Intelligence Opérationnelle &amp; Performance</p>
                </div>

                {/* Right: Premium toggle controls */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-950/80 backdrop-blur-2xl rounded-2xl border border-white/8 shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-1 ring-white/[0.03]">
                    {[
                        { label: 'Légende', checked: showLegend, onChange: setShowLegend, activeColor: 'from-emerald-500 to-emerald-600', glow: 'rgba(16,185,129,0.35)', icon: '◈' },
                        { label: 'Tableau', checked: showTable, onChange: setShowTable, activeColor: 'from-cyan-500 to-cyan-600', glow: 'rgba(34,211,238,0.35)', icon: '⊞' },
                        { label: 'Étiquettes', checked: showLabels, onChange: setShowLabels, activeColor: 'from-indigo-500 to-indigo-600', glow: 'rgba(99,102,241,0.35)', icon: '⌖' },
                    ].map(({ label, checked, onChange, activeColor, glow, icon }) => (
                        <button
                            key={label}
                            onClick={() => onChange(!checked)}
                            style={checked ? { boxShadow: `0 0 16px ${glow}` } : {}}
                            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 select-none ${checked
                                ? `bg-gradient-to-r ${activeColor} text-white border border-white/20`
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] border border-transparent'
                                }`}
                        >
                            <span className={`text-[11px] transition-all duration-300 ${checked ? 'opacity-100' : 'opacity-30'}`}>{icon}</span>
                            {label}
                            {checked && (
                                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-white/80 shadow-[0_0_6px_rgba(255,255,255,0.5)]"></span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Dashboard Visualizations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* ROW 1: SUMMARY METRICS — Premium Cards */}
                <div className="col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-5 mb-2">
                    {[
                        {
                            label: 'Total Tâches',
                            value: totalTasks,
                            unit: 'OT',
                            sub: 'Ordres de travail actifs',
                            accent: { bg: 'bg-cyan-500/8', border: 'border-cyan-500/20', glow: 'rgba(34,211,238,0.08)', text: 'text-cyan-400', orb: 'bg-cyan-400', bar: 'from-cyan-500 to-cyan-400' },
                            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
                        },
                        {
                            label: 'Équipes Déployées',
                            value: totalTeamsCreated,
                            unit: 'EQ',
                            sub: 'Équipes planifiées & actives',
                            accent: { bg: 'bg-violet-500/8', border: 'border-violet-500/20', glow: 'rgba(139,92,246,0.08)', text: 'text-violet-400', orb: 'bg-violet-400', bar: 'from-violet-500 to-indigo-400' },
                            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                        },
                        {
                            label: 'Durée Estimée',
                            value: dureeArretHours.toFixed(1),
                            unit: 'H',
                            sub: 'Fenêtre de l\'arrêt planifié',
                            accent: { bg: 'bg-rose-500/8', border: 'border-rose-500/20', glow: 'rgba(244,63,94,0.08)', text: 'text-rose-400', orb: 'bg-rose-400', bar: 'from-rose-500 to-pink-400' },
                            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                        },
                    ].map(({ label, value, unit, sub, accent, icon }) => (
                        <div
                            key={label}
                            style={{ boxShadow: `0 0 60px ${accent.glow}, inset 0 1px 0 rgba(255,255,255,0.04)` }}
                            className={`relative overflow-hidden rounded-[2rem] border ${accent.border} ${accent.bg} backdrop-blur-xl p-7 group cursor-default transition-all duration-500 hover:scale-[1.01]`}
                        >
                            {/* Ambient orb */}
                            <div className={`absolute -top-10 -right-10 w-40 h-40 ${accent.orb} opacity-[0.06] rounded-full blur-[60px] group-hover:opacity-[0.12] transition-opacity duration-700`} />
                            {/* Shimmer line */}
                            <div className={`absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r ${accent.bar} opacity-30`} />

                            <div className="relative z-10">
                                {/* Icon + label row */}
                                <div className="flex items-center gap-3 mb-5">
                                    <div className={`p-2 rounded-xl border ${accent.border} ${accent.text}`}>
                                        {icon}
                                    </div>
                                    <span className="text-slate-500 font-black uppercase tracking-[0.2em] text-[9px]">{label}</span>
                                </div>

                                {/* Big value */}
                                <div className="flex items-baseline gap-2 mb-4">
                                    <span className={`text-[3.5rem] leading-none font-black tabular-nums ${accent.text} drop-shadow-[0_0_20px_currentColor]`}>{value}</span>
                                    <span className={`text-xs font-black uppercase tracking-widest ${accent.text} opacity-60`}>{unit}</span>
                                </div>

                                {/* Sub-label */}
                                <p className="text-slate-600 text-[9px] font-bold uppercase tracking-widest mb-4">{sub}</p>

                                {/* Decorative bar */}
                                <div className="h-1 w-full bg-slate-800/60 rounded-full overflow-hidden">
                                    <div className={`h-full w-4/5 rounded-full bg-gradient-to-r ${accent.bar} opacity-70`} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ROW 2 */}

                {/* AVANCEMENT GLOBAL (SPEEDOMETER) */}
                <KpiCardExpert
                    title="progrès de la planification"
                    showTable={false}
                >
                    <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none mt-8">
                        <div className="relative flex flex-col items-center">
                            <span className="text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] tabular-nums mt-12 z-50">
                                {globalAdvancement.toFixed(1)}%
                            </span>
                            <span className="text-emerald-400 font-extrabold uppercase tracking-[0.2em] text-[9px] mt-2 drop-shadow-lg bg-slate-900/80 px-4 py-1.5 rounded-full backdrop-blur-lg border border-emerald-500/30 z-50">
                                Réalisé
                            </span>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <defs>
                                <linearGradient id="colorSpeedometer" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#ef4444" />
                                    <stop offset="50%" stopColor="#f59e0b" />
                                    <stop offset="100%" stopColor="#10b981" />
                                </linearGradient>
                            </defs>
                            <Pie
                                data={[
                                    { name: 'Avancé', value: globalAdvancement, fill: 'url(#colorSpeedometer)' },
                                    { name: 'Restant', value: 100 - globalAdvancement, fill: '#1e293b' }
                                ]}
                                cx="50%"
                                cy="70%"
                                startAngle={180}
                                endAngle={0}
                                innerRadius="70%"
                                outerRadius="100%"
                                dataKey="value"
                                stroke="none"
                                cornerRadius={6}
                                paddingAngle={2}
                            />
                            <RechartsTooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </KpiCardExpert>

                <KpiCardExpert
                    title="progrès de la planification des équipes"
                    showTable={showTable}
                    data={advancementByDiscipline}
                    columns={[{ key: 'name', label: 'Discipline' }, { key: 'Avancement', label: 'Avancement (%)' }]}
                >
                    <div className="absolute right-8 top-8">
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest italic opacity-40">Analyse par Secteur</p>
                    </div>

                    <div className="flex-1 flex flex-col pt-4">
                        <div className="h-[380px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={advancementByDiscipline}>
                                    <PolarGrid stroke="rgba(255,255,255,0.07)" />
                                    <PolarAngleAxis
                                        dataKey="name"
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'black' }}
                                    />
                                    <PolarRadiusAxis
                                        angle={30}
                                        domain={[0, 100]}
                                        tick={false}
                                        axisLine={false}
                                    />
                                    <Radar
                                        name="Avancement"
                                        dataKey="Avancement"
                                        stroke="#22d3ee"
                                        fill="#22d3ee"
                                        fillOpacity={0.15}
                                        strokeWidth={4}
                                        animationDuration={2000}
                                        animationBegin={200}
                                    />
                                    <RechartsTooltip content={<CustomTooltip />} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Badges removed — data visible on hover in radar */}
                    </div>
                </KpiCardExpert>

                <KpiCardExpert
                    title="Tâches par Discipline"
                    showTable={showTable}
                    data={tasksByDiscipline}
                    columns={[{ key: 'name', label: 'Discipline' }, { key: 'value', label: 'Tâches' }]}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={tasksByDiscipline} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="40%" outerRadius="80%" paddingAngle={2} label={showLabels ? { fill: '#e2e8f0', fontSize: 11 } : false} stroke="#0f172a" strokeWidth={2}>
                                {tasksByDiscipline.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <RechartsTooltip content={<CustomTooltip />} />
                            {showLegend && <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '10px' }} />}
                        </PieChart>
                    </ResponsiveContainer>
                </KpiCardExpert>


                {/* ROW 3 */}
                <KpiCardExpert
                    title="Prérequis par Discipline"
                    showTable={showTable}
                    data={requirementsByDiscipline}
                    columns={[
                        { key: 'name', label: 'Discipline' },
                        { key: 'Spare Part', label: 'Spare Part' },
                        { key: 'Échafaudage', label: 'Échafaudage' },
                        { key: 'Manutention', label: 'Manutention' },
                        { key: 'Permis Pénétration', label: 'P.Pénétration' },
                        { key: 'Travail Hauteur', label: 'P.Hauteur' },
                        { key: 'Travail à Feu', label: 'P.Feu' },
                        { key: 'Levage', label: 'P.Levage' },
                        { key: 'Excavation', label: 'P.Excavation' },
                        { key: 'Instruction Travail', label: 'Instr.Travail' },
                        { key: 'Éval. Risque', label: 'Éval.Risque' },
                    ]}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={requirementsByDiscipline} margin={{ top: 20 }}>
                            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9, fill: '#cbd5e1' }} axisLine={false} tickLine={false} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <RechartsTooltip
                                cursor={{ fill: '#1e293b' }}
                                content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null;
                                    const nonZero = payload.filter(p => (p.value as number) > 0);
                                    if (nonZero.length === 0) return null;
                                    return (
                                        <div className="bg-slate-900 border border-slate-700/50 p-4 rounded-xl shadow-2xl text-sm">
                                            <p className="font-bold text-white mb-3 tracking-wide">{label}</p>
                                            {nonZero.map((entry: any, i: number) => (
                                                <div key={i} className="flex items-center gap-3 mb-1.5">
                                                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                                    <span className="text-slate-300 font-medium">{entry.name}:</span>
                                                    <span className="text-white font-bold font-mono ml-auto">{entry.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                }}
                            />
                            {showLegend && <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />}
                            <Bar dataKey="Spare Part" stackId="a" fill="#0ea5e9" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="Échafaudage" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="Manutention" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="Permis Pénétration" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="Travail Hauteur" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="Travail à Feu" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="Levage" stackId="a" fill="#14b8a6" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="Excavation" stackId="a" fill="#d946ef" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="Instruction Travail" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="Éval. Risque" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </KpiCardExpert>

                <KpiCardExpert
                    title="Équipes par Discipline et par Taille"
                    showTable={showTable}
                    data={teamsByTypeAndDiscipline}
                    columns={[
                        { key: 'name', label: 'Discipline' },
                        ...teamTypesKeys.map(k => ({ key: k, label: k }))
                    ]}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={teamsByTypeAndDiscipline} margin={{ top: 20 }}>
                            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fill: '#cbd5e1' }} axisLine={false} tickLine={false} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                            {showLegend && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />}
                            {teamTypesKeys.map((key, index) => (
                                <Bar key={key} dataKey={key} stackId="a" fill={COLORS[(index + 4) % COLORS.length]} radius={index === teamTypesKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}>
                                    {showLabels && <LabelList dataKey={key} position="center" fill="#fff" fontSize={10} />}
                                </Bar>
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </KpiCardExpert>


                {/* ROW 4 */}
                <KpiCardExpert
                    title="Heures-Homme par Discipline"
                    showTable={showTable}
                    data={manHoursByDiscipline}
                    columns={[{ key: 'name', label: 'Discipline' }, { key: 'HH', label: 'Heures-Homme' }]}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={manHoursByDiscipline} margin={{ top: 20 }}>
                            <defs>
                                <linearGradient id="colorHH" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={1} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.3} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fill: '#cbd5e1' }} axisLine={false} tickLine={false} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                            {showLegend && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />}
                            <Bar dataKey="HH" fill="url(#colorHH)" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                {showLabels && <LabelList dataKey="HH" position="top" fill="#f59e0b" fontSize={11} />}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </KpiCardExpert>

                <KpiCardExpert
                    title="Durée Totale (h) par Discipline"
                    showTable={showTable}
                    data={durationByDiscipline}
                    columns={[{ key: 'name', label: 'Discipline' }, { key: 'Duree', label: 'Durée (h)' }]}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={durationByDiscipline} margin={{ top: 20 }}>
                            <defs>
                                <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={1} />
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fill: '#cbd5e1' }} axisLine={false} tickLine={false} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                            {showLegend && <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />}
                            <Bar dataKey="Duree" fill="url(#colorDuration)" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                {showLabels && <LabelList dataKey="Duree" position="top" fill="#0ea5e9" fontSize={11} />}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </KpiCardExpert>

                <KpiCardExpert
                    title="Préventive vs Corrective"
                    showTable={showTable}
                    data={prevVsCorr}
                    columns={[{ key: 'name', label: 'Type' }, { key: 'value', label: 'Tâches' }]}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={prevVsCorr} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" stroke="#0f172a" strokeWidth={3} paddingAngle={5} label={showLabels ? { fill: '#e2e8f0', fontSize: 12, fontWeight: 'bold' } : false}>
                                <Cell fill="#10b981" />
                                <Cell fill="#ef4444" />
                            </Pie>
                            <RechartsTooltip content={<CustomTooltip />} />
                            {showLegend && <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '11px' }} />}
                        </PieChart>
                    </ResponsiveContainer>
                </KpiCardExpert>


                {/* ROW 5 */}
                <KpiCardExpert
                    title="Durée & Tâches par Famille"
                    showTable={false}
                    data={filteredDureeData}
                    columns={[{ key: 'name', label: 'Famille' }, { key: 'Duree', label: 'Durée (h)' }, { key: 'Taches', label: 'Tâches' }]}
                >
                    <div className="flex flex-col" style={{ height: '280px' }}>
                        {/* Search + sort */}
                        <div className="flex gap-2 flex-shrink-0 mb-3">
                            <div className="relative flex-grow">
                                <input
                                    type="search"
                                    value={dureeSearch}
                                    onChange={e => setDureeSearch(e.target.value)}
                                    placeholder="Rechercher une famille…"
                                    className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl pl-8 pr-3 py-2 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                                <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <select
                                value={dureeSort}
                                onChange={e => setDureeSort(e.target.value as any)}
                                className="bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2 text-[11px] text-slate-300 focus:outline-none focus:border-blue-500/50 transition-colors"
                            >
                                <option value="Duree">Durée (H)</option>
                                <option value="Taches">Tâches</option>
                            </select>
                        </div>

                        {/* Ranked list */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1 min-h-0">
                            {filteredDureeData.map((f, i) => {
                                const maxDuree = filteredDureeData[0]?.Duree || 1;
                                const maxTaches = filteredDureeData[0]?.Taches || 1;
                                const dureePct = Math.round((f.Duree / maxDuree) * 100);
                                const tachesPct = Math.round((f.Taches / maxTaches) * 100);
                                return (
                                    <div key={f.name} className="flex items-center gap-3 group hover:bg-slate-800/40 rounded-xl px-3 py-2 transition-colors">
                                        <span className="text-[9px] font-black text-slate-700 w-5 text-right tabular-nums flex-shrink-0">{i + 1}</span>
                                        <div className="flex-grow min-w-0">
                                            {/* Name + values */}
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] font-bold text-slate-300 truncate" title={f.name}>{f.name}</span>
                                                <div className="flex gap-3 ml-2 flex-shrink-0">
                                                    <span className="text-[9px] text-blue-400 font-black tabular-nums">{f.Duree.toFixed(0)}<span className="text-slate-600">h</span></span>
                                                    <span className="text-[9px] text-emerald-400 font-black tabular-nums">{f.Taches}<span className="text-slate-600">t</span></span>
                                                </div>
                                            </div>
                                            {/* Dual bars */}
                                            <div className="space-y-0.5">
                                                <div className="h-[3px] bg-slate-800/80 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-700"
                                                        style={{ width: `${dureePct}%` }}
                                                    />
                                                </div>
                                                <div className="h-[3px] bg-slate-800/80 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-green-400 transition-all duration-700"
                                                        style={{ width: `${tachesPct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredDureeData.length === 0 && (
                                <div className="flex items-center justify-center h-20 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                                    Aucune famille trouvée
                                </div>
                            )}
                        </div>

                        {/* Legend + count footer */}
                        <div className="flex-shrink-0 flex items-center justify-between pt-2 border-t border-white/[0.04] mt-2">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1.5 text-[9px] text-slate-600 font-black uppercase tracking-widest">
                                    <span className="w-4 h-[3px] rounded-full bg-gradient-to-r from-blue-600 to-cyan-400 inline-block"></span>
                                    Durée
                                </span>
                                <span className="flex items-center gap-1.5 text-[9px] text-slate-600 font-black uppercase tracking-widest">
                                    <span className="w-4 h-[3px] rounded-full bg-gradient-to-r from-emerald-600 to-green-400 inline-block"></span>
                                    Tâches
                                </span>
                            </div>
                            <span className="text-[9px] text-slate-700 font-black uppercase tracking-widest">
                                {filteredDureeData.length} / {statsByFamille.length} familles
                            </span>
                        </div>
                    </div>
                </KpiCardExpert>

                <KpiCardExpert
                    title="Équipes & Personnes par Famille"
                    showTable={false}
                    data={filteredFamilleData}
                    columns={[{ key: 'name', label: 'Famille' }, { key: 'Equipes', label: 'Équipes' }, { key: 'Personnes', label: 'Personnes' }, { key: 'Taches', label: 'Tâches' }]}
                >
                    {/* Same fixed height as other KpiCardExpert children (min-h-[280px]) */}
                    <div className="flex flex-col" style={{ height: '280px' }}>
                        {/* Search + sort controls */}
                        <div className="flex gap-2 flex-shrink-0 mb-3">
                            <div className="relative flex-grow">
                                <input
                                    type="search"
                                    value={familleSearch}
                                    onChange={e => setFamilleSearch(e.target.value)}
                                    placeholder="Rechercher une famille…"
                                    className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl pl-8 pr-3 py-2 text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                />
                                <svg className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <select
                                value={familleSort}
                                onChange={e => setFamilleSort(e.target.value as any)}
                                className="bg-slate-900/60 border border-slate-700/50 rounded-xl px-3 py-2 text-[11px] text-slate-300 focus:outline-none focus:border-cyan-500/50 transition-colors"
                            >
                                <option value="Taches">Tâches</option>
                                <option value="Equipes">Équipes</option>
                                <option value="Personnes">Personnes</option>
                            </select>
                        </div>
                        {/* Scrollable ranked list — fills remaining height */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1 min-h-0">
                            {filteredFamilleData.map((f, i) => {
                                const maxVal = filteredFamilleData[0]?.[familleSort] || 1;
                                const pct = Math.round((f[familleSort] / maxVal) * 100);
                                return (
                                    <div key={f.name} className="flex items-center gap-3 group hover:bg-slate-800/40 rounded-xl px-3 py-2 transition-colors">
                                        <span className="text-[9px] font-black text-slate-700 w-5 text-right tabular-nums flex-shrink-0">{i + 1}</span>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] font-bold text-slate-300 truncate" title={f.name}>{f.name}</span>
                                                <div className="flex gap-2 ml-2 flex-shrink-0">
                                                    <span className="text-[9px] text-pink-400 font-black tabular-nums">{f.Equipes}<span className="text-slate-600">eq</span></span>
                                                    <span className="text-[9px] text-violet-400 font-black tabular-nums">{f.Personnes}<span className="text-slate-600">p</span></span>
                                                    <span className="text-[9px] text-cyan-400 font-black tabular-nums">{f.Taches}<span className="text-slate-600">t</span></span>
                                                </div>
                                            </div>
                                            <div className="h-[3px] bg-slate-800/80 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-700"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {filteredFamilleData.length === 0 && (
                                <div className="flex items-center justify-center h-20 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                                    Aucune famille trouvée
                                </div>
                            )}
                        </div>
                        {/* Footer count */}
                        <div className="flex-shrink-0 text-[9px] text-slate-700 font-black uppercase tracking-widest text-center pt-2 border-t border-white/[0.04] mt-2">
                            {filteredFamilleData.length} / {statsByFamille.length} familles
                        </div>
                    </div>
                </KpiCardExpert>

                {/* ROW 6: THR */}
                <KpiCardExpert
                    title="Analyse Tâches Haut Risque"
                    showTable={showTable}
                    data={thrByType}
                    columns={[{ key: 'name', label: 'Type' }, { key: 'value', label: 'Tâches' }]}
                >
                    <div className="flex flex-col h-full w-full">
                        <div className="flex justify-around items-center mb-4 bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                            <div className="text-center">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">Total THR</p>
                                <p className="text-2xl font-black text-rose-500">{thrCount}</p>
                            </div>
                            <div className="w-px h-10 bg-slate-700"></div>
                            <div className="text-center">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">% du Global</p>
                                <p className="text-2xl font-black text-orange-400">{thrPct.toFixed(1)}%</p>
                            </div>
                        </div>
                        <div className="flex-grow min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={thrByType} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" stroke="#0f172a" strokeWidth={3} paddingAngle={5} label={showLabels ? { fill: '#e2e8f0', fontSize: 12, fontWeight: 'bold' } : false}>
                                        {thrByType.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    {showLegend && <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '11px' }} />}
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </KpiCardExpert>

                {/* ROW 7: SCAFFOLDING ET MANUTENTION */}
                <KpiCardExpert
                    title="Analyse Échafaudage"
                    showTable={showTable}
                    data={scafByType}
                    columns={[{ key: 'name', label: 'Type' }, { key: 'value', label: 'Tâches' }]}
                >
                    <div className="flex flex-col h-full w-full">
                        <div className="flex justify-around items-center mb-4 bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                            <div className="text-center">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">Total Échafaudage</p>
                                <p className="text-2xl font-black text-amber-500">{scafCount}</p>
                            </div>
                            <div className="w-px h-10 bg-slate-700"></div>
                            <div className="text-center">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">% du Global</p>
                                <p className="text-2xl font-black text-amber-400">{scafPct.toFixed(1)}%</p>
                            </div>
                        </div>
                        <div className="flex-grow min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={scafByType} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" stroke="#0f172a" strokeWidth={3} paddingAngle={5} label={showLabels ? { fill: '#e2e8f0', fontSize: 12, fontWeight: 'bold' } : false}>
                                        {scafByType.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    {showLegend && <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '11px' }} />}
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </KpiCardExpert>

                <KpiCardExpert
                    title="Analyse Manutention"
                    showTable={showTable}
                    data={handByType}
                    columns={[{ key: 'name', label: 'Type' }, { key: 'value', label: 'Tâches' }]}
                >
                    <div className="flex flex-col h-full w-full">
                        <div className="flex justify-around items-center mb-4 bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                            <div className="text-center">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">Total Manutention</p>
                                <p className="text-2xl font-black text-fuchsia-500">{handCount}</p>
                            </div>
                            <div className="w-px h-10 bg-slate-700"></div>
                            <div className="text-center">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">% du Global</p>
                                <p className="text-2xl font-black text-fuchsia-400">{handPct.toFixed(1)}%</p>
                            </div>
                        </div>
                        <div className="flex-grow min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={handByType} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" stroke="#0f172a" strokeWidth={3} paddingAngle={5} label={showLabels ? { fill: '#e2e8f0', fontSize: 12, fontWeight: 'bold' } : false}>
                                        {handByType.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    {showLegend && <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '11px' }} />}
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </KpiCardExpert>

                {/* ROW 8: PERMITS KPIs */}
                <KpiCardExpert
                    title="Analyse Permis Levage"
                    showTable={showTable}
                    data={plByType}
                    columns={[{ key: 'name', label: 'Type' }, { key: 'value', label: 'Tâches' }]}
                >
                    <div className="flex flex-col h-full w-full">
                        <div className="flex justify-around items-center mb-4 bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                            <div className="text-center">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">Total P. Levage</p>
                                <p className="text-2xl font-black text-blue-500">{plCount}</p>
                            </div>
                            <div className="w-px h-10 bg-slate-700"></div>
                            <div className="text-center">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">% du Global</p>
                                <p className="text-2xl font-black text-blue-400">{plPct.toFixed(1)}%</p>
                            </div>
                        </div>
                        <div className="flex-grow min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={plByType} margin={{ top: 20 }}>
                                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fill: '#cbd5e1' }} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                                    {showLegend && <Legend wrapperStyle={{ fontSize: '11px' }} />}
                                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                        {plByType.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                                        ))}
                                        {showLabels && <LabelList dataKey="value" position="top" fill="#e2e8f0" fontSize={11} />}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </KpiCardExpert>

                <KpiCardExpert
                    title="Analyse Permis Travail Hauteur"
                    showTable={showTable}
                    data={pthByType}
                    columns={[{ key: 'name', label: 'Type' }, { key: 'value', label: 'Tâches' }]}
                >
                    <div className="flex flex-col h-full w-full">
                        <div className="flex justify-around items-center mb-4 bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                            <div className="text-center">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">Total P. Hauteur</p>
                                <p className="text-2xl font-black text-red-500">{pthCount}</p>
                            </div>
                            <div className="w-px h-10 bg-slate-700"></div>
                            <div className="text-center">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">% du Global</p>
                                <p className="text-2xl font-black text-red-400">{pthPct.toFixed(1)}%</p>
                            </div>
                        </div>
                        <div className="flex-grow min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={pthByType} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#cbd5e1' }} width={90} />
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={true} horizontal={false} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={32}>
                                        {pthByType.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                                        ))}
                                        {showLabels && <LabelList dataKey="value" position="right" fill="#e2e8f0" fontSize={11} />}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </KpiCardExpert>

                <KpiCardExpert
                    title="Analyse Permis Feu"
                    showTable={showTable}
                    data={pfByType}
                    columns={[{ key: 'name', label: 'Type' }, { key: 'value', label: 'Tâches' }]}
                >
                    <div className="flex flex-col h-full w-full">
                        <div className="flex justify-around items-center mb-4 bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                            <div className="text-center">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">Total P. Feu</p>
                                <p className="text-2xl font-black text-orange-500">{pfCount}</p>
                            </div>
                            <div className="w-px h-10 bg-slate-700"></div>
                            <div className="text-center">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">% du Global</p>
                                <p className="text-2xl font-black text-orange-400">{pfPct.toFixed(1)}%</p>
                            </div>
                        </div>
                        <div className="flex-grow min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={pfByType} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 10, fill: '#cbd5e1' }} axisLine={false} tickLine={false} width={80} />
                                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                                    {showLegend && <Legend wrapperStyle={{ fontSize: '11px' }} />}
                                    <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} maxBarSize={30}>
                                        {pfByType.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                        ))}
                                        {showLabels && <LabelList dataKey="value" position="right" fill="#e2e8f0" fontSize={11} />}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </KpiCardExpert>

                <KpiCardExpert
                    title="Analyse Permis Pénétration"
                    showTable={showTable}
                    data={ppByType}
                    columns={[{ key: 'name', label: 'Type' }, { key: 'value', label: 'Tâches' }]}
                >
                    <div className="flex flex-col h-full w-full">
                        <div className="flex justify-around items-center mb-4 bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                            <div className="text-center">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">Total P. Pénétration</p>
                                <p className="text-2xl font-black text-purple-500">{ppCount}</p>
                            </div>
                            <div className="w-px h-10 bg-slate-700"></div>
                            <div className="text-center">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">% du Global</p>
                                <p className="text-2xl font-black text-purple-400">{ppPct.toFixed(1)}%</p>
                            </div>
                        </div>
                        <div className="flex-grow min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={ppByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" stroke="#0f172a" strokeWidth={2} label={showLabels ? { fill: '#e2e8f0', fontSize: 12, fontWeight: 'bold' } : false}>
                                        {ppByType.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    {showLegend && <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '11px' }} />}
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </KpiCardExpert>

                <KpiCardExpert
                    title="Analyse Permis Excavation"
                    showTable={showTable}
                    data={peByType}
                    columns={[{ key: 'name', label: 'Type' }, { key: 'value', label: 'Tâches' }]}
                >
                    <div className="flex flex-col h-full w-full">
                        <div className="flex justify-around items-center mb-4 bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                            <div className="text-center">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">Total P. Excavation</p>
                                <p className="text-2xl font-black text-yellow-500">{peCount}</p>
                            </div>
                            <div className="w-px h-10 bg-slate-700"></div>
                            <div className="text-center">
                                <p className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1">% du Global</p>
                                <p className="text-2xl font-black text-yellow-400">{pePct.toFixed(1)}%</p>
                            </div>
                        </div>
                        <div className="flex-grow min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={peByType} dataKey="value" nameKey="name" cx="50%" cy="80%" startAngle={180} endAngle={0} innerRadius="60%" outerRadius="100%" stroke="#0f172a" strokeWidth={2} paddingAngle={2} label={showLabels ? { fill: '#e2e8f0', fontSize: 12, fontWeight: 'bold' } : false}>
                                        {peByType.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                    {showLegend && <Legend layout="vertical" align="right" verticalAlign="top" wrapperStyle={{ fontSize: '11px' }} />}
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </KpiCardExpert>
            </div>
        </div>

    );
};
