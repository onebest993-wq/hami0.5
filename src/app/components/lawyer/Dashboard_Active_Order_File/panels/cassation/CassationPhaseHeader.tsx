import React from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
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
            <div className="flex items-center gap-2 min-w-0">
                <span className="text-white/40 text-xs font-bold tabular-nums shrink-0">{cassationStepNumber}</span>
                <div className="text-white font-bold text-sm">
                    {showGrievanceStep ? 'الطعن التمييزي' : 'الطعن التمييزي (مباشر)'}
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
                            className="inline-flex min-h-[44px] items-center px-2 rounded-lg hover:bg-white/10 text-white text-[11px] font-bold touch-manipulation"
                        >
                            تعديل
                        </span>
                    )}
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-white/40 ${
                        activeLifecycleStep === 'cassation' ? 'rotate-180' : ''
                    }`}
                />
            </div>
        </button>
    );
}
