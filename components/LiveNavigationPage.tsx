import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    MapPin, Navigation, Printer, Search, Compass, Circle, CheckCircle2,
    Filter, Calendar, Wind, Droplets, AlertTriangle,
    Cloud, RefreshCw, ChevronDown, X, ExternalLink
} from 'lucide-react';
import type { SchedulingTaskData } from '../types';

interface LiveNavigationPageProps {
    tasks: SchedulingTaskData[];
    onBack: () => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface WeatherDay {
    date: string;
    label: string;
    maxTemp: number;
    minTemp: number;
    windSpeed: number;
    precipProb: number;
    weatherCode: number;
    status: 'safe' | 'warning' | 'danger';
    alerts: string[];
}

interface SiteWeather {
    current: { temp: number; wind: number; precipProb: number; weatherCode: number; label: string };
    forecast: WeatherDay[];
    lat: number; lng: number;
    loadedAt: string;
}

const WMO: Record<number, { label: string; icon: string }> = {
    0: { label: 'Dégagé', icon: '☀️' }, 1: { label: 'Principalement dégagé', icon: '🌤️' },
    2: { label: 'Partiellement nuageux', icon: '⛅' }, 3: { label: 'Couvert', icon: '☁️' },
    45: { label: 'Brouillard', icon: '🌫️' }, 48: { label: 'Brouillard givrant', icon: '🌫️' },
    51: { label: 'Bruine légère', icon: '🌦️' }, 61: { label: 'Pluie légère', icon: '🌧️' },
    63: { label: 'Pluie modérée', icon: '🌧️' }, 65: { label: 'Pluie forte', icon: '⛈️' },
    71: { label: 'Neige légère', icon: '🌨️' }, 80: { label: 'Averses', icon: '🌦️' },
    81: { label: 'Averses modérées', icon: '🌧️' }, 95: { label: 'Orage', icon: '⛈️' },
};

const getWxStatus = (w: { maxTemp: number; minTemp: number; windSpeed: number; precipProb: number }, mode: 'general' | 'crane' | 'concrete'): { status: 'safe' | 'warning' | 'danger'; alerts: string[] } => {
    const alerts: string[] = [];
    let status: 'safe' | 'warning' | 'danger' = 'safe';

    if (mode === 'crane') {
        if (w.windSpeed > 50) { alerts.push('Levage INTERDIT: Vent > 50 km/h'); status = 'danger'; }
        else if (w.windSpeed > 30) { alerts.push('Levage à risque: Vent > 30 km/h'); status = 'warning'; }
    } else if (mode === 'concrete') {
        if (w.maxTemp > 35 || w.minTemp < 5) { alerts.push('Bétonnage RISQUE: Température critique'); status = 'danger'; }
        else if (w.maxTemp > 30 || w.minTemp < 8) { alerts.push('Conditions marginales pour béton'); status = 'warning'; }
    } else {
        if (w.precipProb > 70) { alerts.push('Pluie > 70% — Peinture/Soudage RISQUE'); status = 'warning'; }
        if (w.windSpeed > 40) { alerts.push('Vents forts — Travaux en hauteur RISQUE'); status = 'warning'; }
    }
    return { status, alerts };
};

const parseAnyDate = (raw: any): Date | null => {
    if (!raw && raw !== 0) return null;
    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
    if (typeof raw === 'number') {
        const d = new Date(Math.round((raw - 25569) * 86400 * 1000));
        return isNaN(d.getTime()) ? null : d;
    }
    try { const d = new Date(String(raw)); return isNaN(d.getTime()) ? null : d; } catch { return null; }
};

const fmtDate = (raw: any, includeTime = false): string => {
    const d = parseAnyDate(raw);
    if (!d) return '—';
    const datePart = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
    if (!includeTime) return datePart;
    const timePart = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${datePart} ${timePart}`;
};

const toIsoDate = (d: Date): string => d.toISOString().split('T')[0];

const getMapsUrl = (lat: number, lng: number) =>
    `https://www.google.com/maps/place/${lat},${lng}/@${lat},${lng},18z`;

const getQRUrl = (lat: number, lng: number) => {
    const mapsUrl = getMapsUrl(lat, lng);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mapsUrl)}&format=png&ecc=M&margin=1`;
};

// ─── Weather Fetch ────────────────────────────────────────────────────────────
const fetchWeather = async (lat: number, lng: number, forecastDays = 16): Promise<SiteWeather> => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,windspeed_10m_max,precipitation_probability_max,weathercode&current_weather=true&windspeed_unit=kmh&timezone=auto&forecast_days=${forecastDays}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API');
    const data = await res.json();
    const daily = data.daily;
    const dayNames = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
    const forecast: WeatherDay[] = (daily.time as string[]).map((dateStr, i) => {
        const base = { maxTemp: daily.temperature_2m_max[i] ?? 20, minTemp: daily.temperature_2m_min[i] ?? 10, windSpeed: daily.windspeed_10m_max[i] ?? 0, precipProb: daily.precipitation_probability_max[i] ?? 0 };
        const { status, alerts } = getWxStatus(base, 'general');
        const d = new Date(dateStr);
        const isToday = i === 0;
        return { date: dateStr, label: isToday ? 'AUJ.' : dayNames[d.getDay()], weatherCode: daily.weathercode[i] ?? 0, ...base, status, alerts };
    });
    return {
        current: { temp: data.current_weather?.temperature ?? 0, wind: data.current_weather?.windspeed ?? 0, precipProb: forecast[0]?.precipProb ?? 0, weatherCode: data.current_weather?.weathercode ?? 0, label: WMO[data.current_weather?.weathercode]?.label || '' },
        forecast, lat, lng,
        loadedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
};

// ─── Weather Dashboard Card ──────────────────────────────────────────────────
const WeatherDashboard: React.FC<{ siteCoords: { lat: number; lng: number } | null; onWeatherLoaded: (w: SiteWeather) => void }> = ({ siteCoords, onWeatherLoaded }) => {
    const [wx, setWx] = useState<SiteWeather | null>(null);
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<'general' | 'crane' | 'concrete'>('general');
    const [activeDayIdx, setActiveDayIdx] = useState(0);
    const [manualCoords, setManualCoords] = useState<{ lat: number; lng: number; name: string } | null>(null);
    const [cityInput, setCityInput] = useState('');
    const [geoSearching, setGeoSearching] = useState(false);
    const [geoError, setGeoError] = useState('');
    const [forecastDays, setForecastDays] = useState(7);

    const effectiveCoords = siteCoords || (manualCoords ? { lat: manualCoords.lat, lng: manualCoords.lng } : null);

    const load = useCallback(async () => {
        if (!effectiveCoords) return;
        setLoading(true);
        try {
            const data = await fetchWeather(effectiveCoords.lat, effectiveCoords.lng, forecastDays);
            setWx(data); onWeatherLoaded(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, [effectiveCoords, onWeatherLoaded, forecastDays]);

    useEffect(() => { load(); }, [load]);

    const handleCitySearch = async () => {
        const q = cityInput.trim();
        if (!q) return;
        setGeoSearching(true); setGeoError('');
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=fr&format=json`);
            const data = await res.json();
            if (!data.results?.length) { setGeoError('Ville introuvable. Essayez un autre nom.'); return; }
            const r = data.results[0];
            setManualCoords({ lat: r.latitude, lng: r.longitude, name: `${r.name}${r.country ? ', ' + r.country : ''}` });
        } catch { setGeoError('Erreur de recherche. Vérifiez la connexion.'); }
        finally { setGeoSearching(false); }
    };

    const activeDay = wx?.forecast[activeDayIdx];
    const { alerts } = activeDay ? getWxStatus(activeDay, mode) : { alerts: [] };
    const locationLabel = siteCoords
        ? `${siteCoords.lat.toFixed(4)}, ${siteCoords.lng.toFixed(4)}`
        : manualCoords?.name || null;

    // If no location yet, show city search prompt
    if (!effectiveCoords) return (
        <div className="px-5 py-4 shrink-0">
            <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="px-6 py-5 flex items-center gap-4 border-b border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                        <Cloud size={18} className="text-blue-400" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-[10px] font-black text-white uppercase tracking-widest mb-0.5">Météo du Site</h2>
                        <p className="text-[9px] text-slate-500 font-bold">Aucune coordonnée GPS détectée — Entrez une ville pour afficher la météo</p>
                    </div>
                </div>
                <div className="px-6 py-6">
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-3">🌍 Localisation Manuelle</p>
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={cityInput}
                                onChange={e => setCityInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCitySearch()}
                                placeholder="Ex: Alger, Paris, Casablanca..."
                                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-[11px] text-white font-medium focus:outline-none focus:border-blue-500/50 placeholder:text-slate-600 transition-all"
                            />
                        </div>
                        <button
                            onClick={handleCitySearch}
                            disabled={geoSearching || !cityInput.trim()}
                            className="px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shrink-0"
                        >
                            {geoSearching ? <RefreshCw size={12} className="animate-spin" /> : <Cloud size={12} />}
                            {geoSearching ? 'Recherche...' : 'Charger Météo'}
                        </button>
                    </div>
                    {geoError && <p className="text-[10px] text-red-400 font-bold mt-2">{geoError}</p>}
                    <p className="text-[8px] text-slate-700 font-bold uppercase tracking-widest mt-3">
                        Données fournies par Open-Meteo · Sans clé API requise
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="px-5 py-4 shrink-0">
            <div className="bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col">
                <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20"><Cloud size={16} className="text-blue-400" /></div>
                        <div><h2 className="text-[10px] font-black text-white uppercase tracking-widest">Météo du Site</h2><p className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">{locationLabel || 'Chargement...'} · Màj {wx?.loadedAt || '--:--'}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 p-1 bg-black/40 rounded-xl border border-white/5">
                            <button onClick={() => setMode('general')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'general' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Général</button>
                            <button onClick={() => setMode('crane')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'crane' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Grue</button>
                            <button onClick={() => setMode('concrete')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mode === 'concrete' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Béton</button>
                        </div>
                        {/* Days selector */}
                        <div className="flex items-center gap-1.5 bg-black/40 border border-white/5 rounded-xl px-3 py-1">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Jours</span>
                            {[3, 5, 7, 10, 14, 16].map(d => (
                                <button key={d} onClick={() => setForecastDays(d)} className={`w-7 h-6 rounded-md text-[9px] font-black transition-all ${forecastDays === d ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-white'}`}>{d}</button>
                            ))}
                        </div>
                        {!siteCoords && manualCoords && (
                            <button
                                onClick={() => { setManualCoords(null); setWx(null); setCityInput(''); }}
                                className="px-3 py-1.5 rounded-lg text-[9px] font-black text-slate-500 hover:text-white border border-white/10 hover:border-white/20 transition-all uppercase tracking-widest flex items-center gap-1.5"
                            >
                                <RefreshCw size={10} /> Changer
                            </button>
                        )}
                        <button onClick={load} className="p-2 text-slate-500 hover:text-white transition-colors"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
                    </div>
                </div>
                {loading && !wx ? (
                    <div className="px-8 py-10 flex items-center justify-center gap-3 text-slate-500">
                        <RefreshCw size={18} className="animate-spin text-blue-400" />
                        <span className="text-[11px] font-bold uppercase tracking-widest">Chargement des données météo...</span>
                    </div>
                ) : wx ? (
                    <>
                        <div className="px-8 py-6 flex items-center justify-between gap-8">
                            <div className="flex items-center gap-6">
                                <span className="text-6xl">{WMO[wx.current.weatherCode || 0]?.icon}</span>
                                <div><div className="flex items-baseline gap-1"><span className="text-5xl font-black text-white">{wx.current.temp.toFixed(0)}</span><span className="text-2xl font-bold text-slate-500">°C</span></div><p className="text-xs font-black text-slate-400 uppercase tracking-widest">{wx.current.label}</p></div>
                            </div>
                            <div className="flex items-center gap-12">
                                <div className="flex flex-col items-center gap-1"><Wind className="text-cyan-400" size={24} /><span className="text-2xl font-black text-white">{wx.current.wind.toFixed(0)}</span><span className="text-[9px] font-bold text-slate-500 uppercase">km/h</span></div>
                                <div className="flex flex-col items-center gap-1"><Droplets className="text-blue-400" size={24} /><span className="text-2xl font-black text-white">{wx.current.precipProb}%</span><span className="text-[9px] font-bold text-slate-500 uppercase">Pluie</span></div>
                            </div>
                        </div>
                        <div className="px-6 pb-6 pt-2 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(forecastDays, 10)}, minmax(0, 1fr))` }}>
                            {wx.forecast.slice(0, forecastDays).map((d, i) => {
                                const { status } = getWxStatus(d, mode); const isSelected = activeDayIdx === i;
                                const borderColor = isSelected ? 'border-blue-500/50 bg-blue-500/5' : status === 'danger' ? 'border-red-500/30' : status === 'warning' ? 'border-amber-500/30' : 'border-white/5';
                                return (
                                    <button key={i} onClick={() => setActiveDayIdx(i)} className={`flex flex-col items-center py-4 rounded-2xl border transition-all duration-300 ${borderColor} ${isSelected ? 'scale-105 shadow-xl' : 'hover:border-white/20'}`}>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{d.label}</span>
                                        <span className="text-3xl mb-4">{WMO[d.weatherCode]?.icon}</span>
                                        <div className="flex flex-col items-center gap-0.5 mb-3"><span className="text-lg font-black text-white">{d.maxTemp.toFixed(0)}°</span><span className="text-[10px] font-bold text-slate-600">{d.minTemp.toFixed(0)}°</span></div>
                                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-500"><Wind size={9} className="text-cyan-500/50" /> {d.windSpeed}</div>
                                        {isSelected && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-3 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="px-6 py-4 bg-black/40 border-t border-white/5 min-h-[60px]">
                            <div className="flex items-center gap-3 mb-2"><AlertTriangle size={14} className="text-amber-500" /><span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Alertes — {activeDay?.label} {activeDay?.date.split('-').reverse().slice(0, 2).join('/')}</span></div>
                            {alerts.length > 0 ? (
                                <ul className="flex flex-wrap gap-x-6 gap-y-1">{alerts.map((a, i) => (<li key={i} className="text-[11px] font-bold text-slate-400 flex items-center gap-2"><span className="w-1 h-1 bg-red-500 rounded-full" /> {a}</li>))}</ul>
                            ) : (<p className="text-[11px] font-bold text-emerald-500 tracking-wide">Aucune alerte critique — Conditions favorables</p>)}
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
};

// ─── Task Card ────────────────────────────────────────────────────────────────
const TaskCard: React.FC<{
    task: SchedulingTaskData;
    isSelected: boolean;
    onToggleSelect: (id: number) => void;
    taskWeather: { icon: string; maxTemp: number; minTemp: number; windSpeed: number; precipProb: number; status: 'safe' | 'warning' | 'danger'; alerts: string[] } | null;
}> = ({ task, isSelected, onToggleSelect, taskWeather }) => {
    const lat = Number(task.Latitude); const lng = Number(task.Longitude);
    const hasGps = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    const startDate = parseAnyDate(task['START DATE']);
    const endDate = parseAnyDate(task['END DATE']);
    const borderAcc = taskWeather?.status === 'danger' ? 'border-l-red-500/70' : taskWeather?.status === 'warning' ? 'border-l-amber-500/60' : 'border-l-transparent';
    // resolve team field — data may use different column names
    const teamVal = (task as any).EQUIPE || (task as any).TEAM || (task as any).team || (task as any).Equipe || '—';

    return (
        <div className={`group relative flex flex-col bg-[#0a0f1a] hover:bg-[#0d1520] border border-white/[0.07] hover:border-white/15 rounded-2xl overflow-hidden transition-all duration-200 border-l-2 ${borderAcc}`}>
            <div className="px-4 pt-4 pb-0 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest rounded-full">{task.DISCIPLINE || '—'}</span>
                        {task['Type de Maintenance'] && <span className="px-1.5 py-0.5 bg-purple-500/10 border border-purple-500/15 text-purple-400 text-[8px] font-bold rounded-full">{task['Type de Maintenance']}</span>}
                        <span className="text-[8px] font-mono text-slate-700">OT {task.OT}</span>
                    </div>
                    <h3 className="text-[11px] font-black text-white leading-tight mb-1 line-clamp-2 uppercase">{task['GLOBAL TASKS']}</h3>
                    <p className="text-[9px] text-slate-500 font-medium truncate">{task['Nom Equipement']}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onToggleSelect(task.id); }} className={`shrink-0 transition-all mt-0.5 ${isSelected ? 'text-emerald-500 scale-110' : 'text-slate-800 hover:text-slate-500'}`}>{isSelected ? <CheckCircle2 size={20} /> : <Circle size={20} />}</button>
            </div>

            {/* Key info: team + start + end */}
            <div className="px-4 py-2 grid grid-cols-3 gap-2 mt-2">
                <div className="bg-white/[0.025] rounded-lg px-2.5 py-1.5 border border-white/[0.04]">
                    <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-0.5">É Q U I P E</p>
                    <p className="text-[9px] font-bold text-slate-300 truncate">{teamVal}</p>
                </div>
                <div className="bg-white/[0.025] rounded-lg px-2.5 py-1.5 border border-white/[0.04]">
                    <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-0.5">D É B U T</p>
                    <p className="text-[9px] font-mono text-emerald-400 truncate">{fmtDate(task['START DATE'], false)}</p>
                </div>
                <div className="bg-white/[0.025] rounded-lg px-2.5 py-1.5 border border-white/[0.04]">
                    <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mb-0.5">F I N</p>
                    <p className="text-[9px] font-mono text-rose-400 truncate">{fmtDate(task['END DATE'], false)}</p>
                </div>
            </div>

            {taskWeather && (
                <div className={`px-4 py-2 flex items-center gap-3 border-t ${taskWeather.status === 'danger' ? 'border-red-500/20 bg-red-500/[0.06]' : taskWeather.status === 'warning' ? 'border-amber-500/20 bg-amber-500/[0.04]' : 'border-white/5 bg-white/[0.01]'}`}>
                    <span className="text-base shrink-0">{taskWeather.icon}</span>
                    <div className="flex items-center gap-2 flex-wrap text-[9px]"><span className="text-white font-black">{taskWeather.maxTemp.toFixed(0)}°<span className="text-slate-500 font-normal">/{taskWeather.minTemp.toFixed(0)}°</span></span><span className="flex items-center gap-0.5 text-cyan-400/80"><Wind size={8} />{taskWeather.windSpeed} km/h</span><span className="flex items-center gap-0.5 text-blue-400/80"><Droplets size={8} />{taskWeather.precipProb}%</span></div>
                </div>
            )}
            <div className="px-4 pb-4 pt-3 flex items-center gap-2">{hasGps ? (<><div className="flex items-center gap-1 flex-1 min-w-0"><MapPin size={8} className="text-emerald-600 shrink-0" /><span className="text-[8px] font-mono text-slate-700 truncate">{lat.toFixed(4)}, {lng.toFixed(4)}</span></div><a href={getMapsUrl(lat, lng)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-black rounded-lg transition-all"><Navigation size={10} /> GPS</a></>) : (<div className="flex items-center gap-1.5 text-slate-700 text-[9px]"><MapPin size={9} /> Pas de GPS</div>)}</div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const LiveNavigationPage: React.FC<LiveNavigationPageProps> = ({ tasks, onBack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [siteWeather, setSiteWeather] = useState<SiteWeather | null>(null);

    const [fDiscipline, setFDiscipline] = useState('');
    const [fFamille, setFFamille] = useState('');
    const [fMaintenance, setFMaintenance] = useState('');
    const [fStartDate, setFStartDate] = useState('');
    const [fEndDate, setFEndDate] = useState('');

    useEffect(() => { const t = setTimeout(() => setDebouncedSearch(searchTerm), 250); return () => clearTimeout(t); }, [searchTerm]);

    const locatableTasks = useMemo(() => tasks.filter(t => {
        const lat = Number(t.Latitude); const lng = Number(t.Longitude);
        return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
    }), [tasks]);

    const siteCoords = useMemo(() => locatableTasks.length ? { lat: Number(locatableTasks[0].Latitude), lng: Number(locatableTasks[0].Longitude) } : null, [locatableTasks]);
    const disciplines = useMemo(() => [...new Set(tasks.map(t => t.DISCIPLINE).filter(Boolean))].sort(), [tasks]);
    const familles = useMemo(() => [...new Set(tasks.map(t => t.FAMILLE).filter(Boolean))].sort(), [tasks]);
    const maintenanceTypes = useMemo(() => [...new Set(tasks.map(t => t['Type de Maintenance']).filter(Boolean))].sort(), [tasks]);

    const filteredTasks = useMemo(() => {
        const s = debouncedSearch.toLowerCase().trim();
        return tasks.filter(t => {
            if (fDiscipline && t.DISCIPLINE !== fDiscipline) return false;
            if (fFamille && t.FAMILLE !== fFamille) return false;
            if (fMaintenance && t['Type de Maintenance'] !== fMaintenance) return false;
            if (fStartDate) { const d = parseAnyDate(t['START DATE']); if (!d || toIsoDate(d) < fStartDate) return false; }
            if (fEndDate) { const d = parseAnyDate(t['END DATE']); if (!d || toIsoDate(d) > fEndDate) return false; }
            if (s) {
                const n = String(t['GLOBAL TASKS'] || '').toLowerCase(); const e = String(t['Nom Equipement'] || '').toLowerCase();
                const f = String(t.FAMILLE || '').toLowerCase(); const o = String(t.OT || '').toLowerCase();
                if (!n.includes(s) && !e.includes(s) && !f.includes(s) && !o.includes(s)) return false;
            }
            return true;
        });
    }, [tasks, debouncedSearch, fDiscipline, fFamille, fMaintenance, fStartDate, fEndDate]);

    const activeFilters = [fDiscipline, fFamille, fMaintenance, fStartDate, fEndDate].filter(Boolean).length;
    const clearFilters = () => { setFDiscipline(''); setFFamille(''); setFMaintenance(''); setFStartDate(''); setFEndDate(''); };
    const toggleSelect = (id: number) => setSelectedTaskIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

    const getTaskWeather = useCallback((task: SchedulingTaskData) => {
        if (!siteWeather) return null;
        const startD = parseAnyDate(task['START DATE']);
        const dateKey = startD ? toIsoDate(startD) : null;
        const day = dateKey ? siteWeather.forecast.find(d => d.date === dateKey) : siteWeather.forecast[0];
        if (!day) return null;
        return { icon: WMO[day.weatherCode]?.icon || '🌡️', maxTemp: day.maxTemp, minTemp: day.minTemp, windSpeed: day.windSpeed, precipProb: day.precipProb, status: day.status, alerts: day.alerts };
    }, [siteWeather]);

    const handlePrintReport = useCallback(() => {
        const sel = filteredTasks.filter(t => selectedTaskIds.includes(t.id));
        if (!sel.length) { alert('Sélectionnez au moins une tâche pour générer le rapport.'); return; }
        // Use hidden iframe to avoid popup blocker
        const existingFrame = document.getElementById('nav-pdf-iframe');
        if (existingFrame) existingFrame.remove();
        const iframe = document.createElement('iframe');
        iframe.id = 'nav-pdf-iframe';
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1280px;height:900px;border:none;visibility:hidden;';
        document.body.appendChild(iframe);
        const iDoc = iframe.contentDocument || (iframe.contentWindow as any)?.document;
        if (!iDoc) { iframe.remove(); return; }
        const now = new Date();
        const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const dangerCount = sel.filter(t => { const d = parseAnyDate(t['START DATE']); const k = d ? toIsoDate(d) : null; const day = k ? siteWeather?.forecast.find(f => f.date === k) : siteWeather?.forecast[0]; return day?.status === 'danger'; }).length;
        const wxDaysHtml = (siteWeather?.forecast.slice(0, 7) || []).map((d, i) => {
            const { status, alerts } = getWxStatus(d, 'general');
            const sc = status === 'danger' ? '#ef4444' : status === 'warning' ? '#f59e0b' : '#10b981';
            const sl = status === 'danger' ? '⛔ CRITIQUE' : status === 'warning' ? '⚠ VIGILANCE' : '✅ OPTIMAL';
            return `<div style="background:${sc}0d;border:1.5px solid ${sc}30;border-top:3px solid ${sc};border-radius:14px;padding:16px 10px;text-align:center;">
                <div style="font-size:9px;font-weight:900;color:#64748b;letter-spacing:2px;margin-bottom:8px;">${i === 0 ? '▶ AUJ.' : d.label}</div>
                <div style="font-size:32px;margin-bottom:6px;">${WMO[d.weatherCode]?.icon || '🌡️'}</div>
                <div style="font-size:18px;font-weight:900;color:#f8fafc;margin-bottom:4px;">${d.maxTemp.toFixed(0)}°<span style="font-size:12px;color:#475569;">/${d.minTemp.toFixed(0)}°</span></div>
                <div style="font-size:8px;color:#94a3b8;margin-bottom:8px;">${WMO[d.weatherCode]?.label || ''}</div>
                <div style="font-size:8px;font-weight:900;color:${sc};background:${sc}15;padding:3px 6px;border-radius:99px;margin-bottom:6px;">${sl}</div>
                <div style="font-size:9px;color:#22d3ee;font-weight:700;">💨 ${d.windSpeed}km/h</div>
                <div style="font-size:9px;color:#60a5fa;font-weight:700;">🌧 ${d.precipProb}%</div>
                ${alerts.length ? `<div style="font-size:7px;color:${sc};margin-top:6px;font-weight:900;">${alerts[0]}</div>` : ''}
            </div>`;
        }).join('');
        const taskCardsHtml = sel.map((t, idx) => {
            const lat = Number(t.Latitude); const lng = Number(t.Longitude);
            const hasGps = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
            const startD = parseAnyDate(t['START DATE']); const dk = startD ? toIsoDate(startD) : null;
            const day = dk ? siteWeather?.forecast.find(f => f.date === dk) : siteWeather?.forecast[0];
            const tw = day ? getWxStatus(day, 'general') : null;
            const rc = tw?.status === 'danger' ? '#ef4444' : tw?.status === 'warning' ? '#f59e0b' : '#10b981';
            const dColors: Record<string, string> = { 'Mécanique': '#3b82f6', 'Électrique': '#f59e0b', 'Instrumentation': '#8b5cf6', 'Chaudronnerie': '#ef4444', 'Civil': '#06b6d4' };
            const dc = dColors[t.DISCIPLINE || ''] || '#10b981';
            return `<div style="display:flex;background:rgba(255,255,255,0.015);border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;page-break-inside:avoid;margin-bottom:14px;min-height:200px;">
                <div style="width:185px;flex-shrink:0;background:rgba(0,0,0,0.35);padding:16px;display:flex;flex-direction:column;border-right:1px solid rgba(255,255,255,0.05);">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                        <div style="background:${dc}18;border:1px solid ${dc}30;border-radius:8px;padding:5px 8px;font-size:8px;font-weight:900;color:${dc};text-transform:uppercase;">${t.DISCIPLINE || 'N/A'}</div>
                    </div>
                    <div style="font-size:8px;font-weight:900;color:#475569;letter-spacing:2px;margin-bottom:3px;">OT ${t.OT || '—'}</div>
                    <div style="font-size:10px;font-weight:900;color:#f1f5f9;text-transform:uppercase;line-height:1.3;margin-bottom:14px;flex:1;">${t['GLOBAL TASKS']}</div>
                    ${hasGps ? `<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.15);border-radius:10px;padding:10px;text-align:center;">
                        <img src="${getQRUrl(lat, lng)}" style="width:85px;height:85px;border-radius:6px;display:block;margin:0 auto 6px;background:#fff;"/>
                        <div style="font-size:7px;font-weight:900;color:#10b981;letter-spacing:1px;">SCAN → MAPS</div>
                        <div style="font-size:6px;color:#334155;margin-top:2px;">${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
                    </div>` : `<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:10px;padding:14px;text-align:center;"><div style="font-size:7px;color:#1e293b;text-transform:uppercase;">GPS non configuré</div></div>`}
                </div>
                <div style="flex:1;padding:16px;display:flex;flex-direction:column;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                        <div>
                            <div style="font-size:7px;font-weight:900;color:#1e3a5f;letter-spacing:3px;text-transform:uppercase;">FICHE N°${String(idx + 1).padStart(3, '0')}</div>
                            <div style="font-size:11px;font-weight:900;color:#f1f5f9;text-transform:uppercase;margin-top:2px;">${t['Nom Equipement'] || '—'}</div>
                        </div>
                        <div style="font-size:8px;font-weight:900;color:#fff;background:${dc};padding:4px 10px;border-radius:99px;">${t['Type de Maintenance'] || 'Standard'}</div>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;flex:1;">
                        ${[['Famille', t.FAMILLE || '—'], ['Zone', t.ZONE || '—'], ['Équipe', t.team || t.TEAM || '—'], ['Compagnie', t.COMPANY || 'Interne'], ['Début', fmtDate(t['START DATE'], true)], ['Fin', fmtDate(t['END DATE'], true)], ['Durée', t.DUREE ? t.DUREE + 'h' : '—'], ['Effectif', t.EFFECTIF ? t.EFFECTIF + ' p.' : '—'], ['H-H', t['Heures-Homme'] ? t['Heures-Homme'] + ' HH' : '—'], ['AVIS', t.AVIS || '—'], ['Statut', t.STATUS || 'En cours'], ['Priorité', t.PRIORITY || t['Priorité'] || '—']].map(([l, v]) => `
                        <div style="background:rgba(255,255,255,0.02);border-radius:7px;padding:6px 8px;">
                            <div style="font-size:6px;font-weight:900;color:#1e293b;text-transform:uppercase;letter-spacing:2px;margin-bottom:2px;">${l}</div>
                            <div style="font-size:8px;font-weight:700;color:#94a3b8;">${v}</div>
                        </div>`).join('')}
                    </div>
                    ${tw && tw.alerts.length ? `<div style="margin-top:8px;padding:6px 10px;background:${rc}12;border-left:3px solid ${rc};border-radius:0 7px 7px 0;">
                        <div style="font-size:7px;font-weight:900;color:${rc};text-transform:uppercase;letter-spacing:1px;">⚠ ALERTE MÉTÉO</div>
                        <div style="font-size:7px;font-weight:700;color:#94a3b8;margin-top:2px;">${tw.alerts.join(' · ')}</div>
                    </div>` : ''}
                    ${tw && day ? `<div style="margin-top:6px;display:flex;align-items:center;gap:8px;padding:5px 8px;background:${rc}0a;border:1px solid ${rc}20;border-radius:8px;">
                        <span style="font-size:12px;">${WMO[day.weatherCode]?.icon || '🌡️'}</span>
                        <span style="font-size:7px;font-weight:900;color:${rc};">${tw.status === 'danger' ? '⛔ CRITIQUE' : tw.status === 'warning' ? '⚠ VIGILANCE' : '✅ OPTIMAL'}</span>
                        <span style="font-size:7px;color:#475569;">${day.maxTemp.toFixed(0)}°C · 💨${day.windSpeed}km/h · 🌧${day.precipProb}%</span>
                    </div>` : ''}
                </div>
            </div>`;
        }).join('');
        iDoc.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Navigation Terrain — PlanneX</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
@page{size:A3 landscape;margin:0}*{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:'Inter',sans-serif;background:#020617;color:#f8fafc}
.page{width:420mm;min-height:297mm;position:relative;overflow:hidden;page-break-after:always}
</style></head><body>
<div class="page" style="background:radial-gradient(ellipse at 70% 20%,#0d4429 0%,#051228 35%,#020617 70%);display:flex;flex-direction:column;">
  <div style="position:absolute;inset:0;background-image:linear-gradient(rgba(16,185,129,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(16,185,129,0.04) 1px,transparent 1px);background-size:32px 32px;"></div>
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 20% 80%,rgba(59,130,246,0.08) 0%,transparent 60%);"></div>
  <div style="padding:48px 72px 0;display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:2;">
    <div><div style="font-size:26px;font-weight:900;letter-spacing:-2px;color:#fff;">Planne<span style="color:#10b981;">X</span></div><div style="font-size:8px;font-weight:700;color:#1e3a5f;letter-spacing:4px;text-transform:uppercase;">Industrial Intelligence Platform</div></div>
    <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:99px;padding:8px 28px;font-size:8px;font-weight:900;color:#10b981;letter-spacing:4px;text-transform:uppercase;">🛰 Navigation Terrain</div>
  </div>
  <div style="padding:40px 72px;flex:1;display:flex;flex-direction:column;justify-content:center;position:relative;z-index:2;">
    <div style="font-size:9px;font-weight:900;color:#10b981;letter-spacing:6px;text-transform:uppercase;margin-bottom:14px;display:flex;align-items:center;gap:10px;"><span style="display:block;width:20px;height:2px;background:#10b981;"></span>Rapport Opérationnel</div>
    <div style="font-size:68px;font-weight:900;line-height:0.9;letter-spacing:-4px;color:#fff;margin-bottom:18px;">LIVE MAP<br><span style="color:#10b981;">&amp;</span> QR NAV</div>
    <div style="font-size:14px;font-weight:500;color:#475569;max-width:480px;line-height:1.5;margin-bottom:44px;">Rapport de géolocalisation terrain, analyse météorologique et fiche d'accès GPS — Arrêt en cours</div>
    <div style="display:flex;gap:18px;">
      ${[
                { icon: '📋', val: sel.length, lbl: 'Tâches Rapport', c: '#10b981' },
                { icon: '🌡️', val: (siteWeather?.current.temp.toFixed(0) || '--') + '°', lbl: 'T° Site Actuelle', c: '#22d3ee' },
                { icon: '💨', val: (siteWeather?.current.wind.toFixed(0) || '--'), lbl: 'Vent km/h', c: '#f59e0b' },
                dangerCount > 0 ? { icon: '⛔', val: dangerCount, lbl: 'Tâches Critiques', c: '#ef4444' } : { icon: '✅', val: sel.length - 0, lbl: 'Conditions OK', c: '#10b981' },
            ].map(s => `<div style="width:150px;background:rgba(255,255,255,0.02);border:1.5px solid rgba(255,255,255,0.07);border-radius:22px;padding:24px 18px;text-align:center;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,${s.c},transparent);"></div>
        <div style="font-size:18px;margin-bottom:6px;">${s.icon}</div>
        <div style="font-size:40px;font-weight:900;line-height:1;color:${s.c};margin-bottom:4px;">${s.val}</div>
        <div style="font-size:7px;font-weight:900;color:#1e293b;text-transform:uppercase;letter-spacing:2px;">${s.lbl}</div>
      </div>`).join('')}
    </div>
  </div>
  <div style="padding:0 72px 48px;position:relative;z-index:2;display:flex;justify-content:space-between;align-items:flex-end;">
    <div><div style="font-size:7px;font-weight:900;color:#1e3a5f;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px;">Point GPS du Site</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:#1e40af;">${siteCoords ? `${siteCoords.lat.toFixed(6)}°N, ${siteCoords.lng.toFixed(6)}°E` : 'GPS non disponible'}</div></div>
    <div style="font-size:8px;font-weight:700;color:#1e293b;text-align:right;line-height:1.8;">Généré le ${dateStr} à ${timeStr}<br>PlanneX · Rapport Terrain · Confidentiel</div>
  </div>
</div>
<div class="page" style="background:#020617;">
  <div style="padding:32px 56px 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.04);">
    <div><div style="font-size:8px;font-weight:900;color:#10b981;letter-spacing:5px;text-transform:uppercase;display:flex;align-items:center;gap:8px;"><span style="display:block;width:14px;height:2px;background:linear-gradient(90deg,#10b981,#22d3ee);"></span>Intelligence Météo</div>
    <div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-1px;margin-top:4px;">Prévisions 7 Jours — Analyse de Risque Opérationnel</div></div>
    ${siteWeather ? `<div style="text-align:right;"><div style="font-size:7px;font-weight:900;color:#1e293b;letter-spacing:3px;text-transform:uppercase;margin-bottom:3px;">Conditions Actuelles</div><div style="font-size:14px;font-weight:900;color:#fff;">${WMO[siteWeather.current.weatherCode]?.icon || '🌡️'} ${siteWeather.current.label}</div></div>` : ''}
  </div>
  <div style="padding:28px 56px;display:flex;gap:44px;align-items:center;border-bottom:1px solid rgba(255,255,255,0.04);">
    <div style="display:flex;align-items:center;gap:28px;">${siteWeather ? `<div style="font-size:64px;">${WMO[siteWeather.current.weatherCode]?.icon || '🌡️'}</div>
      <div><div style="display:flex;align-items:baseline;gap:4px;"><span style="font-size:72px;font-weight:900;line-height:1;color:#fff;">${siteWeather.current.temp.toFixed(0)}</span><span style="font-size:28px;color:#334155;">°C</span></div>
      <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:2px;margin-top:4px;">${siteWeather.current.label}</div></div>` : '<div style="color:#334155;">Météo non disponible</div>'}</div>
    <div style="width:1px;height:80px;background:rgba(255,255,255,0.05);"></div>
    <div style="display:flex;flex-direction:column;gap:14px;">${siteWeather ? `
      <div style="display:flex;align-items:center;gap:10px;"><span style="font-size:14px;width:28px;text-align:center;">💨</span><div><div style="font-size:16px;font-weight:900;color:#fff;">${siteWeather.current.wind.toFixed(0)}<span style="font-size:10px;color:#334155;"> km/h</span></div><div style="font-size:7px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:2px;">Vitesse du Vent</div></div></div>
      <div style="display:flex;align-items:center;gap:10px;"><span style="font-size:14px;width:28px;text-align:center;">🌧</span><div><div style="font-size:16px;font-weight:900;color:#fff;">${siteWeather.current.precipProb}<span style="font-size:10px;color:#334155;">%</span></div><div style="font-size:7px;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:2px;">Prob. de Pluie</div></div></div>` : ''}
    </div>
    <div style="margin-left:auto;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:14px;padding:18px 24px;text-align:center;">
      <div style="font-size:7px;font-weight:900;color:#334155;letter-spacing:3px;text-transform:uppercase;margin-bottom:6px;">Coordonnées GPS Site</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:#22d3ee;">${siteCoords ? `${siteCoords.lat.toFixed(5)}, ${siteCoords.lng.toFixed(5)}` : 'N/A'}</div>
      <div style="font-size:7px;color:#1e293b;margin-top:4px;">Sync: ${siteWeather?.loadedAt || '--:--'}</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:9px;padding:18px 56px;">${wxDaysHtml}</div>
  <div style="margin:0 56px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:14px;padding:16px 24px;display:flex;gap:36px;">
    ${[['#10b981', 'OPTIMAL — Conditions opérationnelles favorables. Tous travaux autorisés.'], ['#f59e0b', 'VIGILANCE — Vents > 30 km/h ou pluie > 70%. Levage et travaux en hauteur à surveiller.'], ['#ef4444', 'CRITIQUE — Levage interdit si vent > 50 km/h. Bétonnage risqué si T° hors limites.']].map(([c, txt]) => `<div style="display:flex;align-items:center;gap:10px;"><div style="width:9px;height:9px;border-radius:50%;background:${c};flex-shrink:0;"></div><div style="font-size:8px;font-weight:700;color:#64748b;">${txt}</div></div>`).join('')}
  </div>
</div>
<div class="page" style="background:#020617;height:auto;overflow:visible;">
  <div style="padding:24px 44px 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.04);">
    <div><div style="font-size:8px;font-weight:900;color:#22d3ee;letter-spacing:5px;text-transform:uppercase;">🛰 Catalogue de Navigation</div>
    <div style="font-size:20px;font-weight:900;color:#fff;margin-top:2px;">Fiches Terrain — Accès GPS &amp; QR Code</div></div>
    <div style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.2);border-radius:99px;padding:6px 18px;font-size:9px;font-weight:900;color:#10b981;">${sel.length} tâche${sel.length > 1 ? 's' : ''}</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:14px 44px 20px;">${taskCardsHtml}</div>
  <div style="padding:10px 44px;border-top:1px solid rgba(255,255,255,0.04);display:flex;justify-content:space-between;font-size:7px;font-weight:700;color:#0f172a;">
    <span>PlanneX · Navigation Terrain · ${dateStr} ${timeStr}</span>
    <span style="color:#10b981;">🛰 Rapport généré par le moteur de géolocalisation PlanneX</span>
    <span>Confidentiel — Usage Interne</span>
  </div>
</div>
</body></html>`);
        iDoc.close();
        // Give fonts/images time to load then print
        setTimeout(() => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (e) {
                console.error('Print failed', e);
            }
            // Remove iframe after print dialog closes
            setTimeout(() => iframe.remove(), 3000);
        }, 900);
    }, [filteredTasks, selectedTaskIds, siteWeather, siteCoords]);

    return (
        <div className="flex flex-col h-full bg-[#050810] text-slate-200 overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
            <style>{`.lnp-scroll::-webkit-scrollbar{width:3px}.lnp-scroll::-webkit-scrollbar-track{background:transparent}.lnp-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.05);border-radius:10px}.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}.sel-input{background:#050810;border:1px solid rgba(255,255,255,0.08);color:#e2e8f0;border-radius:8px;padding:5px 8px;font-size:10px;font-weight:600;width:100%;outline:none;appearance:none}.date-input{background:#050810;border:1px solid rgba(255,255,255,0.08);color:#94a3b8;border-radius:8px;padding:5px 8px;font-size:10px;width:100%;outline:none;color-scheme:dark}`}</style>
            <div className="px-5 py-4 bg-black border-b border-white/5 flex items-center justify-between shrink-0"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20"><Compass className="w-5 h-5 text-emerald-400" /></div><div><h1 className="text-sm font-black text-white uppercase tracking-tighter">Live Map & QR Navigation</h1><p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{filteredTasks.length} tâches filtrées</p></div></div><div className="flex items-center gap-2"><button onClick={onBack} className="px-4 py-2 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all">Quitter</button><button onClick={handlePrintReport} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl uppercase tracking-widest text-[9px] flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/40"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="9" y1="14" x2="15" y2="14" /></svg> Exporter PDF ({selectedTaskIds.length})</button></div></div>
            <WeatherDashboard siteCoords={siteCoords} onWeatherLoaded={setSiteWeather} />
            <div className="px-5 py-2 flex items-center gap-3 shrink-0 flex-wrap"><div className="relative flex-1 min-w-[300px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={12} /><input type="text" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white/[0.03] border border-white/8 rounded-xl pl-8 pr-4 py-2 text-[11px] text-white focus:outline-none" /></div><button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${showFilters ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'border-white/8 text-slate-500 bg-white/[0.02]'}`}><Filter size={11} /> Filtres</button><button onClick={() => setSelectedTaskIds(s => s.length === filteredTasks.length ? [] : filteredTasks.map(t => t.id))} className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-2">Tout choisir</button></div>
            {showFilters && (<div className="px-5 py-3 flex flex-wrap gap-4 border-b border-white/5 bg-black/40"><div className="w-40"><label className="text-[8px] text-slate-600 font-black uppercase mb-1 block">Discipline</label><select value={fDiscipline} onChange={e => setFDiscipline(e.target.value)} className="sel-input"><option value="">Toutes</option>{disciplines.map(d => <option key={d} value={d}>{d}</option>)}</select></div><div className="w-40"><label className="text-[8px] text-slate-600 font-black uppercase mb-1 block">Maintenance</label><select value={fMaintenance} onChange={e => setFMaintenance(e.target.value)} className="sel-input"><option value="">Tous</option>{maintenanceTypes.map(m => <option key={m} value={m}>{m}</option>)}</select></div><div className="w-32"><label className="text-[8px] text-slate-600 font-black uppercase mb-1 block">Début ≥</label><input type="date" value={fStartDate} onChange={e => setFStartDate(e.target.value)} className="date-input" /></div><div className="w-32"><label className="text-[8px] text-slate-600 font-black uppercase mb-1 block">Fin ≤</label><input type="date" value={fEndDate} onChange={e => setFEndDate(e.target.value)} className="date-input" /></div></div>)}
            <div className="flex-1 overflow-y-auto lnp-scroll px-5 py-4"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{filteredTasks.map(task => (<TaskCard key={task.id} task={task} isSelected={selectedTaskIds.includes(task.id)} onToggleSelect={toggleSelect} taskWeather={getTaskWeather(task)} />))}</div></div>
        </div>
    );
};
