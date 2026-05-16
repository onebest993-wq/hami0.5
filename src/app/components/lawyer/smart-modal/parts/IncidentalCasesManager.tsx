import React from 'react';
import { CheckSquare, Edit3 } from 'lucide-react';
import type { IncidentalCase, IncidentalStatus } from '../../LawyerShared';

export const IncidentalCasesManager = ({ cases, onResolve, onEditCase }: { cases: IncidentalCase[], onResolve?: (caseId: string, status: IncidentalStatus) => void, onEditCase?: (c: IncidentalCase) => void }) => {
    const activeCases = cases.filter(c => c.status === 'active');
    const resolvedCases = cases.filter(c => c.status !== 'active');

    return (
        <div className="mb-4">
             {/* 1. Active Incidental Cases */}
             {activeCases.map(c => (
                <div key={c.id} className="bg-[#1A1E2E] border border-red-500/30 rounded-xl p-4 mb-3 relative overflow-hidden group shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                    <div className="absolute top-0 right-0 w-1 h-full bg-red-500/50" />
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                             <span className="text-xl">⚖️</span>
                             <div>
                                 <h4 className="text-red-400 font-bold text-sm flex items-center gap-2">
                                     {c.type === 'joined' ? 'دعوى منضمة' : c.type === 'counter' ? 'دعوى متقابلة' : 'دخول شخص ثالث'}
                                     <span className="text-[10px] bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/30 animate-pulse">
                                         جاري النظر
                                     </span>
                                 </h4>
                                 <p className="text-[10px] text-white/60">بتاريخ {c.date}</p>
                             </div>
                        </div>
                        <div className="flex gap-1">
                            {onResolve && (
                                <>
                                    <button type="button" 
                                        onClick={() => onResolve(c.id, 'resolved')}
                                        className="px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/30 rounded text-[10px] font-bold hover:bg-green-500/20"
                                    >
                                        حسم
                                    </button>
                                    <button type="button" 
                                        onClick={() => onResolve(c.id, 'rejected')}
                                        className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded text-[10px] font-bold hover:bg-red-500/20"
                                    >
                                        رد
                                    </button>
                                </>
                            )}
                            {onEditCase && (
                                <button type="button" onClick={() => onEditCase(c)} className="text-slate-400 hover:text-amber-500 transition-colors ml-2">
                                    <Edit3 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="bg-black/20 p-2 rounded-lg border border-white/5 flex justify-between items-center">
                        <span className="text-white text-xs font-bold">{c.partyName}</span>
                        <span className="text-[10px] text-white/40">{c.partyRole}</span>
                    </div>
                </div>
            ))}

            {/* 2. Resolved History (Collapsible or Small) */}
            {resolvedCases.length > 0 && (
                <div className="mt-4 border-t border-white/5 pt-2">
                    <h4 className="text-[10px] font-bold text-white/40 mb-2 flex items-center gap-1">
                        <CheckSquare size={10} />
                        الدعاوى المحسومة سابقاً
                    </h4>
                    <div className="space-y-2 opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0">
                        {resolvedCases.map(c => (
                             <div key={c.id} className="bg-white/5 rounded-lg p-3 flex justify-between items-center border border-white/5">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                         <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-gray-500/20 text-gray-400">
                                            {c.type === 'joined' ? 'منضمة' : c.type === 'counter' ? 'متقابلة' : 'شخص ثالث'}
                                        </span>
                                        <span className="text-white text-xs font-bold line-through decoration-white/50">{c.partyName}</span>
                                    </div>
                                    <p className="text-[10px] text-white/40">{c.date}</p>
                                </div>
                                <span className={`text-[9px] font-bold ${c.status === 'resolved' ? 'text-green-500' : 'text-red-500'}`}>
                                    {c.status === 'resolved' ? 'محسومة' : 'مردودة'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
