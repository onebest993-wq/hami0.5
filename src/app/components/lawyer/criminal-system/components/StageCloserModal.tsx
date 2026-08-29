import type { CaseStage } from '@/app/types/criminal';
import type { CriminalDefendant, SocialInquiryWorkflowStatus } from '../criminalCaseModel';
import type { CriminalStageCloserOrchestratorSlice } from '../orchestrators/criminalOrchestratorSliceTypes';
import { StageCloserModalHeader } from './StageCloserModalHeader';
import { StageCloserDecisionTypeField } from './StageCloserDecisionTypeField';
import { StageCloserFormSections } from './StageCloserFormSections';
import { StageCloserModalFooter } from './StageCloserModalFooter';
import { isDecisionDefendantStatus } from './stageCloserModalGuards';

export { isReferralStageValue, isStageDecisionType } from './stageCloserModalGuards';

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

    const closeModal = () => {
        setStageCloserReferralOnly(false);
        setIsStageCloserOpen(false);
    };

    return (
        <div
            className="fixed inset-0 z-[500] isolate bg-black/62 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="stage-closer-title"
            onClick={closeModal}
        >
            <div
                className="relative z-[501] w-full max-w-lg max-h-[min(92vh,720px)] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-lg shadow-black/35 overflow-hidden isolate"
                onClick={(e) => e.stopPropagation()}
            >
                <StageCloserModalHeader
                    stageCloserReferralOnly={stageCloserReferralOnly}
                    onClose={closeModal}
                />

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

                    <StageCloserDecisionTypeField
                        stageCloserReferralOnly={stageCloserReferralOnly}
                        isTrialCourtStage={isTrialCourtStage}
                        isCassationStage={isCassationStage}
                        isInvestigationPhase={isInvestigationPhase}
                        isJuvenileTrial={isJuvenileTrial}
                        isPrivateRightWaived={isPrivateRightWaived}
                        caseStage={caseStage}
                        defendants={defendants}
                        closureDecisionType={closureDecisionType}
                        setClosureDecisionType={setClosureDecisionType}
                        closureSuspendedExecution={closureSuspendedExecution}
                        setClosureSuspendedExecution={setClosureSuspendedExecution}
                    />

                    <StageCloserFormSections
                        defendants={defendants}
                        isCassationStage={isCassationStage}
                        juvenileAccused={juvenileAccused}
                        firstJuvenileDefendant={firstJuvenileDefendant}
                        firstJuvenileSocialWorkflow={firstJuvenileSocialWorkflow}
                        patchSocialInquiryReport={patchSocialInquiryReport}
                        closureDecisionType={closureDecisionType}
                        closureExpirationReason={closureExpirationReason}
                        setClosureExpirationReason={setClosureExpirationReason}
                        closureExpirationCustomDetail={closureExpirationCustomDetail}
                        setClosureExpirationCustomDetail={setClosureExpirationCustomDetail}
                        closureExpirationDefendantIds={closureExpirationDefendantIds}
                        setClosureExpirationDefendantIds={setClosureExpirationDefendantIds}
                        closureScopedDefendantIds={closureScopedDefendantIds}
                        setClosureScopedDefendantIds={setClosureScopedDefendantIds}
                        closureSharedObjective269b={closureSharedObjective269b}
                        setClosureSharedObjective269b={setClosureSharedObjective269b}
                        closurePunishmentType={closurePunishmentType}
                        setClosurePunishmentType={setClosurePunishmentType}
                        closureJuvenileSeverDefendantId={closureJuvenileSeverDefendantId}
                        setClosureJuvenileSeverDefendantId={setClosureJuvenileSeverDefendantId}
                        closureReferralStage={closureReferralStage}
                        setClosureReferralStage={setClosureReferralStage}
                        closureReferralCourtName={closureReferralCourtName}
                        setClosureReferralCourtName={setClosureReferralCourtName}
                        closureReferralCaseNumber={closureReferralCaseNumber}
                        setClosureReferralCaseNumber={setClosureReferralCaseNumber}
                        closureDate={closureDate}
                        setClosureDate={setClosureDate}
                        closureDefendantStatus={closureDefendantStatus}
                        setClosureDefendantStatus={setClosureDefendantStatus}
                        closureDetails={closureDetails}
                        setClosureDetails={setClosureDetails}
                        isDecisionDefendantStatus={isDecisionDefendantStatus}
                    />

                    <StageCloserModalFooter
                        defendants={defendants}
                        stageCloserReferralOnly={stageCloserReferralOnly}
                        closureDecisionType={closureDecisionType}
                        closureDate={closureDate}
                        closureDetails={closureDetails}
                        closureExpirationReason={closureExpirationReason}
                        closureExpirationCustomDetail={closureExpirationCustomDetail}
                        closureExpirationDefendantIds={closureExpirationDefendantIds}
                        closureJuvenileSeverDefendantId={closureJuvenileSeverDefendantId}
                        closureReferralStage={closureReferralStage}
                        closureReferralCourtName={closureReferralCourtName}
                        closureReferralCaseNumber={closureReferralCaseNumber}
                        closureScopedDefendantIds={closureScopedDefendantIds}
                        closureSharedObjective269b={closureSharedObjective269b}
                        onClose={closeModal}
                        onSubmit={onSubmit}
                    />
                </div>
            </div>
        </div>
    );
}
