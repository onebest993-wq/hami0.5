import type { Dispatch, SetStateAction } from 'react';
import type { CaseStage } from '@/app/types/criminal';
import type { StageConclusion } from '../criminalStore';
import type { CriminalDefendant } from '../criminalCaseModel';
import {
    INVESTIGATION_ARTICLE_130_DECISIONS,
    JUVENILE_REMEDIAL_DECISION_OPTIONS,
    PRIVATE_RIGHT_WAIVER_DECISION_LABEL,
    PRIVATE_RIGHT_WAIVER_DECISION_VALUE,
} from '../criminalStageUtils';
import {
    getStageTransitionOptions,
    isProceduralRouteDecisionType,
} from '../stageJourneyTransitionCore';
import {
    getTrialCourtReferralOrderOptions,
    referralOrderMenuLabel,
    type TrialReferralOrderActionId,
} from '../trialReferralOrdersEngine';
import {
    caseAllowsFugitiveParallelSplit,
    INVESTIGATION_FUGITIVE_PARALLEL_SPLIT_LABEL,
} from '../investigationPhaseGuidance';
import type { StageCloserDecisionType } from '../orchestrators/criminalOrchestratorSliceTypes';
import { isStageDecisionType } from './stageCloserModalGuards';

export type StageCloserDecisionTypeFieldProps = {
    stageCloserReferralOnly: boolean;
    isTrialCourtStage: boolean;
    isCassationStage: boolean;
    isInvestigationPhase: boolean;
    isJuvenileTrial: boolean;
    isPrivateRightWaived: boolean;
    caseStage: CaseStage;
    defendants: CriminalDefendant[];
    closureDecisionType: StageCloserDecisionType;
    setClosureDecisionType: Dispatch<SetStateAction<StageCloserDecisionType>>;
    closureSuspendedExecution: boolean;
    setClosureSuspendedExecution: Dispatch<SetStateAction<boolean>>;
};

export function StageCloserDecisionTypeField({
    stageCloserReferralOnly,
    isTrialCourtStage,
    isCassationStage,
    isInvestigationPhase,
    isJuvenileTrial,
    isPrivateRightWaived,
    caseStage,
    defendants,
    closureDecisionType,
    setClosureDecisionType,
    closureSuspendedExecution,
    setClosureSuspendedExecution,
}: StageCloserDecisionTypeFieldProps) {
    if (stageCloserReferralOnly) {
        return isTrialCourtStage ? (
            <div>
                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                    نوع قرار الإحالة
                </label>
                <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                    value={closureDecisionType}
                    onChange={(e) => {
                        const val = e.target.value;
                        setClosureDecisionType(
                            isProceduralRouteDecisionType(val)
                                ? (val as StageConclusion['decisionType'])
                                : '',
                        );
                    }}
                >
                    <option value="" className="bg-slate-900 text-white">
                        اختر...
                    </option>
                    {getTrialCourtReferralOrderOptions(caseStage).map((opt) => (
                        <option
                            key={opt.actionId}
                            value={opt.actionId}
                            className="bg-slate-900 text-white"
                        >
                            {referralOrderMenuLabel(
                                opt.actionId as TrialReferralOrderActionId,
                            )}
                        </option>
                    ))}
                </select>
            </div>
        ) : null;
    }

    return (
        <div>
            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                نوع القرار
            </label>
            <select
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                value={closureSuspendedExecution ? 'conviction_suspended' : closureDecisionType}
                onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'conviction_suspended') {
                        setClosureDecisionType('conviction');
                        setClosureSuspendedExecution(true);
                        return;
                    }
                    if (val === PRIVATE_RIGHT_WAIVER_DECISION_VALUE) {
                        setClosureDecisionType(PRIVATE_RIGHT_WAIVER_DECISION_VALUE);
                        setClosureSuspendedExecution(false);
                        return;
                    }
                    setClosureDecisionType(
                        isStageDecisionType(val) || isProceduralRouteDecisionType(val)
                            ? (val as StageConclusion['decisionType'])
                            : '',
                    );
                    setClosureSuspendedExecution(false);
                }}
            >
                <option value="" className="bg-slate-900 text-white">
                    اختر...
                </option>
                {isCassationStage ? (
                    <>
                        {getStageTransitionOptions('cassation').map((opt) => (
                            <option
                                key={opt.actionId}
                                value={opt.actionId}
                                className="bg-slate-900 text-white"
                            >
                                {opt.menuLabel}
                            </option>
                        ))}
                        <option value="cassation_quash_remand" className="bg-slate-900 text-white">
                            نقض الحكم وإعادة الأوراق لمحكمة الموضوع (تلقائي)
                        </option>
                        <option value="cassation_quash_reduce" className="bg-slate-900 text-white">
                            نقض الحكم وتخفيف العقوبة دون إعادة
                        </option>
                        <option
                            value="cassation_quash_acquit_release"
                            className="bg-slate-900 text-white"
                        >
                            نقض الحكم وإلغاء التهمة والإفراج الفوري
                        </option>
                    </>
                ) : isInvestigationPhase ? (
                    <>
                        {INVESTIGATION_ARTICLE_130_DECISIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                                {opt.label}
                            </option>
                        ))}
                        {caseAllowsFugitiveParallelSplit(defendants) ? (
                            <option
                                value="case_split_fugitive_referral"
                                className="bg-slate-900 text-white"
                            >
                                ✂️{' '}
                                {INVESTIGATION_FUGITIVE_PARALLEL_SPLIT_LABEL}
                            </option>
                        ) : null}
                        <option
                            value="temporary_release_insufficient_evidence"
                            className="bg-slate-900 text-white"
                        >
                            🔒 إفراج مؤقت لعدم كفاية الأدلة
                        </option>
                    </>
                ) : closureDecisionType === 'default_judgment_opposition' ? (
                    <option value="default_judgment_opposition" className="bg-slate-900 text-white">
                        🔓 تقديم طعن واعتراض معارضة غيابية
                    </option>
                ) : isJuvenileTrial ? (
                    <>
                        {JUVENILE_REMEDIAL_DECISION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                                {opt.label}
                            </option>
                        ))}
                        <option value="acquittal" className="bg-slate-900 text-white">
                            حكم بالبراءة / الإفراج لعدم كفاية الأدلة
                        </option>
                        <option value="release" className="bg-slate-900 text-white">
                            إفراج
                        </option>
                    </>
                ) : isTrialCourtStage ? (
                    <>
                        {getStageTransitionOptions(caseStage).map((opt) => (
                            <option
                                key={opt.actionId}
                                value={opt.actionId}
                                className="bg-slate-900 text-white"
                            >
                                {opt.menuLabel}
                            </option>
                        ))}
                        <option value="conviction" className="bg-slate-900 text-white">
                            إدانة
                        </option>
                        <option value="acquittal" className="bg-slate-900 text-white">
                            براءة
                        </option>
                        <option value="release" className="bg-slate-900 text-white">
                            إفراج
                        </option>
                        <option value="conviction_suspended" className="bg-slate-900 text-white">
                            إيقاف تنفيذ
                        </option>
                        <option value="expiration" className="bg-slate-900 text-white">
                            انقضاء/سقوط الدعوى الجزائية
                        </option>
                        <option value="postpone_article_183" className="bg-slate-900 text-white">
                            ⏳ إيقاف الدعوى واستئخارها للمادة 183
                        </option>
                        <option value="default_judgment_issue" className="bg-slate-900 text-white">
                            ⚖️ صدور حكم غيابي وأرشفة الدعوى
                        </option>
                    </>
                ) : (
                    <>
                        <option value="conviction" className="bg-slate-900 text-white">
                            إدانة
                        </option>
                        {defendants.some((d) => Boolean(d.isJuvenile)) ? (
                            <option value="juvenile_severance_referral" className="bg-slate-900 text-white">
                                تفريق دعوى المتهم الحدث (مسار محكمة الأحداث)
                            </option>
                        ) : null}
                        <option value="acquittal" className="bg-slate-900 text-white">
                            براءة
                        </option>
                        <option value="release" className="bg-slate-900 text-white">
                            إفراج
                        </option>
                        <option value="conviction_suspended" className="bg-slate-900 text-white">
                            إيقاف تنفيذ
                        </option>
                        <option value="expiration" className="bg-slate-900 text-white">
                            انقضاء/سقوط الدعوى الجزائية
                        </option>
                    </>
                )}
                {!isPrivateRightWaived && !stageCloserReferralOnly ? (
                    <option
                        value={PRIVATE_RIGHT_WAIVER_DECISION_VALUE}
                        className="bg-slate-900 text-white"
                    >
                        {PRIVATE_RIGHT_WAIVER_DECISION_LABEL}
                    </option>
                ) : null}
            </select>
        </div>
    );
}
