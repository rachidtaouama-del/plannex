

import React, { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import LandingPage from './components/LandingPage';
import LoadingScreen from './components/LoadingScreen';
import Layout from './components/Layout';
import { WhatIsPlanex, AboutUs, ContactUs, PrivacyPolicy, Disclaimer, GDPRCompliance, CopyrightNotice, PricingPage, VideoModal, VoirLaDemo, Ebook } from './components/InfoPages';
import { LoginPage } from './components/auth/LoginPage';
import { WelcomeBanner } from './components/auth/WelcomeBanner';
import { retrieveUser, logoutUser, storeUser, loginUser, rehydrateUserFromSession } from './services/authService';
import { saveSessionToDB, loadSessionFromDB } from './services/projectService';
// ─── License System ───────────────────────────────────────────────────────────
import LicenseLoginScreen from './components/auth/LicenseLoginScreen';
import NotificationModal from './components/NotificationModal';
import LicenseStatusBanner from './components/LicenseStatusBanner';
import LicenseExpiredScreen from './components/LicenseExpiredScreen';
import { LicenseSession, fetchNotifications, logLogin, getLicenseStatus } from './services/licenseService';
import { parseSchedulingFile, calculateSchedule } from './services/schedulingService';
import { markProjectHasData } from './components/ProjectHub';

// ─── Global LocalStorage Cleanup ──────────────────────────────────────────────
// Free up browser quota by deleting any old bloated planex_session entries 
// that still contain raw tasks arrays (which use ~1MB+ each).
try {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('planex_session_')) {
      const raw = localStorage.getItem(key) || '';
      if (raw.includes('"tasks":[{') || raw.length > 500000) {
        localStorage.removeItem(key);
        i--; // Adjust index after removal
      }
    }
  }
} catch (e) { console.warn('Global storage cleanup failed:', e); }

// ─── Per-project session save/restore ────────────────────────────────────────

const saveProjectSession = (projectId: string, results: any, params: any, evalData: any, schedulingState?: any) => {
  try {
    const payload = {
      params,
      results: {
        ...results,
        scheduledTasks: results.scheduledTasks.map((t: any) => ({
          ...t,
          startTime: t.startTime instanceof Date ? t.startTime.toISOString() : t.startTime,
          endTime: t.endTime instanceof Date ? t.endTime.toISOString() : t.endTime,
        })),
        scheduleEndDate: results.scheduleEndDate instanceof Date ? results.scheduleEndDate.toISOString() : results.scheduleEndDate,
        maxWorkDate: results.maxWorkDate instanceof Date ? results.maxWorkDate.toISOString() : results.maxWorkDate,
      },
      evalData,
      // NOTE: tasks are intentionally excluded from localStorage to prevent QuotaExceededError.
      // They are always reconstructed from results.scheduledTasks when loading the session.
      schedulingState: schedulingState ? {
        simopsRecords: schedulingState.simopsRecords || [],
        costHubEntries: schedulingState.costHubEntries || [],
        scaffoldingRecords: schedulingState.scaffoldingRecords || [],
        handlingRecords: schedulingState.handlingRecords || [],
        permitRecords: schedulingState.permitRecords || [],
        mapTasks: schedulingState.mapTasks || [],
        pdrItems: schedulingState.pdrItems || [],
      } : undefined,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(`planex_session_${projectId}`, JSON.stringify(payload));
  } catch (e) { console.warn('Could not save project session', e); }
};

// ─── Dedicated EvalData save/load ─────────────────────────────────────────────
// Hot Execution progress is saved to its OWN key so it is NEVER wiped by the
// session cleanup routine that deletes large or task-containing payloads.
const saveEvalData = (projectId: string, evalData: any) => {
  if (!projectId || !evalData) return;
  try {
    localStorage.setItem(`plannex_evaldata_${projectId}`, JSON.stringify({
      evalData,
      savedAt: new Date().toISOString(),
    }));
  } catch (e) { console.warn('Could not save evalData', e); }
};

const loadEvalData = (projectId: string): any | null => {
  try {
    const raw = localStorage.getItem(`plannex_evaldata_${projectId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.evalData || null;
  } catch (e) { return null; }
};

const loadProjectSession = (projectId: string) => {
  try {
    const raw = localStorage.getItem(`planex_session_${projectId}`);
    if (!raw) return null;
    const payload = JSON.parse(raw);

    // CLEANUP: If the stored session has tasks inside schedulingState (old bloated format),
    // delete the stale entry so a fresh lean save can be written. Return null so the
    // app falls back to the cloud session (which has the correct data).
    if (payload.schedulingState?.tasks?.length > 0) {
      localStorage.removeItem(`planex_session_${projectId}`);
      return null;
    }

    // Rehydrate Date objects
    const results = {
      ...payload.results,
      scheduleEndDate: payload.results.scheduleEndDate ? new Date(payload.results.scheduleEndDate) : new Date(),
      maxWorkDate: payload.results.maxWorkDate ? new Date(payload.results.maxWorkDate) : new Date(),
      scheduledTasks: payload.results.scheduledTasks.map((t: any) => ({
        ...t,
        startTime: t.startTime ? new Date(t.startTime) : new Date(),
        endTime: t.endTime ? new Date(t.endTime) : new Date(),
      })),
    };
    const rawSchedulingState = payload.schedulingState || null;
    const schedulingState = rawSchedulingState ? rehydrateDraftDates(rawSchedulingState) : null;

    // Prefer the dedicated evalData key (protected from cleanup) over the session payload
    const dedicatedEvalData = loadEvalData(projectId);
    const evalData = dedicatedEvalData || payload.evalData || null;

    return { results, params: payload.params, evalData, schedulingState };
  } catch (e) { console.warn('Could not load project session', e); return null; }
};

const saveProjectDraft = (projectId: string, state: any) => {
  try { localStorage.setItem(`planex_draft_${projectId}`, JSON.stringify(state)); } catch (e) { }
};

const rehydrateDraftDates = (state: any) => {
  if (!state || !Array.isArray(state.tasks)) return state;
  return {
    ...state,
    tasks: state.tasks.map((t: any) => ({
      ...t,
      'START DATE': t['START DATE'] ? new Date(t['START DATE']) : null,
      'END DATE': t['END DATE'] ? new Date(t['END DATE']) : null,
    })),
  };
};

const loadProjectDraft = (projectId: string) => {
  try {
    const raw = localStorage.getItem(`planex_draft_${projectId}`);
    return raw ? rehydrateDraftDates(JSON.parse(raw)) : null;
  } catch (e) { return null; }
};

// Heavy pages — lazy-loaded so they don't block initial startup
const SchedulingPage = lazy(() => import('./components/SchedulingPage'));
const ResultsDashboard = lazy(() => import('./components/ResultsDashboard'));
const TeamScheduleView = lazy(() => import('./components/TeamScheduleView'));
const EvaluationView = lazy(() => import('./components/EvaluationView'));
const HotExecutionReview = lazy(() => import('./components/HotExecutionReview'));
const DataManagementPage = lazy(() => import('./components/DataManagementPage').then(m => ({ default: m.DataManagementPage })));
const WhatIfScenarioPage = lazy(() => import('./components/WhatIfScenarioPage'));
const AICopilotPage = lazy(() => import('./components/AICopilotPage'));
const LiveNavigationPage = lazy(() => import('./components/LiveNavigationPage').then(m => ({ default: m.LiveNavigationPage })));
const AdminDashboard = lazy(() => import('./components/auth/AdminDashboard'));
const UserManagementPage = lazy(() => import('./components/auth/UserManagementPage'));
const ProjectHub = lazy(() => import('./components/ProjectHub'));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'));

// Minimal dark spinner shown while lazy chunks load
const PageLoader = () => (
  <div className="flex items-center justify-center w-full h-64">
    <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-emerald-400 animate-spin" />
  </div>
);

import type {
  Page,
  CalculationResults,
  AppParameters,
  SchedulingPageState,
  EvaluationData,
  EvaluatedTaskData,
  EvaluationKpis,
  ChronologyEvent,
  ScheduledTask,
  CustomCriticalPath,
  UserAccount,
  HotReviewState,
  SchedulingFilters
} from './types';

// Helper to convert a Date object to a 'yyyy-MM-ddTHH:mm' string suitable for datetime-local inputs
const toDateTimeLocal = (date: Date): string => {
  if (!date || isNaN(date.getTime())) return '';
  // Adjust for timezone offset to display local time correctly in the input
  const tzoffset = date.getTimezoneOffset() * 60000; //offset in milliseconds
  const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
  return localISOTime;
};

// Helper to get default dates for Hot Review
const getDefaultHotReviewDates = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0, 0);

  return {
    start: toDateTimeLocal(start),
    end: toDateTimeLocal(end),
  };
};


// Helper to initialize evaluation data
const initializeEvaluationData = (results: CalculationResults, params: AppParameters, isColdStopFlow: boolean): EvaluationData => {
  const tasks: Record<number, EvaluatedTaskData> = {};
  results.scheduledTasks.forEach(task => {
    tasks[task.id] = {
      actualStart: toDateTimeLocal(task.startTime),
      actualEnd: toDateTimeLocal(task.endTime),
      status: 'À Faire',
    };
  });

  // --- DETAILED CHRONOLOGY CALCULATION ---
  const { shutdownStart, shutdownEnd, consignation, deconsignation, combustion, demarrage } = params;
  const { scheduleEndDate } = results;

  const p_consignationStart = new Date(shutdownStart);
  const p_workStart = new Date(p_consignationStart.getTime() + consignation * 60 * 1000);
  const p_workEnd = scheduleEndDate;

  let p_deconsignationStart, p_deconsignationEnd;
  let p_combustionStart, p_combustionEnd;

  const p_demarrageEnd = new Date(shutdownEnd);
  const p_demarrageStart = new Date(p_demarrageEnd.getTime() - demarrage * 60 * 1000);

  if (combustion.mode === 'after_deconsignation') {
    const p_allumageEnd = p_demarrageStart;
    p_combustionEnd = p_allumageEnd;
    p_combustionStart = new Date(p_allumageEnd.getTime() - combustion.value * 60 * 1000);
    p_deconsignationEnd = p_combustionStart;
    p_deconsignationStart = new Date(p_deconsignationEnd.getTime() - deconsignation * 60 * 1000);
  } else {
    p_deconsignationEnd = p_demarrageStart;
    p_deconsignationStart = new Date(p_deconsignationEnd.getTime() - deconsignation * 60 * 1000);
    p_combustionEnd = p_demarrageStart;
    p_combustionStart = new Date(p_combustionEnd.getTime() - combustion.value * 60 * 1000);
  }

  const cheminCritiqueDuration = (p_workEnd.getTime() - p_workStart.getTime()) / (1000 * 60);

  // Initialize Chronology properly
  let initialChronology: ChronologyEvent[] = [];

  if (isColdStopFlow) {
    initialChronology = results.scheduledTasks.filter(t => t.isKeyEvent).map(t => ({
      id: String(t.id),
      label: t.action,
      plannedStart: toDateTimeLocal(t.startTime),
      plannedEnd: toDateTimeLocal(t.endTime),
      actualStart: toDateTimeLocal(t.startTime),
      actualEnd: toDateTimeLocal(t.endTime)
    })).sort((a, b) => new Date(a.plannedStart).getTime() - new Date(b.plannedStart).getTime());
  } else {
    initialChronology = [
      { id: '-10', label: 'Arrêt de la ligne', plannedStart: toDateTimeLocal(p_consignationStart), plannedEnd: toDateTimeLocal(p_consignationStart), actualStart: toDateTimeLocal(p_consignationStart), actualEnd: toDateTimeLocal(p_consignationStart) },
      { id: '-1', label: 'CONSIGNATION', plannedStart: toDateTimeLocal(p_consignationStart), plannedEnd: toDateTimeLocal(p_workStart), actualStart: toDateTimeLocal(p_consignationStart), actualEnd: toDateTimeLocal(p_workStart) },
      { id: '-11', label: 'Début des travaux', plannedStart: toDateTimeLocal(p_workStart), plannedEnd: toDateTimeLocal(p_workStart), actualStart: toDateTimeLocal(p_workStart), actualEnd: toDateTimeLocal(p_workStart) },
      { id: '-12', label: 'Chemin Critique', plannedStart: toDateTimeLocal(p_workStart), plannedEnd: toDateTimeLocal(p_workEnd), actualStart: toDateTimeLocal(p_workStart), actualEnd: toDateTimeLocal(p_workEnd) },
      { id: '-13', label: 'Fin des travaux', plannedStart: toDateTimeLocal(p_workEnd), plannedEnd: toDateTimeLocal(p_workEnd), actualStart: toDateTimeLocal(p_workEnd), actualEnd: toDateTimeLocal(p_workEnd) },
      { id: '-3', label: 'DECONSIGNATION', plannedStart: toDateTimeLocal(p_deconsignationStart), plannedEnd: toDateTimeLocal(p_deconsignationEnd), actualStart: toDateTimeLocal(p_deconsignationStart), actualEnd: toDateTimeLocal(p_deconsignationEnd) },
      { id: '-2', label: 'ALLUMAGE DE LA CHAMBRE À COMBUSTION', plannedStart: toDateTimeLocal(p_combustionStart), plannedEnd: toDateTimeLocal(p_combustionEnd), actualStart: toDateTimeLocal(p_combustionStart), actualEnd: toDateTimeLocal(p_combustionEnd) },
      { id: '-4', label: 'DEMARRAGE DE LA BOUCLE', plannedStart: toDateTimeLocal(p_demarrageStart), plannedEnd: toDateTimeLocal(p_demarrageEnd), actualStart: toDateTimeLocal(p_demarrageStart), actualEnd: toDateTimeLocal(p_demarrageEnd) }
    ].filter(e => e.plannedStart && e.plannedEnd);
  }

  return {
    actualShutdownStart: params.shutdownStart,
    actualShutdownEnd: params.shutdownEnd,
    tasks,
    supplementaryTasks: [],
    globalSlippageEvents: [],
    chronology: initialChronology,
    incidentDetails: [],
    accidentDetails: [],
  };
};

const calculateEvaluationKpis = (
  results: CalculationResults,
  params: AppParameters,
  evaluationData: EvaluationData
): EvaluationKpis => {
  const plannedDuration = results.kpis.shutdownDurationHours;
  const actualStart = new Date(evaluationData.actualShutdownStart);
  const actualEnd = new Date(evaluationData.actualShutdownEnd);
  let actualDuration = 0;
  if (!isNaN(actualStart.getTime()) && !isNaN(actualEnd.getTime()) && actualEnd > actualStart) {
    actualDuration = (actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60);
  }

  const totalSlippage = actualDuration > plannedDuration ? actualDuration - plannedDuration : 0;

  // --- OPTIMIZED SINGLE PASS ---
  const totalPlannedTasks = results.scheduledTasks.length;
  let completedTasks = 0;
  const completionByDiscipline: Record<string, { completed: number, total: number }> = {};
  const completionByTeam: Record<string, { completed: number, total: number }> = {};
  const actualTasksData: { id: number, actualEndTime: number, manHours: number }[] = [];

  results.scheduledTasks.forEach(task => {
    const evalT = evaluationData.tasks[task.id];
    const isDone = evalT?.status === 'Fait';

    if (isDone) {
      completedTasks++;
      if (evalT?.actualEnd) {
        actualTasksData.push({
          id: task.id,
          actualEndTime: new Date(evalT.actualEnd).getTime(),
          manHours: task.manHours
        });
      }
    }

    const d = task.discipline;
    if (!completionByDiscipline[d]) completionByDiscipline[d] = { completed: 0, total: 0 };
    completionByDiscipline[d].total++;
    if (isDone) completionByDiscipline[d].completed++;

    const t = task.team;
    if (!completionByTeam[t]) completionByTeam[t] = { completed: 0, total: 0 };
    completionByTeam[t].total++;
    if (isDone) completionByTeam[t].completed++;
  });

  const completionRate = totalPlannedTasks > 0 ? (completedTasks / totalPlannedTasks) * 100 : 0;
  const totalProjectManHours = results.kpis.totalManHours;
  const shutdownStartTs = new Date(params.shutdownStart).getTime();
  const shutdownEndTs = new Date(params.shutdownEnd).getTime();
  const stepMs = 1 * 60 * 60 * 1000;

  const plannedSorted = [...results.scheduledTasks].sort((a, b) => a.endTime.getTime() - b.endTime.getTime());
  const actualTasks = actualTasksData.sort((a, b) => a.actualEndTime - b.actualEndTime);

  const progressHistory: { timestamp: string; planned: number; actual: number; plannedCount: number; actualCount: number; }[] = [];

  let plannedPtr = 0, cumPlannedHH = 0, plannedCount = 0;
  let actualPtr = 0, cumActualHH = 0, actualCount = 0;

  for (let time = shutdownStartTs; time <= shutdownEndTs; time += stepMs) {
    const currentTime = Math.min(time, shutdownEndTs);

    while (plannedPtr < plannedSorted.length && plannedSorted[plannedPtr].endTime.getTime() <= currentTime) {
      cumPlannedHH += plannedSorted[plannedPtr].manHours;
      plannedCount++;
      plannedPtr++;
    }

    while (actualPtr < actualTasks.length && actualTasks[actualPtr].actualEndTime <= currentTime) {
      cumActualHH += actualTasks[actualPtr].manHours;
      actualCount++;
      actualPtr++;
    }

    const plannedProg = totalProjectManHours > 0 ? (cumPlannedHH / totalProjectManHours) * 100 : 0;
    const actualProg = totalProjectManHours > 0 ? (cumActualHH / totalProjectManHours) * 100 : 0;

    const date = new Date(currentTime);
    const label = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:00`;

    progressHistory.push({
      timestamp: label,
      planned: Number(plannedProg.toFixed(1)),
      actual: Number(actualProg.toFixed(1)),
      plannedCount,
      actualCount
    });

    if (time >= shutdownEndTs) break;
  }

  const supplementaryCharge = evaluationData.supplementaryTasks.reduce((sum, task) => sum + task.totalManHours, 0);

  return {
    plannedShutdownDuration: plannedDuration,
    actualShutdownDuration: actualDuration,
    totalSlippage,
    completionRate,
    completedTasks,
    uncompletedTasks: totalPlannedTasks - completedTasks,
    totalPlannedTasks,
    supplementaryCharge,
    completionByDiscipline,
    completionByTeam,
    supplementaryTasksCount: evaluationData.supplementaryTasks.length,
    slippageRate: plannedDuration > 0 ? (totalSlippage / plannedDuration) * 100 : 0,
    supplementaryWorkRate: results.kpis.totalManHours > 0 ? (supplementaryCharge / results.kpis.totalManHours) * 100 : 0,
    incidents: evaluationData.incidentDetails.length,
    accidents: evaluationData.accidentDetails.length,
    progressHistory
  };
};

const initialHotReviewState: HotReviewState = {
  startDate: '',
  endDate: '',
  displayedStartDate: '',
  displayedEndDate: '',
  dateFilteredTasks: [],
  selectedFamily: 'all',
  selectedEquipment: 'all',
  selectedDiscipline: 'all',
  selectedTeam: 'all',
  searchTerm: '',
  slippageAnalysis: { cause: '', actionPlan: '' },
  sortConfig: { key: 'startTime', direction: 'ascending' },
  manuallyIncludedTaskIds: [],
};

const initialSchedulingFilters: SchedulingFilters = {
  discipline: [],
  equipment: [],
  family: [],
  maintenanceType: [],
  showUnscheduledOnly: false,
  assignedTeam: [],
  showScheduledOnly: false,
  multiDisciplineOnly: false
};

// Shown while planner state is loading after entering a project from the Hub.
// Redirects to admin_dashboard after 5 s if state never arrives (e.g. page refresh).
const PlannerSessionLoader: React.FC<{ onTimeout: () => void }> = ({ onTimeout }) => {
  React.useEffect(() => {
    const timer = setTimeout(onTimeout, 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="flex justify-center items-center h-full min-h-screen bg-[#020202]">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-emerald-400 animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Chargement du projet...</p>
      </div>
    </div>
  );
};

const App: React.FC<{ licenseSession: LicenseSession; onLicenseLogout?: () => void }> = ({ licenseSession, onLicenseLogout }) => {

  const [activePage, setActivePage] = useState<Page>('landing');
  const [plannerSubPage, setPlannerSubPage] = useState<'dashboard' | 'team' | 'evaluation' | 'report'>('dashboard');

  const [schedulingResults, setSchedulingResults] = useState<CalculationResults | null>(null);
  const [schedulingParams, setSchedulingParams] = useState<AppParameters | null>(null);
  const [schedulingState, setSchedulingState] = useState<SchedulingPageState | null>(null);
  const [schedulingStep, setSchedulingStep] = useState<'dashboard' | 'scheduling' | undefined>(undefined);

  const [evaluationData, setEvaluationData] = useState<EvaluationData | null>(null);
  const [hotReviewState, setHotReviewState] = useState<HotReviewState>(initialHotReviewState);
  const [customCriticalPaths, setCustomCriticalPaths] = useState<CustomCriticalPath[]>([]);

  const [isColdStopFlow, setIsColdStopFlow] = useState<boolean>(true);
  const [isScratchMode, setIsScratchMode] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Active project from Project Hub
  const [activeProject, setActiveProject] = useState<import('./components/ProjectHub').ProjectData | null>(null);

  // --- UNIFIED AUTO-SAVE HOOK ---
  // Save to the DB and localStorage whenever project state (or evaluation data) changes.
  useEffect(() => {
    if (!activeProject) return;

    if (schedulingResults && schedulingParams) {
      // 1. COMPLETELY PLANNED PROJECT
      // Auto-save the full session including any updates to Evaluation Data
      saveProjectSession(activeProject.id, schedulingResults, schedulingParams, evaluationData, schedulingState);

      // CRITICAL: Also save evaluationData to its own protected key so Hot Execution
      // progress is NEVER lost when the main session is cleaned up due to size limits.
      if (evaluationData) {
        saveEvalData(activeProject.id, evaluationData);
      }

      const payload = {
        params: schedulingParams,
        results: {
          ...schedulingResults,
          scheduledTasks: schedulingResults.scheduledTasks.map((t: any) => ({
            ...t,
            startTime: t.startTime instanceof Date ? t.startTime.toISOString() : t.startTime,
            endTime: t.endTime instanceof Date ? t.endTime.toISOString() : t.endTime,
          })),
          scheduleEndDate: schedulingResults.scheduleEndDate instanceof Date ? schedulingResults.scheduleEndDate.toISOString() : schedulingResults.scheduleEndDate,
          maxWorkDate: schedulingResults.maxWorkDate instanceof Date ? schedulingResults.maxWorkDate.toISOString() : schedulingResults.maxWorkDate,
        },
        evalData: evaluationData,
        schedulingState: schedulingState ? {
          // Store only the top-level module arrays in the cloud.
          // Per-task nested records (task.pdrItems, task.scaffoldingRecords, etc.) are intentionally
          // excluded — they are duplicates of the top-level arrays and would bloat the Supabase payload.
          // On restore, they are re-linked by OT number (see onEnterProject restore logic).
          // shutdownParams and dailyDurationLimit ARE included so the Aperçu tab works after refresh.
          shutdownParams: schedulingState.shutdownParams,
          dailyDurationLimit: schedulingState.dailyDurationLimit,
          simopsRecords: schedulingState.simopsRecords || [],
          costHubEntries: schedulingState.costHubEntries || [],
          scaffoldingRecords: schedulingState.scaffoldingRecords || [],
          handlingRecords: schedulingState.handlingRecords || [],
          permitRecords: schedulingState.permitRecords || [],
          mapTasks: schedulingState.mapTasks || [],
          pdrItems: schedulingState.pdrItems || [],
        } : undefined,
        savedAt: new Date().toISOString(),
      };
      saveSessionToDB(activeProject.id, payload).catch(() => { });
    } else if (schedulingState) {
      // 2. DRAFT PROJECT
      // Save intermediate draft state for unfinalized projects so Master Data Center edits persist.
      saveProjectDraft(activeProject.id, schedulingState);
      const sessionPayload = { schedulingState, savedAt: new Date().toISOString() };
      saveSessionToDB(activeProject.id, sessionPayload).catch(() => { });
    }
  }, [schedulingResults, schedulingParams, evaluationData, schedulingState, activeProject]);

  // --- AUTHENTICATION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [familyOrder, setFamilyOrder] = useState<string[]>([]);
  const [teamOrder, setTeamOrder] = useState<string[]>([]);
  const [customTaskOrder, setCustomTaskOrder] = useState<Record<string, number[]>>({});

  // --- LIFTED STATE FOR FILTERS ---
  const [schedulingFilters, setSchedulingFilters] = useState<SchedulingFilters>(() => {
    try {
      const savedFilters = sessionStorage.getItem('planex_scheduling_filters');
      if (savedFilters) {
        return JSON.parse(savedFilters);
      }
    } catch (e) {
      console.error("Failed to load filters from sessionStorage", e);
    }
    return initialSchedulingFilters;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('planex_scheduling_filters', JSON.stringify(schedulingFilters));
    } catch (e) {
      console.error("Failed to save filters to sessionStorage", e);
    }
  }, [schedulingFilters]);

  useEffect(() => {
    // If we already have a licenseSession, skip the old auth system entirely
    if (licenseSession) {
      setIsAuthenticated(true);
      return;
    }
    // Fallback: try to rehydrate old session
    const stored = retrieveUser();
    if (stored) {
      setCurrentUser(stored);
      setIsAuthenticated(true);
    } else {
      rehydrateUserFromSession().then(user => {
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      });
    }
  }, [licenseSession]);


  const handleEnterApp = () => {
    if (isAuthenticated) {
      handleSetPage('admin_dashboard');
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setIsLoginModalOpen(false);
    storeUser(user);
    handleSetPage('admin_dashboard');
  };

  const handleLogout = () => {
    (logoutUser as any)();
    setIsAuthenticated(false);
    setCurrentUser(null);
    handleSetPage('landing');
  };

  const evaluationKpis = useMemo(() => {
    if (schedulingResults && schedulingParams && evaluationData) {
      return calculateEvaluationKpis(schedulingResults, schedulingParams, evaluationData);
    }
    return null;
  }, [schedulingResults, schedulingParams, evaluationData]);

  const handleSetPage = (page: Page) => {
    // Reset state when navigating to a starting point (landing or project selection)
    // to ensure no data from a previous session persists.
    if (page === 'project_selection' || page === 'landing') {
      setSchedulingResults(null);
      setSchedulingParams(null);
      setSchedulingState(null);
      setEvaluationData(null);
      setHotReviewState(initialHotReviewState);
      setCustomCriticalPaths([]);
      setIsScratchMode(false);
      setSchedulingStep(undefined);
      setSchedulingFilters(initialSchedulingFilters);
    }
    setActivePage(page);
    window.scrollTo(0, 0);
  };

  const handleBackToDashboard = () => {
    setPlannerSubPage('dashboard');
  }

  const handleFinishedScheduling = (
    results: CalculationResults,
    params: AppParameters,
    state: SchedulingPageState
  ) => {
    setSchedulingResults(results);
    setSchedulingParams(params);
    setSchedulingState(state);

    setEvaluationData(prev => {
      // Use evaluationData from the scheduling state if it exists (e.g. from an imported file), otherwise use current prev
      const sourceData = state.evaluationData || prev;

      const initialEvalData = initializeEvaluationData(results, params, isColdStopFlow);
      if (!sourceData) return initialEvalData;

      // Merge tasks from source
      Object.keys(initialEvalData.tasks).forEach(key => {
        const id = Number(key);
        if (sourceData.tasks[id]) {
          initialEvalData.tasks[id] = { ...initialEvalData.tasks[id], ...sourceData.tasks[id] };
        }
      });

      // Merge chronology from source
      const sourceChronologyMap = new Map(sourceData.chronology.map(e => [e.id, e]));
      initialEvalData.chronology = initialEvalData.chronology.map(event => {
        const existing = sourceChronologyMap.get(event.id);
        if (existing) {
          return {
            ...event,
            actualStart: existing.actualStart || event.actualStart,
            actualEnd: existing.actualEnd || event.actualEnd,
            plannedStart: existing.plannedStart || event.plannedStart,
            plannedEnd: existing.plannedEnd || event.plannedEnd,
            label: existing.label || event.label
          };
        }
        return event;
      });

      // Append user-added events from source
      sourceData.chronology.forEach(event => {
        if (!initialEvalData.chronology.find(e => e.id === event.id)) {
          initialEvalData.chronology.push(event);
        }
      });

      initialEvalData.supplementaryTasks = sourceData.supplementaryTasks;
      initialEvalData.globalSlippageEvents = sourceData.globalSlippageEvents;
      initialEvalData.incidentDetails = sourceData.incidentDetails;
      initialEvalData.accidentDetails = sourceData.accidentDetails;
      initialEvalData.actualShutdownStart = sourceData.actualShutdownStart || initialEvalData.actualShutdownStart;
      initialEvalData.actualShutdownEnd = sourceData.actualShutdownEnd || initialEvalData.actualShutdownEnd;

      return initialEvalData;
    });

    setHotReviewState(initialHotReviewState);
    setCustomCriticalPaths([]);
    setIsColdStopFlow(true);
    setActivePage('planner');
    setPlannerSubPage('dashboard');

    // Save session per project so re-opening goes directly to the dashboard
    setActiveProject(prev => {
      if (prev) {
        saveProjectSession(prev.id, results, params, null, state);
        markProjectHasData(prev.id, String(currentUser?.id || ''));
        // Cloud-save full session (including the extra DB records)
        const sessionPayload = {
          params, results: {
            ...results,
            scheduledTasks: results.scheduledTasks.map((t: any) => ({
              ...t,
              startTime: t.startTime instanceof Date ? t.startTime.toISOString() : t.startTime,
              endTime: t.endTime instanceof Date ? t.endTime.toISOString() : t.endTime,
            })),
            scheduleEndDate: results.scheduleEndDate instanceof Date ? results.scheduleEndDate.toISOString() : results.scheduleEndDate,
            maxWorkDate: results.maxWorkDate instanceof Date ? results.maxWorkDate.toISOString() : results.maxWorkDate,
          },
          schedulingState: {
            // Store only the top-level module arrays — tasks are too large for Supabase
            // and will be re-linked from these on session restore.
            // shutdownParams and dailyDurationLimit ARE included so Aperçu tab works after refresh.
            shutdownParams: state.shutdownParams,
            dailyDurationLimit: state.dailyDurationLimit,
            simopsRecords: state.simopsRecords || [],
            costHubEntries: state.costHubEntries || [],
            scaffoldingRecords: state.scaffoldingRecords || [],
            handlingRecords: state.handlingRecords || [],
            permitRecords: state.permitRecords || [],
            mapTasks: state.mapTasks || [],
            pdrItems: state.pdrItems || [],
          },
          hasSessionData: true,
          savedAt: new Date().toISOString(),
        };
        saveSessionToDB(prev.id, sessionPayload).catch(() => { });
      }
      return prev;
    });
  };

  const handleSelectColdStop = () => {
    setIsScratchMode(false);
    setIsColdStopFlow(true);
    setSchedulingStep(undefined);
    setActivePage('scheduling');
  };

  const handleStartFromScratch = () => {
    setIsScratchMode(true);
    setSchedulingState(null);
    setIsColdStopFlow(true);
    setSchedulingStep(undefined);
    setActivePage('scheduling');
  };

  const handleNavigateToTeamView = () => setPlannerSubPage('team');
  const handleNavigateToEvaluationView = () => setPlannerSubPage('evaluation');

  const handleNavigateToHotReview = () => {
    if (schedulingParams) {
      setHotReviewState(prev => {
        const newState = { ...prev };
        if (!newState.startDate) newState.startDate = schedulingParams.shutdownStart;
        if (!newState.endDate) newState.endDate = schedulingParams.shutdownEnd;
        // Auto-load if displayed dates are empty
        if (!newState.displayedStartDate) newState.displayedStartDate = newState.startDate;
        if (!newState.displayedEndDate) newState.displayedEndDate = newState.endDate;
        return newState;
      });
    }
    setActivePage('hot_execution_review');
  };

  const handleBackToScheduling = () => {
    setSchedulingStep('scheduling');
    setActivePage('scheduling');
  };

  const handleNavigateToDashboard = () => {
    setSchedulingStep('dashboard');
    setActivePage('scheduling');
  };

  const handleSchedulingBack = () => {
    if (schedulingResults) {
      setActivePage('planner');
      setPlannerSubPage('dashboard');
    } else {
      handleSetPage('admin_dashboard');
    }
  };


  const renderPlannerPage = () => {
    if (!isAuthenticated) return <LandingPage onEnterApp={handleEnterApp} setPage={handleSetPage} />;
    if (!schedulingResults || !schedulingParams || !evaluationData || !evaluationKpis) {
      // State hasn't settled yet (e.g. after entering a project from the Hub).
      // Show a loading spinner for up to 5 seconds to let async state updates propagate.
      // Only redirect to portal after that timeout to handle a true page-refresh scenario.
      return (
        <PlannerSessionLoader
          onTimeout={() => handleSetPage('admin_dashboard')}
        />
      );
    }

    const commonDashboardProps = {
      results: schedulingResults,
      isLoading: false,
      error: null,
      parameters: schedulingParams,
      handlingRecords: schedulingState?.handlingRecords || [],
      onNavigateToTeamView: handleNavigateToTeamView,
      onNavigateToEvaluationView: handleNavigateToEvaluationView,
      onNavigateToHotReview: handleNavigateToHotReview,
      onBackToScheduling: handleBackToScheduling,
      isColdStopFlow: isColdStopFlow,
      customCriticalPaths: customCriticalPaths,
      setCustomCriticalPaths: setCustomCriticalPaths,
      onNavigateToPortal: () => {
        handleSetPage('admin_dashboard');
      },
      onNavigateToDashboard: handleNavigateToDashboard,
      onNavigateToReadiness: () => {
        setSchedulingStep('readiness' as any);
        setActivePage('scheduling');
      },
      onNavigateToWhatIf: () => handleSetPage('what_if_scenario'),
      onNavigateToAICopilot: () => handleSetPage('ai_copilot'),
    };

    switch (plannerSubPage) {
      case 'team':
        return <div className="px-4 sm:px-6 lg:px-8 py-8"><TeamScheduleView results={schedulingResults} parameters={schedulingParams} onBack={handleBackToDashboard} isColdStopFlow={isColdStopFlow} dailyDurationLimit={schedulingState?.dailyDurationLimit || 12} /></div>;
      case 'evaluation':
        return <div className="px-4 sm:px-6 lg:px-8 py-8"><EvaluationView results={schedulingResults} parameters={schedulingParams} evaluationData={evaluationData} setEvaluationData={setEvaluationData} evaluationKpis={evaluationKpis} onBack={handleBackToDashboard} user={currentUser} /></div>;
      case 'dashboard':
      default:
        return (
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <ResultsDashboard {...commonDashboardProps} />
          </div>
        );
    }
  }


  const renderPage = () => {
    switch (activePage) {
      case 'project_selection':
        return isAuthenticated ? <LoadingScreen
          onSelectColdStop={handleSelectColdStop}
          onStartFromScratch={handleStartFromScratch}
          onBack={() => {
            if (currentUser?.role === 'admin') {
              handleSetPage('admin_dashboard');
            } else {
              handleSetPage('landing');
            }
          }}
        /> : <LandingPage onEnterApp={handleEnterApp} setPage={handleSetPage} />;
      case 'scheduling':
        return isAuthenticated ? <SchedulingPage
          onBack={handleSchedulingBack}
          onNavigateToPortal={() => {
            handleSetPage('admin_dashboard');
          }}
          onFinishedScheduling={handleFinishedScheduling}
          onStateChange={setSchedulingState}
          initialState={schedulingState}
          isScratchMode={isScratchMode}
          initialStep={schedulingStep}
          filters={schedulingFilters}
          setFilters={setSchedulingFilters}
          evaluationData={evaluationData}
          projectName={activeProject?.name}
        /> : <LandingPage onEnterApp={handleEnterApp} setPage={handleSetPage} />;
      case 'planner':
        return renderPlannerPage();
      case 'hot_execution_review':
        return isAuthenticated && evaluationData && evaluationKpis ? <div className="px-4 sm:px-6 lg:px-8 py-8"><HotExecutionReview results={schedulingResults!} parameters={schedulingParams!} evaluationData={evaluationData} setEvaluationData={setEvaluationData} hotReviewState={hotReviewState} setHotReviewState={setHotReviewState} onBack={() => { setPlannerSubPage('dashboard'); setActivePage('planner'); }} isColdStopFlow={isColdStopFlow} evaluationKpis={evaluationKpis} /></div> : <LandingPage onEnterApp={handleEnterApp} setPage={handleSetPage} />;
      case 'what_if_scenario':
        return isAuthenticated && schedulingResults ? (
          <WhatIfScenarioPage
            baselineTasks={schedulingResults.scheduledTasks}
            params={schedulingParams!}
            projectId={activeProject?.id ?? null}
            onBack={() => { setPlannerSubPage('dashboard'); setActivePage('planner'); }}
          />
        ) : <LandingPage onEnterApp={handleEnterApp} setPage={handleSetPage} />;
      case 'ai_copilot':
        return isAuthenticated && schedulingResults && schedulingParams ? (
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <AICopilotPage
              results={schedulingResults}
              parameters={schedulingParams}
              evaluationData={evaluationData}
              schedulingState={schedulingState}
              onBack={() => { setPlannerSubPage('dashboard'); setActivePage('planner'); }}
            />
          </div>
        ) : <LandingPage onEnterApp={handleEnterApp} setPage={handleSetPage} />;
      case 'admin_dashboard':
        return isAuthenticated ? <AdminDashboard currentUserRole={currentUser?.role} username={(licenseSession as any)?.username || currentUser?.firstName || currentUser?.username} onNavigateToUserManagement={() => handleSetPage('user_management')} onNavigateToProjectHub={() => handleSetPage('project_hub')} /> : <LandingPage onEnterApp={handleEnterApp} setPage={handleSetPage} />;
      case 'project_hub':
        return isAuthenticated ? (
          <ProjectHub
            userId={String(currentUser?.id || '')}
            onBack={() => {
              handleSetPage('admin_dashboard');
            }}
            onEnterProject={async (project) => {
              setActiveProject(project);

              // We prioritize Supabase (cloud source-of-truth) over localStorage to prevent stale cache issues
              // (e.g. if a QuotaExceededError prevented a local save but the cloud save succeeded).
              let saved = null;
              let cloudDraft: any = null;

              if (currentUser && project.hasSessionData) {
                try {
                  const cloudPayload = await loadSessionFromDB(project.id);
                  if (cloudPayload) {
                    if (cloudPayload.params && cloudPayload.results) {
                      // COMPLETED session — rehydrate Date objects
                      const results = {
                        ...cloudPayload.results,
                        scheduleEndDate: cloudPayload.results.scheduleEndDate ? new Date(cloudPayload.results.scheduleEndDate) : new Date(),
                        maxWorkDate: cloudPayload.results.maxWorkDate ? new Date(cloudPayload.results.maxWorkDate) : new Date(),
                        scheduledTasks: cloudPayload.results.scheduledTasks.map((t: any) => ({
                          ...t,
                          startTime: t.startTime ? new Date(t.startTime) : new Date(),
                          endTime: t.endTime ? new Date(t.endTime) : new Date(),
                        })),
                      };
                      const cloudSchedulingState = cloudPayload.schedulingState ? rehydrateDraftDates(cloudPayload.schedulingState) : null;
                      // Prefer dedicated local evalData (protected key) over cloud evalData —
                      // the local copy is always the most up-to-date since Supabase was removed.
                      const localEvalData = loadEvalData(project.id);
                      const evalData = localEvalData || cloudPayload.evalData || null;
                      saved = { results, params: cloudPayload.params, evalData, schedulingState: cloudSchedulingState };
                      // Resync the local cache
                      saveProjectSession(project.id, results, cloudPayload.params, evalData, cloudSchedulingState);
                    } else if (cloudPayload.schedulingState) {
                      // IN-PROGRESS draft — restore and rehydrate task dates
                      cloudDraft = rehydrateDraftDates(cloudPayload.schedulingState);
                      saveProjectDraft(project.id, cloudPayload.schedulingState);
                    }
                  }
                } catch (e) { console.warn('Could not load cloud session:', e); }
              }

              // Fallback to local storage if cloud fetch failed (or we are offline / no session flag)
              if (!saved) {
                saved = loadProjectSession(project.id);
              }

              if (saved) {
                // Completed session — jump straight to the planner dashboard
                setSchedulingResults(saved.results);
                setSchedulingParams(saved.params);
                // Initialize evaluation data — wrapped in try/catch so a bad session
                // never leaves evaluationData as null and blocks the planner page.
                if (saved.evalData) {
                  setEvaluationData(saved.evalData);
                } else {
                  try {
                    setEvaluationData(initializeEvaluationData(saved.results, saved.params, true));
                  } catch (evalErr) {
                    console.warn('Could not initialize evaluation data from session, using empty state', evalErr);
                    // Provide a minimal valid EvaluationData so the planner can still open
                    setEvaluationData({
                      actualShutdownStart: saved.params?.shutdownStart || new Date().toISOString().slice(0, 16),
                      actualShutdownEnd: saved.params?.shutdownEnd || new Date().toISOString().slice(0, 16),
                      tasks: {},
                      supplementaryTasks: [],
                      globalSlippageEvents: [],
                      chronology: [],
                      incidentDetails: [],
                      accidentDetails: [],
                    });
                  }
                }
                // Restore the extra DB records (SIMOPS, Cost Hub, Scaffolding, Handling, Permits)
                // COMPATIBILITY FIX: Old saved projects only stored 6 fields in schedulingState (no tasks/pdrItems).
                // If schedulingState.tasks is empty but we have scheduledTasks, reconstruct tasks from results.
                if (saved.schedulingState) {
                  const restoredState = { ...saved.schedulingState };

                  // ── Reconstruct tasks from scheduledTasks if missing (tasks are not stored in cloud) ──
                  if ((!restoredState.tasks || restoredState.tasks.length === 0) && saved.results?.scheduledTasks?.length > 0) {
                    restoredState.tasks = saved.results.scheduledTasks.map((st: any) => {
                      // Parse TYPE D'EQUIPE from the team string (format: "DISCIPLINE TYPE" e.g. "NETTOYAGE A1")
                      const teamStr = st.team || '';
                      const disc = st.discipline || '';
                      const teamSuffix = disc ? teamStr.replace(disc, '').trim() : teamStr;
                      return {
                        id: st.id,
                        OT: st.ot || '',
                        AVIS: st.avis || '',
                        'GLOBAL TASKS': st.action || '',
                        DISCIPLINE: disc,
                        'Nom Equipement': st.equipment || '',
                        FAMILLE: st.family || '',
                        DUREE: st.duration || 0,
                        EFFECTIF: st.manpower || 0,
                        'Heures-Homme': st.manHours || 0,
                        'Type de maintenance': st.maintenanceType || '',
                        COMPANY: st.company || st.COMPANY || '',
                        ZONE: st.zone || st.ZONE || '',
                        'START DATE': st.startTime || null,
                        'END DATE': st.endTime || null,
                        predecessor: Array.isArray(st.predecessor) ? st.predecessor : [],
                        isScheduled: true,
                        isMultiDiscipline: st.isMultiDiscipline || false,
                        isHighRisk: st.isHighRisk || false,
                        isKeyEvent: st.isKeyEvent || false,
                        "TYPE D'EQUIPE": teamSuffix || null,
                        'EQUIPE NUMBER': st.sequenceOrder ?? null,
                        'MAX HOUR': null,
                        multiDisciplineId: st.multiDisciplineId || undefined,
                        sequenceOrder: st.sequenceOrder ?? null,
                        // Readiness & permit flags
                        'Scaffolding Required': st['Scaffolding Required'] ?? 0,
                        'Scaffolding Readiness': st['Scaffolding Readiness'] ?? 0,
                        'Handling required': st['Handling required'] ?? 0,
                        'Handling Readiness': st['Handling Readiness'] ?? 0,
                        permisTravailHauteur: st.permisTravailHauteur ?? st['permis Travail Hauteur'] ?? 0,
                        'permis Travail Hauteur Readiness': st['permis Travail Hauteur Readiness'] ?? 0,
                        permisFeu: st.permisFeu ?? st['permis Feu'] ?? 0,
                        'permis Feu Readiness': st['permis Feu Readiness'] ?? 0,
                        permisPenetration: st.permisPenetration ?? st['permis Penetration'] ?? 0,
                        'permis Penetration Readiness': st['permis Penetration Readiness'] ?? 0,
                        permisLevage: st.permisLevage ?? st['permis Levage'] ?? 0,
                        'permis Levage Readiness': st['permis Levage Readiness'] ?? 0,
                        permisExcavation: st.permisExcavation ?? st['permis Excavation'] ?? 0,
                        'permis Excavation Readiness': st['permis Excavation Readiness'] ?? 0,
                        'MO Required': st['MO Required'] ?? 0,
                        'MO Readiness': st['MO Readiness'] ?? 0,
                        'ADRPT Required': st['ADRPT Required'] ?? 0,
                        'ADRPT Readiness': st['ADRPT Readiness'] ?? 0,
                        THR: st.isHighRisk ? 1 : 0,
                        Préparatifs: st.preparatifs || '',
                        'Préparatifs Readiness': st['Préparatifs Readiness'] ?? 0,
                        'PRICE FOR HH': st['PRICE FOR HH'] ?? 0,
                        'MANUAL PRICE': st['MANUAL PRICE'] ?? 0,
                        'Scaffolding manual Price': st['Scaffolding manual Price'] ?? 0,
                        'Handling manual Price': st['Handling manual Price'] ?? 0,
                        'TOTAL TASK COST': st['TOTAL TASK COST'] ?? 0,
                        'PDR COST': st['PDR COST'] ?? 0,
                        pdrItems: st.pdrItems || [],
                      };
                    });
                  }

                  // ── Re-link top-level module records back into each task by OT ──
                  // This restores per-task nested data (pdrItems, scaffoldingRecords, etc.) that
                  // was intentionally stripped from the cloud save to respect Supabase size limits.
                  const buildOTMap = (arr: any[]): Map<string, any[]> => {
                    const m = new Map<string, any[]>();
                    (arr || []).forEach((r: any) => {
                      const ot = String(r.OT || '').trim();
                      if (ot) {
                        if (!m.has(ot)) m.set(ot, []);
                        m.get(ot)!.push(r);
                      }
                    });
                    return m;
                  };
                  const pdrByOT = buildOTMap(restoredState.pdrItems);
                  const scaffByOT = buildOTMap(restoredState.scaffoldingRecords);
                  const handleByOT = buildOTMap(restoredState.handlingRecords);
                  const permitByOT = buildOTMap(restoredState.permitRecords);
                  const simopsByOT = buildOTMap(restoredState.simopsRecords);

                  if (Array.isArray(restoredState.tasks) && restoredState.tasks.length > 0) {
                    restoredState.tasks = restoredState.tasks.map((t: any) => {
                      const ot = String(t.OT || '').trim();
                      return {
                        ...t,
                        pdrItems: pdrByOT.get(ot) || t.pdrItems || [],
                        scaffoldingRecords: scaffByOT.get(ot) || t.scaffoldingRecords || [],
                        handlingRecords: handleByOT.get(ot) || t.handlingRecords || [],
                        permitRecords: permitByOT.get(ot) || t.permitRecords || [],
                        simopsRecords: simopsByOT.get(ot) || t.simopsRecords || [],
                      };
                    });
                  }

                  setSchedulingState(restoredState);
                } else if (saved.results?.scheduledTasks?.length > 0) {
                  // Very old session: no schedulingState saved at all — synthesize a minimal one from results
                  const reconstructedTasks = saved.results.scheduledTasks.map((st: any) => {
                    const teamStr = st.team || '';
                    const disc = st.discipline || '';
                    const teamSuffix = disc ? teamStr.replace(disc, '').trim() : teamStr;
                    return {
                      id: st.id,
                      OT: st.ot || '',
                      AVIS: st.avis || '',
                      'GLOBAL TASKS': st.action || '',
                      DISCIPLINE: disc,
                      'Nom Equipement': st.equipment || '',
                      FAMILLE: st.family || '',
                      DUREE: st.duration || 0,
                      EFFECTIF: st.manpower || 0,
                      'Heures-Homme': st.manHours || 0,
                      'Type de maintenance': st.maintenanceType || '',
                      COMPANY: st.company || st.COMPANY || '',
                      ZONE: st.zone || st.ZONE || '',
                      'START DATE': st.startTime || null,
                      'END DATE': st.endTime || null,
                      predecessor: Array.isArray(st.predecessor) ? st.predecessor : [],
                      isScheduled: true,
                      isMultiDiscipline: st.isMultiDiscipline || false,
                      isHighRisk: st.isHighRisk || false,
                      isKeyEvent: st.isKeyEvent || false,
                      "TYPE D'EQUIPE": teamSuffix || null,
                      'EQUIPE NUMBER': st.sequenceOrder ?? null,
                      'MAX HOUR': null,
                      multiDisciplineId: st.multiDisciplineId || undefined,
                      sequenceOrder: st.sequenceOrder ?? null,
                      'Scaffolding Required': st['Scaffolding Required'] ?? 0,
                      'Scaffolding Readiness': st['Scaffolding Readiness'] ?? 0,
                      'Handling required': st['Handling required'] ?? 0,
                      'Handling Readiness': st['Handling Readiness'] ?? 0,
                      permisTravailHauteur: st.permisTravailHauteur ?? st['permis Travail Hauteur'] ?? 0,
                      'permis Travail Hauteur Readiness': st['permis Travail Hauteur Readiness'] ?? 0,
                      permisFeu: st.permisFeu ?? st['permis Feu'] ?? 0,
                      'permis Feu Readiness': st['permis Feu Readiness'] ?? 0,
                      permisPenetration: st.permisPenetration ?? st['permis Penetration'] ?? 0,
                      'permis Penetration Readiness': st['permis Penetration Readiness'] ?? 0,
                      permisLevage: st.permisLevage ?? st['permis Levage'] ?? 0,
                      'permis Levage Readiness': st['permis Levage Readiness'] ?? 0,
                      permisExcavation: st.permisExcavation ?? st['permis Excavation'] ?? 0,
                      'permis Excavation Readiness': st['permis Excavation Readiness'] ?? 0,
                      'MO Required': st['MO Required'] ?? 0,
                      'MO Readiness': st['MO Readiness'] ?? 0,
                      'ADRPT Required': st['ADRPT Required'] ?? 0,
                      'ADRPT Readiness': st['ADRPT Readiness'] ?? 0,
                      THR: st.isHighRisk ? 1 : 0,
                      Préparatifs: st.preparatifs || '',
                      'Préparatifs Readiness': st['Préparatifs Readiness'] ?? 0,
                      'PRICE FOR HH': st['PRICE FOR HH'] ?? 0,
                      'MANUAL PRICE': st['MANUAL PRICE'] ?? 0,
                      'Scaffolding manual Price': st['Scaffolding manual Price'] ?? 0,
                      'Handling manual Price': st['Handling manual Price'] ?? 0,
                      'TOTAL TASK COST': st['TOTAL TASK COST'] ?? 0,
                      'PDR COST': st['PDR COST'] ?? 0,
                      pdrItems: st.pdrItems || [],
                    };
                  });
                  setSchedulingState({
                    tasks: reconstructedTasks,
                    pdrItems: [],
                    simopsRecords: [],
                    costHubEntries: [],
                    scaffoldingRecords: [],
                    handlingRecords: [],
                    permitRecords: [],
                    mapTasks: [],
                  } as any);
                }
                setHotReviewState(initialHotReviewState);
                setCustomCriticalPaths([]);
                setIsScratchMode(project.mode === 'libre');
                setIsColdStopFlow(true);
                setActivePage('planner');
                setPlannerSubPage('dashboard');
              } else {
                // Not yet finalized — load intermediate draft (localStorage first, then cloud)
                const draft = loadProjectDraft(project.id) || cloudDraft;
                setSchedulingState(draft);
                setIsScratchMode(project.mode === 'libre');
                setIsColdStopFlow(true);
                setSchedulingStep(undefined);
                if (!draft) {
                  setSchedulingResults(null);
                  setSchedulingParams(null);
                  setEvaluationData(null);
                }
                handleSetPage('scheduling');
              }
            }}
          />
        ) : <LandingPage onEnterApp={handleEnterApp} setPage={handleSetPage} />;
      case 'user_management':
        return isAuthenticated && currentUser?.role === 'admin' ? <UserManagementPage onBack={() => handleSetPage('admin_dashboard')} /> : <LandingPage onEnterApp={handleEnterApp} setPage={handleSetPage} />;
      case 'what-is': return <WhatIsPlanex />;
      case 'about': return <AboutUs />;
      case 'contact': return <ContactUs />;
      case 'privacy': return <PrivacyPolicy />;
      case 'disclaimer': return <Disclaimer />;
      case 'gdpr': return <GDPRCompliance />;
      case 'copyright': return <CopyrightNotice />;
      case 'pricing': return <PricingPage setPage={handleSetPage} />;
      case 'voir-la-demo': return <VoirLaDemo />;
      case 'ebook': return <Ebook />;
      case 'data_management':
        if (!isAuthenticated) return <LandingPage onEnterApp={handleEnterApp} setPage={handleSetPage} />;

        return (
          <DataManagementPage
            tasks={schedulingState?.tasks || []}
            pdrItems={schedulingState?.pdrItems || []}
            simopsRecords={schedulingState?.simopsRecords || []}
            costHubEntries={schedulingState?.costHubEntries || []}
            scaffoldingRecords={schedulingState?.scaffoldingRecords || []}
            handlingRecords={schedulingState?.handlingRecords || []}
            permitRecords={schedulingState?.permitRecords || []}
            mapTasks={schedulingState?.mapTasks || []}
            onUpdateTasks={(newTasks) => {
              setSchedulingState(prev => {
                const state = prev || {
                  tasks: [],
                  pdrItems: [],
                  simopsRecords: [],
                  costHubEntries: [],
                  scaffoldingRecords: [],
                  handlingRecords: [],
                  permitRecords: [],
                  mapTasks: [],
                  shutdownParams: {
                    shutdownStart: new Date().toISOString().slice(0, 16),
                    shutdownEnd: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
                    consignation: 0,
                    deconsignation: 0,
                    combustion: { mode: 'parallel' as const, value: 0 },
                    workingHoursPerDay: 24,
                  },
                  currentFile: new File([], "manual_data.xlsx"),
                  filters: initialSchedulingFilters,
                  dailyDurationLimit: 24,
                };
                return { ...state, tasks: newTasks };
              });

              if (schedulingResults) {
                setSchedulingResults(prev => {
                  if (!prev) return null;
                  const newTasksMap = new Map(newTasks.map(nt => [nt.id, nt]));
                  const updatedScheduled = prev.scheduledTasks.map(st => {
                    const match = newTasksMap.get(st.id);
                    if (match) {
                      return {
                        ...st,
                        action: match['GLOBAL TASKS'],
                        discipline: match.DISCIPLINE,
                        equipment: match['Nom Equipement'],
                        family: match.FAMILLE,
                        duration: match.DUREE,
                        manpower: match.EFFECTIF,
                        manHours: match['Heures-Homme'],
                        ot: match.OT?.toString(),
                        avis: match.AVIS?.toString()
                      };
                    }
                    return st;
                  });
                  return { ...prev, scheduledTasks: updatedScheduled };
                });
              }
            }}
            onUpdateMapTasks={(newMapTasks) => {
              setSchedulingState(prev => prev ? { ...prev, mapTasks: newMapTasks } : {
                tasks: [], mapTasks: newMapTasks, pdrItems: [], simopsRecords: [], costHubEntries: [], scaffoldingRecords: [], handlingRecords: [], permitRecords: [],
                shutdownParams: { shutdownStart: new Date().toISOString().slice(0, 16), shutdownEnd: new Date(Date.now() + 86400000).toISOString().slice(0, 16), consignation: 0, deconsignation: 0, combustion: { mode: 'parallel', value: 0 }, workingHoursPerDay: 24 },
                currentFile: new File([], "manual_data.xlsx"), filters: initialSchedulingFilters, dailyDurationLimit: 24
              } as any);
            }}
            onUpdatePDR={(newPdr) => {
              setSchedulingState(prev => prev ? { ...prev, pdrItems: newPdr } : {
                tasks: [], pdrItems: newPdr, simopsRecords: [], costHubEntries: [], scaffoldingRecords: [], handlingRecords: [], permitRecords: [], mapTasks: [],
                shutdownParams: { shutdownStart: new Date().toISOString().slice(0, 16), shutdownEnd: new Date(Date.now() + 86400000).toISOString().slice(0, 16), consignation: 0, deconsignation: 0, combustion: { mode: 'parallel', value: 0 }, workingHoursPerDay: 24 },
                currentFile: new File([], "manual_data.xlsx"), filters: initialSchedulingFilters, dailyDurationLimit: 24
              } as any);
              if (schedulingResults) {
                setSchedulingResults(prev => prev ? { ...prev, pdrItems: newPdr } : null);
              }
            }}
            onUpdateSimops={(newSimops) => {
              setSchedulingState(prev => prev ? { ...prev, simopsRecords: newSimops } : {
                tasks: [], simopsRecords: newSimops, pdrItems: [], costHubEntries: [], scaffoldingRecords: [], handlingRecords: [], permitRecords: [], mapTasks: [],
                shutdownParams: { shutdownStart: new Date().toISOString().slice(0, 16), shutdownEnd: new Date(Date.now() + 86400000).toISOString().slice(0, 16), consignation: 0, deconsignation: 0, combustion: { mode: 'parallel', value: 0 }, workingHoursPerDay: 24 },
                currentFile: new File([], "manual_data.xlsx"), filters: initialSchedulingFilters, dailyDurationLimit: 24
              } as any);
              if (schedulingResults) {
                setSchedulingResults(prev => prev ? { ...prev, simopsRecords: newSimops } : null);
              }
            }}
            onUpdateCostHub={(newCost) => {
              setSchedulingState(prev => prev ? { ...prev, costHubEntries: newCost } : {
                tasks: [], costHubEntries: newCost, pdrItems: [], simopsRecords: [], scaffoldingRecords: [], handlingRecords: [], permitRecords: [], mapTasks: [],
                shutdownParams: { shutdownStart: new Date().toISOString().slice(0, 16), shutdownEnd: new Date(Date.now() + 86400000).toISOString().slice(0, 16), consignation: 0, deconsignation: 0, combustion: { mode: 'parallel', value: 0 }, workingHoursPerDay: 24 },
                currentFile: new File([], "manual_data.xlsx"), filters: initialSchedulingFilters, dailyDurationLimit: 24
              } as any);
              if (schedulingResults) {
                setSchedulingResults(prev => prev ? { ...prev, costHubEntries: newCost } : null);
              }
            }}
            onUpdateScaffolding={(newScaff) => {
              const scaffMap = new Map<string, any[]>();
              newScaff.forEach(s => {
                const ot = String(s.OT || '').trim();
                if (!scaffMap.has(ot)) scaffMap.set(ot, []);
                scaffMap.get(ot)!.push(s);
              });

              const linkData = (tasksToUpdate: any[]) => tasksToUpdate.map(t => {
                const ot = String(t.ot || t.OT || '').trim();
                const relevantRecords = ot === '' ? [] : (scaffMap.get(ot) || []);
                const hasScaff = relevantRecords.length > 0;
                const isReady = hasScaff && relevantRecords.every(r => r.readiness === 1);
                return {
                  ...t,
                  'Scaffolding Required': hasScaff ? 1 : 0,
                  'Scaffolding Readiness': isReady ? 1 : 0
                };
              });

              setSchedulingState(prev => {
                const state = prev || {
                  tasks: [], pdrItems: [], simopsRecords: [], costHubEntries: [], scaffoldingRecords: [], handlingRecords: [], permitRecords: [], mapTasks: [],
                  shutdownParams: { shutdownStart: new Date().toISOString().slice(0, 16), shutdownEnd: new Date(Date.now() + 86400000).toISOString().slice(0, 16), consignation: 0, deconsignation: 0, combustion: { mode: 'parallel' as const, value: 0 }, workingHoursPerDay: 24 },
                  currentFile: new File([], "manual_data.xlsx"), filters: initialSchedulingFilters, dailyDurationLimit: 24
                };
                return { ...state, scaffoldingRecords: newScaff, tasks: linkData(state.tasks) };
              });

              if (schedulingResults) {
                setSchedulingResults(prev => prev ? {
                  ...prev,
                  scaffoldingRecords: newScaff,
                  scheduledTasks: linkData(prev.scheduledTasks)
                } : null);
              }
            }}
            onUpdateHandling={(newHand) => {
              const handMap = new Map<string, any[]>();
              newHand.forEach(h => {
                const ot = String(h.OT || '').trim();
                if (!handMap.has(ot)) handMap.set(ot, []);
                handMap.get(ot)!.push(h);
              });

              const linkData = (tasksToUpdate: any[]) => tasksToUpdate.map(t => {
                const ot = String(t.ot || t.OT || '').trim();
                const relevantRecords = ot === '' ? [] : (handMap.get(ot) || []);
                const hasHand = relevantRecords.length > 0;
                const isReady = hasHand && relevantRecords.every(r => r.readiness === 1);
                return {
                  ...t,
                  'Handling required': hasHand ? 1 : 0,
                  'Handling Readiness': isReady ? 1 : 0
                };
              });

              setSchedulingState(prev => {
                const state = prev || {
                  tasks: [], pdrItems: [], simopsRecords: [], costHubEntries: [], scaffoldingRecords: [], handlingRecords: [], permitRecords: [], mapTasks: [],
                  shutdownParams: { shutdownStart: new Date().toISOString().slice(0, 16), shutdownEnd: new Date(Date.now() + 86400000).toISOString().slice(0, 16), consignation: 0, deconsignation: 0, combustion: { mode: 'parallel' as const, value: 0 }, workingHoursPerDay: 24 },
                  currentFile: new File([], "manual_data.xlsx"), filters: initialSchedulingFilters, dailyDurationLimit: 24
                };
                return { ...state, handlingRecords: newHand, tasks: linkData(state.tasks) };
              });

              if (schedulingResults) {
                setSchedulingResults(prev => prev ? {
                  ...prev,
                  handlingRecords: newHand,
                  scheduledTasks: linkData(prev.scheduledTasks)
                } : null);
              }
            }}
            onUpdatePermits={(newPermits) => {
              const permitMap = new Map<string, any[]>();
              newPermits.forEach(p => {
                const ot = String(p.OT || '').trim();
                if (!permitMap.has(ot)) permitMap.set(ot, []);
                permitMap.get(ot)!.push(p);
              });

              const linkData = (tasksToUpdate: any[]) => tasksToUpdate.map(t => {
                const ot = String(t.ot || t.OT || '').trim();
                const relevantPermits = ot === '' ? [] : (permitMap.get(ot) || []);

                const hasLevage = relevantPermits.some(p => p.permitName.toLowerCase().includes('levage'));
                const levageReady = hasLevage && relevantPermits.find(p => p.permitName.toLowerCase().includes('levage'))?.readiness === 1;

                const hasHauteur = relevantPermits.some(p => p.permitName.toLowerCase().includes('hauteur'));
                const hauteurReady = hasHauteur && relevantPermits.find(p => p.permitName.toLowerCase().includes('hauteur'))?.readiness === 1;

                const hasFeu = relevantPermits.some(p => p.permitName.toLowerCase().includes('feu'));
                const feuReady = hasFeu && relevantPermits.find(p => p.permitName.toLowerCase().includes('feu'))?.readiness === 1;

                const hasPenetration = relevantPermits.some(p => p.permitName.toLowerCase().includes('penetration') || p.permitName.toLowerCase().includes('pénétration'));
                const penetrationReady = hasPenetration && relevantPermits.find(p => p.permitName.toLowerCase().includes('penetration') || p.permitName.toLowerCase().includes('pénétration'))?.readiness === 1;

                const hasExcavation = relevantPermits.some(p => p.permitName.toLowerCase().includes('excavation'));
                const excavationReady = hasExcavation && relevantPermits.find(p => p.permitName.toLowerCase().includes('excavation'))?.readiness === 1;

                return {
                  ...t,
                  permisLevage: hasLevage ? 1 : 0,
                  'permis Levage Readiness': levageReady ? 1 : 0,
                  permisTravailHauteur: hasHauteur ? 1 : 0,
                  'permis Travail Hauteur Readiness': hauteurReady ? 1 : 0,
                  permisFeu: hasFeu ? 1 : 0,
                  'permis Feu Readiness': feuReady ? 1 : 0,
                  permisPenetration: hasPenetration ? 1 : 0,
                  'permis Penetration Readiness': penetrationReady ? 1 : 0,
                  permisExcavation: hasExcavation ? 1 : 0,
                  'permis Excavation Readiness': excavationReady ? 1 : 0
                };
              });

              setSchedulingState(prev => {
                const state = prev || {
                  tasks: [], pdrItems: [], simopsRecords: [], costHubEntries: [], scaffoldingRecords: [], handlingRecords: [], permitRecords: [], mapTasks: [],
                  shutdownParams: { shutdownStart: new Date().toISOString().slice(0, 16), shutdownEnd: new Date(Date.now() + 86400000).toISOString().slice(0, 16), consignation: 0, deconsignation: 0, combustion: { mode: 'parallel' as const, value: 0 }, workingHoursPerDay: 24 },
                  currentFile: new File([], "manual_data.xlsx"), filters: initialSchedulingFilters, dailyDurationLimit: 24
                };
                return { ...state, permitRecords: newPermits, tasks: linkData(state.tasks) };
              });

              if (schedulingResults) {
                setSchedulingResults(prev => prev ? {
                  ...prev,
                  permitRecords: newPermits,
                  scheduledTasks: linkData(prev.scheduledTasks)
                } : null);
              }
            }}
            onUpdateEvaluationData={(newEval) => {
              setEvaluationData(prev => {
                if (!prev) return newEval;
                return {
                  ...prev,
                  ...newEval,
                  tasks: { ...prev.tasks, ...newEval.tasks }
                };
              });
            }}
            onBack={() => {
              if (schedulingResults) {
                // Completed project — go back to the planner dashboard, NOT the scheduling page.
                // Going to scheduling would mount SchedulingPage which can overwrite schedulingState
                // (including simopsRecords etc.) with freshly-initialized empty values.
                setPlannerSubPage('dashboard');
                setActivePage('planner');
              } else {
                // Unfinished project — go back to the scheduling wizard
                setSchedulingStep('dashboard');
                handleSetPage('scheduling');
              }
            }}
          />
        );
      case 'live_navigation':
        if (!isAuthenticated) return <LandingPage onEnterApp={handleEnterApp} setPage={handleSetPage} />;
        return (
          <LiveNavigationPage
            tasks={(schedulingState?.mapTasks && schedulingState.mapTasks.length > 0) ? schedulingState.mapTasks : (schedulingState?.tasks || [])}
            onBack={() => {
              setSchedulingStep('dashboard');
              handleSetPage('scheduling');
            }}
          />
        );
      case 'admin_license_panel':
        if (!licenseSession?.isAdmin) return <LandingPage onEnterApp={handleEnterApp} setPage={handleSetPage} />;
        return (
          <Suspense fallback={<PageLoader />}>
            <AdminPanel adminKey={licenseSession.activationKey} />
          </Suspense>
        );
      case 'landing':
      default:
        return <LandingPage onEnterApp={handleEnterApp} setPage={handleSetPage} />;
    }
  };

  return (
    <>
      <Layout
        currentPage={activePage}
        setPage={handleSetPage}
        isColdStopFlow={isColdStopFlow}
        isAuthenticated={isAuthenticated}
        user={currentUser}
        onLogout={handleLogout}
        setIsVideoModalOpen={setIsVideoModalOpen}
        onBack={activePage === 'planner' ? handleBackToScheduling : undefined}
        licenseSession={licenseSession}
        onLicenseLogout={onLicenseLogout}
      >

        <Suspense fallback={<PageLoader />}>
          {renderPage()}
        </Suspense>
      </Layout>
      <VideoModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} />

    </>
  );
};

// ─── AppRoot — License gate wrapper (proper hooks separation) ───────────────────
// This is the REAL default export. It handles the login screen, expired screen,
// notifications, and then renders the main App with the validated license session.
const AppRoot: React.FC = () => {
  const [licenseSession, setLicenseSession] = useState<LicenseSession | null>(null);
  const [pendingNotifications, setPendingNotifications] = useState<{id:string;message:string;created_at:string}[]>([]);
  const [showNotifModal, setShowNotifModal] = useState(false);

  const handleLicenseLogin = async (session: LicenseSession) => {
    setLicenseSession(session);
    logLogin().catch(() => {});
    const notifs = await fetchNotifications();
    if (notifs.length > 0) {
      setPendingNotifications(notifs);
      setShowNotifModal(true);
    }
  };

  // 1. Not yet logged in
  if (!licenseSession) {
    return <LicenseLoginScreen onSuccess={handleLicenseLogin} />;
  }

  // 2. License hard-locked (expired + past grace period)
  const licenseStatus = getLicenseStatus(licenseSession);
  if (licenseStatus.isHardLocked && !licenseSession.isAdmin) {
    return <LicenseExpiredScreen username={licenseSession.username} companyName={licenseSession.companyName} />;
  }

  // 3. Authenticated — render full app
  return (
    <>
      <LicenseStatusBanner session={licenseSession} />
      <App licenseSession={licenseSession} onLicenseLogout={() => {
        localStorage.removeItem('plannex_saved_username');
        setLicenseSession(null);
      }} />

      {showNotifModal && pendingNotifications.length > 0 && (
        <NotificationModal
          notifications={pendingNotifications}
          username={licenseSession.username}
          activationKey={licenseSession.activationKey}
          onClose={() => { setShowNotifModal(false); setPendingNotifications([]); }}
        />
      )}
    </>
  );
};

export default AppRoot;