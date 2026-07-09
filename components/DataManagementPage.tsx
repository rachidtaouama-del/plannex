import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Search,
    Filter,
    Plus,
    Edit2,
    Trash2,
    Copy,
    Database,
    Package,
    ChevronDown,
    ChevronLeft,
    ArrowUpDown,
    Download,
    Upload,
    AlertCircle,
    CheckCircle2,
    CheckCircle,
    Calendar,
    Briefcase,
    Tag,
    ChevronRight,
    RefreshCw,
    FileSpreadsheet,
    Eye,
    MapPin,
    Activity,
    TrendingUp
} from 'lucide-react';
import type { SchedulingTaskData, PDRItem } from '../types';
import { AddTaskModal } from './AddTaskModal';
import { EditTaskModal } from './EditTaskModal';
import { MapTaskModal } from './MapTaskModal';
import { parseSchedulingFile } from '../services/schedulingService';

import { SimopsRecord, CostHubEntry, ScaffoldingRecord, HandlingRecord, PermitRecord } from '../types';

interface DataManagementPageProps {
    tasks: SchedulingTaskData[];
    pdrItems: PDRItem[];
    simopsRecords: SimopsRecord[];
    costHubEntries: CostHubEntry[];
    scaffoldingRecords: ScaffoldingRecord[];
    handlingRecords: HandlingRecord[];
    permitRecords: PermitRecord[];
    mapTasks: SchedulingTaskData[];
    onUpdateTasks: (tasks: SchedulingTaskData[]) => void;
    onUpdatePDR: (pdrItems: PDRItem[]) => void;
    onUpdateMapTasks?: (mapTasks: SchedulingTaskData[]) => void;
    onUpdateSimops?: (records: SimopsRecord[]) => void;
    onUpdateCostHub?: (entries: CostHubEntry[]) => void;
    onUpdateScaffolding?: (records: ScaffoldingRecord[]) => void;
    onUpdateHandling?: (records: HandlingRecord[]) => void;
    onUpdatePermits?: (records: PermitRecord[]) => void;
    onUpdateEvaluationData?: (evalData: any) => void;
    onBack: () => void;
}

export const DataManagementPage: React.FC<DataManagementPageProps> = ({
    tasks = [],
    pdrItems = [],
    simopsRecords = [],
    costHubEntries = [],
    scaffoldingRecords = [],
    handlingRecords = [],
    permitRecords = [],
    mapTasks = [],
    onUpdateTasks,
    onUpdatePDR,
    onUpdateSimops,
    onUpdateCostHub,
    onUpdateScaffolding,
    onUpdateHandling,
    onUpdatePermits,
    onUpdateMapTasks,
    onUpdateEvaluationData,
    onBack
}) => {
    const [activeTab, setActiveTab] = useState<'tasks' | 'pdr' | 'simops' | 'cost' | 'scaffolding' | 'handling' | 'permits' | 'mapTasks'>('tasks');
    const [searchInput, setSearchInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchTerm]);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [isAddSimopsModalOpen, setIsAddSimopsModalOpen] = useState(false);
    const [isAddPDRModalOpen, setIsAddPDRModalOpen] = useState(false);
    const [isAddCostModalOpen, setIsAddCostModalOpen] = useState(false);
    const [isAddScaffoldingModalOpen, setIsAddScaffoldingModalOpen] = useState(false);
    const [isAddHandlingModalOpen, setIsAddHandlingModalOpen] = useState(false);
    const [isAddPermitModalOpen, setIsAddPermitModalOpen] = useState(false);
    const [isAddMapTaskModalOpen, setIsAddMapTaskModalOpen] = useState(false);
    const [editingMapTask, setEditingMapTask] = useState<SchedulingTaskData | null>(null);

    const [newSimops, setNewSimops] = useState<SimopsRecord>({ OT: '', simopsOT: '' });
    const [newPDR, setNewPDR] = useState<PDRItem>({ id: '', OT: '', sparePart: '', unite: '', type: '', qty: 0, priceU: 0, totalPrice: 0, readiness: 0, dueDate: null, status: 'Inventory Assets' });
    const [newCost, setNewCost] = useState<CostHubEntry>({ company: '', costType: '', posteNumber: '', posteDescription: '', priceU: 0 });
    const [newScaffolding, setNewScaffolding] = useState<ScaffoldingRecord>({ OT: '', company: '', readiness: 0, posteNumber: '', QT: 1, totalPrice: 0, comment: '' });
    const [newHandling, setNewHandling] = useState<HandlingRecord>({ OT: '', company: '', handlingType: '', readiness: 0, posteNumber: '', hours: 0, additionalCost: 0 });
    const [newPermit, setNewPermit] = useState<PermitRecord>({ OT: '', permitName: '', readiness: 0 });

    const handleSaveSimops = () => {
        if (onUpdateSimops) {
            onUpdateSimops([...simopsRecords, newSimops]);
            setIsAddSimopsModalOpen(false);
            setNewSimops({ OT: '', simopsOT: '' });
        }
    };

    const handleSavePDR = () => {
        const itemWithId = { ...newPDR, id: Math.random().toString(36).substr(2, 9), totalPrice: (newPDR.qty || 0) * (newPDR.priceU || 0) };
        onUpdatePDR([...pdrItems, itemWithId]);
        setIsAddPDRModalOpen(false);
        setNewPDR({ id: '', OT: '', sparePart: '', unite: '', type: '', qty: 0, priceU: 0, totalPrice: 0, readiness: 0, dueDate: null, status: 'Inventory Assets', comment: '' });
    };

    const handleSaveMapTask = (task: SchedulingTaskData) => {
        if (onUpdateMapTasks) {
            if (editingMapTask) {
                onUpdateMapTasks(mapTasks.map(t => t.id === task.id ? task : t));
            } else {
                onUpdateMapTasks([...mapTasks, task]);
            }
            setIsAddMapTaskModalOpen(false);
            setEditingMapTask(null);
        }
    };

    const handleSaveCost = () => {
        if (onUpdateCostHub) {
            onUpdateCostHub([...costHubEntries, newCost]);
            setIsAddCostModalOpen(false);
            setNewCost({ company: '', costType: '', posteNumber: '', posteDescription: '', priceU: 0 });
        }
    };

    const handleSaveScaffolding = () => {
        if (onUpdateScaffolding) {
            onUpdateScaffolding([...scaffoldingRecords, newScaffolding]);
            setIsAddScaffoldingModalOpen(false);
            setNewScaffolding({ OT: '', company: '', readiness: 0, posteNumber: '', QT: 1, totalPrice: 0, comment: '' });
        }
    };

    const handleSaveHandling = () => {
        if (onUpdateHandling) {
            onUpdateHandling([...handlingRecords, newHandling]);
            setIsAddHandlingModalOpen(false);
            setNewHandling({ OT: '', company: '', handlingType: '', readiness: 0, posteNumber: '', hours: 0, additionalCost: 0 });
        }
    };

    const handleSavePermit = () => {
        if (onUpdatePermits) {
            onUpdatePermits([...permitRecords, newPermit]);
            setIsAddPermitModalOpen(false);
            setNewPermit({ OT: '', permitName: '', readiness: 0 });
        }
    };

    const [editingTask, setEditingTask] = useState<SchedulingTaskData | null>(null);
    const [editingPDR, setEditingPDR] = useState<PDRItem | null>(null);
    const [editingSimops, setEditingSimops] = useState<SimopsRecord | null>(null);
    const [editingCost, setEditingCost] = useState<CostHubEntry | null>(null);
    const [editingScaffolding, setEditingScaffolding] = useState<ScaffoldingRecord | null>(null);
    const [editingHandling, setEditingHandling] = useState<HandlingRecord | null>(null);
    const [editingPermit, setEditingPermit] = useState<PermitRecord | null>(null);
    const [viewingComment, setViewingComment] = useState<{ id: string, comment: string } | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 15;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [filters, setFilters] = useState({
        discipline: 'all',
        family: 'all',
        equipment: 'all'
    });

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{
        type: 'tasks' | 'pdr' | 'simops' | 'cost' | 'scaffolding' | 'handling' | 'permits' | 'mapTasks';
        item: any;
        label: string;
    } | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const { promise } = parseSchedulingFile(file);
        promise.then(data => {
            onUpdateTasks(data.tasks);
            if (data.pdrItems) onUpdatePDR(data.pdrItems);
            if (data.simopsRecords && onUpdateSimops) onUpdateSimops(data.simopsRecords);
            if (data.costHubEntries && onUpdateCostHub) onUpdateCostHub(data.costHubEntries);
            if (data.scaffoldingRecords && onUpdateScaffolding) onUpdateScaffolding(data.scaffoldingRecords);
            if (data.handlingRecords && onUpdateHandling) onUpdateHandling(data.handlingRecords);
            if (data.permitRecords && onUpdatePermits) onUpdatePermits(data.permitRecords);

            if (data.evaluationData && onUpdateEvaluationData) {
                onUpdateEvaluationData(data.evaluationData);
            }
        }).finally(() => {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        });
    };

    // Filtered data
    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesSearch = searchTerm === '' ||
                (task['GLOBAL TASKS']?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (task.OT?.toString().includes(searchTerm)) ||
                (task.DISCIPLINE?.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesDiscipline = filters.discipline === 'all' || task.DISCIPLINE === filters.discipline;
            const matchesFamily = filters.family === 'all' || task.FAMILLE === filters.family;
            const matchesEquipment = filters.equipment === 'all' || task['Nom Equipement'] === filters.equipment;

            return matchesSearch && matchesDiscipline && matchesFamily && matchesEquipment;
        }).sort((a, b) => {
            if (!sortConfig) return 0;
            const { key, direction } = sortConfig;
            const valA = a[key as keyof SchedulingTaskData];
            const valB = b[key as keyof SchedulingTaskData];

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [tasks, searchTerm, filters, sortConfig]);

    const filteredPDR = useMemo(() => {
        return pdrItems.filter(pdr => {
            const matchesSearch = searchTerm === '' ||
                (pdr.sparePart?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (pdr.OT?.toString().includes(searchTerm));
            return matchesSearch;
        });
    }, [pdrItems, searchTerm]);

    const filteredSimops = useMemo(() => {
        return simopsRecords.filter(s =>
            searchTerm === '' || s.OT.includes(searchTerm) || s.simopsOT.includes(searchTerm)
        );
    }, [simopsRecords, searchTerm]);

    const filteredCost = useMemo(() => {
        return costHubEntries.filter(c =>
            searchTerm === '' || c.company.toLowerCase().includes(searchTerm.toLowerCase()) || c.posteNumber.toString().includes(searchTerm)
        );
    }, [costHubEntries, searchTerm]);

    const filteredScaffolding = useMemo(() => {
        return scaffoldingRecords.filter(sr =>
            searchTerm === '' || sr.OT.includes(searchTerm) || sr.company.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [scaffoldingRecords, searchTerm]);

    const filteredHandling = useMemo(() => {
        return handlingRecords.filter(hr =>
            searchTerm === '' || hr.OT.includes(searchTerm) || hr.company.toLowerCase().includes(searchTerm.toLowerCase()) || hr.handlingType.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [handlingRecords, searchTerm]);

    const filteredPermits = useMemo(() => {
        return permitRecords.filter(pr =>
            searchTerm === '' || pr.OT.includes(searchTerm) || pr.permitName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [permitRecords, searchTerm]);

    const filteredMapTasks = useMemo(() => {
        return mapTasks.filter(t =>
            searchTerm === '' || t.OT.includes(searchTerm) || t['GLOBAL TASKS']?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [mapTasks, searchTerm]);

    const currentTabTotal = useMemo(() => {
        switch (activeTab) {
            case 'tasks': return filteredTasks.length;
            case 'pdr': return filteredPDR.length;
            case 'simops': return filteredSimops.length;
            case 'cost': return filteredCost.length;
            case 'scaffolding': return filteredScaffolding.length;
            case 'handling': return filteredHandling.length;
            case 'permits': return filteredPermits.length;
            case 'mapTasks': return filteredMapTasks.length;
            default: return 0;
        }
    }, [activeTab, filteredTasks, filteredPDR, filteredSimops, filteredCost, filteredScaffolding, filteredHandling, filteredPermits, filteredMapTasks]);

    const totalPages = Math.ceil(currentTabTotal / PAGE_SIZE);

    const paginatedTasks = useMemo(() => filteredTasks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filteredTasks, currentPage]);
    const paginatedPDR = useMemo(() => filteredPDR.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filteredPDR, currentPage]);
    const paginatedSimops = useMemo(() => filteredSimops.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filteredSimops, currentPage]);
    const paginatedCost = useMemo(() => filteredCost.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filteredCost, currentPage]);
    const paginatedScaffolding = useMemo(() => filteredScaffolding.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filteredScaffolding, currentPage]);
    const paginatedHandling = useMemo(() => filteredHandling.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filteredHandling, currentPage]);
    const paginatedPermits = useMemo(() => filteredPermits.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filteredPermits, currentPage]);
    const paginatedMapTasks = useMemo(() => filteredMapTasks.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [filteredMapTasks, currentPage]);

    const disciplines = useMemo(() => ['all', ...new Set(tasks.map(t => t.DISCIPLINE).filter(Boolean))].sort(), [tasks]);
    const families = useMemo(() => ['all', ...new Set(tasks.map(t => t.FAMILLE).filter(Boolean))].sort(), [tasks]);
    const equipments = useMemo(() => ['all', ...new Set(tasks.map(t => t['Nom Equipement']).filter(Boolean))].sort(), [tasks]);
    const pdrTypes = useMemo(() => [...new Set(pdrItems.map(p => p.type).filter(Boolean))].sort(), [pdrItems]);
    const pdrUnites = useMemo(() => [...new Set(pdrItems.map(p => p.unite).filter(Boolean))].sort(), [pdrItems]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleDeleteTask = (task: SchedulingTaskData) => {
        setDeleteConfirmation({
            type: 'tasks',
            item: task,
            label: `la tâche "${task['GLOBAL TASKS']}"`
        });
    };

    const handleDuplicateTask = (task: SchedulingTaskData) => {
        const newId = Math.max(...tasks.map(t => t.id), 0) + 1;
        const duplicatedTask = {
            ...task,
            id: newId,
            'GLOBAL TASKS': `${task['GLOBAL TASKS']} (Copie)`,
            isScheduled: false,
            'START DATE': null,
            'END DATE': null
        };
        onUpdateTasks([...tasks, duplicatedTask]);
    };

    const handleSaveTaskEdit = (updatedTasks: SchedulingTaskData[]) => {
        let newFullTasks = [...tasks];

        updatedTasks.forEach(ut => {
            if (ut.id === -1) {
                // New sub-task from multi-discipline mode
                const nextId = Math.max(...newFullTasks.map(t => t.id), 0) + 1;
                newFullTasks.push({ ...ut, id: nextId } as SchedulingTaskData);
            } else {
                const index = newFullTasks.findIndex(t => t.id === ut.id);
                if (index !== -1) {
                    newFullTasks[index] = ut;
                }
            }
        });

        onUpdateTasks(newFullTasks);
        setEditingTask(null);
    };

    const handleAddTask = (newTasks: any[], insertAfterId: number | null) => {
        const tasksToAdd = newTasks.map((t, idx) => ({
            ...t,
            id: Math.max(...tasks.map(task => task.id), 0) + idx + 1,
            isScheduled: false
        }));

        let updatedTasks;
        if (insertAfterId) {
            const index = tasks.findIndex(t => t.id === insertAfterId);
            updatedTasks = [...tasks];
            updatedTasks.splice(index + 1, 0, ...tasksToAdd);
        } else {
            updatedTasks = [...tasks, ...tasksToAdd];
        }

        onUpdateTasks(updatedTasks);
        setIsAddTaskModalOpen(false);
    };

    const handleUpdatePDRItem = (updatedItem: PDRItem) => {
        const newPDR = pdrItems.map(p => p.id === updatedItem.id ? updatedItem : p);
        onUpdatePDR(newPDR);
        setEditingPDR(null);
    };

    const handleUpdateSimops = (oldRecord: SimopsRecord, updatedRecord: SimopsRecord) => {
        if (!onUpdateSimops) return;
        const newSimops = simopsRecords.map(s => (s.OT === oldRecord.OT && s.simopsOT === oldRecord.simopsOT) ? updatedRecord : s);
        onUpdateSimops(newSimops);
        setEditingSimops(null);
    };

    const handleUpdateCost = (oldEntry: CostHubEntry, updatedEntry: CostHubEntry) => {
        if (!onUpdateCostHub) return;
        const newCost = costHubEntries.map(c => (c.posteNumber === oldEntry.posteNumber && c.company === oldEntry.company) ? updatedEntry : c);
        onUpdateCostHub(newCost);
        setEditingCost(null);
    };

    const handleUpdateScaffolding = (oldRecord: ScaffoldingRecord, updatedRecord: ScaffoldingRecord) => {
        if (!onUpdateScaffolding) return;
        const newScaff = scaffoldingRecords.map(sr => (sr.OT === oldRecord.OT && sr.posteNumber === oldRecord.posteNumber) ? updatedRecord : sr);
        onUpdateScaffolding(newScaff);
        setEditingScaffolding(null);
    };

    const handleUpdateHandling = (oldRecord: HandlingRecord, updatedRecord: HandlingRecord) => {
        if (!onUpdateHandling) return;
        const newHand = handlingRecords.map(hr => (hr.OT === oldRecord.OT && hr.handlingType === oldRecord.handlingType) ? updatedRecord : hr);
        onUpdateHandling(newHand);
        setEditingHandling(null);
    };

    const handleUpdatePermit = (oldRecord: PermitRecord, updatedRecord: PermitRecord) => {
        if (!onUpdatePermits) return;
        const newPermits = permitRecords.map(pr => (pr.OT === oldRecord.OT && pr.permitName === oldRecord.permitName) ? updatedRecord : pr);
        onUpdatePermits(newPermits);
        setEditingPermit(null);
    };

    const handleSaveComment = (id: string, comment: string) => {
        const newPDR = pdrItems.map(p => p.id === id ? { ...p, comment } : p);
        onUpdatePDR(newPDR);
        setViewingComment(null);
    };

    const handleDeletePDR = (item: PDRItem) => {
        setDeleteConfirmation({
            type: 'pdr',
            item: item,
            label: `l'article PDR "${item.sparePart}"`
        });
    };

    const handleDeleteSimops = (record: SimopsRecord) => {
        setDeleteConfirmation({
            type: 'simops',
            item: record,
            label: `l'enregistrement SIMOPS OT ${record.OT}`
        });
    };

    const handleDeleteCost = (entry: CostHubEntry) => {
        setDeleteConfirmation({
            type: 'cost',
            item: entry,
            label: `l'entrée de coût pour ${entry.company}`
        });
    };

    const handleDeleteScaffolding = (record: ScaffoldingRecord) => {
        setDeleteConfirmation({
            type: 'scaffolding',
            item: record,
            label: `l'échafaudage OT ${record.OT}`
        });
    };

    const handleDeleteHandling = (record: HandlingRecord) => {
        setDeleteConfirmation({
            type: 'handling',
            item: record,
            label: `la manutention OT ${record.OT}`
        });
    };

    const handleDeletePermit = (record: PermitRecord) => {
        setDeleteConfirmation({
            type: 'permits',
            item: record,
            label: `le permis "${record.permitName}"`
        });
    };

    const handleDeleteMapTask = (task: SchedulingTaskData) => {
        setDeleteConfirmation({
            type: 'mapTasks',
            item: task,
            label: `la tâche Map "${task['GLOBAL TASKS']}" (OT ${task.OT})`
        });
    };

    const confirmDelete = () => {
        if (!deleteConfirmation) return;
        const { type, item } = deleteConfirmation;

        switch (type) {
            case 'tasks':
                onUpdateTasks(tasks.filter(t => t.id !== item.id));
                break;
            case 'pdr':
                onUpdatePDR(pdrItems.filter(p => p.id !== item.id));
                break;
            case 'simops':
                onUpdateSimops(simopsRecords.filter(s => !(s.OT === item.OT && s.simopsOT === item.simopsOT)));
                break;
            case 'cost':
                onUpdateCostHub(costHubEntries.filter(c => !(c.posteNumber === item.posteNumber && c.company === item.company)));
                break;
            case 'scaffolding':
                onUpdateScaffolding(scaffoldingRecords.filter(sr => !(sr.OT === item.OT && sr.posteNumber === item.posteNumber)));
                break;
            case 'handling':
                onUpdateHandling(handlingRecords.filter(hr => !(hr.OT === item.OT && hr.handlingType === item.handlingType)));
                break;
            case 'permits':
                if (onUpdatePermits) onUpdatePermits(permitRecords.filter(pr => !(pr.OT === item.OT && pr.permitName === item.permitName)));
                break;
            case 'mapTasks':
                if (onUpdateMapTasks) onUpdateMapTasks(mapTasks.filter(t => t.id !== item.id));
                break;
        }
        setDeleteConfirmation(null);
    };



    const renderTabDashboard = () => {
        const cardClass = "flex-1 min-w-[240px] bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-[2.5rem] flex items-center justify-between group hover:border-white/10 transition-all relative overflow-hidden";
        const iconContainerClass = "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 relative z-10";
        const glowClass = "absolute -top-12 -right-12 w-24 h-24 blur-3xl rounded-full group-hover:scale-150 transition-transform opacity-20";

        switch (activeTab) {
            case 'tasks':
                const totalHH = tasks.reduce((sum, t) => sum + (parseFloat(t['Heures-Homme'] as any) || 0), 0);
                const uniqueDisciplines = new Set(tasks.map(t => t.DISCIPLINE).filter(Boolean)).size;
                return (
                    <div className="flex flex-wrap gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-blue-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Tasks</p>
                                <h3 className="text-3xl font-black text-white">{tasks.length}</h3>
                            </div>
                            <div className={`${iconContainerClass} bg-blue-500/10 text-blue-400`}><Database size={24} /></div>
                        </div>
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-emerald-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Man-Hours (HH)</p>
                                <h3 className="text-3xl font-black text-white">{new Intl.NumberFormat('fr-FR').format(totalHH)}</h3>
                            </div>
                            <div className={`${iconContainerClass} bg-emerald-500/10 text-emerald-400`}><Activity size={24} /></div>
                        </div>
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-amber-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Disciplines</p>
                                <h3 className="text-3xl font-black text-white">{uniqueDisciplines}</h3>
                            </div>
                            <div className={`${iconContainerClass} bg-amber-500/10 text-amber-400`}><Briefcase size={24} /></div>
                        </div>
                    </div>
                );
            case 'pdr':
                const totalValue = pdrItems.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
                const pdrReadiness = pdrItems.length > 0 ? (pdrItems.filter(p => p.readiness === 1).length / pdrItems.length * 100).toFixed(0) : 0;
                return (
                    <div className="flex flex-wrap gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-amber-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">PDR Items</p>
                                <h3 className="text-3xl font-black text-white">{pdrItems.length}</h3>
                            </div>
                            <div className={`${iconContainerClass} bg-amber-500/10 text-amber-400`}><Package size={24} /></div>
                        </div>
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-blue-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Inventory Value</p>
                                <h3 className="text-3xl font-black text-white text-blue-400">{new Intl.NumberFormat('fr-FR').format(totalValue)} <span className="text-sm font-bold text-slate-500 uppercase">MAD</span></h3>
                            </div>
                            <div className={`${iconContainerClass} bg-blue-500/10 text-blue-400`}><TrendingUp size={24} /></div>
                        </div>
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-emerald-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Readiness Rate</p>
                                <h3 className="text-3xl font-black text-white text-emerald-400">{pdrReadiness}%</h3>
                            </div>
                            <div className={`${iconContainerClass} bg-emerald-500/10 text-emerald-400`}><CheckCircle size={24} /></div>
                        </div>
                    </div>
                );
            case 'scaffolding':
                const totalScaffCost = scaffoldingRecords.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
                const scaffReadiness = scaffoldingRecords.length > 0 ? (scaffoldingRecords.filter(r => r.readiness === 1).length / scaffoldingRecords.length * 100).toFixed(0) : 0;
                return (
                    <div className="flex flex-wrap gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-indigo-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Scaffolding Units</p>
                                <h3 className="text-3xl font-black text-white">{scaffoldingRecords.length}</h3>
                            </div>
                            <div className={`${iconContainerClass} bg-indigo-500/10 text-indigo-400`}><Tag size={24} /></div>
                        </div>
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-blue-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Scaffolding Cost</p>
                                <h3 className="text-3xl font-black text-white text-blue-400">{new Intl.NumberFormat('fr-FR').format(totalScaffCost)} <span className="text-sm font-bold text-slate-500">MAD</span></h3>
                            </div>
                            <div className={`${iconContainerClass} bg-blue-500/10 text-blue-400`}><Activity size={24} /></div>
                        </div>
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-emerald-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Readiness Rate</p>
                                <h3 className="text-3xl font-black text-white text-emerald-400">{scaffReadiness}%</h3>
                            </div>
                            <div className={`${iconContainerClass} bg-emerald-500/10 text-emerald-400`}><CheckCircle size={24} /></div>
                        </div>
                    </div>
                );
            case 'handling':
                const totalHandCost = handlingRecords.reduce((sum, r) => sum + (r.totalPrice || 0), 0);
                const totalHandHours = handlingRecords.reduce((sum, r) => sum + (r.hours || 0), 0);
                return (
                    <div className="flex flex-wrap gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-purple-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Operations</p>
                                <h3 className="text-3xl font-black text-white">{handlingRecords.length}</h3>
                            </div>
                            <div className={`${iconContainerClass} bg-purple-500/10 text-purple-400`}><ArrowUpDown size={24} /></div>
                        </div>
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-amber-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Hours</p>
                                <h3 className="text-3xl font-black text-white text-amber-400">{totalHandHours} <span className="text-sm font-bold text-slate-500">h</span></h3>
                            </div>
                            <div className={`${iconContainerClass} bg-amber-500/10 text-amber-400`}><Activity size={24} /></div>
                        </div>
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-emerald-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Budget</p>
                                <h3 className="text-3xl font-black text-white text-emerald-400">{new Intl.NumberFormat('fr-FR').format(totalHandCost)} <span className="text-sm font-bold text-slate-500 uppercase">MAD</span></h3>
                            </div>
                            <div className={`${iconContainerClass} bg-emerald-500/10 text-emerald-400`}><TrendingUp size={24} /></div>
                        </div>
                    </div>
                );
            case 'mapTasks':
                const mapCoverage = new Set(mapTasks.map(t => t.ZONE).filter(Boolean)).size;
                const mapCompanies = new Set(mapTasks.map(t => t.COMPANY).filter(Boolean)).size;
                return (
                    <div className="flex flex-wrap gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-emerald-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Mapped Targets</p>
                                <h3 className="text-3xl font-black text-white text-emerald-400">{mapTasks.length}</h3>
                            </div>
                            <div className={`${iconContainerClass} bg-emerald-500/10 text-emerald-400`}><MapPin size={24} /></div>
                        </div>
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-blue-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Zones Covered</p>
                                <h3 className="text-3xl font-black text-white text-blue-400">{mapCoverage}</h3>
                            </div>
                            <div className={`${iconContainerClass} bg-blue-500/10 text-blue-400`}><Database size={24} /></div>
                        </div>
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-purple-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Companies</p>
                                <h3 className="text-3xl font-black text-white text-purple-400">{mapCompanies}</h3>
                            </div>
                            <div className={`${iconContainerClass} bg-purple-500/10 text-purple-400`}><Briefcase size={24} /></div>
                        </div>
                    </div>
                );
            case 'permits':
                const permitReadiness = permitRecords.length > 0 ? (permitRecords.filter(r => r.readiness === 1).length / permitRecords.length * 100).toFixed(0) : 0;
                return (
                    <div className="flex flex-wrap gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-sky-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Permits</p>
                                <h3 className="text-3xl font-black text-white text-sky-400">{permitRecords.length}</h3>
                            </div>
                            <div className={`${iconContainerClass} bg-sky-500/10 text-sky-400`}><CheckCircle2 size={24} /></div>
                        </div>
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-emerald-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Validation Rate</p>
                                <h3 className="text-3xl font-black text-white text-emerald-400">{permitReadiness}%</h3>
                            </div>
                            <div className={`${iconContainerClass} bg-emerald-500/10 text-emerald-400`}><Activity size={24} /></div>
                        </div>
                    </div>
                );
            case 'simops':
                const uniqueSimopsOTs = new Set([...simopsRecords.map(s => s.OT), ...simopsRecords.map(s => s.simopsOT)].filter(Boolean)).size;
                return (
                    <div className="flex flex-wrap gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-orange-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Active SIMOPS</p>
                                <h3 className="text-3xl font-black text-white text-orange-400">{simopsRecords.length}</h3>
                            </div>
                            <div className={`${iconContainerClass} bg-orange-500/10 text-orange-400`}><RefreshCw size={24} /></div>
                        </div>
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-blue-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Involved Tasks</p>
                                <h3 className="text-3xl font-black text-white text-blue-400">{uniqueSimopsOTs}</h3>
                            </div>
                            <div className={`${iconContainerClass} bg-blue-500/10 text-blue-400`}><Database size={24} /></div>
                        </div>
                    </div>
                );
            case 'cost':
                const uniqueCostCompanies = new Set(costHubEntries.map(c => c.company).filter(Boolean)).size;
                const avgPrice = costHubEntries.length > 0 ? (costHubEntries.reduce((sum, c) => sum + (c.priceU || 0), 0) / costHubEntries.length) : 0;
                return (
                    <div className="flex flex-wrap gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-emerald-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Poste Rates</p>
                                <h3 className="text-3xl font-black text-white text-emerald-400">{costHubEntries.length}</h3>
                            </div>
                            <div className={`${iconContainerClass} bg-emerald-500/10 text-emerald-400`}><TrendingUp size={24} /></div>
                        </div>
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-blue-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Partner Companies</p>
                                <h3 className="text-3xl font-black text-white text-blue-400">{uniqueCostCompanies}</h3>
                            </div>
                            <div className={`${iconContainerClass} bg-blue-500/10 text-blue-400`}><Briefcase size={24} /></div>
                        </div>
                        <div className={cardClass}>
                            <div className={`${glowClass} bg-amber-500`}></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Avg Price Unit</p>
                                <h3 className="text-3xl font-black text-white text-amber-400">{avgPrice.toFixed(0)} <span className="text-sm font-bold text-slate-500 uppercase">MAD</span></h3>
                            </div>
                            <div className={`${iconContainerClass} bg-amber-500/10 text-amber-400`}><Activity size={24} /></div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col gap-8 w-full p-6 sm:p-10 bg-black min-h-screen">
            {/* Header Hub */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex items-center gap-5">
                    {/* Return Action */}
                    <button
                        onClick={onBack}
                        className="group flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all active:scale-95 shadow-lg group"
                        title="Retour au Tableau de Bord Expert"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 group-hover:-translate-x-0.5 transition-all" />
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <Database className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">Master Data Center</h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Gestion Centralisée des Données de Shutdown</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-wrap bg-slate-900/80 backdrop-blur-md p-1.5 rounded-[1.5rem] border border-white/5 gap-1 shadow-2xl">
                        {[
                            { id: 'tasks', label: 'Tasks Repository', icon: Database, color: 'white' },
                            { id: 'simops', label: 'SIMOPS', icon: RefreshCw, color: 'blue' },
                            { id: 'pdr', label: 'PDR Hub', icon: Package, color: 'amber' },
                            { id: 'cost', label: 'Cost Hub', icon: Briefcase, color: 'emerald' },
                            { id: 'scaffolding', label: 'Scaffolding', icon: Tag, color: 'indigo' },
                            { id: 'handling', label: 'Handling', icon: ArrowUpDown, color: 'purple' },
                            { id: 'permits', label: 'Permit Hub', icon: CheckCircle2, color: 'sky' },
                            { id: 'mapTasks', label: 'Task Maps', icon: MapPin, color: 'emerald' },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative overflow-hidden group ${isActive
                                        ? tab.id === 'tasks' ? 'bg-white text-black shadow-lg shadow-white/10' :
                                            tab.id === 'pdr' ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/40' :
                                                tab.id === 'simops' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' :
                                                    tab.id === 'cost' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' :
                                                        tab.id === 'scaffolding' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40' :
                                                            tab.id === 'handling' ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' :
                                                                tab.id === 'mapTasks' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40' :
                                                                    'bg-sky-600 text-white shadow-lg shadow-sky-900/40'
                                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                                        }`}
                                >
                                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'animate-pulse' : ''}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => {
                                if (activeTab === 'tasks') setIsAddTaskModalOpen(true);
                                else if (activeTab === 'simops') setIsAddSimopsModalOpen(true);
                                else if (activeTab === 'pdr') setIsAddPDRModalOpen(true);
                                else if (activeTab === 'cost') setIsAddCostModalOpen(true);
                                else if (activeTab === 'scaffolding') setIsAddScaffoldingModalOpen(true);
                                else if (activeTab === 'handling') setIsAddHandlingModalOpen(true);
                                else if (activeTab === 'permits') setIsAddPermitModalOpen(true);
                                else if (activeTab === 'mapTasks') setIsAddMapTaskModalOpen(true);
                            }}
                            className={`group flex items-center gap-3 font-black px-8 py-4.5 rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-[10px] ${activeTab === 'tasks' ? 'bg-blue-600 hover:bg-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.4)] text-white' :
                                activeTab === 'simops' ? 'bg-orange-600 hover:bg-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.4)] text-white' :
                                    activeTab === 'pdr' ? 'bg-amber-600 hover:bg-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)] text-white' :
                                        activeTab === 'cost' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)] text-white' :
                                            activeTab === 'scaffolding' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.4)] text-white' :
                                                activeTab === 'handling' ? 'bg-purple-600 hover:bg-purple-500 shadow-[0_0_30px_rgba(147,51,234,0.4)] text-white' :
                                                    'bg-sky-600 hover:bg-sky-500 shadow-[0_0_30px_rgba(14,165,233,0.4)] text-white'
                                }`}
                        >
                            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                            {activeTab === 'tasks' ? 'AJOUTER TÂCHE' :
                                activeTab === 'simops' ? 'ADD SIMOPS' :
                                    activeTab === 'pdr' ? 'ADD PDR' :
                                        activeTab === 'cost' ? 'ADD COST' :
                                            activeTab === 'scaffolding' ? 'ADD SCAFFOLDING' :
                                                activeTab === 'handling' ? 'ADD HANDLING' :
                                                    activeTab === 'mapTasks' ? 'ADD MAP TASK' :
                                                        'ADD PERMIT'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            {/* TAB-SPECIFIC DASHBOARD */}
            {renderTabDashboard()}

            {/* Enhanced Controls Bar */}
            <div className="bg-slate-900/20 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-6 flex flex-col xl:flex-row items-center gap-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-t border-white/10">
                {/* Precision Search */}
                <div className="relative group/search flex-1 max-w-2xl min-w-[300px]">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-emerald-500/10 rounded-2xl blur-xl group-focus-within/search:opacity-100 opacity-0 transition-opacity duration-500"></div>
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/search:text-white group-focus-within/search:scale-110 transition-all duration-300 z-10" />
                    <input
                        type="text"
                        placeholder={`Global Search in ${activeTab.toUpperCase()} repository...`}
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="relative w-full bg-slate-950/80 border border-white/5 rounded-2xl pl-14 pr-16 py-5 text-sm font-black text-white uppercase tracking-wider placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40 shadow-2xl transition-all hover:bg-slate-900 group-focus-within/search:pl-16 italic"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10 group-focus-within/search:hidden transition-all">
                        <span className="text-[8px] font-black text-slate-600 uppercase">CTRL</span>
                        <span className="text-[8px] font-black text-slate-600 uppercase">K</span>
                    </div>
                </div>

                {/* Domain-Specific Filters */}
                {activeTab === 'tasks' && (
                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Discipline Filter */}
                        <div className="relative group/select">
                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/60 z-10 group-focus-within/select:scale-110 transition-all" />
                            <select
                                value={filters.discipline}
                                onChange={(e) => setFilters({ ...filters, discipline: e.target.value })}
                                className="relative w-48 bg-slate-950/60 border border-white/5 rounded-2xl pl-12 pr-10 py-5 text-[10px] font-black text-slate-300 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/20 appearance-none transition-all cursor-pointer hover:bg-slate-900 shadow-xl"
                            >
                                {disciplines.map(d => <option key={d} value={d} className="bg-slate-950 text-slate-200 py-4 font-sans">{d === 'all' ? 'All Disciplines' : d}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none group-focus-within/select:rotate-180 transition-all" />
                        </div>

                        {/* Family Filter */}
                        <div className="relative group/select">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500/60 z-10 group-focus-within/select:scale-110 transition-all" />
                            <select
                                value={filters.family}
                                onChange={(e) => setFilters({ ...filters, family: e.target.value })}
                                className="relative w-48 bg-slate-950/60 border border-white/5 rounded-2xl pl-12 pr-10 py-5 text-[10px] font-black text-slate-300 uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none transition-all cursor-pointer hover:bg-slate-900 shadow-xl"
                            >
                                {families.map(f => <option key={f} value={f} className="bg-slate-950 text-slate-200 py-4 font-sans">{f === 'all' ? 'All Families' : f}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none group-focus-within/select:rotate-180 transition-all" />
                        </div>
                    </div>
                )}
            </div>

            {/* High UI Table Container */}
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-950/30 rounded-[3rem] border border-white/5 backdrop-blur-md shadow-2xl relative">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/20 via-transparent to-blue-500/5 pointer-events-none"></div>
                <div className="overflow-auto scroll-smooth custom-scrollbar relative pb-4 min-h-[400px]">
                    {((activeTab === 'tasks' && tasks.length === 0) ||
                        (activeTab === 'pdr' && pdrItems.length === 0) ||
                        (activeTab === 'simops' && simopsRecords.length === 0) ||
                        (activeTab === 'cost' && costHubEntries.length === 0) ||
                        (activeTab === 'scaffolding' && scaffoldingRecords.length === 0) ||
                        (activeTab === 'handling' && handlingRecords.length === 0) ||
                        (activeTab === 'permits' && permitRecords.length === 0) ||
                        (activeTab === 'mapTasks' && mapTasks.length === 0)) ? (
                        <div className="flex flex-col items-center justify-center py-40 px-10 text-center animate-in fade-in slide-in-from-bottom-10 duration-700">
                            <div className="w-24 h-24 rounded-[2.5rem] bg-slate-900/50 flex items-center justify-center mb-8 border border-white/5 shadow-[0_0_50px_rgba(30,41,59,0.5)] ring-1 ring-white/10 group">
                                <FileSpreadsheet className="w-10 h-10 text-slate-700 group-hover:text-blue-400 transition-colors duration-500" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-4">Base de données isolée</h3>
                            <p className="text-slate-500 text-sm max-w-sm mx-auto font-medium leading-relaxed uppercase tracking-[0.05em] opacity-70">
                                Aucune donnée n'a été synchronisée pour ce module. Veuillez vérifier vos paramètres d'importation.
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[2400px]">
                            <thead>
                                <tr className="bg-white/[0.02] border-b border-white/5">
                                    {activeTab === 'tasks' ? (
                                        <>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] sticky left-0 bg-black z-10 w-24">ID</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-white uppercase tracking-[0.3em] sticky left-24 bg-black z-10 w-80">Libellé de la Tâche</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Discipline</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">TAG Équipement</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Famille</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Type Maint.</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">OT / AVIS</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Durée</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Eff.</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Charge (H-H)</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">COMPANY</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">POSTE NUMBER</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Poste Description</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">QT</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">Additional Cost</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">THR</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">MO Required</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">MO Readiness</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ADRPT Required</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">ADRPT Readiness</th>
                                        </>
                                    ) : activeTab === 'pdr' ? (
                                        <>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">OT REF</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">SPARE PART</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Type</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">UNITE</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">QTY</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">PRICE U</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">TOTAL PRICE</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Readiness</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Due Date</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Statut</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Comment</th>
                                        </>
                                    ) : activeTab === 'simops' ? (
                                        <>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">OT Principal</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">OT SIMOPS (Co-activité)</th>
                                        </>
                                    ) : activeTab === 'cost' ? (
                                        <>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] w-64">Company</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] w-48">Cost Type</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] w-40">Poste Number</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Poste Description</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] w-56">Price U</th>
                                        </>
                                    ) : activeTab === 'scaffolding' ? (
                                        <>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">OT</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Company</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Scaffolding Readiness</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">poste Number</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Poste Description</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">QT</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">TOTAL PRICE</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Comment</th>
                                        </>
                                    ) : activeTab === 'handling' ? (
                                        <>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">OT</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Company</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Handling type</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Handling Readiness</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">poste Number</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Poste Description</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">hours</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Additional Cost</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">TOTAL PRICE</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Comment</th>
                                        </>
                                    ) : activeTab === 'permits' ? (
                                        <>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">OT</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Permit Type</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Readiness</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">OT</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Task Mapping</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Coordinates</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Discipline</th>
                                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Equipment</th>
                                        </>
                                    )}
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center bg-black border-b border-white/5 sticky right-0">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {activeTab === 'tasks' ? (
                                    paginatedTasks.map(task => (
                                        <tr key={task.id} className="group hover:bg-white/[0.04] transition-all border-b border-white/[0.02] last:border-0">
                                            <td className="px-8 py-6 sticky left-0 bg-black z-20 group-hover:bg-slate-900/50 transition-colors">
                                                <span className="text-[10px] font-black text-slate-500 tabular-nums bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">#{task.id}</span>
                                            </td>
                                            <td className="px-8 py-6 sticky left-24 bg-black z-20 group-hover:bg-slate-900/50 transition-colors">
                                                <div className="flex flex-col gap-1 max-w-sm">
                                                    <span className="text-xs font-black text-white hover:text-blue-400 transition-colors uppercase tracking-tight line-clamp-1">{task['GLOBAL TASKS']}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-400 uppercase tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                                                    {task.DISCIPLINE}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-[10px] font-black uppercase tracking-tighter opacity-80">{task['Nom Equipement']}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-[10px] font-bold uppercase">{task.FAMILLE}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/5">{task['Type de Maintenance']}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-[10px] text-slate-500 italic opacity-40 uppercase">OT {task.OT}</td>
                                            <td className="px-4 py-4 text-sm font-black text-white tabular-nums drop-shadow-sm">{task.DUREE}h</td>
                                            <td className="px-4 py-4 text-sm font-black text-slate-400 tabular-nums">{task.EFFECTIF}p</td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-black text-emerald-400 tabular-nums drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">{task['Heures-Homme']}h</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-[10px] font-black uppercase">{task.COMPANY || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-[10px] font-mono">#{task['POSTE NUMBER'] || '-'}</td>
                                            <td className="px-6 py-4 text-slate-400 text-[10px] font-medium uppercase italic max-w-xs truncate">{task['Poste Description'] || '-'}</td>
                                            <td className="px-4 py-4 text-sm font-black text-white tabular-nums">{task.QT || 0}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-black text-amber-500 tabular-nums">{new Intl.NumberFormat('fr-FR').format(task['Additional Cost'] || 0)} MAD</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {task.THR === 1 ? (
                                                    <span className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-500 text-[9px] font-black uppercase border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.35)] animate-pulse tracking-widest ring-1 ring-red-500/20">CRITICAL</span>
                                                ) : <span className="text-slate-800 text-[10px] font-black uppercase tracking-[0.25em] opacity-40">Standard</span>}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-lg transition-all ${task['MO Required'] === 1 ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400' : 'bg-slate-800/20 border-white/5 text-slate-700'}`}>
                                                    <span className="text-xs font-black">{task['MO Required'] === 1 ? 'YES' : 'NO'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-lg transition-all ${task['MO Required'] === 1 ? (task['MO Readiness'] === 1 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-amber-500/20 border-amber-500/40 text-amber-400') : 'bg-slate-800/20 border-white/5 text-slate-700'}`}>
                                                    <span className="text-xs font-black">{task['MO Required'] === 1 ? (task['MO Readiness'] === 1 ? 'R' : 'P') : '-'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-lg transition-all ${task['ADRPT Required'] === 1 ? 'bg-purple-500/10 border-purple-500/40 text-purple-400' : 'bg-slate-800/20 border-white/5 text-slate-700'}`}>
                                                    <span className="text-xs font-black">{task['ADRPT Required'] === 1 ? 'YES' : 'NO'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-lg transition-all ${task['ADRPT Required'] === 1 ? (task['ADRPT Readiness'] === 1 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-amber-500/20 border-amber-500/40 text-amber-400') : 'bg-slate-800/20 border-white/5 text-slate-700'}`}>
                                                    <span className="text-xs font-black">{task['ADRPT Required'] === 1 ? (task['ADRPT Readiness'] === 1 ? 'R' : 'P') : '-'}</span>
                                                </div>
                                            </td>

                                            <td className="px-8 py-6 sticky right-0 bg-black z-20 group-hover:bg-slate-900/50 transition-colors">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button onClick={() => setEditingTask(task)} title="Modifier" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 hover:scale-110 active:scale-90 transition-all border border-white/5"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDuplicateTask(task)} title="Dupliquer" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/20 hover:scale-110 active:scale-90 transition-all border border-white/5"><Copy size={16} /></button>
                                                    <button onClick={() => handleDeleteTask(task)} title="Supprimer" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-red-400 hover:bg-red-500/20 hover:scale-110 active:scale-90 transition-all border border-white/5"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : activeTab === 'pdr' ? (
                                    paginatedPDR.map((pdr, idx) => (
                                        <tr key={idx} className="group hover:bg-white/[0.04] active:bg-white/[0.06] transition-all border-b border-white/[0.02] last:border-0">
                                            <td className="px-8 py-6 text-slate-500 text-[10px] font-black uppercase tracking-widest italic opacity-60">OT {String(pdr.OT || '')}</td>
                                            <td className="px-8 py-6">
                                                <div className="text-white text-[11px] font-black uppercase font-mono group-hover:text-amber-500 transition-colors duration-300 line-clamp-1 truncate max-w-md drop-shadow-md">{pdr.sparePart}</div>
                                            </td>
                                            <td className="px-8 py-6 text-slate-400 text-[10px] font-black uppercase italic tracking-tighter">{pdr.type || '-'}</td>
                                            <td className="px-8 py-6 text-slate-400 text-[10px] font-black uppercase tracking-tighter italic">{pdr.unite}</td>
                                            <td className="px-8 py-6 text-white text-sm font-black tabular-nums">{pdr.qty}</td>
                                            <td className="px-8 py-6 text-emerald-400 text-[11px] font-black tabular-nums tracking-tighter">{new Intl.NumberFormat('fr-FR').format(pdr.priceU || 0)} MAD</td>
                                            <td className="px-8 py-6 text-blue-400 text-[11px] font-black tabular-nums tracking-tighter">{new Intl.NumberFormat('fr-FR').format(pdr.totalPrice || 0)} MAD</td>
                                            <td className="px-8 py-6">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xl transition-all transform hover:scale-110 active:scale-95 cursor-help ${pdr.readiness === 1 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10' : 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-amber-500/10'}`}>
                                                    <span className="text-xs font-black">{pdr.readiness === 1 ? 'R' : 'P'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-slate-400 text-[10px] font-black uppercase tracking-tighter">
                                                {(pdr.dueDate as any) instanceof Date
                                                    ? (pdr.dueDate as any).toLocaleDateString('fr-FR')
                                                    : (typeof pdr.dueDate === 'object' && pdr.dueDate !== null ? JSON.stringify(pdr.dueDate) : (pdr.dueDate || '-'))}
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase border transition-all shadow-lg ${pdr.status === 'Inventory Assets' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5' : pdr.status === 'Active Tenders' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5' : 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-amber-500/5'}`}>
                                                    {pdr.status || 'Awaiting'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-slate-500 text-[10px] truncate max-w-[150px] italic font-medium">{pdr.comment || '-'}</td>
                                            <td className="px-8 py-6 sticky right-0 bg-black z-20 group-hover:bg-slate-900/50 transition-colors">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button onClick={() => setEditingPDR(pdr)} title="Modifier" className="w-10 h-10 flex items-center justify-center bg-slate-800/50 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 hover:scale-110 active:scale-90 transition-all border border-white/5"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeletePDR(pdr)} title="Supprimer" className="w-10 h-10 flex items-center justify-center bg-slate-800/50 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/20 hover:scale-110 active:scale-90 transition-all border border-white/5"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : activeTab === 'simops' ? (
                                    paginatedSimops.map((s, idx) => (
                                        <tr key={idx} className="group hover:bg-white/[0.04] active:bg-white/[0.06] transition-all border-b border-white/[0.02] last:border-0">
                                            <td className="px-8 py-6 text-emerald-400 text-xs font-black tabular-nums tracking-widest drop-shadow-[0_0_10px_rgba(52,211,153,0.2)]">OT {s.OT}</td>
                                            <td className="px-8 py-6 text-blue-400 text-xs font-black tabular-nums tracking-widest drop-shadow-[0_0_10px_rgba(59,130,246,0.2)]">OT {s.simopsOT}</td>
                                            <td className="px-8 py-6 sticky right-0 bg-black z-20 group-hover:bg-slate-900/50 transition-colors">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button onClick={() => setEditingSimops(s)} title="Modifier" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 hover:scale-110 active:scale-90 transition-all border border-white/5"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeleteSimops(s)} title="Supprimer" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-red-400 hover:bg-red-500/20 hover:scale-110 active:scale-90 transition-all border border-white/5"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : activeTab === 'cost' ? (
                                    paginatedCost.map((c, idx) => (
                                        <tr key={idx} className="group hover:bg-white/[0.04] active:bg-white/[0.06] transition-all border-b border-white/[0.02] last:border-0">
                                            <td className="px-8 py-6 text-white text-[11px] font-black uppercase tracking-tight group-hover:text-emerald-400 transition-colors drop-shadow-sm">{c.company}</td>
                                            <td className="px-8 py-6">
                                                <span className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest shadow-inner">{c.costType}</span>
                                            </td>
                                            <td className="px-8 py-6 text-slate-500 text-[10px] font-mono tracking-tighter">#{c.posteNumber}</td>
                                            <td className="px-8 py-6">
                                                <div className="text-slate-400 text-[10px] font-medium uppercase italic max-w-sm line-clamp-1 opacity-80">{c.posteDescription}</div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-emerald-400 text-sm font-black tabular-nums tracking-tighter drop-shadow-[0_0_10px_rgba(16,185,129,0.2)]">{new Intl.NumberFormat('fr-FR').format(c.priceU)} MAD</span>
                                                    <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest mt-1">HORS TAXES</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 sticky right-0 bg-black z-20 group-hover:bg-slate-900/50 transition-colors">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button onClick={() => setEditingCost(c)} title="Modifier" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 hover:scale-110 active:scale-90 transition-all border border-white/5"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeleteCost(c)} title="Supprimer" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-red-400 hover:bg-red-500/20 hover:scale-110 active:scale-90 transition-all border border-white/5"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : activeTab === 'scaffolding' ? (
                                    paginatedScaffolding.map((sr, idx) => (
                                        <tr key={idx} className="group hover:bg-white/[0.04] active:bg-white/[0.06] transition-all border-b border-white/[0.02] last:border-0">
                                            <td className="px-8 py-6 text-indigo-400 text-xs font-black tabular-nums tracking-wider uppercase drop-shadow-[0_0_10px_rgba(99,102,241,0.2)]">OT {sr.OT}</td>
                                            <td className="px-8 py-6 text-slate-400 text-[10px] font-black uppercase tracking-tight opacity-80">{sr.company}</td>
                                            <td className="px-8 py-6">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xl transition-all transform hover:scale-110 active:scale-95 cursor-help ${sr.readiness === 1 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10' : 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-amber-500/10'}`}>
                                                    <span className="text-xs font-black">{sr.readiness === 1 ? 'R' : 'P'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-slate-600 text-[10px] font-mono italic">#{sr.posteNumber}</td>
                                            <td className="px-8 py-6">
                                                <div className="text-slate-400 text-[10px] font-medium uppercase italic max-w-sm line-clamp-1 opacity-80">{sr.posteDescription || '-'}</div>
                                            </td>
                                            <td className="px-8 py-6 text-white text-xs font-black tabular-nums">{sr.QT}</td>
                                            <td className="px-8 py-6 text-emerald-400 text-[11px] font-black">{sr.totalPrice ? `${new Intl.NumberFormat('fr-FR').format(sr.totalPrice)} MAD` : '-'}</td>
                                            <td className="px-8 py-6 text-slate-500 text-[10px] truncate max-w-[150px] italic">{sr.comment || '-'}</td>
                                            <td className="px-8 py-6 sticky right-0 bg-black z-20 group-hover:bg-slate-900/50 transition-colors">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button onClick={() => setEditingScaffolding(sr)} title="Modifier" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 hover:scale-110 active:scale-90 transition-all border border-white/5"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeleteScaffolding(sr)} title="Supprimer" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-red-400 hover:bg-red-500/20 hover:scale-110 active:scale-90 transition-all border border-white/5"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : activeTab === 'handling' ? (
                                    paginatedHandling.map((hr, idx) => (
                                        <tr key={idx} className="group hover:bg-white/[0.04] active:bg-white/[0.06] transition-all border-b border-white/[0.02] last:border-0">
                                            <td className="px-8 py-6">
                                                <span className="text-[11px] font-black text-purple-400 uppercase tracking-tighter">OT {hr.OT}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{hr.company}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-[10px] font-black text-white uppercase italic">{hr.handlingType}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${hr.readiness ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${hr.readiness ? 'bg-emerald-500' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">{hr.readiness ? 'PRÊT (R)' : 'PLANIFIÉ (P)'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-[10px] font-black text-slate-300 font-mono tracking-widest">{hr.posteNumber}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-[10px] font-bold text-white uppercase tracking-tight truncate max-w-[150px] block">{hr.posteDescription || '-'}</span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="text-[11px] font-black text-white uppercase">{hr.hours} H</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-[11px] font-black text-slate-400">{hr.additionalCost || 0} MAD</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-[11px] font-black text-emerald-400">
                                                    {hr.totalPrice ? hr.totalPrice.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' }) : '0,00 MAD'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-[11px] font-medium text-slate-500 italic max-w-xs block truncate">{hr.comment || '-'}</span>
                                            </td>
                                            <td className="px-8 py-6 sticky right-0 bg-black z-20 group-hover:bg-slate-900/50 transition-colors">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button onClick={() => setEditingHandling(hr)} title="Modifier" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 hover:scale-110 active:scale-90 transition-all border border-white/5"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeleteHandling(hr)} title="Supprimer" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-red-400 hover:bg-red-500/20 hover:scale-110 active:scale-90 transition-all border border-white/5"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : activeTab === 'permits' ? (
                                    paginatedPermits.map((pr, idx) => (
                                        <tr key={idx} className="group hover:bg-white/[0.04] active:bg-white/[0.06] transition-all border-b border-white/[0.02] last:border-0">
                                            <td className="px-8 py-6 text-sky-400 text-xs font-black tabular-nums tracking-wider uppercase drop-shadow-[0_0_10px_rgba(14,165,233,0.2)]">OT {pr.OT}</td>
                                            <td className="px-8 py-6 text-white text-[11px] font-black uppercase tracking-tighter drop-shadow-sm truncate max-w-lg">{pr.permitName}</td>
                                            <td className="px-8 py-6">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xl transition-all transform hover:scale-110 active:scale-95 cursor-help ${pr.readiness === 1 ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10' : 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-amber-500/10'}`}>
                                                    <span className="text-xs font-black">{pr.readiness === 1 ? 'R' : 'P'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 sticky right-0 bg-black z-20 group-hover:bg-slate-900/50 transition-colors">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button onClick={() => setEditingPermit(pr)} title="Modifier" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 hover:scale-110 active:scale-90 transition-all border border-white/5"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeletePermit(pr)} title="Supprimer" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-red-400 hover:bg-red-500/20 hover:scale-110 active:scale-90 transition-all border border-white/5"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    paginatedMapTasks.map((task) => (
                                        <tr key={task.id} className="group hover:bg-white/[0.04] active:bg-white/[0.06] transition-all border-b border-white/[0.02] last:border-0">
                                            <td className="px-8 py-6 text-emerald-400 text-xs font-black tabular-nums tracking-wider uppercase">OT {task.OT}</td>
                                            <td className="px-8 py-6 text-white text-[11px] font-black uppercase tracking-tighter">{task['GLOBAL TASKS']}</td>
                                            <td className="px-8 py-6 text-slate-400 text-[10px] font-mono">{task.Latitude}, {task.Longitude}</td>
                                            <td className="px-8 py-6 text-blue-400 text-[10px] font-black uppercase">{task.DISCIPLINE}</td>
                                            <td className="px-8 py-6 text-slate-400 text-[10px] font-black uppercase">{task['Nom Equipement']}</td>
                                            <td className="px-8 py-6 sticky right-0 bg-black z-20 group-hover:bg-slate-900/50 transition-colors">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button onClick={() => { setEditingMapTask(task); setIsAddMapTaskModalOpen(true); }} title="Modifier" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 hover:scale-110 active:scale-90 transition-all border border-white/5"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeleteMapTask(task)} title="Supprimer" className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 hover:text-red-400 hover:bg-red-500/20 hover:scale-110 active:scale-90 transition-all border border-white/5"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Controls */}
                {currentTabTotal > PAGE_SIZE && (
                    <div className="mt-8 px-10 py-6 bg-slate-900/30 border border-white/5 rounded-[2.5rem] flex items-center justify-between backdrop-blur-xl">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-4">
                            <span className="bg-white/5 px-4 py-2 rounded-xl border border-white/5 shadow-inner">Page <span className="text-white">{currentPage}</span> / {totalPages}</span>
                            <span className="opacity-40 italic">Affichage de <span className="text-slate-300">{(currentPage - 1) * PAGE_SIZE + 1}</span> à <span className="text-slate-300">{Math.min(currentPage * PAGE_SIZE, currentTabTotal)}</span> sur <span className="text-slate-300">{currentTabTotal}</span> entrées</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === 1 ? 'text-slate-700 cursor-not-allowed opacity-50' : 'text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 border border-white/5'}`}
                            >
                                <ChevronLeft size={14} className="mr-1" />
                                Précédent
                            </button>

                            <div className="flex items-center gap-2">
                                {[...Array(totalPages)].map((_, i) => {
                                    const pageNum = i + 1;
                                    // Only show current, first, last, and neighbors
                                    if (pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1) {
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-500/50' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-white/5'}`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    } else if (pageNum === 2 || pageNum === totalPages - 1) {
                                        return <span key={pageNum} className="text-slate-700">...</span>;
                                    }
                                    return null;
                                }).filter(Boolean).filter((val, i, arr) => {
                                    // Remove consecutive dots
                                    if (val?.type === 'span' && arr[i - 1]?.type === 'span') return false;
                                    return true;
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === totalPages ? 'text-slate-700 cursor-not-allowed opacity-50' : 'text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 border border-white/5 group'}`}
                            >
                                Suivant
                                <ChevronLeft size={14} className="ml-1 rotate-180 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AddTaskModal
                isOpen={isAddTaskModalOpen}
                onClose={() => setIsAddTaskModalOpen(false)}
                onSave={handleAddTask}
                allTasks={tasks}
                costHubEntries={costHubEntries}
            />

            <MapTaskModal
                isOpen={isAddMapTaskModalOpen}
                editingTask={editingMapTask}
                allTasks={tasks}
                onClose={() => {
                    setIsAddMapTaskModalOpen(false);
                    setEditingMapTask(null);
                }}
                onSave={handleSaveMapTask}
            />

            {
                editingTask && (
                    <EditTaskModal
                        isOpen={!!editingTask}
                        onClose={() => setEditingTask(null)}
                        task={editingTask}
                        onSave={handleSaveTaskEdit}
                        allTasks={tasks}
                        costHubEntries={costHubEntries}
                    />
                )
            }

            {/* PDR Comment Modal */}
            {
                viewingComment && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
                        <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-500">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-black text-white uppercase tracking-wider">Commentaire PDR</h3>
                                <button onClick={() => setViewingComment(null)} className="text-slate-500 hover:text-white"><Plus className="w-6 h-6 rotate-45" /></button>
                            </div>
                            <textarea
                                className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 mb-6 min-h-[200px] resize-none font-medium italic"
                                value={viewingComment.comment}
                                onChange={(e) => setViewingComment({ ...viewingComment, comment: e.target.value })}
                            />
                            <div className="flex justify-end gap-4">
                                <button onClick={() => setViewingComment(null)} className="px-6 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all">Annuler</button>
                                <button
                                    onClick={() => handleSaveComment(viewingComment.id, viewingComment.comment)}
                                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-900/40"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* PDR Edit Modal */}
            {
                editingPDR && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
                        <div className="bg-slate-950 border border-white/5 rounded-[3rem] w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 overflow-hidden">
                            <div className="p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Edit Spare Part</h2>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Configuration Directe de l'Item Hub</p>
                                    </div>
                                </div>
                                <button onClick={() => setEditingPDR(null)} className="text-slate-500 hover:text-white group transition-all">
                                    <Plus className="w-8 h-8 rotate-45 group-hover:scale-110" />
                                </button>
                            </div>

                            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-black/20">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">OT REF</label>
                                        <input
                                            type="text"
                                            value={editingPDR.OT || ''}
                                            onChange={e => setEditingPDR({ ...editingPDR, OT: e.target.value })}
                                            className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-mono italic opacity-60"
                                        />
                                    </div>
                                    <div className="col-span-1 space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">SPARE PART NAME</label>
                                        <input
                                            type="text"
                                            value={editingPDR.sparePart}
                                            onChange={e => setEditingPDR({ ...editingPDR, sparePart: e.target.value })}
                                            className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-bold"
                                        />
                                    </div>
                                    <div className="col-span-1 space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Type</label>
                                        <input
                                            type="text"
                                            list="pdr-types"
                                            value={editingPDR.type || ''}
                                            onChange={e => setEditingPDR({ ...editingPDR, type: e.target.value })}
                                            className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none"
                                            placeholder="Ex: Consomable, PDR..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantité (QTY)</label>
                                        <input
                                            type="number"
                                            value={editingPDR.qty}
                                            onChange={e => {
                                                const qty = parseFloat(e.target.value) || 0;
                                                setEditingPDR({ ...editingPDR, qty, totalPrice: qty * (editingPDR.priceU || 0) });
                                            }}
                                            className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Unité</label>
                                        <input
                                            type="text"
                                            list="pdr-unites"
                                            value={editingPDR.unite}
                                            onChange={e => setEditingPDR({ ...editingPDR, unite: e.target.value })}
                                            className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none"
                                            placeholder="Ex: PSC, LTR..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prix Unitaire (PRICE U)</label>
                                        <input
                                            type="number"
                                            value={editingPDR.priceU}
                                            onChange={e => {
                                                const priceU = parseFloat(e.target.value) || 0;
                                                setEditingPDR({ ...editingPDR, priceU, totalPrice: (editingPDR.qty || 0) * priceU });
                                            }}
                                            className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none font-mono text-emerald-400"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Total Price (Calculé)</label>
                                        <div className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-blue-400 text-sm font-black tabular-nums shadow-inner">
                                            {new Intl.NumberFormat('fr-FR').format(editingPDR.totalPrice || 0)} MAD
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Readiness</label>
                                        <select
                                            value={editingPDR.readiness}
                                            onChange={e => setEditingPDR({ ...editingPDR, readiness: parseInt(e.target.value) })}
                                            className={`w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-[10px] font-black uppercase tracking-widest focus:outline-none cursor-pointer ${editingPDR.readiness === 1 ? 'text-emerald-400' : 'text-amber-500'}`}
                                        >
                                            <option value="0">MANQUANT</option>
                                            <option value="1">PRÊT</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 ml-1">Due Date</label>
                                        <input
                                            type="text"
                                            value={(editingPDR.dueDate as any) instanceof Date ? (editingPDR.dueDate as any).toLocaleDateString('fr-FR') : (editingPDR.dueDate || '')}
                                            onChange={e => setEditingPDR({ ...editingPDR, dueDate: e.target.value })}
                                            className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none"
                                            placeholder="Ex: 12-mai-26"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-blue-400">Statut Procurement</label>
                                        <select
                                            value={editingPDR.status}
                                            onChange={e => setEditingPDR({ ...editingPDR, status: e.target.value as any })}
                                            className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white text-xs font-black uppercase tracking-widest focus:outline-none cursor-pointer"
                                        >
                                            <option value="Awaiting Process">Awaiting Process</option>
                                            <option value="Active Tenders">Active Tenders</option>
                                            <option value="Inventory Assets">Inventory Assets</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Commentaire</label>
                                    <textarea
                                        value={editingPDR.comment}
                                        onChange={e => setEditingPDR({ ...editingPDR, comment: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none min-h-[120px] resize-none italic font-medium"
                                    />
                                </div>
                            </div>

                            <div className="p-8 border-t border-white/5 bg-slate-900/30 flex justify-end gap-4">
                                <button
                                    onClick={() => setEditingPDR(null)}
                                    className="px-8 py-4 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-white transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={() => handleUpdatePDRItem(editingPDR)}
                                    className="px-10 py-4 bg-amber-500 hover:bg-amber-400 text-white font-black rounded-2xl transition-all shadow-xl shadow-amber-950/40 uppercase tracking-[0.2em] text-xs active:scale-95"
                                >
                                    Appliquer les Modifications
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* SIMOPS Edit Modal */}
            {
                editingSimops && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 md:p-6 animate-in fade-in duration-300">
                        <div className="bg-slate-950 border border-white/5 rounded-[2rem] md:rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center flex-shrink-0">
                                <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Edit SIMOPS</h2>
                                <button onClick={() => setEditingSimops(null)} className="text-slate-500 hover:text-white transition-all"><Plus className="w-8 h-8 rotate-45" /></button>
                            </div>
                            <div className="p-6 md:p-8 space-y-6 bg-black/20 overflow-y-auto custom-scrollbar flex-1">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">OT Principal</label>
                                    <input type="text" value={editingSimops.OT} onChange={e => setEditingSimops({ ...editingSimops, OT: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-blue-400">OT SIMOPS (Co-activité)</label>
                                    <input type="text" value={editingSimops.simopsOT} onChange={e => setEditingSimops({ ...editingSimops, simopsOT: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                            </div>
                            <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/30 flex justify-end gap-4 flex-shrink-0">
                                <button onClick={() => setEditingSimops(null)} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase transition-colors hover:text-white">Annuler</button>
                                <button onClick={() => {
                                    const original = simopsRecords.find(s => s === editingSimops) || editingSimops;
                                    handleUpdateSimops(original, editingSimops);
                                }} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all shadow-xl shadow-blue-900/40">Appliquer</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Cost Hub Edit Modal */}
            {
                editingCost && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 md:p-6 animate-in fade-in duration-300">
                        <div className="bg-slate-950 border border-white/5 rounded-[2rem] md:rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center flex-shrink-0">
                                <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Edit Cost Entry</h2>
                                <button onClick={() => setEditingCost(null)} className="text-slate-500 hover:text-white transition-all"><Plus className="w-8 h-8 rotate-45" /></button>
                            </div>
                            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Company</label>
                                        <input type="text" value={editingCost.company} onChange={e => setEditingCost({ ...editingCost, company: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Poste Number</label>
                                        <input type="text" value={editingCost.posteNumber} onChange={e => setEditingCost({ ...editingCost, posteNumber: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Description</label>
                                        <input type="text" value={editingCost.posteDescription} onChange={e => setEditingCost({ ...editingCost, posteDescription: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1">Price U (MAD)</label>
                                        <input type="number" value={editingCost.priceU} onChange={e => setEditingCost({ ...editingCost, priceU: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-2 focus:ring-emerald-500/20" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cost Type</label>
                                        <input type="text" value={editingCost.costType} onChange={e => setEditingCost({ ...editingCost, costType: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/30 flex justify-end gap-4 flex-shrink-0">
                                <button onClick={() => setEditingCost(null)} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase transition-colors hover:text-white">Annuler</button>
                                <button onClick={() => handleUpdateCost(costHubEntries.find(c => c.posteNumber === editingCost.posteNumber) || editingCost, editingCost)} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-emerald-900/40 active:scale-95 transition-all">Appliquer</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Scaffolding Edit Modal */}
            {
                editingScaffolding && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 md:p-6 animate-in fade-in duration-300">
                        <div className="bg-slate-950 border border-white/5 rounded-[2rem] md:rounded-[3rem] w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden">
                            <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center flex-shrink-0">
                                <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Edit Scaffolding</h2>
                                <button onClick={() => setEditingScaffolding(null)} className="text-slate-500 hover:text-white transition-all"><Plus className="w-8 h-8 rotate-45" /></button>
                            </div>
                            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">OT</label>
                                        <input type="text" value={editingScaffolding.OT} onChange={e => setEditingScaffolding({ ...editingScaffolding, OT: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Company</label>
                                        <input
                                            type="text"
                                            list="edit-scaffolding-companies"
                                            value={editingScaffolding.company}
                                            onChange={e => {
                                                const company = e.target.value;
                                                const match = costHubEntries.find(c => c.company.toUpperCase() === company.toUpperCase() && String(c.posteNumber) === String(editingScaffolding.posteNumber));
                                                setEditingScaffolding({ ...editingScaffolding, company, posteDescription: match ? match.posteDescription : editingScaffolding.posteDescription });
                                            }}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-2 focus:ring-indigo-500/20"
                                            placeholder="Sélectionner ou saisir..."
                                        />
                                        <datalist id="edit-scaffolding-companies">
                                            {[...new Set(costHubEntries.map(c => c.company))].sort().map(co => (
                                                <option key={co} value={co} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Poste Number</label>
                                        <input
                                            type="text"
                                            value={editingScaffolding.posteNumber}
                                            onChange={e => {
                                                const posteNumber = e.target.value;
                                                if (!posteNumber) {
                                                    setEditingScaffolding({ ...editingScaffolding, posteNumber: '', posteDescription: '' });
                                                } else {
                                                    const match = costHubEntries.find(c => c.company.toUpperCase() === (editingScaffolding.company || '').toUpperCase() && String(c.posteNumber) === posteNumber);
                                                    setEditingScaffolding({ ...editingScaffolding, posteNumber, posteDescription: match ? match.posteDescription : editingScaffolding.posteDescription });
                                                }
                                            }}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-2 focus:ring-indigo-500/20"
                                            placeholder="Ex: 12345..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantité (QT)</label>
                                        <input
                                            type="number"
                                            value={editingScaffolding.QT}
                                            onChange={e => {
                                                const QT = parseFloat(e.target.value) || 0;
                                                const match = costHubEntries.find(c => c.company.toUpperCase() === (editingScaffolding.company || '').toUpperCase() && String(c.posteNumber) === String(editingScaffolding.posteNumber));
                                                setEditingScaffolding({
                                                    ...editingScaffolding,
                                                    QT,
                                                    totalPrice: match ? QT * (match.priceU || 0) : editingScaffolding.totalPrice
                                                });
                                            }}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-2 focus:ring-amber-500/20"
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <span>Poste Description</span>
                                            <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-black">AUTO</span>
                                        </label>
                                        <div className="w-full bg-slate-900/30 border border-blue-500/10 rounded-2xl px-5 py-4 text-blue-400 text-sm font-bold min-h-[56px] leading-relaxed">
                                            {editingScaffolding.posteDescription || <span className="text-slate-600 italic font-normal">Entrez Company + Poste Number pour auto-remplir...</span>}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">TOTAL PRICE</label>
                                        <input type="number" value={editingScaffolding.totalPrice} onChange={e => setEditingScaffolding({ ...editingScaffolding, totalPrice: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-emerald-400 text-sm font-black" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Readiness</label>
                                        <select value={editingScaffolding.readiness} onChange={e => setEditingScaffolding({ ...editingScaffolding, readiness: parseInt(e.target.value) })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase text-amber-500 tracking-widest focus:outline-none cursor-pointer">
                                            <option value="0">PLANIFIÉ (P)</option>
                                            <option value="1">PRÊT (R)</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Comment</label>
                                        <textarea value={editingScaffolding.comment} onChange={e => setEditingScaffolding({ ...editingScaffolding, comment: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-slate-400 text-sm italic min-h-[80px]" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/30 flex justify-end gap-4 flex-shrink-0">
                                <button onClick={() => setEditingScaffolding(null)} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase transition-colors hover:text-white">Annuler</button>
                                <button onClick={() => handleUpdateScaffolding(scaffoldingRecords.find(sr => sr.OT === editingScaffolding.OT && sr.posteNumber === editingScaffolding.posteNumber) || editingScaffolding, editingScaffolding)} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all shadow-xl shadow-indigo-900/40">Sauvegarder</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Handling Edit Modal */}
            {
                editingHandling && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 md:p-6 animate-in fade-in duration-300">
                        <div className="bg-slate-950 border border-white/5 rounded-[2rem] md:rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center flex-shrink-0">
                                <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Edit Handling</h2>
                                <button onClick={() => setEditingHandling(null)} className="text-slate-500 hover:text-white transition-all"><Plus className="w-8 h-8 rotate-45" /></button>
                            </div>
                            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">OT</label>
                                        <input type="text" value={editingHandling.OT} onChange={e => setEditingHandling({ ...editingHandling, OT: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Company</label>
                                        <input
                                            type="text"
                                            list="edit-handling-companies"
                                            value={editingHandling.company}
                                            onChange={e => {
                                                const company = e.target.value;
                                                const match = costHubEntries.find(c => c.company.toUpperCase() === company.toUpperCase() && String(c.posteNumber) === String(editingHandling.posteNumber));
                                                setEditingHandling({ ...editingHandling, company, posteDescription: match ? match.posteDescription : editingHandling.posteDescription });
                                            }}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-2 focus:ring-purple-500/20"
                                            placeholder="Sélectionner ou saisir..."
                                        />
                                        <datalist id="edit-handling-companies">
                                            {[...new Set(costHubEntries.map(c => c.company))].sort().map(co => (
                                                <option key={co} value={co} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Handling Type</label>
                                        <input type="text" value={editingHandling.handlingType} onChange={e => setEditingHandling({ ...editingHandling, handlingType: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Poste Number</label>
                                        <input
                                            type="text"
                                            value={editingHandling.posteNumber}
                                            onChange={e => {
                                                const posteNumber = e.target.value;
                                                if (!posteNumber) {
                                                    setEditingHandling({ ...editingHandling, posteNumber: '', posteDescription: '' });
                                                } else {
                                                    const match = costHubEntries.find(c => c.company.toUpperCase() === (editingHandling.company || '').toUpperCase() && String(c.posteNumber) === posteNumber);
                                                    setEditingHandling({ ...editingHandling, posteNumber, posteDescription: match ? match.posteDescription : editingHandling.posteDescription });
                                                }
                                            }}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-2 focus:ring-purple-500/20"
                                            placeholder="Ex: 12345..."
                                        />
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                            <span>Poste Description</span>
                                            <span className="text-[8px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-black">AUTO</span>
                                        </label>
                                        <div className="w-full bg-slate-900/30 border border-purple-500/10 rounded-2xl px-5 py-4 text-purple-300 text-sm font-bold min-h-[56px] leading-relaxed">
                                            {editingHandling.posteDescription || <span className="text-slate-600 italic font-normal">Entrez Company + Poste Number pour auto-remplir...</span>}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hours</label>
                                        <input
                                            type="number"
                                            value={editingHandling.hours}
                                            onChange={e => {
                                                const hours = parseFloat(e.target.value) || 0;
                                                const match = costHubEntries.find(c => c.company.toUpperCase() === (editingHandling.company || '').toUpperCase() && String(c.posteNumber) === String(editingHandling.posteNumber));
                                                setEditingHandling({
                                                    ...editingHandling,
                                                    hours,
                                                    totalPrice: (match ? hours * (match.priceU || 0) : (editingHandling.totalPrice || 0) - (editingHandling.additionalCost || 0)) + (editingHandling.additionalCost || 0)
                                                });
                                            }}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Additional Cost</label>
                                        <input
                                            type="number"
                                            value={editingHandling.additionalCost}
                                            onChange={e => {
                                                const additionalCost = parseFloat(e.target.value) || 0;
                                                const match = costHubEntries.find(c => c.company.toUpperCase() === (editingHandling.company || '').toUpperCase() && String(c.posteNumber) === String(editingHandling.posteNumber));
                                                setEditingHandling({
                                                    ...editingHandling,
                                                    additionalCost,
                                                    totalPrice: (match ? (editingHandling.hours || 0) * (match.priceU || 0) : (editingHandling.totalPrice || 0) - (editingHandling.additionalCost || 0)) + additionalCost
                                                });
                                            }}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">TOTAL PRICE</label>
                                        <input type="number" value={editingHandling.totalPrice} onChange={e => setEditingHandling({ ...editingHandling, totalPrice: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-emerald-400 text-sm font-black" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Readiness</label>
                                        <select value={editingHandling.readiness} onChange={e => setEditingHandling({ ...editingHandling, readiness: parseInt(e.target.value) })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase text-purple-500 tracking-widest appearance-none cursor-pointer">
                                            <option value="0">PLANIFIÉ (P)</option>
                                            <option value="1">PRÊT (R)</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Comment</label>
                                        <textarea value={editingHandling.comment} onChange={e => setEditingHandling({ ...editingHandling, comment: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-slate-400 text-sm italic min-h-[80px]" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/30 flex justify-end gap-4 flex-shrink-0">
                                <button onClick={() => setEditingHandling(null)} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase transition-colors hover:text-white">Annuler</button>
                                <button onClick={() => handleUpdateHandling(handlingRecords.find(hr => hr.OT === editingHandling.OT && hr.handlingType === editingHandling.handlingType) || editingHandling, editingHandling)} className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all shadow-xl shadow-purple-900/40">Sauvegarder</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Permit Edit Modal */}
            {
                editingPermit && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 md:p-6 animate-in fade-in duration-300">
                        <div className="bg-slate-950 border border-white/5 rounded-[2rem] md:rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center flex-shrink-0">
                                <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Edit Permit Hub</h2>
                                <button onClick={() => setEditingPermit(null)} className="text-slate-500 hover:text-white transition-all"><Plus className="w-8 h-8 rotate-45" /></button>
                            </div>
                            <div className="p-6 md:p-8 space-y-6 bg-black/20 overflow-y-auto custom-scrollbar flex-1">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 font-mono">ID OT (Tracking)</label>
                                        <input type="text" value={editingPermit.OT} onChange={e => setEditingPermit({ ...editingPermit, OT: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-2 focus:ring-sky-500/20" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Permit Name / Type</label>
                                        <input type="text" value={editingPermit.permitName} onChange={e => setEditingPermit({ ...editingPermit, permitName: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Status Readiness</label>
                                        <select value={editingPermit.readiness} onChange={e => setEditingPermit({ ...editingPermit, readiness: parseInt(e.target.value) })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase text-sky-500 tracking-widest appearance-none cursor-pointer">
                                            <option value="0">EN ATTENTE (P)</option>
                                            <option value="1">VALIDÉ (R)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/30 flex justify-end gap-4 flex-shrink-0">
                                <button onClick={() => setEditingPermit(null)} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase transition-colors hover:text-white">Annuler</button>
                                <button onClick={() => handleUpdatePermit(permitRecords.find(pr => pr.OT === editingPermit.OT && pr.permitName === editingPermit.permitName) || editingPermit, editingPermit)} className="px-8 py-4 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs active:scale-95 transition-all shadow-xl shadow-sky-900/40">Sauvegarder</button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Add Simops Modal */}
            {isAddSimopsModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 md:p-6 animate-in fade-in duration-300">
                    <div className="bg-slate-950 border border-white/5 rounded-[2rem] md:rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center bg-orange-600/10">
                            <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Ajouter SIMOPS</h2>
                            <button onClick={() => setIsAddSimopsModalOpen(false)} className="text-slate-500 hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
                        </div>
                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">OT</label>
                                    <input type="text" value={newSimops.OT} onChange={e => setNewSimops({ ...newSimops, OT: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-2 focus:ring-orange-500/20" placeholder="Ex: 400081..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">SIMOPS OT (Sibling)</label>
                                    <input type="text" value={newSimops.simopsOT} onChange={e => setNewSimops({ ...newSimops, simopsOT: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" placeholder="Ex: 400082..." />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/30 flex justify-end gap-4">
                            <button onClick={() => setIsAddSimopsModalOpen(false)} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Annuler</button>
                            <button onClick={handleSaveSimops} className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-orange-900/40">Ajouter</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add PDR Modal */}
            {isAddPDRModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 md:p-6 animate-in fade-in duration-300">
                    <div className="bg-slate-950 border border-white/5 rounded-[2rem] md:rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center bg-amber-600/10">
                            <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Ajouter PDR (Pièce de Rechange)</h2>
                            <button onClick={() => setIsAddPDRModalOpen(false)} className="text-slate-500 hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
                        </div>
                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ID / OT REF</label>
                                    <input type="text" value={newPDR.OT} onChange={e => setNewPDR({ ...newPDR, OT: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-2 focus:ring-amber-500/20" placeholder="OT / ID" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Spare Part Name</label>
                                    <input type="text" value={newPDR.sparePart} onChange={e => setNewPDR({ ...newPDR, sparePart: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Type</label>
                                    <input
                                        type="text"
                                        list="pdr-types"
                                        value={newPDR.type}
                                        onChange={e => setNewPDR({ ...newPDR, type: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm"
                                        placeholder="Ex: Consomable, PDR..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Unité</label>
                                    <input
                                        type="text"
                                        list="pdr-unites"
                                        value={newPDR.unite}
                                        onChange={e => setNewPDR({ ...newPDR, unite: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm"
                                        placeholder="Ex: PSC, LTR..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantité (QTY)</label>
                                    <input
                                        type="number"
                                        value={newPDR.qty}
                                        onChange={e => {
                                            const qty = parseFloat(e.target.value) || 0;
                                            setNewPDR({ ...newPDR, qty, totalPrice: qty * (newPDR.priceU || 0) });
                                        }}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prix Unitaire (PRICE U)</label>
                                    <input
                                        type="number"
                                        value={newPDR.priceU}
                                        onChange={e => {
                                            const priceU = parseFloat(e.target.value) || 0;
                                            setNewPDR({ ...newPDR, priceU, totalPrice: (newPDR.qty || 0) * priceU });
                                        }}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Total Price (Auto)</label>
                                    <div className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-blue-400 text-sm font-black tabular-nums">
                                        {new Intl.NumberFormat('fr-FR').format((newPDR.qty || 0) * (newPDR.priceU || 0))} MAD
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Availability (Readiness)</label>
                                    <select value={newPDR.readiness} onChange={e => setNewPDR({ ...newPDR, readiness: parseInt(e.target.value) })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase text-amber-500 tracking-widest appearance-none transition-all">
                                        <option value="0">NOT IN STOCK</option>
                                        <option value="1">READY / STOCK</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Due Date</label>
                                    <input type="text" value={newPDR.dueDate || ''} onChange={e => setNewPDR({ ...newPDR, dueDate: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" placeholder="Ex: 12-mai-26" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Logistics Status</label>
                                    <select value={newPDR.status} onChange={e => setNewPDR({ ...newPDR, status: e.target.value as any })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase text-amber-500 tracking-widest appearance-none">
                                        <option value="Inventory Assets">Inventory Assets</option>
                                        <option value="Active Tenders">Active Tenders</option>
                                        <option value="Awaiting Process">Awaiting Process</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-6 space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Commentaire</label>
                                <textarea value={newPDR.comment || ''} onChange={e => setNewPDR({ ...newPDR, comment: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm italic h-24 resize-none" />
                            </div>
                        </div>
                        <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/30 flex justify-end gap-4">
                            <button onClick={() => setIsAddPDRModalOpen(false)} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Annuler</button>
                            <button onClick={handleSavePDR} className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-amber-900/40">Sauvegarder</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Cost Modal */}
            {isAddCostModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 md:p-6 animate-in fade-in duration-300">
                    <div className="bg-slate-950 border border-white/5 rounded-[2rem] md:rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center bg-emerald-600/10">
                            <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Ajouter Entrée Coût</h2>
                            <button onClick={() => setIsAddCostModalOpen(false)} className="text-slate-500 hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
                        </div>
                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Company</label>
                                    <input type="text" value={newCost.company} onChange={e => setNewCost({ ...newCost, company: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cost Type</label>
                                    <input type="text" value={newCost.costType} onChange={e => setNewCost({ ...newCost, costType: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Poste Number</label>
                                    <input type="text" value={newCost.posteNumber} onChange={e => setNewCost({ ...newCost, posteNumber: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Price Unit (H-H / Unit)</label>
                                    <input type="number" value={newCost.priceU} onChange={e => setNewCost({ ...newCost, priceU: parseFloat(e.target.value) || 0 })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-emerald-400 font-black text-sm" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Poste Description</label>
                                    <textarea value={newCost.posteDescription} onChange={e => setNewCost({ ...newCost, posteDescription: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm italic h-24" />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/30 flex justify-end gap-4">
                            <button onClick={() => setIsAddCostModalOpen(false)} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Annuler</button>
                            <button onClick={handleSaveCost} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-emerald-900/40">Enregistrer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Scaffolding Modal */}
            {isAddScaffoldingModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 md:p-6 animate-in fade-in duration-300">
                    <div className="bg-slate-950 border border-white/5 rounded-[2rem] md:rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center bg-indigo-600/10">
                            <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Ajouter Échafaudage</h2>
                            <button onClick={() => setIsAddScaffoldingModalOpen(false)} className="text-slate-500 hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
                        </div>
                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">OT</label>
                                    <input type="text" value={newScaffolding.OT} onChange={e => setNewScaffolding({ ...newScaffolding, OT: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Company</label>
                                    <input
                                        type="text"
                                        list="add-scaffolding-companies"
                                        value={newScaffolding.company}
                                        onChange={e => {
                                            const company = e.target.value;
                                            const match = costHubEntries.find(c => c.company.toUpperCase() === company.toUpperCase() && String(c.posteNumber) === String(newScaffolding.posteNumber));
                                            setNewScaffolding({
                                                ...newScaffolding,
                                                company,
                                                posteDescription: match ? match.posteDescription : newScaffolding.posteDescription,
                                                totalPrice: match ? (newScaffolding.QT || 0) * (match.priceU || 0) : newScaffolding.totalPrice
                                            });
                                        }}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-2 focus:ring-indigo-500/20"
                                        placeholder="Sélectionner ou saisir..."
                                    />
                                    <datalist id="add-scaffolding-companies">
                                        {[...new Set(costHubEntries.map(c => c.company))].sort().map(co => (
                                            <option key={co} value={co} />
                                        ))}
                                    </datalist>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Poste Number</label>
                                    <input
                                        type="text"
                                        value={newScaffolding.posteNumber}
                                        onChange={e => {
                                            const posteNumber = e.target.value;
                                            if (!posteNumber) {
                                                setNewScaffolding({ ...newScaffolding, posteNumber: '', posteDescription: '', totalPrice: 0 });
                                            } else {
                                                const match = costHubEntries.find(c => c.company.toUpperCase() === (newScaffolding.company || '').toUpperCase() && String(c.posteNumber) === posteNumber);
                                                setNewScaffolding({
                                                    ...newScaffolding,
                                                    posteNumber,
                                                    posteDescription: match ? match.posteDescription : newScaffolding.posteDescription,
                                                    totalPrice: match ? (newScaffolding.QT || 0) * (match.priceU || 0) : newScaffolding.totalPrice
                                                });
                                            }
                                        }}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-2 focus:ring-indigo-500/20"
                                        placeholder="Ex: 12345..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantity (QT)</label>
                                    <input
                                        type="number"
                                        value={newScaffolding.QT}
                                        onChange={e => {
                                            const QT = parseFloat(e.target.value) || 0;
                                            const match = costHubEntries.find(c => c.company.toUpperCase() === (newScaffolding.company || '').toUpperCase() && String(c.posteNumber) === String(newScaffolding.posteNumber));
                                            setNewScaffolding({ ...newScaffolding, QT, totalPrice: match ? QT * (match.priceU || 0) : 0 });
                                        }}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Price</label>
                                    <div className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-indigo-400 font-black text-sm tabular-nums">
                                        {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(newScaffolding.totalPrice || 0)} MAD
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Readiness</label>
                                    <select value={newScaffolding.readiness} onChange={e => setNewScaffolding({ ...newScaffolding, readiness: parseInt(e.target.value) })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase text-indigo-500 tracking-widest appearance-none transition-all">
                                        <option value="0">PLANIFIÉ (P)</option>
                                        <option value="1">PRÊT (R)</option>
                                    </select>
                                </div>
                                <div className="md:col-span-1 space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Commentaire</label>
                                    <input
                                        type="text"
                                        value={newScaffolding.comment || ''}
                                        onChange={e => setNewScaffolding({ ...newScaffolding, comment: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm italic"
                                        placeholder="Observations..."
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <span>Poste Description</span>
                                        <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-black">AUTO</span>
                                    </label>
                                    <div className="w-full bg-slate-900/30 border border-blue-500/10 rounded-2xl px-5 py-4 text-blue-400 text-sm font-bold min-h-[56px] leading-relaxed">
                                        {newScaffolding.posteDescription || <span className="text-slate-600 italic font-normal">Entrez Company + Poste Number pour auto-remplir...</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/30 flex justify-end gap-4">
                            <button onClick={() => setIsAddScaffoldingModalOpen(false)} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Annuler</button>
                            <button onClick={handleSaveScaffolding} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-indigo-900/40">Ajouter</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Handling Modal */}
            {isAddHandlingModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 md:p-6 animate-in fade-in duration-300">
                    <div className="bg-slate-950 border border-white/5 rounded-[2rem] md:rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center bg-purple-600/10">
                            <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Ajouter Manutention</h2>
                            <button onClick={() => setIsAddHandlingModalOpen(false)} className="text-slate-500 hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
                        </div>
                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">OT</label>
                                    <input type="text" value={newHandling.OT} onChange={e => setNewHandling({ ...newHandling, OT: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Company</label>
                                    <input
                                        type="text"
                                        list="add-handling-companies"
                                        value={newHandling.company}
                                        onChange={e => {
                                            const company = e.target.value;
                                            const match = costHubEntries.find(c => c.company.toUpperCase() === company.toUpperCase() && String(c.posteNumber) === String(newHandling.posteNumber));
                                            setNewHandling({ ...newHandling, company, posteDescription: match ? match.posteDescription : newHandling.posteDescription });
                                        }}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-2 focus:ring-purple-500/20"
                                        placeholder="Sélectionner ou saisir..."
                                    />
                                    <datalist id="add-handling-companies">
                                        {[...new Set(costHubEntries.map(c => c.company))].sort().map(co => (
                                            <option key={co} value={co} />
                                        ))}
                                    </datalist>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Handling Type</label>
                                    <input type="text" value={newHandling.handlingType} onChange={e => setNewHandling({ ...newHandling, handlingType: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Poste Number</label>
                                    <input
                                        type="text"
                                        value={newHandling.posteNumber}
                                        onChange={e => {
                                            const posteNumber = e.target.value;
                                            if (!posteNumber) {
                                                setNewHandling({ ...newHandling, posteNumber: '', posteDescription: '' });
                                            } else {
                                                const match = costHubEntries.find(c => c.company.toUpperCase() === (newHandling.company || '').toUpperCase() && String(c.posteNumber) === posteNumber);
                                                setNewHandling({ ...newHandling, posteNumber, posteDescription: match ? match.posteDescription : newHandling.posteDescription });
                                            }
                                        }}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-2 focus:ring-purple-500/20"
                                        placeholder="Ex: 12345..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hours</label>
                                    <input
                                        type="number"
                                        value={newHandling.hours}
                                        onChange={e => {
                                            const hours = parseFloat(e.target.value) || 0;
                                            const match = costHubEntries.find(c => c.company.toUpperCase() === (newHandling.company || '').toUpperCase() && String(c.posteNumber) === String(newHandling.posteNumber));
                                            setNewHandling({
                                                ...newHandling,
                                                hours,
                                                totalPrice: (match ? hours * (match.priceU || 0) : 0) + (newHandling.additionalCost || 0)
                                            });
                                        }}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Additional Cost</label>
                                    <input
                                        type="number"
                                        value={newHandling.additionalCost}
                                        onChange={e => {
                                            const additionalCost = parseFloat(e.target.value) || 0;
                                            const match = costHubEntries.find(c => c.company.toUpperCase() === (newHandling.company || '').toUpperCase() && String(c.posteNumber) === String(newHandling.posteNumber));
                                            setNewHandling({
                                                ...newHandling,
                                                additionalCost,
                                                totalPrice: (match ? (newHandling.hours || 0) * (match.priceU || 0) : 0) + additionalCost
                                            });
                                        }}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1">Total Price (Auto)</label>
                                    <div className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-emerald-400 font-black text-sm tabular-nums">
                                        {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(newHandling.totalPrice || 0)} MAD
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Readiness</label>
                                    <select value={newHandling.readiness} onChange={e => setNewHandling({ ...newHandling, readiness: parseInt(e.target.value) })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase text-purple-500 tracking-widest appearance-none">
                                        <option value="0">PLANIFIÉ (P)</option>
                                        <option value="1">PRÊT (R)</option>
                                    </select>
                                </div>
                                <div className="md:col-span-1 space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Commentaire</label>
                                    <input
                                        type="text"
                                        value={newHandling.comment || ''}
                                        onChange={e => setNewHandling({ ...newHandling, comment: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm italic"
                                        placeholder="Observations..."
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                        <span>Poste Description</span>
                                        <span className="text-[8px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-black">AUTO</span>
                                    </label>
                                    <div className="w-full bg-slate-900/30 border border-purple-500/10 rounded-2xl px-5 py-4 text-purple-300 text-sm font-bold min-h-[56px] leading-relaxed">
                                        {newHandling.posteDescription || <span className="text-slate-600 italic font-normal">Entrez Company + Poste Number pour auto-remplir...</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/30 flex justify-end gap-4">
                            <button onClick={() => setIsAddHandlingModalOpen(false)} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Annuler</button>
                            <button onClick={handleSaveHandling} className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-purple-900/40">Ajouter</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Permit Modal */}
            {isAddPermitModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 md:p-6 animate-in fade-in duration-300">
                    <div className="bg-slate-950 border border-white/5 rounded-[2rem] md:rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center bg-sky-600/10">
                            <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Ajouter Permis</h2>
                            <button onClick={() => setIsAddPermitModalOpen(false)} className="text-slate-500 hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
                        </div>
                        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/20 text-white">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">OT</label>
                                    <input type="text" value={newPermit.OT} onChange={e => setNewPermit({ ...newPermit, OT: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Permit Name</label>
                                    <input type="text" value={newPermit.permitName} onChange={e => setNewPermit({ ...newPermit, permitName: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Readiness</label>
                                    <select value={newPermit.readiness} onChange={e => setNewPermit({ ...newPermit, readiness: parseInt(e.target.value) })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase text-sky-500 tracking-widest appearance-none">
                                        <option value="0">EN ATTENTE (P)</option>
                                        <option value="1">VALIDÉ (R)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/30 flex justify-end gap-4">
                            <button onClick={() => setIsAddPermitModalOpen(false)} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Annuler</button>
                            <button onClick={handleSavePermit} className="px-8 py-4 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-sky-900/40">Ajouter</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {
                deleteConfirmation && (
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-6 animate-in fade-in duration-300">
                        <div className="bg-slate-950 border border-red-500/20 rounded-[3rem] w-full max-w-md shadow-[0_0_100px_rgba(239,68,68,0.1)] animate-in zoom-in-95 duration-500 overflow-hidden">
                            <div className="p-10 text-center space-y-6">
                                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20 shadow-2xl">
                                    <AlertCircle className="w-10 h-10 text-red-500 animate-pulse" />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Supprimer ?</h2>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        Êtes-vous sûr de vouloir supprimer <span className="text-red-400 font-bold">{deleteConfirmation.label}</span> ? <br />
                                        <span className="text-[10px] uppercase tracking-widest text-slate-600 mt-2 block">Cette action est irréversible.</span>
                                    </p>
                                </div>
                            </div>
                            <div className="p-8 bg-slate-900/50 border-t border-white/5 flex gap-4">
                                <button
                                    onClick={() => setDeleteConfirmation(null)}
                                    className="flex-1 py-4 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-red-900/40 active:scale-95 transition-all"
                                >
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Global Datalists for Suggestions */}
            <datalist id="pdr-types">
                {pdrTypes.map(type => <option key={type} value={type} />)}
            </datalist>
            <datalist id="pdr-unites">
                {pdrUnites.map(unite => <option key={unite} value={unite} />)}
            </datalist>
        </div>
    );
};
