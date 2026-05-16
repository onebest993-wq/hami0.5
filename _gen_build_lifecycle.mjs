import fs from 'fs';

const keys = `activeLifecycleStep
addHearing
caseData
cassationData
cassationDecision
cassationDecisionDateError
cassationDecisionError
cassationDecisionGateRef
cassationDecisionMinYmd
cassationError
cassationExpiredCanClose
cassationExpiredConfirmed
cassationFilingAfterDeadline
cassationFilingDateChronologyError
cassationFilingGateRef
cassationFilingMinYmd
cassationLegalEndDate
cassationPhaseFinalizeReady
cassationRef
cassationStepNumber
clearCassation
clearGrievance
clearJudgeDecision
computedCassationFiledBy
computedGrievanceFiledBy
confirmGrievanceDetails
confirmGrievanceTiming
defenderPhase1ReadOnly
defenderPhase2ReadOnly
defenderStateOrderSummaryDate
editCassation
editGrievance
editJudge
effectiveJudgeDecision
effectiveJudgeDecisionDate
effectiveRejectionNotificationDate
fastForwardToGrievance
fileStatus
grievanceData
grievanceDecision
grievanceDecisionDateChronologyError
grievanceDecisionError
grievanceDecisionMinYmd
grievanceDecisionNotificationConfirmed
grievanceError
grievanceExpiredCanClose
grievanceExpiredConfirmed
grievanceFilingDateChronologyError
grievanceFilingMinYmd
grievanceFinalGateRef
grievanceFinalSaveReady
grievanceFirstHearingAnchorYmd
grievanceFirstHearingDateChronologyError
grievanceFirstHearingMinYmd
grievanceHearingsGateRef
grievanceHearingsSorted
grievanceInHearings
grievanceLegalEndDate
grievanceLegalEndDateChronologyError
grievanceLegalEndMinYmd
grievanceLockedSummaryText
grievanceOutcomeGateRef
grievancePhase2FinalizeReady
grievanceProceedingsClosed
grievanceRef
grievanceStepNumber
grievanceTimingConfirmed
grievanceTimingGateReady
grievanceWizardInputsLocked
grievanceWizardLocked
guaranteeDetails
guaranteeGateActive
guaranteeSubmitted
handleCassationPhaseSubmit
handleGrievanceSubmit
handleJudgeDecisionSubmit
hasIntervention
hasSessions
hearingDraft
hearingDraftAdjournReasonError
hearingDraftNextSessionDateError
hearingDraftSessionDateError
hearingsError
intakeFirstHearingDate
isAdjourned
isCaseTerminated
isDefendantClient
isFinalityNoGrievance
isFinalityTerminatedRequest
isFinalized
isIqrarContext
isStateOrder
judgeDecision
judgeDecisionDateChronologyError
judgeError
latestOutcome
partyLabel
persistGrievanceOutcomeDraft
phase1ActiveDate
phase1JudgeDecisionMinYmd
phase1NewSessionMinYmd
phase1Sessions
phase2ActiveDate
phase2FirstHearingDate
phase2NewSessionMinYmd
preDecisionHearingsSorted
preDecisionTerminalKind
registerOpponentIntervention
setActiveLifecycleStep
setCassationData
setCassationDecision
setCassationExpiredConfirmed
setDecisionNotificationModalOpen
setEditCassation
setEditGrievance
setGrievanceData
setGrievanceDecision
setGrievanceDetailsConfirmed
setGrievanceExpiredConfirmed
setGrievanceLegalEndDate
setGuaranteeDetails
setGuaranteeSubmitted
setHearingDraft
setJudgeDecision
setPhase2FirstHearingDate
showCassationDecisionPanel
showCassationLifecycle
showGrievanceDecisionForm
showGrievanceDetailsForm
showGrievanceDetailsSummary
showGrievanceLifecycle
showGrievanceOutcomeForm
showGrievanceOutcomeSummary
showGrievancePhase2AdjournBanner
showGrievanceStep
showGrievanceTimingForm
showGrievanceTimingSummary
showGrievanceFinalizeButton
showJudgeDecisionBlock
showJudgeDecisionFullForm
showJudgeDecisionTerminateOnly
showPreDecisionHearings
toggleLifecycleStep
updatePhase2FirstHearingDate`.trim().split('\n');

const actionKeys = new Set([
    'addHearing',
    'clearCassation',
    'clearGrievance',
    'clearJudgeDecision',
    'confirmGrievanceDetails',
    'confirmGrievanceTiming',
    'fastForwardToGrievance',
    'handleCassationPhaseSubmit',
    'handleGrievanceSubmit',
    'handleJudgeDecisionSubmit',
    'persistGrievanceOutcomeDraft',
    'registerOpponentIntervention',
    'toggleLifecycleStep',
    'updatePhase2FirstHearingDate',
]);

const pathwayKeys = new Set([
    'computedCassationFiledBy',
    'computedGrievanceFiledBy',
    'partyLabel',
    'showGrievanceStep',
    'cassationStepNumber',
    'grievanceStepNumber',
    'showPreDecisionHearings',
    'isIqrarContext',
    'isStateOrder',
]);

const derivedKeys = new Set(keys.filter((k) => !actionKeys.has(k) && !pathwayKeys.has(k) && !k.startsWith('set') && ![
    'activeLifecycleStep','caseData','cassationData','cassationDecision','cassationDecisionError','cassationError',
    'cassationDecisionGateRef','cassationExpiredConfirmed','cassationFilingGateRef','cassationRef',
    'defenderPhase1ReadOnly','defenderPhase2ReadOnly','editCassation','editGrievance','editJudge',
    'fileStatus','grievanceData','grievanceDecision','grievanceDecisionError','grievanceDecisionNotificationConfirmed',
    'grievanceError','grievanceExpiredConfirmed','grievanceFinalGateRef','grievanceHearingsGateRef','grievanceLegalEndDate',
    'grievanceOutcomeGateRef','grievanceRef','grievanceTimingConfirmed',
    'guaranteeDetails','guaranteeGateActive','guaranteeSubmitted','hasIntervention','hearingDraft','hearingsError',
    'isDefendantClient','isFinalityNoGrievance','isFinalityTerminatedRequest','isFinalized','judgeDecision','judgeError',
    'phase2FirstHearingDate',
].includes(k)));

const lines = keys.map((k) => {
    if (actionKeys.has(k)) return `        ${k}: actions.${k},`;
    if (pathwayKeys.has(k)) return `        ${k}: pathway.${k},`;
    if (derivedKeys.has(k)) return `        ${k}: derived.${k},`;
    return `        ${k}: s.${k},`;
});

const out = `import type { LifecyclePanelProps } from '../layout/LifecyclePanelProps';
import type { useOrderFileCasePathway } from '../hooks/useOrderFileCasePathway';
import type { useOrderFileLifecycleDerived } from '../hooks/useOrderFileLifecycleDerived';
import type { useOrderFileLifecycleActions } from '../hooks/useOrderFileLifecycleActions';

export type BuildLifecyclePanelPropsInput = {
    pathway: ReturnType<typeof useOrderFileCasePathway>;
    derived: ReturnType<typeof useOrderFileLifecycleDerived>;
    actions: ReturnType<typeof useOrderFileLifecycleActions>;
} & Record<string, unknown>;

export function buildLifecyclePanelProps(input: BuildLifecyclePanelPropsInput): LifecyclePanelProps {
    const { pathway, derived, actions, ...s } = input;
    return {
${lines.join('\n')}
    };
}
`;

fs.writeFileSync(
    'src/app/components/lawyer/Dashboard_Active_Order_File/layout/buildLifecyclePanelProps.ts',
    out,
);
console.log('buildLifecyclePanelProps.ts written');
