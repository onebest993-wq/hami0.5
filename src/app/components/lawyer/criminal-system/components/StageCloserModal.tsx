import type { CaseStage } from '@/app/types/criminal';
import type { StageConclusion } from '../criminalStore';
import type { CriminalDefendant, SocialInquiryWorkflowStatus } from '../criminalCaseModel';
import {
    INVESTIGATION_ARTICLE_130_DECISIONS,
    JUVENILE_REMEDIAL_DECISION_OPTIONS,
    PRIVATE_RIGHT_WAIVER_DECISION_LABEL,
    PRIVATE_RIGHT_WAIVER_DECISION_VALUE,
    isPrivateRightWaiverDecisionValue,
} from '../criminalStageUtils';
import {
    isReferralTrialStage,
    isValidSocialInquiryWorkflowStatus,
    socialInquiryWorkflowLabel,
} from '../criminalStagePresentationCore';
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
import { JUVENILE_SOCIAL_INQUIRY_ARTICLE_REF } from '../juvenileInvestigationRules';
import { isCassationClosureQuashDecision } from '../cassationEngine';
import { validateExpirationReasonSelection } from '../stageExpirationReasons';
import {
    decisionRequiresDefendantScope,
    shouldShowDefendantDecisionScopePicker,
} from '../partyPersonalStage';
import { ExpirationReasonFields } from './ExpirationReasonFields';
import { DefendantDecisionScopePicker } from './DefendantDecisionScopePicker';
import type { CriminalStageCloserOrchestratorSlice } from '../orchestrators/criminalOrchestratorSliceTypes';

/** حارس نوع: هل القيمة مرحلة إحالة صالحة (جنح/جنايات)؟ */
export const isReferralStageValue = (v: string): v is 'محكمة الجنح' | 'محكمة الجنايات' =>
    isReferralTrialStage(v);

/** حارس نوع: هل القيمة نوع قرار غلق مرحلة معروف؟ */
export const isStageDecisionType = (v: string): v is StageConclusion['decisionType'] =>
    v === 'referral' ||
    v === 'closing' ||
    v === 'temporary_closing' ||
    v === 'conviction' ||
    v === 'juvenile_deliver_guardian' ||
    v === 'juvenile_behavioral_surveillance' ||
    v === 'juvenile_reform_boys' ||
    v === 'juvenile_youth_school' ||
    v === 'juvenile_fine' ||
    v === 'juvenile_severance_referral' ||
    v === 'acquittal' ||
    v === 'release' ||
    v === 'expiration' ||
    v === 'cassation_confirm' ||
    v === 'cassation_quash_remand' ||
    v === 'cassation_quash_reduce' ||
    v === 'cassation_quash_acquit_release' ||
    v === 'case_split_fugitive_referral' ||
    v === 'temporary_release_insufficient_evidence' ||
    v === 'postpone_article_183' ||
    v === 'default_judgment_issue' ||
    v === 'default_judgment_opposition' ||
    isProceduralRouteDecisionType(v);

/** حارس نوع: هل القيمة حالة متهم لحظة القرار؟ */
export const isDecisionDefendantStatus = (
    v: string,
): v is StageConclusion['defendantStatusAtDecision'] =>
    v === 'detained' || v === 'bailed' || v === 'fugitive';

export type StageCloserModalProps = {
    /** حالة المودال بالكامل — من useCriminalStageCloserOrchestrator */
    closer: CriminalStageCloserOrchestratorSlice;
    defendants: CriminalDefendant[];
    caseStage: CaseStage;
    isCassationStage: boolean;
    isInvestigationPhase: boolean;
    isJuvenileTrial: boolean;
    isTrialCourtStage: boolean;
    isPrivateRightWaived: boolean;
    juvenileAccused: boolean;
    firstJuvenileDefendant: CriminalDefendant | null;
    firstJuvenileSocialWorkflow: SocialInquiryWorkflowStatus;
    patchSocialInquiryReport: (patch: {
        workflowStatus?: SocialInquiryWorkflowStatus;
        isAttached?: boolean;
        receivedDate?: string;
        investigatorName?: string;
        recommendations?: string;
    }) => void;
    onSubmit: () => void;
};

/**
 * مودال «إصدار القرار الختامي للمرحلة» / «أوامر الإحالة — محكمة الموضوع»
 * — مستخرَج من CriminalDashboardResolvedRuntime ضمن تفكيك المكوّن العملاق.
 */
export function StageCloserModal(props: StageCloserModalProps) {
    const {
        closer,
        defendants,
        caseStage,
        isCassationStage,
        isInvestigationPhase,
        isJuvenileTrial,
        isTrialCourtStage,
        isPrivateRightWaived,
        juvenileAccused,
        firstJuvenileDefendant,
        firstJuvenileSocialWorkflow,
        patchSocialInquiryReport,
        onSubmit,
    } = props;
    const {
        setIsStageCloserOpen,
        stageCloserReferralOnly,
        setStageCloserReferralOnly,
        stageCloserError,
        closureDecisionType,
        setClosureDecisionType,
        closureDate,
        setClosureDate,
        closureDetails,
        setClosureDetails,
        closureDefendantStatus,
        setClosureDefendantStatus,
        closureExpirationReason,
        setClosureExpirationReason,
        closureExpirationCustomDetail,
        setClosureExpirationCustomDetail,
        closureExpirationDefendantIds,
        setClosureExpirationDefendantIds,
        closureReferralStage,
        setClosureReferralStage,
        closureReferralCourtName,
        setClosureReferralCourtName,
        closureReferralCaseNumber,
        setClosureReferralCaseNumber,
        closureSuspendedExecution,
        setClosureSuspendedExecution,
        closurePunishmentType,
        setClosurePunishmentType,
        closureJuvenileSeverDefendantId,
        setClosureJuvenileSeverDefendantId,
        closureScopedDefendantIds,
        setClosureScopedDefendantIds,
        closureSharedObjective269b,
        setClosureSharedObjective269b,
    } = closer;

    return (
        <div
            className="fixed inset-0 z-[500] isolate bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stage-closer-title"
            onClick={() => {
                setStageCloserReferralOnly(false);
                setIsStageCloserOpen(false);
            }}
        >
            <div
                className="relative z-[501] w-full max-w-lg max-h-[min(92vh,720px)] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 overflow-hidden isolate"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div
                        id="stage-closer-title"
                        className="text-white font-black text-sm whitespace-normal break-words"
                    >
                        {stageCloserReferralOnly
                            ? 'أوامر الإحالة — محكمة الموضوع'
                            : 'إصدار القرار الختامي للمرحلة'}
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setStageCloserReferralOnly(false);
                            setIsStageCloserOpen(false);
                        }}
                        className="text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words"
                    >
                        إغلاق
                    </button>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    {stageCloserError ? (
                        <div className="rounded-xl border border-red-500/40 bg-red-900/20 p-3 text-red-200 font-black text-sm whitespace-normal break-words">
                            {stageCloserError}
                        </div>
                    ) : null}
                    {stageCloserReferralOnly ? (
                        <p className="text-[11px] font-bold text-sky-200/90 whitespace-normal break-words">
                            قرار حالة حال — يُسجَّل في تبويب الطلبات والقرارات ويُمكن الطعن فيه بالتمييز. يُحدَّث مسار الإضبارة بعد الحفظ.
                        </p>
                    ) : null}
                    {stageCloserReferralOnly ? (
                        isTrialCourtStage ? (
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
                        ) : null
                    ) : (
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
                    )}

                    {closureDecisionType &&
                    !isPrivateRightWaiverDecisionValue(closureDecisionType) &&
                    decisionRequiresDefendantScope(closureDecisionType) &&
                    shouldShowDefendantDecisionScopePicker(defendants) &&
                    closureDecisionType !== 'expiration' &&
                    closureDecisionType !== 'juvenile_severance_referral' &&
                    !(
                        closureSharedObjective269b &&
                        isCassationClosureQuashDecision(closureDecisionType)
                    ) ? (
                        <DefendantDecisionScopePicker
                            defendants={defendants}
                            selectedIds={closureScopedDefendantIds}
                            onChange={setClosureScopedDefendantIds}
                        />
                    ) : null}

                    {isCassationClosureQuashDecision(closureDecisionType) ? (
                        <label className="flex items-center justify-between gap-3 rounded-xl border border-violet-500/40 bg-violet-950/30 px-3 py-2.5 cursor-pointer">
                            <span className="text-[11px] font-bold text-white/85 whitespace-normal break-words">
                                هل أسباب النقض موضوعية مشتركة يستفيد منها بقية المتهمين؟ (المادة 269/ب أصولية)
                            </span>
                            <input
                                type="checkbox"
                                checked={closureSharedObjective269b}
                                onChange={(e) => setClosureSharedObjective269b(e.target.checked)}
                                className="h-5 w-5 accent-[#E6C673]"
                            />
                        </label>
                    ) : null}

                    {juvenileAccused && firstJuvenileDefendant ? (
                        <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 space-y-3">
                            <div className="text-white font-black text-sm whitespace-normal break-words">
                                موقف تقرير الباحث الاجتماعي {JUVENILE_SOCIAL_INQUIRY_ARTICLE_REF}
                            </div>
                            <div>
                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                    حالة التقرير
                                </label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={firstJuvenileSocialWorkflow}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        if (!isValidSocialInquiryWorkflowStatus(v)) return;
                                        patchSocialInquiryReport({
                                            workflowStatus: v,
                                            isAttached: v === 'submitted',
                                        });
                                    }}
                                >
                                    <option value="not_requested" className="bg-slate-900 text-white">
                                        {socialInquiryWorkflowLabel('not_requested')}
                                    </option>
                                    <option value="under_preparation" className="bg-slate-900 text-white">
                                        {socialInquiryWorkflowLabel('under_preparation')}
                                    </option>
                                    <option value="submitted" className="bg-slate-900 text-white">
                                        {socialInquiryWorkflowLabel('submitted')}
                                    </option>
                                </select>
                            </div>
                            {firstJuvenileSocialWorkflow === 'submitted' ? (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                                تاريخ ورود التقرير
                                            </label>
                                            <input
                                                type="date"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                                value={String(firstJuvenileDefendant?.socialInquiryReport?.receivedDate ?? '')}
                                                onChange={(e) => patchSocialInquiryReport({ receivedDate: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                                اسم الباحث الاجتماعي
                                            </label>
                                            <input
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                                value={String(firstJuvenileDefendant?.socialInquiryReport?.investigatorName ?? '')}
                                                onChange={(e) => patchSocialInquiryReport({ investigatorName: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                            توصيات التقرير
                                        </label>
                                        <textarea
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[90px] resize-none"
                                            value={String(firstJuvenileDefendant?.socialInquiryReport?.recommendations ?? '')}
                                            onChange={(e) => patchSocialInquiryReport({ recommendations: e.target.value })}
                                        />
                                    </div>
                                </>
                            ) : null}
                        </div>
                    ) : null}

                    {closureDecisionType === 'expiration' ? (
                        <div className="rounded-xl border border-slate-700/80 bg-slate-800/20 p-2.5 space-y-2">
                            <ExpirationReasonFields
                                reason={closureExpirationReason}
                                customDetail={closureExpirationCustomDetail}
                                onReasonChange={setClosureExpirationReason}
                                onCustomDetailChange={setClosureExpirationCustomDetail}
                                compact
                            />

                            <div>
                                <label className="block text-[#A0AEC0] text-[10px] font-light mb-1 whitespace-normal break-words">
                                    المتهم المعني بالانقضاء
                                </label>
                                <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-2">
                                    {defendants.length ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                            {defendants.map((d) => {
                                                const label = d.fullName.trim() || '—';
                                                const checked = closureExpirationDefendantIds.includes(d.id);
                                                return (
                                                    <label
                                                        key={d.id}
                                                        className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/30 px-2 py-1.5 text-xs font-medium text-white/80"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="h-3.5 w-3.5 accent-[#E6C673]"
                                                            checked={checked}
                                                            onChange={() =>
                                                                setClosureExpirationDefendantIds((prev) =>
                                                                    prev.includes(d.id)
                                                                        ? prev.filter((x) => x !== d.id)
                                                                        : [...prev, d.id],
                                                                )
                                                            }
                                                        />
                                                        <span className="whitespace-normal break-words">{label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-white/60 text-xs whitespace-normal break-words">—</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {closureDecisionType === 'conviction' ? (
                        <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 space-y-3">
                            <div>
                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                    نوع العقوبة
                                </label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={closurePunishmentType}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        setClosurePunishmentType(v === 'death' || v === 'life' || v === 'other' ? v : 'other');
                                    }}
                                >
                                    <option value="death" className="bg-slate-900 text-white">
                                        إعدام
                                    </option>
                                    <option value="life" className="bg-slate-900 text-white">
                                        سجن مؤبد
                                    </option>
                                    <option value="other" className="bg-slate-900 text-white">
                                        عقوبات أخرى
                                    </option>
                                </select>
                            </div>
                        </div>
                    ) : null}

                    {closureDecisionType === 'juvenile_severance_referral' ? (
                        <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 space-y-3">
                            <div>
                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                    المتهم الحدث المراد تفريق دعواه (إجباري)
                                </label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={closureJuvenileSeverDefendantId}
                                    onChange={(e) => setClosureJuvenileSeverDefendantId(e.target.value)}
                                >
                                    <option value="" className="bg-slate-900 text-white">
                                        اختر...
                                    </option>
                                    {defendants
                                        .filter((d) => Boolean(d.isJuvenile))
                                        .map((d) => (
                                            <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                                                {String(d.fullName ?? '').trim() || '—'}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>
                    ) : null}

                    {closureDecisionType === 'referral' ||
                    closureDecisionType === 'case_split_fugitive_referral' ||
                    closureDecisionType === 'misdemeanor_to_felony_jurisdiction' ||
                    closureDecisionType === 'felony_to_misdemeanor_jurisdiction' ? (
                        <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 space-y-3">
                            {closureDecisionType === 'referral' ||
                            closureDecisionType === 'case_split_fugitive_referral' ? (
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                        المحكمة المحال إليها
                                    </label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                        value={closureReferralStage}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setClosureReferralStage(isReferralStageValue(v) ? v : '');
                                        }}
                                    >
                                        <option value="" className="bg-slate-900 text-white">
                                            اختر...
                                        </option>
                                        <option value="محكمة الجنح" className="bg-slate-900 text-white">
                                            محكمة الجنح
                                        </option>
                                        <option value="محكمة الجنايات" className="bg-slate-900 text-white">
                                            محكمة الجنايات
                                        </option>
                                    </select>
                                </div>
                            ) : null}
                            <div>
                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                    اسم محكمة الموضوع
                                </label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={closureReferralCourtName}
                                    onChange={(e) => setClosureReferralCourtName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                    رقم الدعوى الجديد (اختياري)
                                </label>
                                <input
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={closureReferralCaseNumber}
                                    onChange={(e) => setClosureReferralCaseNumber(e.target.value)}
                                />
                            </div>
                        </div>
                    ) : null}

                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">تاريخ صدور القرار</label>
                        <input
                            type="date"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={closureDate}
                            onChange={(e) => setClosureDate(e.target.value)}
                        />
                    </div>

                    {isCassationStage ? null : (
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                حالة المتهم في لحظة القرار
                            </label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                value={closureDefendantStatus}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (isDecisionDefendantStatus(v)) setClosureDefendantStatus(v);
                                }}
                            >
                                <option value="detained" className="bg-slate-900 text-white">
                                    موقوف
                                </option>
                                <option value="bailed" className="bg-slate-900 text-white">
                                    مكفل
                                </option>
                                <option value="fugitive" className="bg-slate-900 text-white">
                                    هارب
                                </option>
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">نص القرار</label>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[120px] resize-none"
                            value={closureDetails}
                            onChange={(e) => setClosureDetails(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setStageCloserReferralOnly(false);
                                setIsStageCloserOpen(false);
                            }}
                            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={onSubmit}
                            disabled={
                                !closureDecisionType ||
                                !closureDate.trim() ||
                                !closureDetails.trim() ||
                                (closureDecisionType === 'expiration' &&
                                    (Boolean(
                                        validateExpirationReasonSelection(
                                            closureExpirationReason,
                                            closureExpirationCustomDetail,
                                        ),
                                    ) ||
                                        !closureExpirationDefendantIds.length)) ||
                                (closureDecisionType === 'juvenile_severance_referral' &&
                                    !closureJuvenileSeverDefendantId.trim()) ||
                                ((closureDecisionType === 'referral' ||
                                    closureDecisionType === 'case_split_fugitive_referral') &&
                                    (!closureReferralStage.trim() ||
                                        !closureReferralCourtName.trim() ||
                                        !closureReferralCaseNumber.trim())) ||
                                (decisionRequiresDefendantScope(closureDecisionType) &&
                                    shouldShowDefendantDecisionScopePicker(defendants) &&
                                    !isPrivateRightWaiverDecisionValue(closureDecisionType) &&
                                    closureDecisionType !== 'expiration' &&
                                    closureDecisionType !== 'juvenile_severance_referral' &&
                                    !(
                                        closureSharedObjective269b &&
                                        isCassationClosureQuashDecision(closureDecisionType)
                                    ) &&
                                    !closureScopedDefendantIds.length)
                            }
                            className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words"
                        >
                            {stageCloserReferralOnly ? 'حفظ أمر الإحالة' : 'حفظ القرار الختامي'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
