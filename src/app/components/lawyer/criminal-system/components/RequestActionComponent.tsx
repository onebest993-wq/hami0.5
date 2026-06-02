import React from 'react';
import type { CaseStage, JudicialDecision } from '@/app/types/criminal';
import type { CriminalCaseUserRole } from '../complainantCassationGovernance';
import type { CassationCorrectionUserRole } from '../decisionAppealPeriodEngine';
import { DecisionCardAppealFooter } from './DecisionCardAppealFooter';
import {
    resolveEffectiveRequestOrderDecision,
    resolveProceedingsBlockAppealability,
    resolveProceedingsBlockToggleValue,
    shouldShowProceedingsBlockToggle,
    shouldShowRequestOrderAppealActions,
} from '../requestActionEngine';

export type RequestActionComponentProps = {
    decision: JudicialDecision;
    caseStage?: CaseStage;
    /** مرحلة إصدار القرار/الطلب — لعزل طلبات التحقيق بعد الانتقال. */
    decisionRecordStage?: CaseStage;
    crimeTypeLabel?: string;
    readOnly?: boolean;
    userRole?: CassationCorrectionUserRole | CriminalCaseUserRole;
    onProceedingsBlockChange?: (blocksProceedings: boolean) => void;
    onCassationAppeal: () => void;
    onInterventionCassation: () => void;
    onCassationCorrection: () => void;
    onDeclareJudgmentFinal: () => void;
    onRecordAppealResult?: () => void;
    prominentCassation?: boolean;
};

const toggleBtnBase =
    'rounded-lg border px-2.5 py-1 text-[10px] font-black transition whitespace-normal break-words';

/**
 * أزرار الطعن ومفتاح «منع/وقف سير الدعوى» لأوامر القاضي على طلبات المحامين.
 * يُمرَّر قراراً موروثاً من السجل ويُعيد استخدام DecisionCardAppealFooter.
 */
export const RequestActionComponent = ({
    decision,
    caseStage,
    decisionRecordStage,
    crimeTypeLabel,
    readOnly,
    userRole,
    onProceedingsBlockChange,
    onCassationAppeal,
    onInterventionCassation,
    onCassationCorrection,
    onDeclareJudgmentFinal,
    onRecordAppealResult,
    prominentCassation,
}: RequestActionComponentProps) => {
    const showToggle = shouldShowProceedingsBlockToggle(decision, caseStage, decisionRecordStage);
    const blocksProceedings = resolveProceedingsBlockToggleValue(decision);
    const showAppeals = shouldShowRequestOrderAppealActions(decision, caseStage, decisionRecordStage);
    const effectiveDecision = resolveEffectiveRequestOrderDecision(
        decision,
        caseStage,
        decisionRecordStage,
    );

    const handleToggle = (next: boolean) => {
        if (readOnly || !onProceedingsBlockChange) return;
        onProceedingsBlockChange(next);
    };

    if (!showToggle && !showAppeals) return null;

    return (
        <div className="flex flex-col gap-2 w-full">
            {showToggle ? (
                <div
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 space-y-1.5"
                    role="group"
                    aria-label="هل القرار يترتب عليه منع أو وقف في سير الدعوى؟"
                >
                    <span className="block text-[10px] font-bold text-white/75 whitespace-normal break-words">
                        هل القرار يترتب عليه منع أو وقف في سير الدعوى؟
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            role="radio"
                            aria-checked={blocksProceedings}
                            disabled={readOnly || !onProceedingsBlockChange}
                            onClick={() => handleToggle(true)}
                            className={`${toggleBtnBase} ${
                                blocksProceedings
                                    ? 'border-[#E6C673]/55 bg-[#E6C673]/15 text-[#E6C673]'
                                    : 'border-white/15 bg-white/[0.04] text-white/60 hover:text-white/85'
                            }`}
                        >
                            نعم
                        </button>
                        <button
                            type="button"
                            role="radio"
                            aria-checked={!blocksProceedings}
                            disabled={readOnly || !onProceedingsBlockChange}
                            onClick={() => handleToggle(false)}
                            className={`${toggleBtnBase} ${
                                !blocksProceedings
                                    ? 'border-slate-500/45 bg-slate-700/35 text-slate-200'
                                    : 'border-white/15 bg-white/[0.04] text-white/60 hover:text-white/85'
                            }`}
                        >
                            لا
                        </button>
                    </div>
                </div>
            ) : null}

            {showAppeals ? (
                <DecisionCardAppealFooter
                    decision={effectiveDecision}
                    caseStage={caseStage}
                    decisionRecordStage={decisionRecordStage}
                    crimeTypeLabel={crimeTypeLabel}
                    readOnly={readOnly}
                    userRole={userRole}
                    onCassationAppeal={onCassationAppeal}
                    onInterventionCassation={onInterventionCassation}
                    onCassationCorrection={onCassationCorrection}
                    onDeclareJudgmentFinal={onDeclareJudgmentFinal}
                    onRecordAppealResult={onRecordAppealResult}
                    prominentCassation={prominentCassation}
                />
            ) : null}
        </div>
    );
};

export { resolveProceedingsBlockAppealability };
