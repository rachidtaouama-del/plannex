import React, { useMemo, useState } from 'react';
import type { ScheduledTask } from '../types';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie
} from 'recharts';

const formatDate = (date: Date) => {
    return date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

interface TaskBlock {
    id: string;
    action: string;
    equipment: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    teams: string[];
    isCoActivity: boolean;
    predecessorBlockIds: string[];
    originalTaskIds: number[];
}

interface ChainLink {
    block: TaskBlock;
    linkToNext?: 'logical' | 'resource' | 'mixed';
}

const LinkHUD: React.FC<{ linkType: ChainLink['linkToNext'] }> = ({ linkType }) => {
    if (!linkType) return null;

    const typeConfig = {
        logical: {
            label: "Liaison Logique",
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            border: "border-blue-500/30",
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
        },
        resource: {
            label: "Liaison Ressource",
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            border: "border-amber-500/30 border-dashed",
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        },
        mixed: {
            label: "Liaison Critique (Mixte)",
            color: "text-red-400",
            bg: "bg-red-500/10",
            border: "border-red-500/40",
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v20M5 12l7 7 7-7" /><path d="M18.6 6.6l-6.6 6.6-6.6-6.6" /></svg>
        },
    };

    const config = typeConfig[linkType];

    return (
        <div className="flex flex-col items-center py-2 relative">
            <div className={`w-0.5 h-6 ${config.border.replace('border-', 'bg-').split(' ')[0]} opacity-30`}></div>
            <div className={`group relative flex items-center justify-center gap-2 px-4 py-1.5 rounded-full border ${config.bg} ${config.border} ${config.color} transition-all duration-300 hover:scale-105 my-1 shadow-lg`}>
                {config.icon}
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{config.label}</span>
                <div className="absolute inset-0 bg-current opacity-10 blur-md rounded-full -z-10 animate-pulse"></div>
            </div>
            <div className={`w-0.5 h-6 ${config.border.replace('border-', 'bg-').split(' ')[0]} opacity-30`}></div>
        </div>
    );
};

const AnalyticsCard: React.FC<{ title: string; value: string | number; subtitle?: string; icon: React.ReactNode; color: string; status?: string; statusColor?: string }> = ({ title, value, subtitle, icon, color, status = "ACTIF", statusColor = "text-emerald-500" }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2 group transition-all duration-500 hover:border-white/20 hover:bg-white/[0.07]">
        <div className="flex items-center justify-between">
            <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center text-white shadow-lg`}>
                {icon}
            </div>
            <div className="flex items-center gap-1.5">
                <div className={`w-1 h-1 rounded-full ${statusColor.replace('text-', 'bg-')} animate-pulse`}></div>
                <span className={`text-[8px] font-black ${statusColor} uppercase tracking-widest leading-none`}>{status}</span>
            </div>
        </div>
        <div>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">{title}</p>
            <h4 className="text-xl font-black text-white italic tracking-tighter leading-none truncate">{value}</h4>
            {subtitle && <p className="text-[9px] font-medium text-slate-500 mt-1 leading-tight">{subtitle}</p>}
        </div>
    </div>
);

export const DependencyChainModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    tasks: ScheduledTask[];
}> = ({ isOpen, onClose, tasks }) => {
    const [teamFilter, setTeamFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [showHelp, setShowHelp] = useState<boolean>(false);

    const allTeams = useMemo(() => {
        return [...new Set(tasks.map(t => t.team))].sort();
    }, [tasks]);

    const { chains, isolatedTasks, analytics } = useMemo(() => {
        if (!tasks || tasks.length === 0) {
            return { chains: [], isolatedTasks: [], analytics: null };
        }

        // 1. Group ScheduledTask[] into TaskBlock[]
        const taskGroups = new Map<string, ScheduledTask[]>();
        tasks.forEach(task => {
            const key = task.multiDisciplineId || `single_${task.id}`;
            if (!taskGroups.has(key)) taskGroups.set(key, []);
            taskGroups.get(key)!.push(task);
        });

        const taskBlocks: TaskBlock[] = [];
        const taskBlocksById = new Map<string, TaskBlock>();
        const originalTaskToBlockId = new Map<number, string>();

        taskGroups.forEach((tasksInGroup, key) => {
            const mainTask = tasksInGroup[0];
            const allPredecessorIds = [...new Set(tasksInGroup.flatMap(t => t.predecessor || []))];

            tasksInGroup.forEach(t => originalTaskToBlockId.set(t.id, key));

            const block: TaskBlock = {
                id: key,
                action: mainTask.action,
                equipment: mainTask.equipment,
                startTime: mainTask.startTime,
                endTime: mainTask.endTime,
                duration: mainTask.duration,
                teams: [...new Set(tasksInGroup.map(t => t.team))].sort(),
                isCoActivity: tasksInGroup.length > 1,
                predecessorBlockIds: [...new Set(allPredecessorIds.map(tid => originalTaskToBlockId.get(tid)).filter((id): id is string => !!id && taskGroups.has(id)))],
                originalTaskIds: tasksInGroup.map(t => t.id),
            };
            taskBlocks.push(block);
            taskBlocksById.set(key, block);
        });

        // 2. Determine Resource Successors
        const tasksByTeam = new Map<string, TaskBlock[]>();
        taskBlocks.forEach(block => {
            block.teams.forEach(team => {
                if (!tasksByTeam.has(team)) tasksByTeam.set(team, []);
                tasksByTeam.get(team)!.push(block);
            });
        });
        tasksByTeam.forEach(teamTasks => teamTasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()));

        const resourceSuccessors = new Map<string, string>();
        tasksByTeam.forEach(teamTasks => {
            for (let i = 0; i < teamTasks.length - 1; i++) {
                resourceSuccessors.set(teamTasks[i].id, teamTasks[i + 1].id);
            }
        });

        // 3. Build Chains
        //
        // KEY FIX: A task is a true chain-start ONLY if it has neither:
        //   - An explicit logical predecessor  (predecessorBlockIds.length === 0)
        //   - A resource predecessor  (i.e. nobody's resourceSuccessor points to it)
        //
        // Previously, ALL tasks with no logical predecessors were treated as
        // chain-starts. This caused time-sequenced tasks (e.g. AT02→AT03→AT07
        // chained by the team's time-order) to each become their own "chain start",
        // produce a chain of length 1, get excluded (chain.length > 1), and end up
        // in isolatedTasks — a false positive.
        const allChains: ChainLink[][] = [];
        const processed = new Set<string>();

        // Build inverse of resourceSuccessors: blockId → its resource-predecessor id
        const resourcePredecessors = new Map<string, string>();
        resourceSuccessors.forEach((sucId, predId) => {
            resourcePredecessors.set(sucId, predId);
        });

        // A genuine chain start: no explicit predecessor AND no resource predecessor
        const chainStarts = taskBlocks.filter(block =>
            block.predecessorBlockIds.length === 0 &&
            !resourcePredecessors.has(block.id)
        );

        for (const startBlock of chainStarts) {
            if (processed.has(startBlock.id)) continue;

            const chain: ChainLink[] = [];
            let currentBlock: TaskBlock | undefined = startBlock;

            while (currentBlock) {
                if (processed.has(currentBlock.id)) break;

                chain.push({ block: currentBlock });
                processed.add(currentBlock.id);

                const logicalSuccessorIds = taskBlocks
                    .filter(b => b.predecessorBlockIds.includes(currentBlock!.id))
                    .map(b => b.id);
                const resourceSuccessorId = resourceSuccessors.get(currentBlock.id);

                const allSuccessorIds = new Set(logicalSuccessorIds);
                if (resourceSuccessorId) allSuccessorIds.add(resourceSuccessorId);

                let nextBlock: TaskBlock | undefined;
                let linkType: 'logical' | 'resource' | 'mixed' | undefined;

                if (allSuccessorIds.size === 1) {
                    const nextBlockId = [...allSuccessorIds][0];
                    const nextCandidate = taskBlocksById.get(nextBlockId);

                    if (nextCandidate && !chain.some(c => c.block.id === nextCandidate.id)) {
                        nextBlock = nextCandidate;
                        const isLogical = logicalSuccessorIds.includes(nextBlockId);
                        const isResource = resourceSuccessorId === nextBlockId;

                        if (isLogical && isResource) linkType = 'mixed';
                        else if (isLogical) linkType = 'logical';
                        else if (isResource) linkType = 'resource';
                    }
                } else if (allSuccessorIds.size > 1) {
                    // Branching: follow the logical link first; record resource link too
                    const nextBlockId = logicalSuccessorIds[0] ?? [...allSuccessorIds][0];
                    const nextCandidate = taskBlocksById.get(nextBlockId);
                    if (nextCandidate && !chain.some(c => c.block.id === nextCandidate.id)) {
                        nextBlock = nextCandidate;
                        const isLogical = logicalSuccessorIds.includes(nextBlockId);
                        const isResource = resourceSuccessorId === nextBlockId;
                        if (isLogical && isResource) linkType = 'mixed';
                        else if (isLogical) linkType = 'logical';
                        else if (isResource) linkType = 'resource';
                    }
                }

                if (chain.length > 0 && linkType) {
                    chain[chain.length - 1].linkToNext = linkType;
                }
                currentBlock = nextBlock;
            }

            // Include single-task chains too if they at least have a resource link
            // (solo tasks with no connections at all remain isolated)
            if (chain.length > 1) {
                allChains.push(chain);
            } else if (chain.length === 1) {
                // Check if this single-block had any resource successor (it was consumed
                // by a multi-block chain above). If not, it is genuinely isolated.
                // We mark it as NOT processed so it falls into isolatedTasks naturally.
                if (!resourceSuccessors.has(chain[0].block.id) &&
                    !logicalSuccessorIds_SingleBlock(chain[0].block, taskBlocks)) {
                    processed.delete(chain[0].block.id); // will appear in isolatedTasks
                }
            }
        }

        // Helper used above (inline) — returns true if block has any logical successor
        function logicalSuccessorIds_SingleBlock(block: TaskBlock, allBlocks: TaskBlock[]): boolean {
            return allBlocks.some(b => b.predecessorBlockIds.includes(block.id));
        }

        const isolatedTasksResult = taskBlocks.filter(b => !processed.has(b.id));
        allChains.sort((a, b) => a[0].block.startTime.getTime() - b[0].block.startTime.getTime());

        // 3.5 Apply Filters
        const filteredChains = allChains.filter(chain => {
            const matchesTeam = teamFilter === 'all' || chain.some(link => link.block.teams.includes(teamFilter));
            const matchesSearch = searchQuery === '' || chain.some(link =>
                link.block.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                link.block.equipment.toLowerCase().includes(searchQuery.toLowerCase())
            );
            return matchesTeam && matchesSearch;
        });

        const filteredIsolated = isolatedTasksResult.filter(block => {
            const matchesTeam = teamFilter === 'all' || block.teams.includes(teamFilter);
            const matchesSearch = searchQuery === '' ||
                block.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                block.equipment.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesTeam && matchesSearch;
        });

        // 4. Advanced Analytics (based on filtered data)
        const activeChains = filteredChains;
        const totalChainHours = activeChains.reduce((acc, chain) => acc + chain.reduce((s, link) => s + link.block.duration, 0), 0);
        const linkTypeCounts = { logical: 0, resource: 0, mixed: 0 };
        allChains.forEach(c => c.forEach(l => l.linkToNext && linkTypeCounts[l.linkToNext]++));

        const longestChain = [...allChains].sort((a, b) => b.length - a.length)[0];

        const teamInvolvement: Record<string, number> = {};
        allChains.forEach(c => c.forEach(l => l.block.teams.forEach(t => teamInvolvement[t] = (teamInvolvement[t] || 0) + 1)));

        const chartData = allChains.map((c, i) => ({
            name: `C-${i + 1}`,
            duration: c.reduce((s, l) => s + l.block.duration, 0),
            tasks: c.length
        })).slice(0, 10);

        const pieData = [
            { name: 'Logique', value: linkTypeCounts.logical, color: '#60A5FA' },
            { name: 'Ressource', value: linkTypeCounts.resource, color: '#FBBF24' },
            { name: 'Mixte', value: linkTypeCounts.mixed, color: '#F87171' }
        ].filter(d => d.value > 0);

        return {
            chains: filteredChains,
            isolatedTasks: filteredIsolated,
            analytics: {
                totalChains: filteredChains.length,
                totalChainHours,
                avgChainLength: filteredChains.length > 0 ? (filteredChains.reduce((a, c) => a + c.length, 0) / filteredChains.length).toFixed(1) : 0,
                longestPath: longestChain?.length || 0,
                chartData,
                pieData,
                topTeam: Object.entries(teamInvolvement).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
            }
        };

    }, [tasks, teamFilter, searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-[100] p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div
                className="bg-slate-900 border border-white/10 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent"></div>

                <header className="px-10 py-8 border-b border-white/5 bg-black/20 flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-cyan-600/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-cyan-400 rotate-45"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" /></svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">Centre de Corrélation Strategique</h2>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Analyse interactive des dépendances</p>
                        </div>
                    </div>

                    {/* Interactive Filter Bar */}
                    <div className="flex items-center gap-4 bg-white/5 p-1 rounded-2xl border border-white/10 ml-auto mr-4">
                        <div className="relative group">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filtrer mission..."
                                className="bg-transparent px-4 py-2 text-[10px] font-bold text-white w-48 focus:outline-none transition-all placeholder:text-slate-600 uppercase tracking-widest"
                            />
                            <svg className="absolute right-3 top-2.5 text-slate-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        </div>

                        <div className="w-px h-4 bg-white/10"></div>

                        <select
                            value={teamFilter}
                            onChange={(e) => setTeamFilter(e.target.value)}
                            className="bg-transparent px-4 py-2 text-[10px] font-bold text-white focus:outline-none transition-all appearance-none cursor-pointer pr-8 tracking-widest uppercase"
                        >
                            <option value="all" className="bg-slate-900 text-white">Toutes Équipes</option>
                            {allTeams.map(t => (
                                <option key={t} value={t} className="bg-slate-900 text-white">{t}</option>
                            ))}
                        </select>

                        {(teamFilter !== 'all' || searchQuery !== '') && (
                            <button
                                onClick={() => { setTeamFilter('all'); setSearchQuery(''); }}
                                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-xl border border-red-500/20 transition-all text-[10px] font-black uppercase tracking-widest"
                                title="Réinitialiser"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => setShowHelp(true)}
                        className="w-12 h-12 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 flex items-center justify-center text-cyan-400 hover:text-cyan-300 transition-all border border-cyan-500/20 mr-2 group"
                        title="Guide d'utilisation"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:scale-110 transition-transform"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                    </button>

                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5 hover:rotate-90 duration-300"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel: Analytics */}
                    <aside className="w-[450px] border-r border-white/5 bg-black/20 p-10 overflow-y-auto hidden lg:block scrollbar-hide">
                        <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                            <span className="w-8 h-px bg-cyan-500/40"></span>
                            Diagnostique Planning
                        </h3>

                        <div className="grid grid-cols-2 gap-4 mb-10">
                            <AnalyticsCard
                                title="Chaines"
                                value={analytics?.totalChains || 0}
                                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>}
                                color="bg-cyan-600 shadow-cyan-500/20"
                                status="SYNC"
                            />
                            <AnalyticsCard
                                title="Pression"
                                value={analytics?.longestPath || 0}
                                subtitle="MAX PROFONDEUR"
                                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>}
                                color="bg-orange-600 shadow-orange-500/20"
                                status="CRITIQUE"
                                statusColor="text-orange-400"
                            />
                            <AnalyticsCard
                                title="Charge H"
                                value={analytics?.totalChainHours.toFixed(1) || 0}
                                subtitle="VOLUME TEMPS"
                                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                                color="bg-indigo-600 shadow-indigo-500/20"
                            />
                            <AnalyticsCard
                                title="Point Focal"
                                value={analytics?.topTeam.split(' ')[0] || 'N/A'}
                                subtitle={analytics?.topTeam.split(' ').slice(1).join(' ')}
                                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>}
                                color="bg-emerald-600 shadow-emerald-500/20"
                            />
                        </div>

                        {/* Charts Area */}
                        <div className="space-y-10">
                            <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Distribution des Liaisons</p>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analytics?.pieData || []}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={70}
                                                paddingAngle={8}
                                                dataKey="value"
                                            >
                                                {(analytics?.pieData || []).map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-center gap-4 mt-2">
                                    {(analytics?.pieData || []).map((d: any) => (
                                        <div key={d.name} className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                                            <span className="text-[9px] font-black text-slate-400">{d.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Chronologie des Chaines (Heures)</p>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics?.chartData || []}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} />
                                            <RechartsTooltip
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                            />
                                            <Bar dataKey="duration" radius={[4, 4, 0, 0]} barSize={20}>
                                                {(analytics?.chartData || []).map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#06b6d4' : '#334155'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Main Content: The Chains */}
                    <main className="flex-1 overflow-y-auto p-12 space-y-12 scrollbar-thin scrollbar-thumb-white/10">
                        {chains.length === 0 && isolatedTasks.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center opacity-50">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4 text-slate-600"><path d="M12 2v20M2 12h20" /></svg>
                                <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Néant Opérationnel : Flux de données vide</p>
                            </div>
                        )}

                        {chains.map((chain, index) => (
                            <section key={index} className="relative group/chain">
                                {/* Chain HUD Header */}
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="text-4xl font-black text-white/5 group-hover/chain:text-cyan-500/20 transition-colors uppercase italic select-none">CHAIN-{index + 1}</div>
                                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                                    <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Missions: <span className="text-white">{chain.length}</span></span>
                                        <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Impact: <span className="text-cyan-400">SIGNIFICATIF</span></span>
                                    </div>
                                </div>

                                <div className="space-y-0 flex flex-col items-center sm:items-stretch">
                                    {chain.map((link, taskIndex) => (
                                        <React.Fragment key={link.block.id}>
                                            <div className="relative group/card bg-slate-800/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/5 hover:border-white/20 hover:bg-slate-800/60 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            {link.block.isCoActivity && (
                                                                <div className="bg-cyan-500/10 text-cyan-400 p-1.5 rounded-lg border border-cyan-500/20" title="Co-activité">
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                                                </div>
                                                            )}
                                                            <h4 className="text-base font-bold text-white italic uppercase tracking-tight leading-tight line-clamp-2 max-w-[500px]">{link.block.action}</h4>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-4">
                                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] bg-black/40 px-3 py-1 rounded-lg border border-white/5">{link.block.equipment}</span>
                                                            <div className="flex gap-1.5">
                                                                {link.block.teams.map(team => (
                                                                    <span key={team} className="text-[9px] font-black text-cyan-400 bg-cyan-500/5 px-2.5 py-1 rounded-md border border-cyan-500/10">{team}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="hidden md:flex flex-col items-end gap-2 flex-shrink-0">
                                                        <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-2xl border border-white/5 shadow-inner">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-indigo-400"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                                            <span className="font-mono text-xs font-black text-white italic tracking-tighter">{formatDate(link.block.startTime)} → {formatDate(link.block.endTime)}</span>
                                                        </div>
                                                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{link.block.duration.toFixed(2)}h de Travail</span>
                                                    </div>
                                                </div>
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[50px] -z-10 rounded-full"></div>
                                            </div>
                                            {taskIndex < chain.length - 1 && (
                                                <LinkHUD linkType={link.linkToNext} />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </section>
                        ))}

                        {isolatedTasks.length > 0 && (
                            <section className="bg-white/[0.02] p-10 rounded-[3rem] border border-white/5">
                                <div className="flex items-center gap-6 mb-10">
                                    <h3 className="text-xl font-black text-slate-400 uppercase italic tracking-tighter">Entités Indépendantes</h3>
                                    <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent"></div>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{isolatedTasks.length} Tâches hors-flux</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {isolatedTasks.map(taskBlock => (
                                        <div key={taskBlock.id} className="bg-white/5 p-5 rounded-3xl border border-white/5 hover:border-white/10 hover:bg-white/[0.08] transition-all group">
                                            <p className="font-bold text-white uppercase italic tracking-tight line-clamp-2 mb-3 leading-tight" title={taskBlock.action}>{taskBlock.action}</p>
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest opacity-60">
                                                <span className="truncate max-w-[150px]">{taskBlock.equipment}</span>
                                                <span className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md">{taskBlock.duration.toFixed(2)}h</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </main>
                </div>

                <footer className="px-10 py-4 bg-black/40 border-t border-white/5 flex justify-between items-center">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">Système de Diagnostic PlanneX v4.0 // Analyse en temps réel</p>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></div>
                            <span className="text-[10px] font-black text-slate-500 uppercase">Synchronisé</span>
                        </div>
                    </div>
                </footer>

                {/* Interactive Help Overlay */}
                {showHelp && (
                    <div
                        className="absolute inset-0 z-[110] bg-slate-950/90 backdrop-blur-xl animate-in fade-in zoom-in duration-300 flex items-center justify-center p-8"
                        onClick={() => setShowHelp(false)}
                    >
                        <div
                            className="bg-slate-900 border border-white/10 rounded-[3rem] w-full max-w-4xl max-h-full overflow-y-auto p-12 relative shadow-[0_0_100px_rgba(6,182,212,0.15)] scrollbar-hide"
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowHelp(false)}
                                className="absolute top-8 right-8 w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>

                            <div className="flex items-center gap-6 mb-12">
                                <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/30">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-cyan-400"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none mb-2">Manuel de Corrélation Strategique</h2>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Maximisez votre intelligence opérationnelle</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div className="space-y-8">
                                    <section>
                                        <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                                            <span className="w-6 h-px bg-cyan-500/40"></span>
                                            Protocoles de Liaisons
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                                <div className="flex items-center gap-3 mb-2 text-blue-400">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Liaison Logique</span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 leading-relaxed font-bold italic">Dépendance technique stricte. Une étape doit impérativement précéder l'autre selon le processus industriel.</p>
                                            </div>
                                            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                                <div className="flex items-center gap-3 mb-2 text-amber-400">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Liaison Ressource</span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 leading-relaxed font-bold italic">Continuité d'équipe. Indique que la même ressource humaine enchaîne ces deux missions.</p>
                                            </div>
                                            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                                <div className="flex items-center gap-3 mb-2 text-red-500">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v20M5 12l7 7 7-7" /></svg>
                                                    <span className="text-[10px] font-black uppercase tracking-widest">Liaison Critique</span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 leading-relaxed font-bold italic">Zone de risque maximal. Dépendance technique ET humaine simultanée. Risque de point mort planning.</p>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <div className="space-y-8">
                                    <section>
                                        <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                                            <span className="w-6 h-px bg-cyan-500/40"></span>
                                            Diagnostic HUD
                                        </h3>
                                        <div className="grid grid-cols-1 gap-3">
                                            <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl">
                                                <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-orange-500/20">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-black text-white uppercase tracking-widest">Pression Profil</span>
                                                    <p className="text-[10px] text-slate-500 font-bold italic mt-0.5">La profondeur maximale d'une chaîne. C'est votre chemin critique direct.</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-emerald-500/20">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] font-black text-white uppercase tracking-widest">Point Focal</span>
                                                    <p className="text-[10px] text-slate-500 font-bold italic mt-0.5">L'entité (équipe) ayant la plus forte influence sur les couplages de tâches.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                                            <span className="w-6 h-px bg-cyan-500/40"></span>
                                            Contrôle Tactique
                                        </h3>
                                        <p className="text-[11px] text-slate-400 font-bold italic leading-relaxed">
                                            Utilisez la barre de filtres pour isoler un équipement ou une équipe spécifique. Le système recalculera dynamiquement toutes les chaînes et analytics pour cette sélection.
                                        </p>
                                    </section>
                                </div>
                            </div>

                            <div className="mt-12 pt-8 border-t border-white/5 flex gap-4">
                                <button
                                    onClick={() => setShowHelp(false)}
                                    className="px-8 py-3 bg-cyan-500 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] hover:bg-cyan-400 transition-all shadow-[0_10px_30px_rgba(6,182,212,0.3)]"
                                >
                                    Compris, retour au centre
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
