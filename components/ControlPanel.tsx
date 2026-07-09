import React from 'react';
import type { AppParameters, CombustionParams } from '../types';

interface ControlPanelProps {
  file: File | null;
  setFile: (file: File | null) => void;
  parameters: AppParameters;
  setParameters: (params: AppParameters) => void;
  onCalculate: () => void;
  isLoading: boolean;
  isColdStopFlow: boolean;
}

const SectionHeader: React.FC<{ icon: React.ReactElement; title: string; }> = ({ icon, title }) => (
  <div className="flex items-center space-x-3 mb-4">
    {icon}
    <h2 className="text-lg font-semibold text-slate-200">{title}</h2>
  </div>
);

const FileUploadIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
);

const SettingsIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
);

const ControlPanel: React.FC<ControlPanelProps> = ({ file, setFile, parameters, setParameters, onCalculate, isLoading, isColdStopFlow }) => {
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleParamChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    // This handler will not manage combustion object, it's handled separately
    setParameters({
      ...parameters,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    } as AppParameters);
  };

  const handleCombustionChange = (field: keyof CombustionParams, value: string) => {
    const newCombustion = { ...parameters.combustion };
    if (field === 'mode') {
      newCombustion.mode = value as 'parallel' | 'after_deconsignation';
    } else { // field === 'value'
      newCombustion.value = parseInt(value, 10) || 0;
    }
    setParameters({ ...parameters, combustion: newCombustion });
  };


  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-lg space-y-8 sticky top-28">
      {/* Section 1: File Upload */}
      <div>
        <SectionHeader icon={<FileUploadIcon className="w-6 h-6 text-slate-400" />} title="Fichier de Données"/>
        <label htmlFor="file-upload" className="relative cursor-pointer bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-3 px-4 rounded-md flex items-center justify-between transition-colors">
          <span className="truncate max-w-[calc(100%-3rem)]">{file ? file.name : "Choisir un fichier .xlsx"}</span>
          <FileUploadIcon className="w-5 h-5 text-slate-400" />
        </label>
        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".xlsx, .xls" />
        {file && (
            <button onClick={() => setFile(null)} className="mt-2 text-sm text-red-400 hover:text-red-300 w-full text-right">
                Retirer
            </button>
        )}
      </div>

      {/* Section 2: Parameters */}
      <div>
        <SectionHeader icon={<SettingsIcon className="w-6 h-6 text-slate-400" />} title="Paramètres de l'Arrêt" />
        <div className="space-y-4">
          <div>
            <label htmlFor="shutdownStart" className="block text-sm font-medium text-slate-400 mb-1">Début de l'Arrêt</label>
            <input type="datetime-local" id="shutdownStart" name="shutdownStart" value={parameters.shutdownStart} onChange={handleParamChange} className="w-full bg-slate-700 border-slate-600 rounded-md px-3 py-2 text-slate-200 focus:ring-blue-500 focus:border-blue-500"/>
          </div>
          <div>
            <label htmlFor="shutdownEnd" className="block text-sm font-medium text-slate-400 mb-1">Fin de l'Arrêt</label>
            <input type="datetime-local" id="shutdownEnd" name="shutdownEnd" value={parameters.shutdownEnd} onChange={handleParamChange} className="w-full bg-slate-700 border-slate-600 rounded-md px-3 py-2 text-slate-200 focus:ring-blue-500 focus:border-blue-500"/>
          </div>
          {!isColdStopFlow && (
            <>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="consignation" className="block text-sm font-medium text-slate-400 mb-1">Consignation (min)</label>
                    <input type="number" id="consignation" name="consignation" value={parameters.consignation} onChange={handleParamChange} className="w-full bg-slate-700 border-slate-600 rounded-md px-3 py-2 text-slate-200"/>
                  </div>
                  <div>
                    <label htmlFor="deconsignation" className="block text-sm font-medium text-slate-400 mb-1">Déconsignation (min)</label>
                    <input type="number" id="deconsignation" name="deconsignation" value={parameters.deconsignation} onChange={handleParamChange} className="w-full bg-slate-700 border-slate-600 rounded-md px-3 py-2 text-slate-200"/>
                  </div>
              </div>
              <div className="space-y-3">
                 <label className="block text-sm font-medium text-slate-400">Stratégie d'Allumage Combustion</label>
                 <div className="flex gap-4 rounded-md bg-slate-700 p-1">
                     <button
                        onClick={() => handleCombustionChange('mode', 'parallel')}
                        className={`w-full text-center text-xs py-2 rounded ${parameters.combustion.mode === 'parallel' ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-600/50'}`}
                    >
                        En parallèle (avant fin)
                    </button>
                    <button
                        onClick={() => handleCombustionChange('mode', 'after_deconsignation')}
                        className={`w-full text-center text-xs py-2 rounded ${parameters.combustion.mode === 'after_deconsignation' ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-600/50'}`}
                    >
                        Après Déconsignation
                    </button>
                 </div>
                 <div>
                    <label htmlFor="combustionValue" className="block text-sm font-medium text-slate-400 mb-1">Durée Allumage (min)</label>
                    <input
                      type="number"
                      id="combustionValue"
                      name="combustionValue"
                      value={parameters.combustion.value}
                      onChange={(e) => handleCombustionChange('value', e.target.value)}
                      className="w-full bg-slate-700 border-slate-600 rounded-md px-3 py-2 text-slate-200"
                    />
                 </div>
              </div>
              <div>
                <label htmlFor="demarrage" className="block text-sm font-medium text-slate-400 mb-1">Durée Démarrage (min)</label>
                <input
                  type="number"
                  id="demarrage"
                  name="demarrage"
                  value={parameters.demarrage}
                  onChange={handleParamChange}
                  className="w-full bg-slate-700 border-slate-600 rounded-md px-3 py-2 text-slate-200"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section 3: Action Button */}
      <div>
        <button
          onClick={onCalculate}
          disabled={!file || isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md flex items-center justify-center transition-colors shadow-lg disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              {/* FIX: Corrected invalid viewBox attribute in SVG element. */}
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              <span>Mise à jour...</span>
            </>
          ) : 'Mettre à Jour le Planning'}
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;