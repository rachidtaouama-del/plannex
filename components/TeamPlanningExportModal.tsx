
import React, { useState, useEffect, useMemo } from 'react';
import type { CalculationResults, AppParameters, ScheduledTask } from '../types';
import { exportTeamPlanningToPDF, TeamPlanningExportOptions } from '../services/teamPlanningPdfExportService';
import { MultiSelectDropdown } from './MultiSelectDropdown';

declare var JSZip: any;

interface TeamPlanningExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: CalculationResults;
  parameters: AppParameters;
  isColdStopFlow: boolean;
}

export const TeamPlanningExportModal: React.FC<TeamPlanningExportModalProps> = ({
  isOpen, onClose, results, parameters, isColdStopFlow
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const [reportTitle, setReportTitle] = useState("Centre de Pilotage des Ressources");
  const [reportSubtitle, setReportSubtitle] = useState("Ordonnancement des Équipes par Arrêt Planifié");
  const [includeDashboard, setIncludeDashboard] = useState(true);
  const [showGeneratedDate, setShowGeneratedDate] = useState(true);
  const [histogramStyle, setHistogramStyle] = useState<'table' | 'cards'>('cards');
  const [filterMode, setFilterMode] = useState<'global' | 'range' | 'daily'>('global');

  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [cycleStartTime, setCycleStartTime] = useState('06:00');
  const [ignoreEmptyDays, setIgnoreEmptyDays] = useState(true);

  const [maintTypeFilter, setMaintTypeFilter] = useState<string[]>([]);
  const [disciplineFilter, setDisciplineFilter] = useState<string[]>([]);
  const [manpowerFilter, setManpowerFilter] = useState<string>('');

  const { uniqueMaintenanceTypes, uniqueDisciplines } = useMemo(() => {
    const maintTypes = new Set<string>();
    const disciplines = new Set<string>();
    results.scheduledTasks.forEach(t => {
      if (t.maintenanceType) maintTypes.add(t.maintenanceType);
      if (t.discipline) disciplines.add(t.discipline);
    });
    return {
      uniqueMaintenanceTypes: Array.from(maintTypes).sort(),
      uniqueDisciplines: Array.from(disciplines).sort()
    };
  }, [results.scheduledTasks, isColdStopFlow]);

  const filteredCount = useMemo(() => {
    let tasks = results.scheduledTasks;
    if (maintTypeFilter.length > 0) tasks = tasks.filter(t => t.maintenanceType && maintTypeFilter.includes(t.maintenanceType));
    if (manpowerFilter) {
      const mp = parseInt(manpowerFilter, 10);
      if (!isNaN(mp)) tasks = tasks.filter(t => t.manpower === mp);
    }
    return tasks.length;
  }, [results.scheduledTasks, maintTypeFilter, manpowerFilter, isColdStopFlow]);

  useEffect(() => {
    if (isOpen) {
      const toDateTimeLocal = (dateStr: string) => {
        const date = new Date(dateStr);
        const tzoffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
      };
      setRangeStart(toDateTimeLocal(parameters.shutdownStart));
      setRangeEnd(toDateTimeLocal(parameters.shutdownEnd));
      setMaintTypeFilter([]);
      setDisciplineFilter(uniqueDisciplines); // All selected by default
      setManpowerFilter('');
    }
  }, [isOpen, parameters, uniqueDisciplines]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const options: TeamPlanningExportOptions = {
        includeDashboard,
        reportTitle,
        reportSubtitle,
        showGeneratedDate,
        histogramStyle,
        contentFilters: {
          maintenanceType: maintTypeFilter,
          discipline: disciplineFilter,
          manpower: manpowerFilter ? parseInt(manpowerFilter, 10) : undefined
        }
      };

      if (filterMode === 'global') {
        const doc = await exportTeamPlanningToPDF(results, parameters, reportSubtitle, isColdStopFlow, null, options);
        doc.save(`${reportTitle}.pdf`);
      } else if (filterMode === 'range') {
        const filter = { start: new Date(rangeStart), end: new Date(rangeEnd) };
        const doc = await exportTeamPlanningToPDF(results, parameters, reportSubtitle, isColdStopFlow, filter, options);
        doc.save(`${reportTitle}_Plage.pdf`);
      } else if (filterMode === 'daily') {
        if (typeof JSZip === 'undefined') { alert("JSZip non chargé."); setIsDownloading(false); return; }
        const dailyOptions: TeamPlanningExportOptions = { ...options, includeDashboard: false };
        const zip = new JSZip();
        const [cycleH, cycleM] = cycleStartTime.split(':').map(Number);
        let cursor = new Date(parameters.shutdownStart);
        cursor.setHours(cycleH, cycleM, 0, 0);
        if (cursor.getTime() > new Date(parameters.shutdownStart).getTime()) cursor.setDate(cursor.getDate() - 1);
        const endTs = new Date(parameters.shutdownEnd).getTime();
        while (cursor.getTime() < endTs) {
          const shiftStart = new Date(cursor);
          const shiftEnd = new Date(cursor); shiftEnd.setDate(shiftEnd.getDate() + 1);
          const hasTasks = results.scheduledTasks.some(t => t.startTime.getTime() < shiftEnd.getTime() && t.endTime.getTime() > shiftStart.getTime());
          if (hasTasks || !ignoreEmptyDays) {
            const dateStr = shiftStart.toLocaleDateString('fr-CA');
            const doc = await exportTeamPlanningToPDF(results, parameters, `${reportSubtitle} - ${dateStr}`, isColdStopFlow, { start: shiftStart, end: shiftEnd }, dailyOptions);
            zip.file(`${reportTitle.replace(/[^a-z0-9]/gi, '_')}_${dateStr}.pdf`, doc.output('blob'));
          }
          cursor.setDate(cursor.getDate() + 1);
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a'); link.href = URL.createObjectURL(zipBlob);
        link.download = `${reportTitle.replace(/[^a-z0-9]/gi, '_')}_Batch.zip`;
        link.click(); URL.revokeObjectURL(link.href);
      }
      onClose();
    } catch (e) {
      console.error("PDF Export failed:", e);
      if (e instanceof Error) alert(`Erreur: ${e.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const hasFilters = maintTypeFilter.length > 0 || disciplineFilter.length !== uniqueDisciplines.length || !!manpowerFilter;
  const totalTasks = results.scheduledTasks.length;

  const modeConfig = [
    {
      id: 'global',
      label: 'Vue Globale',
      sub: 'Cycle complet du projet',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
        </svg>
      ),
      accentClass: 'from-emerald-500 to-teal-500',
      activeBg: 'bg-emerald-500/10 border-emerald-500/40',
      activeText: 'text-emerald-400',
      dotClass: 'bg-emerald-500',
    },
    {
      id: 'range',
      label: 'Fenêtre Précise',
      sub: 'Sélection horaire libre',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      accentClass: 'from-blue-500 to-indigo-500',
      activeBg: 'bg-blue-500/10 border-blue-500/40',
      activeText: 'text-blue-400',
      dotClass: 'bg-blue-500',
    },
    {
      id: 'daily',
      label: 'Batch Quotidien',
      sub: 'Archive ZIP multi-jours',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 11H3" /><path d="M21 7H3" /><path d="M21 15H3" /><path d="M21 19H3" />
        </svg>
      ),
      accentClass: 'from-violet-500 to-purple-500',
      activeBg: 'bg-violet-500/10 border-violet-500/40',
      activeText: 'text-violet-400',
      dotClass: 'bg-violet-500',
    },
  ];

  const activeMode = modeConfig.find(m => m.id === filterMode)!;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-md flex justify-center items-center z-[100] p-4"
      onClick={onClose}
    >
      <style>{`
        .export-scroll::-webkit-scrollbar { width: 3px; }
        .export-scroll::-webkit-scrollbar-track { background: transparent; }
        .export-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }
        .export-input { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 14px; color: white; font-size: 13px; width: 100%; outline: none; transition: all 0.2s; }
        .export-input:focus { border-color: rgba(16,185,129,0.5); background: rgba(255,255,255,0.07); }
        .export-input::placeholder { color: rgba(148,163,184,0.5); }
      `}</style>

      <div
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(160deg, #0a1628 0%, #0d1f3c 60%, #070f1e 100%)', border: '1px solid rgba(255,255,255,0.07)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500 z-10" />

        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-5 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className="relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.1))', border: '1px solid rgba(16,185,129,0.25)' }}>
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a1628] flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-white" />
              </div>
            </div>
            <div>
              <h2 className="text-[15px] font-black text-white tracking-tight leading-none">Export — Centre de Pilotage</h2>
              <p className="text-[10px] text-slate-500 font-semibold mt-1 uppercase tracking-wider">Génération du rapport PDF professionnel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-white transition-all duration-200 hover:rotate-90"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto export-scroll px-7 py-6 space-y-6">

          {/* ── SECTION: Identité du rapport ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identité du Rapport</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest pl-0.5">Titre</label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={e => setReportTitle(e.target.value)}
                  className="export-input"
                  placeholder="Titre du rapport"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest pl-0.5">Sous-titre</label>
                <input
                  type="text"
                  value={reportSubtitle}
                  onChange={e => setReportSubtitle(e.target.value)}
                  className="export-input"
                  placeholder="Sous-titre"
                />
              </div>
            </div>
          </div>

          {/* ── SECTION: Mode de génération ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-4 rounded-full bg-blue-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Périmètre Temporel</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {modeConfig.map(mode => (
                <button
                  key={mode.id}
                  onClick={() => setFilterMode(mode.id as any)}
                  className={`relative p-4 rounded-xl border text-left transition-all duration-300 group ${filterMode === mode.id
                      ? `${mode.activeBg} shadow-lg`
                      : 'border-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  style={{ background: filterMode === mode.id ? undefined : 'rgba(255,255,255,0.025)' }}
                >
                  {filterMode === mode.id && (
                    <div className={`absolute bottom-0 left-0 right-0 h-[2px] rounded-b-xl bg-gradient-to-r ${mode.accentClass}`} />
                  )}
                  <div className={`mb-3 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${filterMode === mode.id ? mode.activeText : 'text-slate-600 group-hover:text-slate-400'
                    }`}
                    style={{ background: filterMode === mode.id ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)' }}>
                    {mode.icon}
                  </div>
                  <p className={`text-[10px] font-black uppercase tracking-wide leading-none mb-1 transition-colors ${filterMode === mode.id ? mode.activeText : 'text-slate-500'
                    }`}>{mode.label}</p>
                  <p className="text-[8px] text-slate-600 font-medium">{mode.sub}</p>
                </button>
              ))}
            </div>

            {/* Mode detail panel */}
            <div className="rounded-xl p-5 border border-white/[0.06]" style={{ background: 'rgba(0,0,0,0.3)' }}>
              {filterMode === 'global' && (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Flux Intégral</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Extraction complète couvrant l'intégralité de la chronologie projet — {totalTasks} tâches.</p>
                  </div>
                </div>
              )}
              {filterMode === 'range' && (
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Début de Plage</label>
                    <input
                      type="datetime-local"
                      value={rangeStart}
                      onChange={e => setRangeStart(e.target.value)}
                      className="export-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-rose-400 uppercase tracking-widest">Fin de Plage</label>
                    <input
                      type="datetime-local"
                      value={rangeEnd}
                      onChange={e => setRangeEnd(e.target.value)}
                      className="export-input"
                    />
                  </div>
                </div>
              )}
              {filterMode === 'daily' && (
                <div className="grid grid-cols-2 gap-5 items-center">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-violet-400 uppercase tracking-widest">Heure de cycle</label>
                    <input type="time" value={cycleStartTime} onChange={e => setCycleStartTime(e.target.value)}
                      className="export-input font-mono" />
                    <p className="text-[9px] text-slate-600">Cadencement automatique — cycle 24h.</p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group p-4 rounded-xl border border-white/[0.06] hover:border-white/[0.1] transition-all" style={{ background: 'rgba(255,255,255,0.025)' }}>
                    <div className="relative shrink-0">
                      <input type="checkbox" checked={ignoreEmptyDays} onChange={e => setIgnoreEmptyDays(e.target.checked)} className="sr-only peer" />
                      <div className="w-9 h-5 rounded-full bg-slate-800 peer-checked:bg-violet-500 transition-colors border border-white/10" />
                      <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-transform shadow" />
                    </div>
                    <div>
                      <span className="block text-[10px] font-black text-white tracking-wide">Filtrer inactifs</span>
                      <span className="text-[8px] text-slate-500">Exclure les jours sans tâches</span>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* ── SECTION: Filtres ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-amber-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Filtres de Contenu</span>
              </div>
              {hasFilters && (
                <button
                  onClick={() => { setMaintTypeFilter([]); setDisciplineFilter(uniqueDisciplines); setManpowerFilter(''); }}
                  className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 transition-all"
                >
                  Réinitialiser
                </button>
              )}
            </div>
            <div className="rounded-xl p-5 border border-white/[0.06] space-y-4" style={{ background: 'rgba(255,255,255,0.025)' }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Protocole</label>
                  <MultiSelectDropdown options={uniqueMaintenanceTypes} selected={maintTypeFilter} onChange={setMaintTypeFilter} placeholder="Tous" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Effectif</label>
                  <input type="number" min="1" value={manpowerFilter} onChange={e => setManpowerFilter(e.target.value)} placeholder="—" className="export-input" />
                </div>
              </div>

              {/* Dedicated Discipline Checkboxes Grid */}
              <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Disciplines à inclure dans les graphiques</label>
                  <button
                    onClick={() => {
                      if (disciplineFilter.length === uniqueDisciplines.length) {
                        setDisciplineFilter([]);
                      } else {
                        setDisciplineFilter(uniqueDisciplines);
                      }
                    }}
                    className="text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                  >
                    {disciplineFilter.length === uniqueDisciplines.length ? "Tout décocher" : "Tout cocher"}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-black/45 border border-white/5 rounded-xl p-3.5 max-h-36 overflow-y-auto custom-scrollbar">
                  {uniqueDisciplines.map(disc => {
                    const isChecked = disciplineFilter.includes(disc);
                    return (
                      <label
                        key={disc}
                        className={`flex items-center gap-2.5 cursor-pointer group text-[10px] font-bold px-2.5 py-2 rounded-lg border transition-all ${isChecked ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-white/[0.01] border-white/[0.04] text-slate-500 hover:text-slate-300'}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setDisciplineFilter(disciplineFilter.filter(d => d !== disc));
                            } else {
                              setDisciplineFilter([...disciplineFilter, disc]);
                            }
                          }}
                          className="rounded border-white/10 bg-black/40 text-emerald-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="truncate uppercase tracking-wider">{disc}</span>
                      </label>
                    );
                  })}
                  {uniqueDisciplines.length === 0 && (
                    <div className="col-span-3 text-center py-4 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                      Aucune discipline disponible
                    </div>
                  )}
                </div>
              </div>
              {/* Radar status */}
              <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-white/[0.05]" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${hasFilters ? 'bg-amber-400 animate-pulse' : 'bg-slate-700'}`} />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tâches sélectionnées</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-black ${hasFilters ? 'text-amber-400' : 'text-emerald-400'}`}>{filteredCount}</span>
                  <span className="text-[9px] text-slate-600">/ {totalTasks}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION: Options ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-cyan-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contenu</span>
              </div>
              <div className="rounded-xl p-4 border border-white/[0.06] space-y-4" style={{ background: 'rgba(255,255,255,0.025)' }}>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative shrink-0">
                    <input type="checkbox" checked={includeDashboard} onChange={e => setIncludeDashboard(e.target.checked)} className="sr-only peer" />
                    <div className="w-9 h-5 rounded-full bg-slate-800 peer-checked:bg-emerald-500 transition-colors border border-white/10" />
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-transform shadow" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-black text-white tracking-wide">Synthèse Exécutive</span>
                    <span className="text-[8px] text-slate-500">KPIs analytiques + graphiques</span>
                  </div>
                </label>
                {includeDashboard && (
                  <div className="border-t border-white/[0.05] pt-3 space-y-2">
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Style histogramme</p>
                    <div className="flex gap-2">
                      {(['cards', 'table'] as const).map(s => (
                        <button key={s} onClick={() => setHistogramStyle(s)}
                          className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all border ${histogramStyle === s ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'border-white/[0.06] text-slate-500 hover:border-white/10'}`}>
                          {s === 'cards' ? 'Cards' : 'Table'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-slate-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Métadonnées</span>
              </div>
              <div className="rounded-xl p-4 border border-white/[0.06] h-full space-y-4" style={{ background: 'rgba(255,255,255,0.025)' }}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative shrink-0">
                    <input type="checkbox" checked={showGeneratedDate} onChange={e => setShowGeneratedDate(e.target.checked)} className="sr-only peer" />
                    <div className="w-9 h-5 rounded-full bg-slate-800 peer-checked:bg-cyan-500 transition-colors border border-white/10" />
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-transform shadow" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-black text-white tracking-wide">Horodatage</span>
                    <span className="text-[8px] text-slate-500">Date de génération du rapport</span>
                  </div>
                </label>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest">Format</span>
                  <span className="text-[9px] font-black text-cyan-400">A3 PAYSAGE</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-white/[0.06] flex items-center justify-between shrink-0" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PlanneX Report Engine</p>
            <p className="text-[8px] text-slate-600 mt-0.5">Format A3 · jsPDF · Intelligence Engine v4</p>
          </div>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="relative inline-flex items-center gap-3 px-8 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-wider text-white overflow-hidden disabled:opacity-60 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #0891b2 100%)', boxShadow: '0 8px 30px rgba(16,185,129,0.25)' }}
          >
            {/* Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
            {isDownloading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Génération...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{filterMode === 'daily' ? 'Générer Archive' : 'Exporter PDF'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
