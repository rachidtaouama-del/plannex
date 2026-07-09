const fs = require('fs');

const FILE_PATH = 'c:\\Users\\HP\\Downloads\\copy-of-plannex-account-99.84ra-s\\components\\EvaluationView.tsx';

let content = fs.readFileSync(FILE_PATH, 'utf8');

const replacementKpiCard = `
const KpiCard: React.FC<{ title: string; children: React.ReactNode; onClick?: () => void; icon?: React.ReactNode; gradient?: string }> = ({ title, children, onClick, icon, gradient = 'from-blue-500/10 to-purple-500/10' }) => (
    <div
      className={\`relative overflow-hidden bg-slate-800/40 backdrop-blur-md p-5 rounded-2xl border border-white/5 flex flex-col justify-between text-left min-h-[130px] shadow-lg transition-all duration-300 \${onClick ? 'cursor-pointer hover:bg-slate-700/60 hover:-translate-y-1 hover:shadow-emerald-500/20 hover:border-emerald-500/50' : 'hover:border-white/10 hover:-translate-y-0.5'}\`}
      onClick={onClick}
      role={onClick ? 'button' : 'figure'}
      tabIndex={onClick ? 0 : -1}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
        <div className={\`absolute inset-0 bg-gradient-to-br \${gradient} opacity-50 pointer-events-none\`}></div>
        <div className="relative z-10 flex justify-between items-start mb-2">
            <p className="text-sm font-medium text-slate-300 tracking-wide">{title}</p>
            {icon && <div className="text-slate-400 opacity-80">{icon}</div>}
        </div>
        <div className="relative z-10 flex-grow flex flex-col justify-end">
            {children}
        </div>
    </div>
);`;

content = content.replace(/const KpiCard: React\.FC<\{ title: string; children: React\.ReactNode; onClick\?: \(\) => void; \}> = \(\{ title, children, onClick \}\) => \([\s\S]*?\);\n/m, replacementKpiCard + '\n');


content = content.replace(/<section className="bg-slate-800 p-6 rounded-lg">\s*<h3 className="text-xl font-semibold text-white mb-4">Paramètres Globaux de l'Évaluation<\/h3>/g,
    `<section className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300 mb-6 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    Paramètres Globaux de l'Évaluation
                </h3>`);

content = content.replace(/<section className="bg-slate-800 p-6 rounded-lg">\s*<h3 className="text-xl font-semibold text-white mb-4">Indicateurs de Performance \(KPIs\)<\/h3>\s*<div className="grid grid-cols-2 md:grid-cols-4 gap-4">([\s\S]*?)<\/div>\s*<\/section>/,
    `<section className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10 -translate-x-1/4 -translate-y-1/4"></div>
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-6 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                    Indicateurs de Performance (KPIs)
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
                    <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                        $1
                    </div>
                    <div className="lg:col-span-1 bg-slate-800/40 rounded-2xl border border-white/5 p-4 flex flex-col items-center justify-center min-h-[200px]">
                        <h4 className="text-slate-300 font-semibold mb-2 text-sm text-center">Taux d'Achèvement</h4>
                        <div className="w-full h-32">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={[
                                        { name: 'Fait', value: evaluationKpis.completedTasks },
                                        { name: 'Restant', value: evaluationKpis.totalPlannedTasks - evaluationKpis.completedTasks }
                                    ]}
                                    cx="50%" cy="50%"
                                    innerRadius={35}
                                    outerRadius={50}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                  >
                                    <Cell fill="#10B981" />
                                    <Cell fill="#334155" />
                                  </Pie>
                                  <RechartsTooltip contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="text-center mt-2">
                             <span className="text-3xl font-extrabold text-white">{evaluationKpis.completionRate.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            </section>`
);


// Replace the individual KPI cards inside the previously matched $1 to use the new icons and UI
content = content.replace(/<KpiCard title="Durée Planifiée">[\s\S]*?<\/KpiCard>/, `<KpiCard title="Durée Planifiée" icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>} gradient="from-blue-600/10 to-cyan-500/10">
                        <p className="text-3xl font-extrabold text-white">{evaluationKpis.plannedShutdownDuration.toFixed(2)}<span className="text-base font-medium text-slate-400 ml-1">h</span></p>
                    </KpiCard>`);

content = content.replace(/<KpiCard title="Durée Réelle">[\s\S]*?<\/KpiCard>/, `<KpiCard title="Durée Réelle" icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>} gradient="from-indigo-600/10 to-blue-500/10">
                        <p className="text-3xl font-extrabold text-white">{evaluationKpis.actualShutdownDuration.toFixed(2)}<span className="text-base font-medium text-slate-400 ml-1">h</span></p>
                    </KpiCard>`);

content = content.replace(/<KpiCard title="Glissement Total"[\s\S]*?<\/KpiCard>/, `<KpiCard title="Glissement Total" onClick={() => setIsSlippageLogModalOpen(true)} icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>} gradient="from-rose-500/10 to-red-600/10">
                        <p className={\`text-3xl font-extrabold \${evaluationKpis.totalSlippage > 0.01 ? 'text-red-400' : 'text-emerald-400'}\`}>{evaluationKpis.totalSlippage.toFixed(2)}<span className="text-base font-medium opacity-70 ml-1">h</span></p>
                        <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-rose-400 group-hover:underline"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>Analyser l'écart</span>
                    </KpiCard>`);

content = content.replace(/<KpiCard title="Taux de Réalisation">[\s\S]*?<\/KpiCard>/, `<KpiCard title="Taux de Réalisation" icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>} gradient="from-emerald-500/10 to-green-600/10">
                        <p className="text-3xl font-extrabold text-emerald-400">{evaluationKpis.completionRate.toFixed(1)}%</p>
                        <p className="text-xs font-medium text-slate-400 mt-1 bg-slate-800/50 rounded inline-block px-2 py-0.5">{evaluationKpis.completedTasks} / {evaluationKpis.totalPlannedTasks} tâches</p>
                    </KpiCard>`);

content = content.replace(/<KpiCard title="Travaux Supplémentaires">[\s\S]*?<\/KpiCard>/, `<KpiCard title="Travaux Supplémentaires" icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>} gradient="from-purple-500/10 to-fuchsia-600/10">
                        <p className="text-3xl font-extrabold text-fuchsia-400">{evaluationKpis.supplementaryTasksCount}</p>
                    </KpiCard>`);

content = content.replace(/<KpiCard title="Charge Supplémentaire">[\s\S]*?<\/KpiCard>/, `<KpiCard title="Charge Supplémentaire" icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>} gradient="from-pink-500/10 to-rose-600/10">
                        <p className="text-3xl font-extrabold text-pink-400">{evaluationKpis.supplementaryCharge.toFixed(2)}<span className="text-base font-medium text-slate-400 ml-1">H-H</span></p>
                    </KpiCard>`);

content = content.replace(/<KpiCard title="Incidents"[\s\S]*?<\/KpiCard>/, `<KpiCard title="Incidents" onClick={() => setIsEventDetailModalOpen(true)} icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>} gradient="from-amber-500/10 to-orange-600/10">
                        <p className="text-3xl font-extrabold text-amber-400">{evaluationKpis.incidents}</p>
                    </KpiCard>`);

content = content.replace(/<KpiCard title="Accidents"[\s\S]*?<\/KpiCard>/, `<KpiCard title="Accidents" onClick={() => setIsEventDetailModalOpen(true)} icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>} gradient="from-red-500/10 to-rose-600/10">
                        <p className={\`text-3xl font-extrabold \${evaluationKpis.accidents > 0 ? 'text-red-500' : 'text-emerald-400'}\`}>{evaluationKpis.accidents}</p>
                    </KpiCard>`);


content = content.replace(/<section className="bg-slate-800 p-6 rounded-lg">\s*<div className="flex justify-between items-center mb-4">\s*<h3 className="text-xl font-semibold text-white">Chronologie de l'Arrêt<\/h3>/g,
    `<section className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-300 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        Chronologie de l'Arrêt
                    </h3>`);

content = content.replace(/<section className="bg-slate-800 p-6 rounded-lg">\s*<div className="flex justify-between items-center mb-4">\s*<h3 className="text-xl font-semibold text-white">Travaux Supplémentaires<\/h3>/g,
    `<section className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-pink-300 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fuchsia-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                        Travaux Supplémentaires
                    </h3>`);

content = content.replace(/<section className="bg-slate-800 p-6 rounded-lg">\s*<div className="flex justify-between items-center flex-wrap mb-4">\s*<h3 className="text-xl font-semibold text-white">Suivi des Tâches Planifiées<\/h3>/g,
    `<section className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10 -translate-x-1/4 translate-y-1/4"></div>
                <div className="flex justify-between items-center flex-wrap mb-6">
                    <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-300 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        Suivi des Tâches Planifiées
                    </h3>`);

// Replace header styling
content = content.replace(/<header className="flex items-center justify-between flex-wrap gap-4">/,
    `<header className="flex items-center justify-between flex-wrap gap-4 bg-slate-800/60 backdrop-blur-xl p-4 rounded-2xl border border-white/5 shadow-lg relative z-10">`);

content = content.replace(/<h2 className="text-2xl font-bold text-white">Évaluation de la Performance de l'Arrêt<\/h2>/,
    `<h2 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">Évaluation de la Performance de l'Arrêt</h2>`);

// Improve table styles globally (find `<thead className="bg-slate-700/50 text-slate-300">` and replace with `bg-slate-800/80 backdrop-blur border-b border-white/10`)
content = content.replace(/<thead className="bg-slate-700\/50 text-slate-300">/g, `<thead className="bg-slate-800/80 backdrop-blur-md text-slate-300 border-b border-white/10">`);
content = content.replace(/<thead className="text-slate-300 bg-slate-900\/50 sticky top-0">/g, `<thead className="text-slate-300 bg-slate-900/80 backdrop-blur-md sticky top-0 border-b border-white/10 shadow-sm z-10">`);
content = content.replace(/<tr key=\{task\.id\} className="border-t border-slate-700/g, `<tr key={task.id} className="border-t border-slate-700/50 transition-colors`);
content = content.replace(/<tr key=\{task\.id\} className=\{\`border-t border-slate-700 hover:bg-slate-700\/40/g, `<tr key={task.id} className={\`border-t border-slate-700/50 transition-all hover:bg-slate-800/80`);


fs.writeFileSync(FILE_PATH, content, 'utf8');
console.log('Successfully updated the UI of EvaluationView.tsx');
