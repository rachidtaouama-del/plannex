import React, { useState, useEffect, useRef } from 'react';
import type { CalculationResults, AppParameters } from '../types';
import { getChatContextString, sendMessageToChat } from '../services/geminiService';
import { GoogleGenAI } from '@google/genai';

interface AIChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
    results: CalculationResults;
    parameters: AppParameters;
}

interface Message {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    timestamp: Date;
}

const AVAILABLE_MODELS = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash' },
    { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro' },
];

type ApiStatus = 'unverified' | 'checking' | 'ok' | 'error';

const StatusIndicator: React.FC<{ status: ApiStatus }> = ({ status }) => {
    switch (status) {
        case 'checking':
            return (
                <div className="flex items-center gap-2 text-[10px] text-amber-400 font-black uppercase tracking-widest">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    Initialisation...
                </div>
            );
        case 'ok':
            return (
                <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-black uppercase tracking-widest">
                    <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    </span>
                    Système Opérationnel
                </div>
            );
        case 'error':
            return (
                <div className="flex items-center gap-2 text-[10px] text-red-400 font-black uppercase tracking-widest">
                    <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                    </span>
                    Échec Liaison
                </div>
            );
        default:
            return null;
    }
};


export const AIChatPanel: React.FC<AIChatPanelProps> = ({ isOpen, onClose, results, parameters }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].id);
    const [apiStatus, setApiStatus] = useState<ApiStatus>('unverified');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && apiStatus === 'unverified') {
            const checkApiConnection = async () => {
                setApiStatus('checking');
                try {
                    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                    await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: 'test' });
                    setApiStatus('ok');
                } catch (error) {
                    console.error("API Connection Check Failed:", error);
                    setApiStatus('error');
                }
            };
            checkApiConnection();
        }
    }, [isOpen, apiStatus]);


    useEffect(() => {
        if (isOpen && (messages.length === 0 || apiStatus !== 'unverified')) {
            let initialMessage: Message;
            if (apiStatus === 'ok') {
                initialMessage = {
                    id: 'welcome-ok',
                    sender: 'ai',
                    text: "Unité PlanneX activée. J'ai indexé l'intégralité du planning opérationnel. Prêt pour l'analyse stratégique.\n\nDemandez-moi une analyse des risques, une optimisation de charge ou le statut d'un équipement spécifique.",
                    timestamp: new Date()
                };
            } else if (apiStatus === 'error') {
                initialMessage = {
                    id: 'welcome-error',
                    sender: 'ai',
                    text: "ERREUR CRITIQUE : Liaison neuronale défectueuse. Vérifiez vos protocoles API (Clé absente ou invalide).",
                    timestamp: new Date()
                };
            } else {
                initialMessage = {
                    id: 'welcome-checking',
                    sender: 'ai',
                    text: "Séquence de boot en cours... Synchronisation avec le noyau Gemini.",
                    timestamp: new Date()
                };
            }
            setMessages([initialMessage]);
        }
    }, [isOpen, apiStatus]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || isLoading || apiStatus !== 'ok') return;

        const userMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        try {
            const context = getChatContextString(results, parameters);
            const aiResponseText = await sendMessageToChat(userMsg.text, context, selectedModel);

            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: aiResponseText,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error(error);
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'ai',
                text: "SYNTAX ERROR : Interruption du flux de données. Veuillez relancer la requête.",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

            <div className="absolute inset-y-0 right-0 max-w-full flex">
                <div className="w-screen max-w-lg transform transition-all duration-500 ease-in-out bg-slate-900 shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col h-full border-l border-white/5 relative">

                    {/* Ambient glow decoration */}
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-blue-500/5 via-transparent to-emerald-500/5 pointer-events-none"></div>

                    {/* Header */}
                    <div className="relative z-10 px-8 py-6 border-b border-white/5 bg-black/40 backdrop-blur-2xl flex justify-between items-center flex-wrap gap-4">
                        <div className="flex items-center gap-5">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-blue-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-2xl border border-white/10 group-hover:scale-110 transition-transform">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white italic uppercase tracking-tighter leading-none mb-1.5">Noyau de Copilot</h2>
                                <StatusIndicator status={apiStatus} />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="bg-black/40 text-[10px] font-black uppercase tracking-widest text-slate-300 rounded-xl border border-white/10 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 p-2 min-w-[140px] cursor-pointer"
                            >
                                {AVAILABLE_MODELS.map(model => (
                                    <option key={model.id} value={model.id} className="bg-slate-900 border-none">{model.name}</option>
                                ))}
                            </select>
                            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="relative z-10 flex-1 overflow-y-auto p-8 space-y-8 bg-transparent scrollbar-hide">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[90%] rounded-[2rem] p-6 transition-all duration-300 ${msg.sender === 'user'
                                    ? 'bg-blue-600/20 border border-blue-500/40 text-blue-50 shadow-[0_10px_30px_rgba(37,99,235,0.1)] rounded-br-lg'
                                    : 'bg-slate-800/40 backdrop-blur-md border border-white/5 text-slate-200 shadow-2xl rounded-bl-lg'
                                    }`}>
                                    <div className="text-[13px] font-medium leading-relaxed tracking-wide">
                                        {msg.text.split('**').map((part, i) =>
                                            i % 2 === 1 ? <strong key={i} className="font-black text-white italic">{part}</strong> : part
                                        )}
                                    </div>
                                    <div className={`mt-4 flex items-center justify-end gap-2 text-[8px] font-black uppercase tracking-[0.2em] ${msg.sender === 'user' ? 'text-blue-400/70' : 'text-slate-500'}`}>
                                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><circle cx="12" cy="12" r="10" /></svg>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800/40 border border-white/5 backdrop-blur-md rounded-[1.5rem] p-4 flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                                    </div>
                                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Traitement...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="relative z-10 p-6 bg-black/40 backdrop-blur-2xl border-t border-white/5">
                        <form onSubmit={handleSendMessage} className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-emerald-500/20 rounded-[2.5rem] blur opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                            <div className="relative flex items-center gap-4 bg-slate-900/60 border border-white/10 rounded-[2rem] p-2 transition-all focus-within:border-blue-500/40 focus-within:ring-4 focus-within:ring-blue-500/10">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder={apiStatus === 'ok' ? "Entrez votre requête opérationnelle..." : "Liaison interrompue..."}
                                    className="flex-1 bg-transparent text-white text-sm font-medium px-5 py-2 focus:outline-none placeholder-slate-600 disabled:cursor-not-allowed"
                                    disabled={isLoading || apiStatus !== 'ok'}
                                />
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim() || isLoading || apiStatus !== 'ok'}
                                    className="w-12 h-12 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center disabled:shadow-none active:scale-95 group/btn"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                        <div className="flex justify-center mt-4">
                            <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/40 border border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                                Les analyses peuvent nécessiter une validation physique
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};