import React from 'react';
import { Scale } from '@/app/components/ui/icons/Scale';
import type { CaseStage, JudicialDecision } from '@/app/types/criminal';
import type { CassationCorrectionUserRole } from '../decisionAppealPeriodEngine';
import {
    resolveDecisionAppealActions,
    type DecisionAppealActionKind,
} from '../decisionAppealPeriodEngine';

export type DecisionCardAppealFooterProps = {
    decision: JudicialDecision;
    caseStage?: CaseStage;
    decisionRecordStage?: CaseStage;
    crimeTypeLabel?: string;
    readOnly?: boolean;
    userRole?: CassationCorrectionUserRole;
    onCassationAppeal: () => void;
    onInterventionCassation: () => void;
    onCassationCorrection: () => void;
    onDeclareJudgmentFinal: () => void;
    onRecordAppealResult?: () => void;
    prominentCassation?: boolean;
};

const btnBase =
    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-black transition whitespace-normal break-words';

/**
 * شريط إجراءات الطعون على بطاقة القرار — تذييل موحّد:
 * تمييز عادي | تدخل تمييزي | تصحيح قرار تمييزي | إعلان بات | نتيجة معلّقة.
 */
export const DecisionCardAppealFooter = ({
    decision,
    caseStage,
    decisionRecordStage,
    crimeTypeLabel,
    readOnly,
    userRole,
    onCassationAppeal,
    onInterventionCassation,
    onCassationCorrection,
    onDeclareJudgmentFinal,
    onRecordAppealResult,
    prominentCassation,
}: DecisionCardAppealFooterProps) => {
    const actions = resolveDecisionAppealActions(decision, {
        caseStage,
        decisionRecordStage,
        crimeTypeLabel,
        readOnly,
        userRole,
    });
    if (!actions.length) return null;

    const renderAction = (kind: DecisionAppealActionKind) => {
        if (kind === 'cassation_appeal') {
            return (
                <button
                    key={kind}
                    type="button"
                    onClick={onCassationAppeal}
                    aria-label="تسجيل طعن تمييزي"
                    className={
                        prominentCassation
                            ? `${btnBase} border-[#E6C673]/65 bg-[#E6C673]/20 text-[#E6C673] hover:bg-[#E6C673]/30 text-[12px]`
                            : `${btnBase} border-[#E6C673]/55 bg-[#E6C673]/12 text-[#E6C673] hover:bg-[#E6C673]/22`
                    }
                >
                    <Scale className="w-4 h-4 shrink-0" aria-hidden />
                    <span>تسجيل طعن تمييزي</span>
                </button>
            );
        }
        if (kind === 'intervention_cassation') {
            return (
                <button
                    key={kind}
                    type="button"
                    onClick={onInterventionCassation}
                    aria-label="طلب تدخل تمييزي"
                    className={`${btnBase} border-violet-500/50 bg-violet-500/12 text-violet-100 hover:bg-violet-500/20`}
                >
                    <Scale className="w-4 h-4 shrink-0" aria-hidden />
                    <span>طلب تدخل تمييزي</span>
                </button>
            );
        }
        if (kind === 'cassation_correction') {
            return (
                <button
                    key={kind}
                    type="button"
                    onClick={onCassationCorrection}
                    aria-label="طلب تصحيح القرار التمييزي"
                    className={`${btnBase} border-amber-500/50 bg-amber-500/10 text-amber-100 hover:bg-amber-500/18`}
                >
                    <Scale className="w-4 h-4 shrink-0" aria-hidden />
                    <span>طلب تصحيح القرار التمييزي</span>
                </button>
            );
        }
        if (kind === 'declare_judgment_final') {
            return (
                <button
                    key={kind}
                    type="button"
                    onClick={onDeclareJudgmentFinal}
                    aria-label="إعلان حكم بات"
                    className={`${btnBase} border-white/15 bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white text-[10px]`}
                >
                    <span>إعلان حكم بات</span>
                </button>
            );
        }
        if (kind === 'record_appeal_result' && onRecordAppealResult) {
            return (
                <button
                    key={kind}
                    type="button"
                    onClick={onRecordAppealResult}
                    aria-label="تسجيل نتيجة الطعن المعلّق"
                    className={`${btnBase} border-[#E6C673]/45 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/20`}
                >
                    <Scale className="w-4 h-4 shrink-0" aria-hidden />
                    <span>تسجيل نتيجة الطعن المعلّق</span>
                </button>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="إجراءات الطعن التمييزي">
            {actions.map((kind) => renderAction(kind))}
        </div>
    );
};
