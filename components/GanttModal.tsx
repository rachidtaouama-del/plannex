
import React from 'react';
import type { ScheduledTask, AppParameters } from '../types';
import { SmartFamilyGantt } from './SmartFamilyGantt';

interface GanttModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  tasks: ScheduledTask[];
  parameters: AppParameters;
}

export const GanttModal: React.FC<GanttModalProps> = ({ isOpen, onClose, title, tasks, parameters }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gantt-modal-title"
    >
      <div 
        className="bg-slate-800 rounded-lg shadow-xl w-full max-w-[95vw] h-[90vh] flex flex-col border border-slate-700" 
        onClick={e => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
          <h2 id="gantt-modal-title" className="text-xl font-bold text-white">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white text-3xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 transition-colors"
            aria-label="Fermer"
          >
            &times;
          </button>
        </header>
        <main className="flex-1 overflow-hidden p-4">
          <SmartFamilyGantt tasks={tasks} parameters={parameters} />
        </main>
      </div>
    </div>
  );
};
