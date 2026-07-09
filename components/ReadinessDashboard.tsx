import React, { useMemo, useState } from 'react';
import type { SchedulingTaskData, PDRItem } from '../types';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip,
    ResponsiveContainer, ComposedChart, Line, Area,
} from 'recharts';
import CircularProgress from './CircularProgress';


interface ReadinessDashboardProps {
    tasks: SchedulingTaskData[];
    pdrItems?: PDRItem[];
    onTaskUpdate?: (taskId: number, updates: Partial<SchedulingTaskData>) => void;
}


const KPI_CONFIGS = [
    { id: 'scaffolding', reqField: 'Scaffolding Required', readField: 'Scaffolding Readiness', label: 'SCAFFOLDING', color: '#f59e0b', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { id: 'handling', reqField: 'Handling required', readField: 'Handling Readiness', label: 'HANDLING', color: '#10b981', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    { id: 'handling_permit', reqField: 'permisLevage', readField: 'permis Levage Readiness', label: 'HANDLING PERMIT', color: '#0ea5e9', icon: 'M13 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
    { id: 'hauteur', reqField: 'permisTravailHauteur', readField: 'permis Travail Hauteur Readiness', label: 'HEIGHT WORK PERMIT', color: '#8b5cf6', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { id: 'feu', reqField: 'permisFeu', readField: 'permis Feu Readiness', label: 'HOT WORK PERMIT', color: '#ef4444', icon: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z' },
    { id: 'penetration', reqField: 'permisPenetration', readField: 'permis Penetration Readiness', label: 'CONFINED SPACE PERMIT', color: '#ec4899', icon: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1' },
    { id: 'excavation', reqField: 'permisExcavation', readField: 'permis Excavation Readiness', label: 'EXCAVATION PERMIT', color: '#14b8a6', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 'mo', reqField: 'MO Required', readField: 'MO Readiness', label: 'WORK INSTRUCTION', color: '#f97316', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'adrpt', reqField: 'ADRPT Required', readField: 'ADRPT Readiness', label: 'SAFETY RISK ASSESS.', color: '#64748b', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
];

const CustomActiveDot = (props: any) => {
    const { cx, cy, value } = props;
    return (
        <g>
            <circle cx={cx} cy={cy} r={6} fill="#3b82f6" stroke="#06080C" strokeWidth={2} />
            <rect x={cx - 24} y={cy - 34} width={48} height={22} fill="#3b82f6" rx={6} />
            <text x={cx} y={cy - 19} fill="#ffffff" fontSize={11} fontWeight="900" textAnchor="middle">{value}%</text>
        </g>
    );
};

export const ReadinessDashboard: React.FC<ReadinessDashboardProps> = ({ tasks, pdrItems = [], onTaskUpdate }) => {
    const [selectedKPI, setSelectedKPI] = useState<string>(KPI_CONFIGS[0].id);
    const [drillDownMode, setDrillDownMode] = useState<boolean>(false);
    const [scurveResolution, setScurveResolution] = useState<number>(24); // hours
    const [popupTaskDetails, setPopupTaskDetails] = useState<any | null>(null);
    const [fbSearch, setFbSearch] = useState<string>('');
    const [fbSort, setFbSort] = useState<'worst' | 'best' | 'missing' | 'name'>('worst');

    // Compute Metrics with Critical Path awareness
    const kpiStats = useMemo(() => {
        let globalRequired = 0;
        let globalReady = 0;
        let criticalRequired = 0;
        let criticalReady = 0;

        const series = KPI_CONFIGS.map(config => {
            let required = 0;
            let ready = 0;
            let critReq = 0;
            let critReady = 0;
            let isApplicable = false;

            tasks.forEach(t => {
                const reqVal = t[config.reqField as keyof SchedulingTaskData];
                // Support both numeric 1/0 and string 'oui'/'non' or '1'/'0'
                const isRequired = typeof reqVal === 'string'
                    ? (reqVal.trim() !== '' && reqVal.trim() !== '0' && reqVal.toLowerCase() !== 'non')
                    : (reqVal === 1 || reqVal === true);

                if (isRequired) {
                    isApplicable = true;
                    required++;
                    globalRequired++;

                    const readVal = t[config.readField as keyof SchedulingTaskData];
                    // Correctly parse readiness which might be 1/0 or true/false from Excel
                    let isReady = readVal === 1 || readVal === true || String(readVal).toLowerCase() === 'true' || String(readVal) === '1';

                    if (isReady) {
                        ready++;
                        globalReady++;
                    }

                    if (t.isCritical) {
                        critReq++;
                        criticalRequired++;
                        if (isReady) {
                            critReady++;
                            criticalReady++;
                        }
                    }
                }
            });

            const percent = required > 0 ? Math.round((ready / required) * 100) : (isApplicable ? 100 : -1);

            return {
                ...config,
                required,
                ready,
                percent,
                isApplicable,
                missing: required - ready,
                critReq,
                critReady
            };
        });

        // ── Include spare parts (PDR) in global readiness ──
        const pdrTotal = pdrItems.length;
        const pdrReady = pdrItems.filter(p => p.readiness === 1).length;
        globalRequired += pdrTotal;
        globalReady += pdrReady;

        const globalPercent = globalRequired > 0 ? Math.round((globalReady / globalRequired) * 100) : 0;
        const criticalPercent = criticalRequired > 0 ? Math.round((criticalReady / criticalRequired) * 100) : 100;

        return {
            globalRequired,
            globalReady,
            globalPercent,
            criticalRequired,
            criticalReady,
            criticalPercent,
            pdrTotal,
            pdrReady,
            series
        };
    }, [tasks, pdrItems]);

    const drillDownTasks = useMemo(() => {
        const config = KPI_CONFIGS.find(c => c.id === selectedKPI);
        if (!config) return [];
        return tasks.filter(t => {
            const reqVal = t[config.reqField as keyof SchedulingTaskData];
            return typeof reqVal === 'string'
                ? (reqVal.trim() !== '' && reqVal.trim() !== '0' && reqVal.toLowerCase() !== 'non')
                : (reqVal === 1 || reqVal === true);
        }).map(t => {
            const readVal = t[config.readField as keyof SchedulingTaskData];
            const isReady = readVal === 1 || readVal === true || String(readVal).toLowerCase() === 'true' || String(readVal) === '1';

            return {
                ...t,
                isReady
            };
        });
    }, [tasks, selectedKPI]);

    const toggleReadiness = (taskId: number) => {
        const config = KPI_CONFIGS.find(c => c.id === selectedKPI);
        if (!config || !onTaskUpdate) return;

        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const currentVal = task[config.readField as keyof SchedulingTaskData];
        const currentIsReady = currentVal === 1 || currentVal === true || String(currentVal).toLowerCase() === 'true' || String(currentVal) === '1';

        onTaskUpdate(taskId, {
            [config.readField]: currentIsReady ? 0 : 1
        });
    };

    const familyBreakdown = useMemo(() => {
        const config = KPI_CONFIGS.find(c => c.id === selectedKPI);
        if (!config) return [];

        const familyMap: Record<string, { family: string; required: number; ready: number; missing: number; criticalCount: number }> = {};

        tasks.forEach(t => {
            const familyName = t.FAMILLE || 'SYSTEM';

            const reqVal = t[config.reqField as keyof SchedulingTaskData];
            const isRequired = typeof reqVal === 'string' ? reqVal.trim() !== '' && reqVal !== '0' : reqVal === 1;

            if (isRequired) {
                if (!familyMap[familyName]) {
                    familyMap[familyName] = { family: familyName, required: 0, ready: 0, missing: 0, criticalCount: 0 };
                }
                familyMap[familyName].required++;
                if (t.isCritical) familyMap[familyName].criticalCount++;

                const readVal = t[config.readField as keyof SchedulingTaskData];
                let isReady = readVal === 1 || String(readVal).toLowerCase() === 'true';


                if (isReady) familyMap[familyName].ready++;
                else familyMap[familyName].missing++;
            }
        });

        return Object.values(familyMap).sort((a, b) => b.required - a.required);
    }, [tasks, selectedKPI]);

    const radarData = useMemo(() => {
        return kpiStats.series
            .filter(item => item.isApplicable) // Only show applicable KPIs on radar
            .map(item => ({
                subject: item.label,
                A: item.percent,
                fullMark: 100
            }));
    }, [kpiStats]);

    // ── S-Curve data: per-KPI planned+ready per time bucket ──────────────
    const getScurveData = (resolutionHours: number) => {
        const datePoints: number[] = [];
        tasks.forEach(t => { if (t["START DATE"]) datePoints.push(new Date(t["START DATE"]).getTime()); });
        if (datePoints.length === 0) return [];

        const minDate = Math.min(...datePoints);
        const maxDate = Math.max(...datePoints);
        const resMs = resolutionHours * 3600000;
        const timeline: number[] = [];
        for (let ts = minDate; ts <= maxDate + resMs; ts += resMs) timeline.push(ts);

        // Also include global spare parts from pdrItems prop
        return timeline.map(ts => {
            const point: Record<string, any> = {
                timestamp: ts,
                dateLabel: new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) +
                    (resolutionHours < 24 ? ' ' + new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''),
                planned: 0, ready: 0,
            };
            KPI_CONFIGS.forEach(cfg => { point[`${cfg.id}_planned`] = 0; point[`${cfg.id}_ready`] = 0; });
            point['pdr_planned'] = 0; point['pdr_ready'] = 0;

            tasks.forEach(t => {
                if (!t["START DATE"] || new Date(t["START DATE"]).getTime() > ts) return;
                KPI_CONFIGS.forEach(cfg => {
                    const reqVal = t[cfg.reqField as keyof SchedulingTaskData];
                    const isReq = typeof reqVal === 'string' ? (reqVal.trim() !== '' && reqVal !== '0' && reqVal.toLowerCase() !== 'non') : (reqVal === 1 || reqVal === true);
                    if (isReq) {
                        point[`${cfg.id}_planned`]++; point.planned++;
                        const readVal = t[cfg.readField as keyof SchedulingTaskData];
                        const isReady = readVal === 1 || readVal === true || String(readVal).toLowerCase() === 'true' || String(readVal) === '1';
                        if (isReady) { point[`${cfg.id}_ready`]++; point.ready++; }
                    }
                });
            });

            // Use global pdrItems for spare parts (correct source of truth)
            pdrItems.forEach(p => {
                point['pdr_planned']++; point.planned++;
                if (p.readiness === 1) { point['pdr_ready']++; point.ready++; }
            });

            point.gap = Math.max(0, point.planned - point.ready);
            point.readinessPct = point.planned > 0 ? Math.round((point.ready / point.planned) * 100) : 0;
            return point;
        });
    };

    const globalScurve = useMemo(() => getScurveData(scurveResolution), [tasks, scurveResolution]);
    const kpiScurve = useMemo(() => getScurveData(scurveResolution), [tasks, scurveResolution, selectedKPI]);

    const missionStatus = kpiStats.criticalPercent < 100 ? 'AT RISK' : kpiStats.globalPercent < 50 ? 'PREPARING' : 'OPERATIONAL';

    // ── PDF Export ─────────────────────────────────────────────────────────
    const handleExportPDF = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const existingFrame = document.getElementById('readiness-pdf-iframe');
        if (existingFrame) existingFrame.remove();
        const iframe = document.createElement('iframe');
        iframe.id = 'readiness-pdf-iframe';
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1280px;height:900px;border:none;visibility:hidden;';
        document.body.appendChild(iframe);
        const iDoc = iframe.contentDocument || (iframe.contentWindow as any)?.document;
        if (!iDoc) { iframe.remove(); return; }

        const applicableKPIs = kpiStats.series.filter(k => k.isApplicable);
        const kpiCardsHtml = applicableKPIs.map(k => {
            const sc = k.percent === 100 ? '#10b981' : k.percent > 60 ? '#3b82f6' : k.percent > 30 ? '#f59e0b' : '#ef4444';
            return `<div style="background:rgba(255,255,255,0.02);border:1.5px solid ${sc}30;border-top:3px solid ${sc};border-radius:14px;padding:16px;">
                <div style="font-size:7px;font-weight:900;color:${sc};text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">${k.label}</div>
                <div style="font-size:32px;font-weight:900;color:${sc};line-height:1;margin-bottom:4px;">${k.percent === -1 ? 'N/A' : k.percent + '%'}</div>
                <div style="font-size:8px;color:#64748b;font-weight:700;">${k.ready} / ${k.required} prêts</div>
                ${k.missing > 0 ? `<div style="margin-top:6px;font-size:7px;font-weight:900;color:${sc};background:${sc}15;padding:3px 8px;border-radius:99px;display:inline-block;">${k.missing} manquant${k.missing > 1 ? 's' : ''}</div>` : '<div style="margin-top:6px;font-size:7px;font-weight:900;color:#10b981;">✓ Complet</div>'}
                <div style="margin-top:8px;height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;"><div style="width:${Math.max(0, k.percent)}%;height:100%;background:${sc};border-radius:2px;"></div></div>
            </div>`;
        }).join('');

        // S-Curve bars (last 12 points)
        const sCurvePoints = globalScurve.slice(-12);
        const maxVal = Math.max(...sCurvePoints.map(p => p.planned), 1);
        const scBarsHtml = sCurvePoints.map(p => {
            const phPct = Math.round((p.planned / maxVal) * 100);
            const rhPct = Math.round((p.ready / maxVal) * 100);
            return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;">
                <div style="display:flex;align-items:flex-end;gap:2px;height:80px;">
                    <div style="width:10px;background:rgba(239,68,68,0.3);border-radius:2px 2px 0 0;height:${phPct}%;"></div>
                    <div style="width:10px;background:#10b981;border-radius:2px 2px 0 0;height:${rhPct}%;box-shadow:0 0 6px #10b98180;"></div>
                </div>
                <div style="font-size:7px;color:#475569;font-weight:700;text-align:center;">${p.dateLabel}</div>
            </div>`;
        }).join('');

        const pdrRowsHtml = pdrItems.slice(0, 30).map(p => {
            const sc = p.readiness === 1 ? '#10b981' : '#ef4444';
            return `<tr><td style="padding:8px 12px;font-size:8px;font-weight:700;color:#94a3b8;border-bottom:1px solid rgba(255,255,255,0.03);">${p.sparePart || '—'}</td>
                <td style="padding:8px 12px;font-size:8px;color:#64748b;border-bottom:1px solid rgba(255,255,255,0.03);">${p.otRef || '—'}</td>
                <td style="padding:8px 12px;font-size:8px;color:#64748b;border-bottom:1px solid rgba(255,255,255,0.03);">${p.qty || '—'} ${p.unite || ''}</td>
                <td style="padding:8px 12px;font-size:9px;font-weight:900;color:${sc};border-bottom:1px solid rgba(255,255,255,0.03);">${p.readiness === 1 ? '✓ PRÊT' : '✗ MANQUANT'}</td></tr>`;
        }).join('');

        const statusColor = missionStatus === 'AT RISK' ? '#ef4444' : missionStatus === 'PREPARING' ? '#f59e0b' : '#10b981';

        iDoc.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Readiness Report — PlanneX</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>@page{size:A3 landscape;margin:0}*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:'Inter',sans-serif;background:#020617;color:#f8fafc}.page{width:420mm;min-height:297mm;position:relative;page-break-after:always;overflow:hidden}</style></head><body>
<!-- PAGE 1: COVER -->
<div class="page" style="background:radial-gradient(ellipse at 60% 10%,#0d3b1e 0%,#051228 30%,#020617 65%);display:flex;flex-direction:column;">
  <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(16,185,129,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.03) 1px,transparent 1px);background-size:28px 28px;"></div>
  <div style="padding:48px 72px 0;display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:2;">
    <div><div style="font-size:24px;font-weight:900;letter-spacing:-2px;color:#fff;">Planne<span style="color:#10b981;">X</span></div><div style="font-size:7px;font-weight:700;color:#1e3a5f;letter-spacing:4px;text-transform:uppercase;">Industrial Intelligence Platform</div></div>
    <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:99px;padding:8px 28px;font-size:8px;font-weight:900;color:#10b981;letter-spacing:4px;text-transform:uppercase;">📊 Readiness Report</div>
  </div>
  <div style="padding:36px 72px;flex:1;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2;">
    <div style="font-size:8px;font-weight:900;color:#10b981;letter-spacing:6px;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:8px;"><span style="display:block;width:18px;height:2px;background:#10b981;"></span>Rapport de Préparation Stratégique</div>
    <div style="font-size:64px;font-weight:900;line-height:0.9;letter-spacing:-4px;color:#fff;margin-bottom:14px;">READINESS<br><span style="color:#10b981;">CONTROL</span> CENTER</div>
    <div style="font-size:13px;font-weight:500;color:#475569;max-width:520px;line-height:1.5;margin-bottom:40px;">Bilan complet de l'état de préparation de l'arrêt — permis, ressources, pièces de rechange et indicateurs de performance opérationnelle.</div>
    <div style="display:flex;gap:16px;flex-wrap:wrap;">
      ${[
                { icon: '📋', val: kpiStats.globalRequired, lbl: 'Éléments<br>Requis', c: '#94a3b8' },
                { icon: '✅', val: kpiStats.globalReady, lbl: 'Éléments<br>Prêts', c: '#10b981' },
                { icon: '⚠', val: kpiStats.globalRequired - kpiStats.globalReady, lbl: 'Éléments<br>Manquants', c: '#ef4444' },
                { icon: '🔩', val: kpiStats.pdrTotal, lbl: 'Pièces de<br>Rechange', c: '#0ea5e9' },
                { icon: '✓', val: kpiStats.pdrReady, lbl: 'PDR<br>Disponibles', c: '#10b981' },
                { icon: '📈', val: kpiStats.globalPercent + '%', lbl: 'Readiness<br>Globale', c: statusColor },
            ].map(s => `<div style="width:130px;background:rgba(255,255,255,0.02);border:1.5px solid ${s.c}25;border-radius:18px;padding:20px 14px;text-align:center;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${s.c},transparent);"></div>
        <div style="font-size:16px;margin-bottom:6px;">${s.icon}</div>
        <div style="font-size:32px;font-weight:900;line-height:1;color:${s.c};margin-bottom:4px;">${s.val}</div>
        <div style="font-size:7px;font-weight:900;color:#334155;text-transform:uppercase;letter-spacing:2px;line-height:1.4;">${s.lbl}</div>
      </div>`).join('')}
    </div>
  </div>
  <div style="padding:0 72px 40px;position:relative;z-index:2;display:flex;justify-content:space-between;align-items:flex-end;">
    <div style="display:flex;align-items:center;gap:14px;">
      <div style="width:48px;height:48px;border-radius:50%;border:3px solid ${statusColor};display:flex;align-items:center;justify-content:center;position:relative;">
        <div style="font-size:10px;font-weight:900;color:${statusColor};">${kpiStats.globalPercent}%</div>
      </div>
      <div><div style="font-size:7px;font-weight:900;color:#1e293b;letter-spacing:3px;text-transform:uppercase;">Statut Mission</div>
      <div style="font-size:20px;font-weight:900;color:${statusColor};letter-spacing:-1px;">${missionStatus}</div></div>
    </div>
    <div style="font-size:8px;font-weight:700;color:#1e293b;text-align:right;line-height:1.8;">Généré le ${dateStr} à ${timeStr}<br>PlanneX · Rapport Readiness · Confidentiel</div>
  </div>
</div>
<!-- PAGE 2: KPI DETAILS + S-CURVE -->
<div class="page" style="background:#020617;">
  <div style="padding:28px 56px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.04);">
    <div><div style="font-size:7px;font-weight:900;color:#10b981;letter-spacing:5px;text-transform:uppercase;">Analyse par Paramètre</div>
    <div style="font-size:22px;font-weight:900;color:#fff;margin-top:2px;">Tableau de Bord des KPI de Préparation</div></div>
    <div style="display:flex;align-items:center;gap:8px;background:rgba(${missionStatus === 'AT RISK' ? '239,68,68' : '16,185,129'},0.1);border:1px solid rgba(${missionStatus === 'AT RISK' ? '239,68,68' : '16,185,129'},0.25);border-radius:99px;padding:8px 20px;">
      <div style="width:7px;height:7px;border-radius:50%;background:${statusColor};"></div>
      <div style="font-size:9px;font-weight:900;color:${statusColor};letter-spacing:2px;text-transform:uppercase;">${missionStatus}</div>
    </div>
  </div>
  <!-- KPI Grid -->
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding:18px 56px 0;">${kpiCardsHtml}</div>
  <!-- PDR Card -->
  <div style="margin:14px 56px 0;background:rgba(14,165,233,0.05);border:1.5px solid rgba(14,165,233,0.2);border-top:3px solid #0ea5e9;border-radius:14px;padding:16px;display:flex;align-items:center;gap:24px;">
    <div><div style="font-size:7px;font-weight:900;color:#0ea5e9;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">🔩 PIÈCES DE RECHANGE (PDR)</div>
    <div style="font-size:32px;font-weight:900;color:#0ea5e9;line-height:1;">${kpiStats.pdrTotal > 0 ? Math.round((kpiStats.pdrReady / kpiStats.pdrTotal) * 100) + '%' : 'N/A'}</div></div>
    <div style="width:1px;height:40px;background:rgba(255,255,255,0.05);"></div>
    <div style="display:flex;gap:28px;">
      <div><div style="font-size:7px;color:#334155;font-weight:900;text-transform:uppercase;letter-spacing:2px;">Total PDR</div><div style="font-size:20px;font-weight:900;color:#f8fafc;">${kpiStats.pdrTotal}</div></div>
      <div><div style="font-size:7px;color:#334155;font-weight:900;text-transform:uppercase;letter-spacing:2px;">Disponibles</div><div style="font-size:20px;font-weight:900;color:#10b981;">${kpiStats.pdrReady}</div></div>
      <div><div style="font-size:7px;color:#334155;font-weight:900;text-transform:uppercase;letter-spacing:2px;">Manquantes</div><div style="font-size:20px;font-weight:900;color:#ef4444;">${kpiStats.pdrTotal - kpiStats.pdrReady}</div></div>
    </div>
    <div style="flex:1;margin-left:16px;"><div style="font-size:7px;color:#334155;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Taux de disponibilité PDR</div>
    <div style="height:6px;background:rgba(255,255,255,0.04);border-radius:3px;overflow:hidden;"><div style="width:${kpiStats.pdrTotal > 0 ? Math.round((kpiStats.pdrReady / kpiStats.pdrTotal) * 100) : 0}%;height:100%;background:#0ea5e9;border-radius:3px;"></div></div></div>
  </div>
  <!-- S-Curve mini -->
  <div style="margin:14px 56px 0;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:14px;padding:16px 20px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <div><div style="font-size:7px;font-weight:900;color:#10b981;letter-spacing:4px;text-transform:uppercase;">Courbe S de Readiness Globale</div>
      <div style="font-size:8px;color:#334155;font-weight:700;margin-top:2px;">Planifié (rouge) vs Prêt (vert) — cumul</div></div>
      <div style="display:flex;gap:12px;align-items:center;">
        <div style="display:flex;align-items:center;gap:4px;"><div style="width:14px;height:2px;background:#ef4444;border-top:2px dashed #ef4444;"></div><span style="font-size:7px;color:#64748b;font-weight:700;">Planifié</span></div>
        <div style="display:flex;align-items:center;gap:4px;"><div style="width:14px;height:2px;background:#10b981;"></div><span style="font-size:7px;color:#64748b;font-weight:700;">Prêt</span></div>
      </div>
    </div>
    <div style="display:flex;align-items:flex-end;gap:4px;height:96px;">${scBarsHtml}</div>
  </div>
  <div style="padding:10px 56px;border-top:1px solid rgba(255,255,255,0.03);margin-top:12px;display:flex;justify-content:space-between;font-size:7px;font-weight:700;color:#0f172a;">
    <span>PlanneX · Readiness Report · ${dateStr}</span><span style="color:#10b981;">📊 Rapport généré automatiquement par PlanneX</span><span>Confidentiel – Usage Interne</span>
  </div>
</div>
<!-- PAGE 3: PDR TABLE -->
<div class="page" style="background:#020617;height:auto;overflow:visible;">
  <div style="padding:28px 56px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.04);">
    <div><div style="font-size:7px;font-weight:900;color:#0ea5e9;letter-spacing:5px;text-transform:uppercase;">🔩 Inventaire PDR</div>
    <div style="font-size:22px;font-weight:900;color:#fff;margin-top:2px;">Pièces de Rechange — Statut de Disponibilité</div></div>
    <div style="font-size:9px;font-weight:900;color:#0ea5e9;background:rgba(14,165,233,0.1);border:1px solid rgba(14,165,233,0.2);border-radius:99px;padding:6px 18px;">${kpiStats.pdrTotal} pièces · ${kpiStats.pdrReady} disponibles</div>
  </div>
  <div style="padding:16px 56px;">
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr>
        <th style="padding:10px 12px;font-size:7px;font-weight:900;color:#334155;text-transform:uppercase;letter-spacing:2px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06);">Désignation</th>
        <th style="padding:10px 12px;font-size:7px;font-weight:900;color:#334155;text-transform:uppercase;letter-spacing:2px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06);">OT Référence</th>
        <th style="padding:10px 12px;font-size:7px;font-weight:900;color:#334155;text-transform:uppercase;letter-spacing:2px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06);">Quantité</th>
        <th style="padding:10px 12px;font-size:7px;font-weight:900;color:#334155;text-transform:uppercase;letter-spacing:2px;text-align:left;border-bottom:1px solid rgba(255,255,255,0.06);">Statut</th>
      </tr></thead>
      <tbody>${pdrRowsHtml}</tbody>
    </table>
    ${pdrItems.length > 30 ? `<div style="text-align:center;padding:12px;font-size:8px;color:#334155;font-weight:700;">... et ${pdrItems.length - 30} pièces supplémentaires</div>` : ''}
  </div>
  <div style="padding:10px 56px;border-top:1px solid rgba(255,255,255,0.03);display:flex;justify-content:space-between;font-size:7px;font-weight:700;color:#0f172a;">
    <span>PlanneX · Readiness Control Center · ${dateStr} ${timeStr}</span>
    <span style="color:#10b981;">📊 Rapport de Préparation — Confidentiel, Usage Interne</span>
  </div>
</div>
<script>setTimeout(()=>{window.print();},900);</script></body></html>`);
        iDoc.close();
        setTimeout(() => {
            try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch (e) { console.error(e); }
            setTimeout(() => iframe.remove(), 3000);
        }, 900);
    };

    return (
        <div className="p-8 flex flex-col gap-10 w-full min-h-screen bg-[#06080C] text-slate-200">
            {/* HEADER HUB */}
            <div className="flex flex-wrap justify-between items-center gap-6 border-b border-white/[0.05] pb-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/[0.02] blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className={`w-4 h-4 rounded-full animate-ping absolute inset-0 ${missionStatus === 'AT RISK' ? 'bg-red-500' : 'bg-emerald-500'} opacity-20`} />
                            <div className={`w-4 h-4 rounded-full relative z-10 ${missionStatus === 'AT RISK' ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)]' : 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.6)]'}`} />
                        </div>
                        <h1 className="text-5xl lg:text-6xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-2xl">
                            Readiness <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Control Center</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-5 mt-5">
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md border border-white/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black text-slate-400 tracking-[0.3em] uppercase">Tactical Intelligence HUD</span>
                        </div>
                        <div className="h-3 w-px bg-slate-800" />
                        <span className="text-[10px] font-black text-emerald-400/80 tracking-[0.2em] uppercase italic">Strategic Preparation Alpha</span>
                    </div>
                </div>

                {/* Right side — global card + export button */}
                <div className="flex items-center gap-4">
                    {/* Global Progress Yield — compact header card */}
                    <div className="group relative flex items-center gap-6 px-8 py-5 rounded-[2.5rem] border backdrop-blur-3xl shadow-2xl ring-1 ring-white/5 overflow-hidden bg-[#0D0F14]/80 border-white/10 transition-all duration-700 hover:border-emerald-500/30">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] to-transparent pointer-events-none" />
                        {/* Circular mini */}
                        <div className="relative w-20 h-20 flex-shrink-0">
                            <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90" fill="none">
                                <circle cx="18" cy="18" r="15" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15"
                                    stroke={kpiStats.globalPercent === 100 ? '#10b981' : kpiStats.globalPercent > 70 ? '#3b82f6' : kpiStats.globalPercent > 40 ? '#f59e0b' : '#ef4444'}
                                    strokeWidth="3" strokeLinecap="round"
                                    strokeDasharray={`${(kpiStats.globalPercent / 100) * 94.2} 94.2`}
                                    style={{ filter: `drop-shadow(0 0 6px ${kpiStats.globalPercent === 100 ? '#10b981' : '#3b82f6'})`, transition: 'stroke-dasharray 1.5s ease' }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-sm font-black ${kpiStats.globalPercent === 100 ? 'text-emerald-400' : 'text-white'}`}>{kpiStats.globalPercent}%</span>
                            </div>
                        </div>
                        <div className="relative z-10">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] mb-1">Global Progress Yield</p>
                            <p className={`text-3xl font-black italic tracking-tighter ${missionStatus === 'AT RISK' ? 'text-red-400 animate-pulse' : missionStatus === 'PREPARING' ? 'text-amber-400' : 'text-emerald-400'}`}>{missionStatus}</p>
                            <p className="text-[9px] text-slate-600 font-bold mt-1">{kpiStats.globalReady} / {kpiStats.globalRequired} éléments prêts</p>
                            {kpiStats.pdrTotal > 0 && (
                                <p className="text-[8px] text-cyan-600 font-bold mt-0.5">🔩 PDR: {kpiStats.pdrReady} / {kpiStats.pdrTotal} disponibles</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ GLOBAL READINESS S-CURVE ═══════════════════════════ */}
            <div className="bg-[#0D0F14] border border-white/10 rounded-[3.5rem] p-8 lg:p-10 relative group overflow-hidden mb-2 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.03] via-transparent to-transparent" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent rounded-t-[3.5rem]" />

                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-8 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Global Readiness S-Curve</h3>
                        </div>
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest italic ml-5">
                            All 10 Readiness Parameters · Cumulative Demand vs Availability
                        </p>
                    </div>

                    {/* Legend + Resolution */}
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Legend */}
                        <div className="flex items-center gap-5">
                            <div className="flex items-center gap-2">
                                <div className="w-8 border-t-2 border-dashed border-red-500" />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Planned</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 border-t-2 border-emerald-400" />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Ready</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Gap</span>
                            </div>
                        </div>
                        {/* Resolution Selector */}
                        <div className="flex items-center gap-1 bg-black/40 border border-white/5 rounded-xl p-1">
                            {[
                                { label: '1H', val: 1 },
                                { label: '6H', val: 6 },
                                { label: '12H', val: 12 },
                                { label: '1D', val: 24 },
                                { label: '1W', val: 168 },
                                { label: '1M', val: 720 },
                                { label: '1Y', val: 8760 },
                            ].map(r => (
                                <button key={r.val} onClick={() => setScurveResolution(r.val)}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${scurveResolution === r.val
                                        ? 'bg-emerald-500 text-black shadow-[0_0_12px_#10b98160]'
                                        : 'text-slate-600 hover:text-slate-300'
                                        }`}>{r.label}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="h-[380px] w-full relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={globalScurve} margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                            <defs>
                                <linearGradient id="gapGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.18} />
                                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.01} />
                                </linearGradient>
                                <linearGradient id="readyGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.12} />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.01} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="dateLabel" axisLine={false} tickLine={false}
                                tick={{ fill: '#475569', fontSize: 9, fontWeight: 900 }}
                                interval={Math.max(0, Math.floor(globalScurve.length / 10) - 1)} />
                            <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9 }} />
                            <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false}
                                tick={{ fill: '#475569', fontSize: 9 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: '#0a0e1a', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 60px rgba(0,0,0,0.6)', padding: '16px 20px', minWidth: 260 }}
                                labelStyle={{ color: '#94a3b8', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}
                                formatter={(value: any, name: string, props: any) => {
                                    const d = props.payload;
                                    if (name === '__tooltip_main__') {
                                        const lines: React.ReactNode[] = [
                                            <div key="hdr" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 8, paddingBottom: 6 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <span style={{ color: '#ef4444', fontWeight: 900, fontSize: 10 }}>▬▬ PLANNED: {d.planned}</span>
                                                    <span style={{ color: '#10b981', fontWeight: 900, fontSize: 10 }}>●── READY: {d.ready}</span>
                                                </div>
                                                <div style={{ fontSize: 9, color: '#f59e0b', fontWeight: 900 }}>GAP: {d.gap} · READINESS: {d.readinessPct}%</div>
                                            </div>,
                                            ...[{ id: 'pdr', label: 'SPARE PARTS', color: '#0ea5e9' }, ...KPI_CONFIGS].map((cfg) => {
                                                const pl = d[`${cfg.id}_planned`] ?? 0;
                                                const rd = d[`${cfg.id}_ready`] ?? 0;
                                                if (pl === 0) return null;
                                                const pct = Math.round((rd / pl) * 100);
                                                return (
                                                    <div key={cfg.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                                                        <span style={{ color: (cfg as any).color || '#0ea5e9', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>{(cfg as any).label || 'Spare Parts'}</span>
                                                        <span style={{ fontSize: 9, fontWeight: 900, color: pct === 100 ? '#10b981' : pct > 50 ? '#f59e0b' : '#ef4444' }}>{rd}/{pl} ({pct}%)</span>
                                                    </div>
                                                );
                                            })
                                        ];
                                        return [<div>{lines}</div>, ''];
                                    }
                                    return [value, name];
                                }}
                            />
                            {/* gap fill */}
                            <Area yAxisId="left" type="monotone" dataKey="gap" name="Gap" fill="url(#gapGrad)" stroke="none" />
                            {/* ready area */}
                            <Area yAxisId="left" type="monotone" dataKey="ready" name="__tooltip_main__" fill="url(#readyGrad)" stroke="none" />
                            {/* planned line — red dashed */}
                            <Line yAxisId="left" type="monotone" dataKey="planned" name="Planned" stroke="#ef4444" strokeWidth={2.5} strokeDasharray="8 4" dot={false}
                                activeDot={{ r: 5, fill: '#ef4444', stroke: '#0a0e1a', strokeWidth: 2 }} />
                            {/* ready line — green solid */}
                            <Line yAxisId="left" type="monotone" dataKey="ready" name="Ready" stroke="#10b981" strokeWidth={4} dot={false}
                                activeDot={{ r: 6, fill: '#10b981', stroke: '#0a0e1a', strokeWidth: 2 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Per-parameter mini KPI strip */}
                <div className="mt-6 grid grid-cols-5 lg:grid-cols-10 gap-2 relative z-10">
                    {[{ id: 'pdr', label: 'PDR', color: '#0ea5e9' }, ...KPI_CONFIGS].map(cfg => {
                        const last = globalScurve[globalScurve.length - 1];
                        const pl = last?.[`${cfg.id}_planned`] ?? 0;
                        const rd = last?.[`${cfg.id}_ready`] ?? 0;
                        const pct = pl > 0 ? Math.round((rd / pl) * 100) : -1;
                        return (
                            <div key={cfg.id} className="bg-black/30 border border-white/[0.04] rounded-xl p-2 flex flex-col gap-1">
                                <span className="text-[7px] font-black uppercase tracking-widest truncate" style={{ color: (cfg as any).color || '#0ea5e9' }}>{(cfg as any).label || 'PDR'}</span>
                                <span className="text-[13px] font-black text-white leading-none">{pct === -1 ? 'N/A' : `${pct}%`}</span>
                                <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${Math.max(0, pct)}%`, backgroundColor: pct === 100 ? '#10b981' : pct > 50 ? '#f59e0b' : '#ef4444' }} />
                                </div>
                                <span className="text-[6px] text-slate-700 font-bold">{rd}/{pl}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══ KPI TACTICAL GRID ═══════════════════════════════ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {kpiStats.series.map((kpi) => {
                    const isActive = selectedKPI === kpi.id && drillDownMode;
                    const c = kpi.color;
                    const statusColor = kpi.percent === 100 ? '#10b981' : kpi.percent === -1 ? '#1e293b' : kpi.percent > 60 ? '#3b82f6' : kpi.percent > 30 ? '#f59e0b' : '#ef4444';
                    const circumference = 2 * Math.PI * 28; // r=28
                    const dash = kpi.percent > 0 ? (kpi.percent / 100) * circumference : 0;
                    return (
                        <button
                            key={kpi.id}
                            onClick={() => { setSelectedKPI(kpi.id); setDrillDownMode(true); }}
                            className="group relative rounded-2xl border text-left overflow-hidden flex flex-col transition-all duration-500 active:scale-95 hover:-translate-y-1"
                            style={{
                                background: isActive ? `linear-gradient(135deg, ${c}12, #0a0e1a)` : 'rgba(13,15,20,0.9)',
                                borderColor: isActive ? `${c}50` : 'rgba(255,255,255,0.05)',
                                boxShadow: isActive ? `0 0 40px ${c}25, inset 0 1px 0 ${c}20` : '0 2px 20px rgba(0,0,0,0.4)',
                            }}
                        >
                            {/* Top shimmer line */}
                            <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${c}${isActive ? '80' : '30'}, transparent)` }} />

                            {/* Ambient glow */}
                            <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl transition-all duration-700"
                                style={{ backgroundColor: `${c}${isActive ? '20' : '0a'}` }} />

                            <div className="p-4 flex flex-col gap-3 relative z-10 flex-1">
                                {/* Header: icon + ring */}
                                <div className="flex items-center justify-between">
                                    {/* SVG Progress Ring */}
                                    <div className="relative w-14 h-14 flex-shrink-0">
                                        <svg viewBox="0 0 64 64" className="w-14 h-14 -rotate-90">
                                            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
                                            {kpi.percent !== -1 && (
                                                <circle cx="32" cy="32" r="28" fill="none"
                                                    stroke={statusColor}
                                                    strokeWidth="4"
                                                    strokeLinecap="round"
                                                    strokeDasharray={`${dash} ${circumference}`}
                                                    style={{ filter: `drop-shadow(0 0 4px ${statusColor})`, transition: 'stroke-dasharray 2s ease' }}
                                                />
                                            )}
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke={isActive ? c : '#475569'} strokeWidth="2.5"
                                                style={{ transition: 'stroke 0.3s', filter: isActive ? `drop-shadow(0 0 4px ${c})` : 'none' }}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Status badge */}
                                    <div className="flex flex-col items-end gap-1">
                                        {kpi.percent === 100 ? (
                                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                                                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                    <path d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        ) : kpi.percent !== -1 && (
                                            <div className="px-1.5 py-0.5 rounded text-[7px] font-black tracking-wider border"
                                                style={{ color: statusColor, borderColor: `${statusColor}40`, backgroundColor: `${statusColor}10` }}>
                                                {kpi.missing}↓
                                            </div>
                                        )}
                                        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: statusColor }} />
                                    </div>
                                </div>

                                {/* Label */}
                                <div>
                                    <p className="text-[8px] font-black tracking-[0.25em] uppercase mb-0.5 transition-colors duration-300"
                                        style={{ color: isActive ? c : '#475569' }}>{kpi.label}</p>
                                    <div className="h-px transition-all duration-700 group-hover:opacity-100 opacity-50"
                                        style={{ width: isActive ? '100%' : '24px', backgroundColor: `${c}60` }} />
                                </div>

                                {/* Big percent number */}
                                <div className="flex items-baseline gap-0.5">
                                    <span className="text-[2.5rem] font-black italic tracking-tighter leading-none transition-all duration-500"
                                        style={{ color: kpi.percent === -1 ? '#1e293b' : statusColor, textShadow: kpi.percent !== -1 ? `0 0 30px ${statusColor}50` : 'none' }}>
                                        {kpi.percent === -1 ? 'N/A' : kpi.percent}
                                    </span>
                                    {kpi.percent !== -1 && <span className="text-base font-black italic" style={{ color: `${statusColor}70` }}>%</span>}
                                </div>

                                {/* Footer stats */}
                                <div className="mt-auto pt-2 border-t border-white/[0.04]">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{kpi.ready}/{kpi.required}</span>
                                        {kpi.missing > 0 && (
                                            <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                                                style={{ color: statusColor, backgroundColor: `${statusColor}12` }}>
                                                {kpi.missing} missing
                                            </span>
                                        )}
                                    </div>
                                    {/* Segmented progress bar */}
                                    <div className="h-1 bg-black/50 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-[2s] ease-out"
                                            style={{ width: `${kpi.percent === -1 ? 0 : kpi.percent}%`, backgroundColor: statusColor, boxShadow: `0 0 8px ${statusColor}80` }} />
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* ═══ INTELLIGENCE DRILL-DOWN ═══════════════════════════ */}
            {drillDownMode && (() => {
                const activeKPI = KPI_CONFIGS.find(c => c.id === selectedKPI)!;
                const accentColor = activeKPI?.color || '#3b82f6';
                const kpiPl = `${selectedKPI}_planned`;
                const kpiRd = `${selectedKPI}_ready`;
                // computed per-KPI scurve points
                const chartData = globalScurve.map(pt => ({
                    ...pt,
                    kpi_planned: pt[kpiPl] ?? 0,
                    kpi_ready: pt[kpiRd] ?? 0,
                    kpi_gap: Math.max(0, (pt[kpiPl] ?? 0) - (pt[kpiRd] ?? 0)),
                }));
                const activeStat = kpiStats.series.find(s => s.id === selectedKPI);
                return (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="rounded-3xl border overflow-hidden shadow-2xl"
                            style={{ background: `linear-gradient(135deg, #0a0e1a, #0d0f14)`, borderColor: `${accentColor}25`, boxShadow: `0 0 80px ${accentColor}15` }}>

                            {/* ── Panel Header ── */}
                            <div className="relative px-8 py-6 border-b"
                                style={{ borderColor: `${accentColor}15`, background: `linear-gradient(135deg, ${accentColor}10, transparent)` }}>
                                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)` }} />
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center border"
                                            style={{ backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40` }}>
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={accentColor} strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d={activeKPI?.icon} />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black tracking-[0.4em] uppercase mb-0.5" style={{ color: accentColor }}>Intelligence Module</p>
                                            <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase">{activeKPI?.label}</h3>
                                        </div>
                                        <div className="flex items-center gap-4 ml-4 pl-4 border-l border-white/5">
                                            {[{ label: 'PLANNED', val: activeStat?.required ?? 0, color: '#ef4444' },
                                            { label: 'READY', val: activeStat?.ready ?? 0, color: '#10b981' },
                                            { label: 'GAP', val: activeStat?.missing ?? 0, color: '#f59e0b' },
                                            ].map(stat => (
                                                <div key={stat.label} className="text-center">
                                                    <p className="text-[7px] font-black tracking-widest uppercase" style={{ color: stat.color }}>{stat.label}</p>
                                                    <p className="text-xl font-black text-white">{stat.val}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <button onClick={() => setDrillDownMode(false)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-slate-500 hover:text-white hover:border-white/30 hover:bg-white/5 transition-all text-[9px] font-black uppercase tracking-widest">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
                                        Close
                                    </button>
                                </div>
                            </div>

                            {/* ── S-Curve Chart with Resolution ── */}
                            <div className="p-8">
                                <div className="rounded-2xl border border-white/5 bg-black/30 p-6 mb-6">
                                    <div className="flex items-center justify-between mb-5">
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-[0.4em] mb-1" style={{ color: accentColor }}>Readiness Window · {activeKPI?.label}</p>
                                            <p className="text-[9px] text-slate-600 font-bold">Planned vs Achieved — cumulative over time</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {/* Legend */}
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-5 border-t-2 border-dashed border-red-500" />
                                                    <span className="text-[8px] font-black text-slate-600 uppercase">Planned</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-5 border-t-2" style={{ borderColor: accentColor }} />
                                                    <span className="text-[8px] font-black text-slate-600 uppercase">Ready</span>
                                                </div>
                                            </div>
                                            {/* Resolution */}
                                            <div className="flex items-center gap-0.5 bg-black/40 border border-white/5 rounded-lg p-0.5">
                                                {[
                                                    { l: '1H', v: 1 },
                                                    { l: '6H', v: 6 },
                                                    { l: '12H', v: 12 },
                                                    { l: '1D', v: 24 },
                                                    { l: '1W', v: 168 },
                                                    { l: '1M', v: 720 },
                                                    { l: '1Y', v: 8760 },
                                                ].map(r => (
                                                    <button key={r.v} onClick={() => setScurveResolution(r.v)}
                                                        className="px-2.5 py-1 rounded text-[8px] font-black uppercase tracking-widest transition-all"
                                                        style={scurveResolution === r.v
                                                            ? { backgroundColor: accentColor, color: '#000', boxShadow: `0 0 10px ${accentColor}60` }
                                                            : { color: '#475569' }}>{r.l}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-[220px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id={`drillGrad_${selectedKPI}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor={accentColor} stopOpacity={0.15} />
                                                        <stop offset="100%" stopColor={accentColor} stopOpacity={0.01} />
                                                    </linearGradient>
                                                    <linearGradient id="drillGapGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.12} />
                                                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="dateLabel" axisLine={false} tickLine={false}
                                                    tick={{ fill: '#334155', fontSize: 8, fontWeight: 900 }}
                                                    interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 8 }} />
                                                <RechartsTooltip
                                                    contentStyle={{ backgroundColor: '#080c14', borderRadius: '12px', border: `1px solid ${accentColor}30`, padding: '10px 14px' }}
                                                    labelStyle={{ color: '#64748b', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', marginBottom: 6 }}
                                                    formatter={(val: any, name: string) => {
                                                        const colors: Record<string, string> = { 'Planned': '#ef4444', 'Ready': accentColor, 'Gap': '#f59e0b' };
                                                        return [<span style={{ color: colors[name] || '#fff', fontWeight: 900 }}>{val}</span>, name];
                                                    }}
                                                />
                                                <Area type="monotone" dataKey="kpi_gap" name="Gap" fill="url(#drillGapGrad)" stroke="none" />
                                                <Area type="monotone" dataKey="kpi_ready" name="Ready" fill={`url(#drillGrad_${selectedKPI})`} stroke="none" />
                                                <Line type="monotone" dataKey="kpi_planned" name="Planned" stroke="#ef4444" strokeWidth={2} strokeDasharray="6 3" dot={false}
                                                    activeDot={{ r: 4, fill: '#ef4444', stroke: '#080c14', strokeWidth: 2 }} />
                                                <Line type="monotone" dataKey="kpi_ready" name="Ready" stroke={accentColor} strokeWidth={3} dot={false}
                                                    activeDot={{ r: 5, fill: accentColor, stroke: '#080c14', strokeWidth: 2 }}
                                                    style={{ filter: `drop-shadow(0 0 6px ${accentColor}80)` }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* ── Analysis Grid ── */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {/* Family Priority Intelligence Board */}
                                    {(() => {
                                        const filtered = familyBreakdown
                                            .filter(f => f.family.toLowerCase().includes(fbSearch.toLowerCase()))
                                            .sort((a, b) => {
                                                const pctA = a.required > 0 ? (a.ready / a.required) : 1;
                                                const pctB = b.required > 0 ? (b.ready / b.required) : 1;
                                                if (fbSort === 'worst') return pctA - pctB;
                                                if (fbSort === 'best') return pctB - pctA;
                                                if (fbSort === 'missing') return b.missing - a.missing;
                                                return a.family.localeCompare(b.family);
                                            });
                                        const totalFamilies = familyBreakdown.length;
                                        const fullReady = familyBreakdown.filter(f => f.missing === 0 && f.required > 0).length;
                                        const atRisk = familyBreakdown.filter(f => f.missing > 0).length;
                                        const avgPct = familyBreakdown.length > 0
                                            ? Math.round(familyBreakdown.reduce((s, f) => s + (f.required > 0 ? f.ready / f.required : 1), 0) / familyBreakdown.length * 100) : 0;
                                        return (
                                            <div className="rounded-2xl border border-white/[0.04] bg-black/20 p-5 flex flex-col gap-3">
                                                {/* Header */}
                                                <div>
                                                    <p className="text-[8px] font-black uppercase tracking-[0.35em] mb-0.5" style={{ color: accentColor }}>Family Priority Board</p>
                                                    <p className="text-[8px] text-slate-700 font-bold">Ranked readiness · scales to any dataset size</p>
                                                </div>

                                                {/* Summary strip */}
                                                <div className="grid grid-cols-4 gap-1.5">
                                                    {[
                                                        { label: 'Families', val: totalFamilies, color: '#94a3b8' },
                                                        { label: 'Avg Ready', val: `${avgPct}%`, color: accentColor },
                                                        { label: 'Complete', val: fullReady, color: '#10b981' },
                                                        { label: 'At Risk', val: atRisk, color: '#ef4444' },
                                                    ].map(s => (
                                                        <div key={s.label} className="rounded-lg p-2 text-center border border-white/[0.03] bg-black/20">
                                                            <p className="text-[7px] font-black uppercase tracking-widest text-slate-700 mb-0.5">{s.label}</p>
                                                            <p className="text-sm font-black" style={{ color: s.color }}>{s.val}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Controls */}
                                                <div className="flex items-center gap-2">
                                                    {/* Search */}
                                                    <div className="relative flex-1">
                                                        <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                        </svg>
                                                        <input
                                                            value={fbSearch}
                                                            onChange={e => setFbSearch(e.target.value)}
                                                            placeholder="Search family..."
                                                            className="w-full bg-black/30 border border-white/[0.05] rounded-lg pl-6 pr-3 py-1.5 text-[9px] font-bold text-slate-300 placeholder-slate-700 outline-none focus:border-white/10"
                                                        />
                                                    </div>
                                                    {/* Sort pills */}
                                                    <div className="flex gap-0.5 bg-black/30 border border-white/[0.04] rounded-lg p-0.5">
                                                        {([['worst', '↓ Risk'], ['missing', '↓ Gap'], ['best', '↑ Best'], ['name', 'A–Z']] as const).map(([k, lbl]) => (
                                                            <button key={k} onClick={() => setFbSort(k)}
                                                                className="px-2 py-1 rounded text-[7px] font-black uppercase tracking-widest transition-all"
                                                                style={fbSort === k
                                                                    ? { backgroundColor: accentColor, color: '#000' }
                                                                    : { color: '#475569' }}>{lbl}</button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Ranked rows */}
                                                <div className="overflow-y-auto max-h-[210px] tactical-scrollbar flex flex-col gap-1">
                                                    {filtered.length === 0 && (
                                                        <p className="text-center text-[9px] text-slate-700 py-6 font-bold">No results</p>
                                                    )}
                                                    {filtered.map((f, i) => {
                                                        const pct = f.required > 0 ? Math.round((f.ready / f.required) * 100) : 100;
                                                        const statusColor = pct === 100 ? '#10b981' : pct > 60 ? '#3b82f6' : pct > 30 ? '#f59e0b' : '#ef4444';
                                                        const circ = 2 * Math.PI * 10;
                                                        const dash = (pct / 100) * circ;
                                                        return (
                                                            <div key={f.family}
                                                                className="flex items-center gap-3 px-3 py-2 rounded-xl border border-white/[0.03] bg-black/10 hover:bg-white/[0.03] hover:border-white/[0.07] transition-all group">
                                                                {/* Rank */}
                                                                <span className="text-[9px] font-black text-slate-700 w-5 text-right flex-shrink-0">#{i + 1}</span>
                                                                {/* Mini donut */}
                                                                <div className="relative w-7 h-7 flex-shrink-0">
                                                                    <svg viewBox="0 0 24 24" className="w-7 h-7 -rotate-90">
                                                                        <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                                                                        <circle cx="12" cy="12" r="10" fill="none" stroke={statusColor} strokeWidth="3"
                                                                            strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
                                                                            style={{ filter: `drop-shadow(0 0 3px ${statusColor})` }} />
                                                                    </svg>
                                                                    <span className="absolute inset-0 flex items-center justify-center text-[6px] font-black" style={{ color: statusColor }}>{pct}</span>
                                                                </div>
                                                                {/* Name + bar */}
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[9px] font-black text-slate-300 truncate uppercase tracking-tight group-hover:text-white transition-colors">{f.family}</p>
                                                                    <div className="mt-1 h-0.5 bg-black/40 rounded-full overflow-hidden">
                                                                        <div className="h-full rounded-full transition-all duration-1000"
                                                                            style={{ width: `${pct}%`, backgroundColor: statusColor }} />
                                                                    </div>
                                                                </div>
                                                                {/* Stats */}
                                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                                    <span className="text-[8px] font-bold text-slate-600">{f.ready}/{f.required}</span>
                                                                    {f.missing > 0 && (
                                                                        <span className="px-1.5 py-0.5 rounded text-[7px] font-black"
                                                                            style={{ backgroundColor: `${statusColor}15`, color: statusColor }}>
                                                                            -{f.missing}
                                                                        </span>
                                                                    )}
                                                                    {f.criticalCount > 0 && (
                                                                        <span className="w-4 h-4 rounded bg-red-500/20 border border-red-500/30 flex items-center justify-center text-[6px] font-black text-red-400">!</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Node Intelligence Log */}
                                    <div className="rounded-2xl border border-white/[0.04] bg-black/20 overflow-hidden flex flex-col">
                                        <div className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between">
                                            <div>
                                                <p className="text-[8px] font-black uppercase tracking-[0.35em] mb-0.5" style={{ color: accentColor }}>Node Intelligence Log</p>
                                                <p className="text-[8px] text-slate-700 font-bold">{drillDownTasks.filter(t => !t.isReady).length} nodes require action</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border" style={{ borderColor: `${accentColor}30`, backgroundColor: `${accentColor}10` }}>
                                                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
                                                <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: accentColor }}>Live</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto max-h-[280px] tactical-scrollbar">
                                            {drillDownTasks.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                                                        <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    </div>
                                                    <p className="text-[9px] text-slate-700 font-bold uppercase tracking-widest">No tasks require this</p>
                                                </div>
                                            ) : (
                                                drillDownTasks.map((t, i) => (
                                                    <div key={i}
                                                        className={`flex items-center gap-3 px-5 py-3 border-b border-white/[0.03] transition-colors hover:bg-white/[0.02] ${t.isCritical ? 'bg-red-500/[0.02]' : ''}`}>
                                                        {/* Status indicator */}
                                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.isReady ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-red-500 shadow-[0_0_6px_#ef4444] animate-pulse'}`} />
                                                        {/* Content */}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[9px] font-black text-slate-300 truncate uppercase tracking-tight">{t['GLOBAL TASKS'] || 'N/A'}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[7px] font-bold text-slate-700">#{t.id}</span>
                                                                {t.FAMILLE && <span className="text-[7px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ backgroundColor: `${accentColor}15`, color: `${accentColor}90` }}>{String(t.FAMILLE).slice(0, 12)}</span>}
                                                                {t.isCritical && <span className="text-[7px] font-black text-red-400 uppercase">CRIT</span>}
                                                            </div>
                                                        </div>
                                                        {/* Action button */}
                                                        <button onClick={() => toggleReadiness(t.id)}
                                                            className="flex-shrink-0 px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-wider transition-all active:scale-95"
                                                            style={t.isReady
                                                                ? { borderColor: '#ef444440', color: '#ef4444', backgroundColor: '#ef444410' }
                                                                : { borderColor: `${accentColor}40`, color: accentColor, backgroundColor: `${accentColor}10` }}>
                                                            {t.isReady ? 'Undo' : 'Confirm'}
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* PREPARATION POPUP MODAL */}
            {popupTaskDetails && (
                <div className="fixed top-0 left-0 right-0 bottom-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setPopupTaskDetails(null)}></div>
                    <div className="relative w-full max-w-2xl bg-[#0b1121] border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden scale-100 animate-in zoom-in-95 duration-200 z-[60]">
                        {/* Header */}
                        <div className="relative p-8 pb-6 border-b border-white/5 bg-gradient-to-r from-blue-500/10 to-transparent">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                        </div>
                                        <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] italic">Intelligence Log</h4>
                                    </div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Preparations Required</h2>
                                </div>
                                <button
                                    onClick={() => setPopupTaskDetails(null)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors relative z-20"
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8">
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                                    <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Structural Unit</span>
                                    <span className="text-sm font-bold text-white">{popupTaskDetails.FAMILLE || "N/A"}</span>
                                </div>
                                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                                    <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Task ID</span>
                                    <span className="text-sm font-bold text-white">#{popupTaskDetails.id}</span>
                                </div>
                            </div>

                            <div className="bg-blue-500/[0.02] border border-blue-500/10 p-6 rounded-3xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
                                <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Préparatifs / Context</h5>
                                <div className="space-y-6 max-h-[400px] overflow-y-auto tactical-scrollbar pr-4 relative z-10 w-full">
                                    {popupTaskDetails.Préparatifs && (
                                        <p className="text-base font-bold text-slate-200 leading-relaxed whitespace-pre-wrap">
                                            {popupTaskDetails.Préparatifs}
                                        </p>
                                    )}

                                    {popupTaskDetails.pdrItems && popupTaskDetails.pdrItems.length > 0 && (
                                        <div className="mt-6 border-t border-white/5 pt-6">
                                            <h6 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                                                Pièces de Rechange (PDR)
                                            </h6>
                                            <div className="space-y-3">
                                                {popupTaskDetails.pdrItems.map((pdr: any, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-colors group/pdr">
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-black text-slate-200 uppercase tracking-tight">{pdr.sparePart}</span>
                                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Qty: {pdr.qty} {pdr.unite}</span>
                                                        </div>
                                                        <div className={`px-2 py-0.5 rounded-md text-[8px] font-black tracking-widest uppercase border ${pdr.readiness === 1 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                                                            {pdr.readiness === 1 ? 'PRÊT' : 'MANQUANT'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {!popupTaskDetails.Préparatifs && (!popupTaskDetails.pdrItems || popupTaskDetails.pdrItems.length === 0) && (
                                        <p className="text-slate-500 italic text-sm">Aucun préparatif spécifique documenté.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-white/5 bg-[#0D0F14] flex justify-end">
                            <button
                                onClick={() => setPopupTaskDetails(null)}
                                className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors border border-white/10"
                            >
                                Acknowledge Log
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes scanline {
                        0% { transform: translateY(-100%); opacity: 0; }
                        50% { opacity: 0.5; }
                        100% { transform: translateY(200%); opacity: 0; }
                    }
                    .animate-scanline {
                        animation: scanline 4s linear infinite;
                    }
                    .tactical-scrollbar::-webkit-scrollbar {
                        width: 4px;
                    }
                    .tactical-scrollbar::-webkit-scrollbar-track {
                        background: rgba(255, 255, 255, 0.02);
                    }
                    .tactical-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(59, 130, 246, 0.3);
                        border-radius: 10px;
                    }
                    .tactical-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(59, 130, 246, 0.5);
                    }
                `
            }} />
        </div>
    );
};
