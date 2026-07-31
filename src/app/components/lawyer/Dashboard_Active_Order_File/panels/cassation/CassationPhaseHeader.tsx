import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { CassationLifecyclePanelProps } from '../CassationLifecyclePanelProps';
import { URGENT_LIFECYCLE_STEP_HEADER } from '../../layout/urgentDossierUi';

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

    const statusChip =
        caseData?.cassationOutcome === 'expired' || caseData?.cassationDecision
            ? 'مكتملة'
            : caseData?.cassationOutcome === 'filed'
              ? 'قيد السير'
              : activeLifecycleStep === 'cassation'
                ? 'مفتوحة'
                : '—';

    return (
        <button type="button" onClick={() => toggleLifecycleStep('cassation')} className={URGENT_LIFECYCLE_STEP_HEADER}>
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center border border-purple-500/35 bg-purple-500/10 shrink-0">
                    <span className="text-xs font-extrabold text-purple-200">{cassationStepNumber}</span>
                </div>
                <div className="min-w-0">
                    <div className="text-white font-bold text-sm">
                        {showGrievanceStep ? 'الطعن التمييزي' : 'الطعن التمييزي (مباشر)'}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2 text-white/50 text-[11px] shrink-0">
                <span>{statusChip}</span>
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
                            className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded-md hover:bg-white/10 text-white text-[11px] font-bold"
                        >
                            تعديل
                        </span>
                    )}
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-white/40 transition-transform duration-200 ${
                        activeLifecycleStep === 'cassation' ? 'rotate-180' : ''
                    }`}
                />
            </div>
        </button>
    );
}
