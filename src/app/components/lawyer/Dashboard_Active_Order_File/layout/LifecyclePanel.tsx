import React from 'react';
import { PRE_DECISION_OUTCOME_NULLIFY } from '../constants/hearingOutcomes';
import type { LifecyclePanelProps } from './LifecyclePanelProps';
import { GrievanceLifecyclePanel } from '../panels/GrievanceLifecyclePanel';
import { CassationLifecyclePanel } from '../panels/CassationLifecyclePanel';
import { JudgeDecisionLifecyclePanel } from '../panels/JudgeDecisionLifecyclePanel';
import {
    pickCassationLifecyclePanelProps,
    pickGrievanceLifecyclePanelProps,
    pickJudgeDecisionLifecyclePanelProps,
} from '../panels/pickLifecyclePanelProps';
import { URGENT_DOSSIER_CARD, URGENT_DOSSIER_SECTION_TITLE } from './urgentDossierUi';

export type { LifecyclePanelProps } from './LifecyclePanelProps';

type LifecyclePanelComponentProps = LifecyclePanelProps & { embedded?: boolean };

export function LifecyclePanel({ embedded = false, ...props }: LifecyclePanelComponentProps) {
    const {
        guaranteeGateActive,
        isFinalityTerminatedRequest,
        isFinalized,
        latestOutcome,
        showCassationLifecycle,
        showGrievanceLifecycle,
    } = props;

    const inner = (
        <>
            {guaranteeGateActive ? (
                <div className="border border-amber-500/25 bg-amber-500/10 rounded-lg px-3 py-2 mb-3">
                    <div className="text-amber-100 text-xs font-bold leading-relaxed">
                        قرار القاضي معلق: يرجى إيداع الكفالة الضامنة لفتح إجراءات التنفيذ والتبليغ
                    </div>
                </div>
            ) : null}

            <div className="space-y-2">
                <JudgeDecisionLifecyclePanel {...pickJudgeDecisionLifecyclePanelProps(props)} />

                {showGrievanceLifecycle ? (
                    <GrievanceLifecyclePanel {...pickGrievanceLifecyclePanelProps(props)} />
                ) : null}

                {showCassationLifecycle ? (
                    <CassationLifecyclePanel {...pickCassationLifecyclePanelProps(props)} />
                ) : null}

                {isFinalized ? (
                    <div className="pt-1">
                        {isFinalityTerminatedRequest || latestOutcome === PRE_DECISION_OUTCOME_NULLIFY ? (
                            <div className="bg-red-900/40 text-red-200 px-3 py-2.5 rounded-lg font-bold text-center text-sm border border-red-700/50">
                                تم إبطال الطلب وغلق الإضبارة نهائياً
                            </div>
                        ) : (
                            <div className="border border-emerald-500/25 bg-emerald-500/10 rounded-lg px-3 py-2.5 text-emerald-100 font-bold text-center text-sm">
                                اكتسب القرار الدرجة القطعية — تم إنهاء الإضبارة
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </>
    );

    if (embedded) {
        return (
            <section aria-label="سير الإجراءات القضائية">
                <h2 className={URGENT_DOSSIER_SECTION_TITLE}>سير الإجراءات القضائية</h2>
                <div className="mt-3">{inner}</div>
            </section>
        );
    }

    return (
        <div className={`${URGENT_DOSSIER_CARD} p-4`}>
            <h3 className={URGENT_DOSSIER_SECTION_TITLE}>سير الإجراءات القضائية</h3>
            <div className="mt-3">{inner}</div>
        </div>
    );
}
