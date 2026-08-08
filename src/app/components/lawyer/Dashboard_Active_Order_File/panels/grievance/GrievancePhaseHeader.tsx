import React from 'react';
import { ChevronDown } from '@/app/components/ui/lucideIcons';
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
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center border border-orange-500/35 bg-orange-500/10 shrink-0">
                    <span className="text-xs font-extrabold text-orange-200">{grievanceStepNumber}</span>
                </div>
                <div className="min-w-0">
                    <div className="text-white font-bold text-sm">مرحلة التظلم</div>
                </div>
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
                            className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded-md hover:bg-white/10 text-white text-[11px] font-bold"
                        >
                            تعديل
                        </span>
                    )}
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-white/40 transition-transform duration-200 ${
                        activeLifecycleStep === 'grievance' ? 'rotate-180' : ''
                    }`}
                />
            </div>
        </button>
    );
}
