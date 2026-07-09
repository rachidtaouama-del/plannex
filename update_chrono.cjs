const fs = require('fs');

const GANTT_PATH = 'c:\\Users\\HP\\Downloads\\copy-of-plannex-account-99.84ra-s\\components\\previews\\ChronologyGanttChart.tsx';
let ganttContent = fs.readFileSync(GANTT_PATH, 'utf8');

ganttContent = ganttContent.replace(
    /className="mt-8 p-4 bg-slate-700\/30 rounded-lg"/,
    `className="mt-8 p-6 bg-slate-800/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl relative overflow-hidden"`
);

ganttContent = ganttContent.replace(
    /<h5 className="text-md font-semibold text-slate-300 mb-8">Gantt de Chronologie<\/h5>/,
    `<div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
             <h5 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-yellow-400 mb-6 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                Gantt de Chronologie
             </h5>`
);

// Planned Bar
ganttContent = ganttContent.replace(
    /className="absolute bg-yellow-500 h-3 rounded-sm shadow-md"/g,
    `className="absolute bg-gradient-to-r from-amber-400 to-yellow-500 h-2.5 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)] border border-yellow-300/20 transition-all hover:brightness-110"`
);

// Actual Bar
ganttContent = ganttContent.replace(
    /className="absolute bg-blue-500 h-4 rounded-sm shadow-md"/g,
    `className="absolute bg-gradient-to-r from-blue-500 to-cyan-400 h-3.5 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] border border-cyan-300/20 transition-all z-10 hover:brightness-110"`
);

// Legend
ganttContent = ganttContent.replace(
    /<div className="w-4 h-3 rounded-sm bg-yellow-500 mr-2"><\/div>/,
    `<div className="w-4 h-3 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 shadow-[0_0_5px_rgba(251,191,36,0.5)] mr-2"></div>`
);
ganttContent = ganttContent.replace(
    /<div className="w-4 h-4 rounded-sm bg-blue-500 mr-2"><\/div>/,
    `<div className="w-4 h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_5px_rgba(59,130,246,0.5)] mr-2"></div>`
);

// Grid borders
ganttContent = ganttContent.replace(/border-slate-600\/50/g, 'border-white/5');

// Text color in left column
ganttContent = ganttContent.replace(/className="w-1\/3 pr-4 text-right text-sm text-slate-300 truncate"/g, 'className="w-1/3 pr-4 text-right text-xs font-medium text-slate-300 truncate"');

fs.writeFileSync(GANTT_PATH, ganttContent, 'utf8');

const EVAL_PATH = 'c:\\Users\\HP\\Downloads\\copy-of-plannex-account-99.84ra-s\\components\\EvaluationView.tsx';
let evalContent = fs.readFileSync(EVAL_PATH, 'utf8');

// Replace standard input fields in chronology with better UI
evalContent = evalContent.replace(
    /className="bg-transparent border-0 rounded px-2 py-1 w-full focus:bg-slate-700 focus:ring-1 focus:ring-blue-500"/g,
    'className="bg-slate-800/60 border border-white/10 rounded-lg px-3 py-1.5 w-full text-slate-200 focus:bg-slate-700/80 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all hover:bg-slate-800"'
);

evalContent = evalContent.replace(
    /className="bg-transparent border-0 rounded px-2 py-1 w-44 focus:bg-slate-700 focus:ring-1 focus:ring-blue-500"/g,
    'className="bg-slate-800/60 border border-white/10 rounded-lg px-3 py-1.5 w-44 text-slate-200 text-xs focus:bg-slate-700/80 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all hover:bg-slate-800"'
);

fs.writeFileSync(EVAL_PATH, evalContent, 'utf8');
console.log('Successfully updated UI for Chronology sections.');
