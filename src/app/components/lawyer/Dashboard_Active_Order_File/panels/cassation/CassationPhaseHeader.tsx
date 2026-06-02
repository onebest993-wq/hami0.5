import React from 'react';
import { Scale, ChevronDown } from 'lucide-react';
import type { CassationLifecyclePanelProps } from '../CassationLifecyclePanelProps';

export function CassationPhaseHeader(props: CassationLifecyclePanelProps) {
    const {
        activeLifecycleStep,
        caseData,
        cassationStepNumber,
        isFinalized,
        setActiveLifecycleStep,
        setEditCassation,
        showGrievanceStep,
        toggleLifecycleStep,
    } = props;

    return (
                                    <button
                                        type="button"
                                        onClick={() => toggleLifecycleStep('cassation')}
                                        className="w-full px-4 py-4 flex items-center justify-between gap-3 text-right bg-gradient-to-r from-purple-900/30 to-violet-900/20 hover:from-purple-900/40 hover:to-violet-900/30 group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center border border-purple-500/40 bg-purple-500/10">
                                                <span className="text-sm font-extrabold text-white">{cassationStepNumber}</span>
                                            </div>
                                            <div>
                                                <div className="text-white font-extrabold text-sm flex items-center gap-2">
                                                    <Scale size={18} className="text-purple-300" />
                                                    {showGrievanceStep ? 'الطعن التمييزي' : 'الطعن التمييزي (مباشر)'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-white/60 text-xs">
                                            {caseData?.cassationOutcome === 'expired' || caseData?.cassationDecision
                                                ? '✅'
                                                : caseData?.cassationOutcome === 'filed'
                                                  ? '⏳'
                                                  : activeLifecycleStep === 'cassation'
                                                    ? 'مفتوحة'
                                                    : '—'}
                                            {!isFinalized &&
                                                !caseData?.cassationDecision &&
                                                caseData?.cassationOutcome !== 'expired' &&
                                                !!caseData?.cassationOutcome && (
                                                <span
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditCassation(true);
                                                        setActiveLifecycleStep('cassation');
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-md bg-transparent hover:bg-white/10 text-white text-[11px] font-bold"
                                                >
                                                    ✏️ تعديل
                                                </span>
                                            )}
                                            <ChevronDown
                                                size={18}
                                                className={`shrink-0 text-white/50 transition-transform duration-200 ${
                                                    activeLifecycleStep === 'cassation' ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </div>
                                    </button>
    );
}
