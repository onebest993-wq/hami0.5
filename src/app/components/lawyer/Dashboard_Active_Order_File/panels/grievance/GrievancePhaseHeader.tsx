import React from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import type { GrievanceLifecyclePanelProps } from '../GrievanceLifecyclePanelProps';
import { URGENT_LIFECYCLE_STEP_HEADER } from '../../layout/urgentDossierUi';

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

    const statusChip =
        caseData?.grievanceOutcome === 'expired' || caseData?.grievanceDecision
            ? 'مكتملة'
            : caseData?.grievanceOutcome === 'filed'
              ? 'قيد السير'
              : activeLifecycleStep === 'grievance'
                ? 'مفتوحة'
                : '—';

    return (
        <button type="button" onClick={() => toggleLifecycleStep('grievance')} className={URGENT_LIFECYCLE_STEP_HEADER}>
            <div className="flex items-center gap-2 min-w-0">
                <span className="text-white/40 text-xs font-bold tabular-nums shrink-0">{grievanceStepNumber}</span>
                <div className="text-white font-bold text-sm">مرحلة التظلم</div>
            </div>
            <div className="flex items-center gap-2 text-white/50 text-[11px] shrink-0">
                <span>{statusChip}</span>
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
                            className="inline-flex min-h-[44px] items-center px-2 rounded-lg hover:bg-white/10 text-white text-[11px] font-bold touch-manipulation"
                        >
                            تعديل
                        </span>
                    )}
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-white/40 ${
                        activeLifecycleStep === 'grievance' ? 'rotate-180' : ''
                    }`}
                />
            </div>
        </button>
    );
}
