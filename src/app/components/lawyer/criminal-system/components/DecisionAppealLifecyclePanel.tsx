import React from 'react';
import { Scale } from 'lucide-react';
import type { CaseStage, JudicialDecision } from '@/app/types/criminal';
import {
    resolveDecisionAppealActions,
    resolveDecisionAppealBadge,
    type CassationCorrectionUserRole,
    type DecisionAppealActionKind,
} from '../decisionAppealPeriodEngine';

const BADGE_CLASS: Record<string, string> = {
    review: 'border-sky-500/45 bg-sky-500/12 text-sky-100',
    result: 'border-emerald-500/45 bg-emerald-500/12 text-emerald-100',
    countdown: 'border-orange-500/50 bg-orange-500/10 text-orange-100',
    finality: 'border-emerald-600/50 bg-emerald-900/25 text-emerald-100',
    preparatory_final: 'border-slate-500/45 bg-slate-700/35 text-slate-300',
};

export type DecisionAppealLifecyclePanelProps = {
    decision: JudicialDecision;
    caseStage?: CaseStage;
    crimeTypeLabel?: string;
    readOnly?: boolean;
    userRole?: CassationCorrectionUserRole;
    onCassationAppeal: () => void;
    onInterventionCassation?: () => void;
    onCassationCorrection?: () => void;
    onDeclareJudgmentFinal?: () => void;
    onRecordAppealResult?: () => void;
    prominentCassation?: boolean;
};

const btnBase =
    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-black transition whitespace-normal break-words';

export const DecisionAppealLifecycleBadge = ({
    decision,
    caseStage,
    crimeTypeLabel,
}: {
    decision: JudicialDecision;
    caseStage?: CaseStage;
    crimeTypeLabel?: string;
}) => {
    const badge = resolveDecisionAppealBadge(decision, { caseStage, crimeTypeLabel });
    return (
        <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black whitespace-normal break-words ${
                BADGE_CLASS[badge.tone] ?? BADGE_CLASS.countdown
            }`}
        >
            {badge.label}
        </span>
    );
};

export const DecisionAppealLifecycleActionBar = ({
    decision,
    caseStage,
    crimeTypeLabel,
    readOnly,
    userRole,
    onCassationAppeal,
    onInterventionCassation,
    onCassationCorrection,
    onDeclareJudgmentFinal,
    onRecordAppealResult,
    prominentCassation,
}: DecisionAppealLifecyclePanelProps) => {
    const actions = resolveDecisionAppealActions(decision, { caseStage, crimeTypeLabel, readOnly, userRole });
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
                            ? 'inline-flex items-center gap-1.5 rounded-lg border border-[#E6C673]/65 bg-[#E6C673]/20 px-3 py-1.5 text-[12px] font-black text-[#E6C673] hover:bg-[#E6C673]/30 transition shadow-[0_0_10px_rgba(230,198,115,0.25)]'
                            : 'inline-flex items-center gap-1.5 rounded-lg border border-[#E6C673]/55 bg-[#E6C673]/12 px-3 py-1.5 text-[11px] font-black text-[#E6C673] hover:bg-[#E6C673]/22 transition'
                    }
                >
                    <Scale className="w-4 h-4 shrink-0" aria-hidden />
                    <span>تسجيل طعن تمييزي</span>
                </button>
            );
        }
        if (kind === 'intervention_cassation' && onInterventionCassation) {
            return (
                <button
                    key={kind}
                    type="button"
                    onClick={onInterventionCassation}
                    className={`${btnBase} border-violet-500/50 bg-violet-500/12 text-violet-100 hover:bg-violet-500/20`}
                >
                    <Scale className="w-4 h-4 shrink-0" aria-hidden />
                    <span>طلب تدخل تمييزي</span>
                </button>
            );
        }
        if (kind === 'cassation_correction' && onCassationCorrection) {
            return (
                <button
                    key={kind}
                    type="button"
                    onClick={onCassationCorrection}
                    className={`${btnBase} border-amber-500/50 bg-amber-500/10 text-amber-100 hover:bg-amber-500/18`}
                >
                    <span>طلب تصحيح القرار التمييزي</span>
                </button>
            );
        }
        if (kind === 'declare_judgment_final' && onDeclareJudgmentFinal) {
            return (
                <button
                    key={kind}
                    type="button"
                    onClick={onDeclareJudgmentFinal}
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
        <div className="flex flex-wrap items-center gap-2">
            {actions.map((kind) => renderAction(kind))}
        </div>
    );
};
