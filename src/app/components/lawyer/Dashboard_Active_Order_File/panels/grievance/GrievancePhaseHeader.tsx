import React from 'react';
import { Scale, ChevronDown } from 'lucide-react';
import type { GrievanceLifecyclePanelProps } from '../GrievanceLifecyclePanelProps';

export function GrievancePhaseHeader(props: GrievanceLifecyclePanelProps) {
    const {
        activeLifecycleStep,
        caseData,
        defenderPhase2ReadOnly,
        grievanceStepNumber,
        isFinalized,
        setActiveLifecycleStep,
        setEditGrievance,
        toggleLifecycleStep,
    } = props;

    return (
                                    <button
                                        type="button"
                                        onClick={() => toggleLifecycleStep('grievance')}
                                        className="w-full px-4 py-4 flex items-center justify-between gap-3 text-right bg-gradient-to-r from-orange-900/30 to-red-900/20 hover:from-orange-900/40 hover:to-red-900/30 group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center border border-orange-500/40 bg-orange-500/10">
                                                <span className="text-sm font-extrabold text-white">{grievanceStepNumber}</span>
                                            </div>
                                            <div>
                                                <div className="text-white font-extrabold text-sm flex items-center gap-2">
                                                    <Scale size={18} className="text-orange-300" />
                                                    مرحلة التظلم
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-white/60 text-xs">
                                            {caseData?.grievanceOutcome === 'expired' || caseData?.grievanceDecision
                                                ? '✅'
                                                : caseData?.grievanceOutcome === 'filed'
                                                  ? '⏳'
                                                  : activeLifecycleStep === 'grievance'
                                                    ? 'مفتوحة'
                                                    : '—'}
                                            {!isFinalized &&
                                                !defenderPhase2ReadOnly &&
                                                !caseData?.grievanceDecision &&
                                                caseData?.grievanceOutcome !== 'expired' &&
                                                !!caseData?.grievanceOutcome && (
                                                <span
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditGrievance(true);
                                                        setActiveLifecycleStep('grievance');
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-md bg-transparent hover:bg-white/10 text-white text-[11px] font-bold"
                                                >
                                                    ✏️ تعديل
                                                </span>
                                            )}
                                            <ChevronDown
                                                size={18}
                                                className={`shrink-0 text-white/50 transition-transform duration-200 ${
                                                    activeLifecycleStep === 'grievance' ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </div>
                                    </button>
    );
}
