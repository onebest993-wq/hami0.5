import { shouldShowOpponentAppealRegisterButton, isFirstInstanceStageName, isCassationStageName } from '../../smartFile/judgmentTypes';
import { isPersonalStatusCoreStage } from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import { isCassationCorrectionStageName } from '../../smartFile/extraordinaryAppealGateway';
import {
    shouldShowAbsentJudgmentFooter,
    isAbsentObjectionStageName,
} from '../../smartFile/absentJudgmentFlow';
import { shouldShowFirstInstanceIncidentalUi } from '../../smartFile/appealStageTransition';
import {
    resolveAppealStageFooterEligibility,
    shouldPreferPleadingCloseFooter,
} from '../../smartFile/appealStageFooter';
import {
    shouldShowPetitionVoidFooterPanel,
} from '../../smartFile/petitionVoidFlow';
import {
    isRetrialPleadingStageName,
    isThirdPartyObjectionStageName,
} from '../../smartFile/pleadingStageClassification';
import {
    shouldShowExtraordinaryPleadingPostJudgmentUi,
    shouldShowFirstInstancePleadingLockUi,
} from '../../smartFile/stageInit';
import type { SmartFileMainPanelProps } from './smartFileMainPanelTypes';

export type SmartFileMainPanelFooterFlagsInput = Pick<
    SmartFileMainPanelProps,
    | 'status'
    | 'isViewingArchived'
    | 'parentData'
    | 'displayStage'
    | 'currentStage'
    | 'stages'
    | 'activeStageIndex'
    | 'viewingStageIndex'
    | 'isPaused'
    | 'isInterrupted'
> & {
    displayStageLabel: string;
    currentStageLabel: string;
};

export type SmartFileMainPanelFooterFlags = {
    showOpponentAppealBtn: boolean;
    showFirstInstanceIncidentalUi: boolean;
    showAbsentJudgmentFooter: boolean;
    showOpponentAppealBtnEffective: boolean;
    appealStageFooter: ReturnType<typeof resolveAppealStageFooterEligibility>;
    showAppealStageFooter: boolean;
    showPetitionVoidFooter: boolean;
    awaitingOpponentAppeal: boolean;
    showPostJudgmentAppealFooter: boolean;
    showFlowInterruptionFooter: boolean;
    showFlowAbandonmentFooter: boolean;
    showFlowPauseFooter: boolean;
    isCaseFlowSuspended: boolean;
    showFlowStatusFooter: boolean;
    showPleadingCloseFooter: boolean;
    quickActionsVariant: 'notes-only' | 'full';
};

export function resolveSmartFileMainPanelFooterFlags(
    input: SmartFileMainPanelFooterFlagsInput,
): SmartFileMainPanelFooterFlags {
    const {
        status,
        isViewingArchived,
        parentData,
        displayStage,
        currentStage,
        stages,
        activeStageIndex,
        viewingStageIndex,
        isPaused,
        isInterrupted,
        displayStageLabel,
        currentStageLabel,
    } = input;

    const stageLabelForAppeal = displayStageLabel || currentStageLabel;
    const isOpponentAppealWatchStage = (() => {
        const label = String(stageLabelForAppeal ?? '').trim();
        if (!label) return false;
        if (isFirstInstanceStageName(label)) return true;
        return isPersonalStatusCoreStage(label) && !isAbsentObjectionStageName(label);
    })();

    const showOpponentAppealBtn =
        viewingStageIndex === activeStageIndex &&
        isOpponentAppealWatchStage &&
        shouldShowOpponentAppealRegisterButton(
            {
                finalDecision: displayStage?.finalDecision ?? currentStage?.finalDecision,
                isPleadingsClosed: displayStage?.isPleadingsClosed ?? currentStage?.isPleadingsClosed,
                appealDeadline: displayStage?.appealDeadline ?? currentStage?.appealDeadline,
                wasReopened: displayStage?.wasReopened ?? currentStage?.wasReopened,
                awaitingOpponentAppeal:
                    displayStage?.awaitingOpponentAppeal ?? currentStage?.awaitingOpponentAppeal,
                stageName: displayStageLabel || currentStageLabel,
                status: displayStage?.status ?? currentStage?.status,
            },
            status,
            parentData.representedParty,
        );

    const showFirstInstanceIncidentalUi = shouldShowFirstInstanceIncidentalUi(
        displayStage?.stageName,
        displayStage?.isPleadingsClosed,
    );

    const showAbsentJudgmentFooter =
        !isViewingArchived &&
        viewingStageIndex === activeStageIndex &&
        shouldShowAbsentJudgmentFooter(displayStage, stages, parentData.representedParty);

    const showOpponentAppealBtnEffective =
        showOpponentAppealBtn && !showAbsentJudgmentFooter;

    const appealStageFooter = resolveAppealStageFooterEligibility(
        displayStage,
        status,
        stages,
    );
    const preferPleadingCloseFooter = shouldPreferPleadingCloseFooter(displayStage);
    const showAppealStageFooter =
        !isViewingArchived
        && viewingStageIndex === activeStageIndex
        && appealStageFooter.show
        && !preferPleadingCloseFooter
        && !showAbsentJudgmentFooter
        && !showOpponentAppealBtnEffective;

    const showPetitionVoidFooter =
        !isViewingArchived
        && viewingStageIndex === activeStageIndex
        && shouldShowPetitionVoidFooterPanel(displayStage);

    const awaitingOpponentAppeal =
        viewingStageIndex === activeStageIndex &&
        isOpponentAppealWatchStage &&
        shouldShowOpponentAppealRegisterButton(
            {
                finalDecision: displayStage?.finalDecision ?? currentStage?.finalDecision,
                isPleadingsClosed: displayStage?.isPleadingsClosed ?? currentStage?.isPleadingsClosed,
                appealDeadline: displayStage?.appealDeadline ?? currentStage?.appealDeadline,
                wasReopened: displayStage?.wasReopened ?? currentStage?.wasReopened,
                awaitingOpponentAppeal:
                    displayStage?.awaitingOpponentAppeal ?? currentStage?.awaitingOpponentAppeal,
                stageName: displayStageLabel || currentStageLabel,
                status: displayStage?.status ?? currentStage?.status,
            },
            status,
            parentData.representedParty,
        );

    const showPostJudgmentAppealFooter =
        !isViewingArchived &&
        viewingStageIndex === activeStageIndex &&
        (
            shouldShowFirstInstancePleadingLockUi(displayStage)
            || shouldShowExtraordinaryPleadingPostJudgmentUi(displayStage)
        ) &&
        !isCassationStageName(displayStage?.stageName) &&
        Boolean(displayStage?.isPleadingsClosed) &&
        !showAbsentJudgmentFooter &&
        !showOpponentAppealBtnEffective &&
        !showAppealStageFooter &&
        !showPetitionVoidFooter &&
        !awaitingOpponentAppeal;

    const isNoPleadingLitigationStage =
        isCassationStageName(displayStage?.stageName)
        || isCassationCorrectionStageName(displayStage?.stageName);
    const showNoPleadingJudgmentFooter =
        !isViewingArchived
        && viewingStageIndex === activeStageIndex
        && isNoPleadingLitigationStage
        && displayStage?.status === 'active';

    const showFlowInterruptionFooter =
        !isViewingArchived
        && viewingStageIndex === activeStageIndex
        && !displayStage?.abandonmentDate
        && (
            Boolean(displayStage?.interruptionDate)
            || isInterrupted
            || status === 'منقطعة'
        );

    const showFlowAbandonmentFooter =
        !isViewingArchived
        && viewingStageIndex === activeStageIndex
        && status === 'متروكة للمراجعة'
        && Boolean(displayStage?.abandonmentDate);

    const showFlowPauseFooter =
        !isViewingArchived
        && viewingStageIndex === activeStageIndex
        && (
            isPaused
            || status === 'مستأخرة'
            || status === 'موقوفة اتفاقياً'
        );

    const isCaseFlowSuspended =
        showFlowInterruptionFooter
        || showFlowAbandonmentFooter
        || showFlowPauseFooter
        || isInterrupted
        || isPaused
        || status === 'منقطعة'
        || status === 'مستأخرة'
        || status === 'موقوفة اتفاقياً'
        || status === 'متروكة للمراجعة';

    const showFlowStatusFooter =
        showFlowInterruptionFooter || showFlowAbandonmentFooter || showFlowPauseFooter;

    const showPleadingCloseFooter =
        !isViewingArchived &&
        viewingStageIndex === activeStageIndex &&
        !showAbsentJudgmentFooter &&
        !showOpponentAppealBtnEffective &&
        !showAppealStageFooter &&
        !showPetitionVoidFooter &&
        !showFlowStatusFooter &&
        !showPostJudgmentAppealFooter &&
        !isCaseFlowSuspended &&
        (showNoPleadingJudgmentFooter
            || preferPleadingCloseFooter
            || !displayStage?.isPleadingsClosed
            || Boolean(displayStage?.isUnderObjection)
            || isAbsentObjectionStageName(displayStageLabel)
            || isThirdPartyObjectionStageName(displayStageLabel)
            || isRetrialPleadingStageName(displayStageLabel));

    const quickActionsVariant = displayStage?.isPleadingsClosed ? 'notes-only' : 'full';

    return {
        showOpponentAppealBtn,
        showFirstInstanceIncidentalUi,
        showAbsentJudgmentFooter,
        showOpponentAppealBtnEffective,
        appealStageFooter,
        showAppealStageFooter,
        showPetitionVoidFooter,
        awaitingOpponentAppeal,
        showPostJudgmentAppealFooter,
        showFlowInterruptionFooter,
        showFlowAbandonmentFooter,
        showFlowPauseFooter,
        isCaseFlowSuspended,
        showFlowStatusFooter,
        showPleadingCloseFooter,
        quickActionsVariant,
    };
}
