
import React, { useState, useEffect, useRef, useMemo } from 'react';

interface MultiSelectDropdownProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ options, selected, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset search on close
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option => option.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  const handleOptionClick = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  const handleSelectAllClick = () => {
    const allFilteredSelected = filteredOptions.every(opt => selected.includes(opt));

    if (allFilteredSelected) {
      // Deselect all filtered options
      const filteredIds = new Set(filteredOptions);
      onChange(selected.filter(id => !filteredIds.has(id)));
    } else {
      // Select all filtered options
      const newSelected = [...new Set([...selected, ...filteredOptions])];
      onChange(newSelected);
    }
  };

  const displayLabel = useMemo(() => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) return selected[0];
    if (selected.length === options.length) return "Toutes les sélections";
    return `${selected.length} sélection(s)`;
  }, [selected, placeholder, options.length]);


  return (
    <div className="relative group/multi" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full bg-black/40 backdrop-blur-md border rounded-2xl px-4 py-3 text-[10px] font-bold transition-all flex justify-between items-center text-left group-hover/multi:border-white/20 active:scale-[0.98] ${isOpen ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-white/5 text-slate-400 group-hover/multi:text-slate-200 shadow-lg'}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate tracking-widest uppercase">{displayLabel}</span>
        <svg className={`w-4 h-4 transition-transform duration-300 flex-shrink-0 ml-2 ${isOpen ? 'rotate-180 text-emerald-400' : 'text-slate-600 group-hover/multi:text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200" role="listbox">
          <div className="p-3 border-b border-white/5 bg-white/5">
            <div className="relative">
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Recherche tactique..."
                className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/30 transition-all focus:outline-none"
                autoFocus
              />
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
          </div>
          <ul className="text-[10px] text-slate-300 max-h-80 overflow-y-auto custom-scrollbar divide-y divide-white/[0.03]">
            {options.length > 0 && (
              <li className="px-5 py-3 hover:bg-emerald-500/10 cursor-pointer flex items-center group transition-colors sticky top-0 bg-slate-900/95 z-10 border-b border-white/5" onClick={handleSelectAllClick}>
                <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${filteredOptions.length > 0 && filteredOptions.every(opt => selected.includes(opt)) ? 'bg-emerald-500 border-emerald-400' : 'bg-black/40 border-white/10 group-hover:border-white/30'}`}>
                  {(filteredOptions.length > 0 && filteredOptions.every(opt => selected.includes(opt))) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className={`ml-4 font-black uppercase tracking-widest ${filteredOptions.length > 0 && filteredOptions.every(opt => selected.includes(opt)) ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'}`}>
                  {filteredOptions.length === options.length ? 'Tout Sélectionner' : 'SÉLECT. FILTRÉS'}
                </span>
              </li>
            )}
            {filteredOptions.map(option => {
              const isSel = selected.includes(option);
              return (
                <li key={option} className={`px-5 py-2.5 hover:bg-white/[0.04] cursor-pointer flex items-center group transition-colors ${isSel ? 'bg-blue-500/10' : ''}`} onClick={() => handleOptionClick(option)}>
                  <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${isSel ? 'bg-blue-500 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.6)]' : 'bg-black/40 border-white/10 group-hover:border-white/30'}`}>
                    {isSel && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className={`ml-4 tracking-wider font-bold truncate ${isSel ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} title={option}>{option}</span>
                </li>
              );
            })}
            {filteredOptions.length === 0 && (
              <li className="px-4 py-8 text-center bg-black/20">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 italic">Aucune donnée radar</span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
