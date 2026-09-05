import { shouldShowOpponentAppealRegisterButton, isFirstInstanceStageName, isCassationStageName, isAppealStageName, hasMeritJudgmentRecorded } from '../../smartFile/judgmentTypes';
import { isPersonalStatusCoreStage } from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import { isCassationCorrectionStageName } from '../../smartFile/extraordinaryAppealGateway';
import {
    shouldShowAbsentJudgmentFooter,
    shouldShowAbsentJudgmentNotificationAction,
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
    isLockedPriorStage,
} from '../../smartFile/stageInit';
import {
    canOfferArt172AppealResume,
    canOfferArt172AppealStay,
    isArt172AppealStayActive,
} from '../../smartFile/art172AppealStay';
import { resolvePostHopChallengeChromeActions } from './postHopChallengeChrome';
import {
    canOfferJoinCoObjector,
    resolveJoinableCoObjectors,
} from '../../smartFile/joinGhayabiObjectorToStage';
import type { JoinableGhayabiObjector } from '@/app/domain/lawsuit/joinGhayabiObjector';
import { isPartialBothInterestStage } from '../../smartFile/opponentAppealMethods';
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
    /** لتمييز إضبارة الأحوال — بلا استئناف */
    file?: SmartFileMainPanelProps['file'];
};

export type SmartFileMainPanelFooterFlags = {
    showOpponentAppealBtn: boolean;
    showFirstInstanceIncidentalUi: boolean;
    showAbsentJudgmentFooter: boolean;
    showAbsentJudgmentNotificationAction: boolean;
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
    showArt172StayFooter: boolean;
    showArt172ResumeFooter: boolean;
    remainingOpponentChallengeLabel: string;
    showRemainingOpponentChallenge: boolean;
    /** جزئي + الخصم سبق بالطعن: الموكل مستأنف عليه ويحتاج إضبارة طعن مستقلة */
    showIndependentClientChallenge: boolean;
    showJoinCoObjectorFooter: boolean;
    joinCoObjectorCandidates: JoinableGhayabiObjector[];
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
        file,
    } = input;

    const stageLabelForAppeal = displayStageLabel || currentStageLabel;
    const isAppealStage = isAppealStageName(displayStageLabel || displayStage?.stageName);
    const isOpponentAppealWatchStage = (() => {
        const label = String(stageLabelForAppeal ?? '').trim();
        if (!label) return false;
        if (isAppealStageName(label)) return false;
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
                pleadingDoorReopened:
                    displayStage?.pleadingDoorReopened ?? currentStage?.pleadingDoorReopened,
                awaitingOpponentAppeal:
                    displayStage?.awaitingOpponentAppeal ?? currentStage?.awaitingOpponentAppeal,
                stageName: displayStageLabel || currentStageLabel,
                status: displayStage?.status ?? currentStage?.status,
            },
            status,
            parentData.representedParty,
        );

    const partialBothInterest = isPartialBothInterestStage(displayStage ?? currentStage);

    const showFirstInstanceIncidentalUi = shouldShowFirstInstanceIncidentalUi(
        displayStage?.stageName,
        displayStage?.isPleadingsClosed,
    );

    const showAbsentJudgmentFooter =
        !isViewingArchived &&
        viewingStageIndex === activeStageIndex &&
        shouldShowAbsentJudgmentFooter(displayStage, stages, parentData.representedParty);

    const showAbsentJudgmentNotificationAction =
        (!isViewingArchived || isLockedPriorStage(displayStage)) &&
        shouldShowAbsentJudgmentNotificationAction(displayStage, stages);

    /** الجزئي: لوحة مزدوجة في تذييل ما بعد الحكم — لا زر خصم منفصل يلغي طعن الموكل. */
    const showOpponentAppealBtnEffective =
        showOpponentAppealBtn
        && !partialBothInterest
        && !(showAbsentJudgmentFooter && !showAbsentJudgmentNotificationAction);

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
        && !showAbsentJudgmentNotificationAction
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
                pleadingDoorReopened:
                    displayStage?.pleadingDoorReopened ?? currentStage?.pleadingDoorReopened,
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
        !isAppealStage &&
        (
            shouldShowFirstInstancePleadingLockUi(displayStage)
            || shouldShowExtraordinaryPleadingPostJudgmentUi(displayStage)
        ) &&
        !isCassationStageName(displayStage?.stageName) &&
        Boolean(displayStage?.isPleadingsClosed) &&
        !showAbsentJudgmentFooter &&
        !showAbsentJudgmentNotificationAction &&
        !showOpponentAppealBtnEffective &&
        !showAppealStageFooter &&
        !showPetitionVoidFooter &&
        (!awaitingOpponentAppeal || partialBothInterest);

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

    const showArt172StayFooter =
        !isViewingArchived
        && viewingStageIndex === activeStageIndex
        && canOfferArt172AppealStay({
            currentStage: displayStage,
            stages,
            parentIntegrity: parentData.disputeIntegrity,
        });

    const showArt172ResumeFooter =
        !isViewingArchived
        && viewingStageIndex === activeStageIndex
        && canOfferArt172AppealResume(displayStage);

    const postHopChallenge = resolvePostHopChallengeChromeActions({
        stages,
        displayStage,
        displayStageLabel: displayStageLabel || currentStageLabel,
        representedParty: parentData.representedParty,
        isViewingArchived,
        viewingStageIndex,
        activeStageIndex,
        suppressForArt172Resume: showArt172ResumeFooter,
        file: file as { lawsuitJurisdiction?: string; selectedType?: string; type?: string } | undefined,
    });
    const showRemainingOpponentChallenge = postHopChallenge.showRemainingOpponentChallenge;
    const showIndependentClientChallenge = postHopChallenge.showIndependentClientChallenge;

    const showJoinCoObjectorFooter =
        !isViewingArchived
        && canOfferJoinCoObjector({
            currentStage: displayStage,
            stages,
            viewingStageIndex,
        });
    const joinCoObjectorCandidates = showJoinCoObjectorFooter
        ? resolveJoinableCoObjectors({ stages })
        : [];

    const showPleadingCloseFooter =
        !isViewingArchived &&
        viewingStageIndex === activeStageIndex &&
        !showArt172StayFooter &&
        !showAbsentJudgmentFooter &&
        !showAbsentJudgmentNotificationAction &&
        !showOpponentAppealBtnEffective &&
        !showAppealStageFooter &&
        !showPetitionVoidFooter &&
        !showFlowStatusFooter &&
        !showPostJudgmentAppealFooter &&
        !showArt172ResumeFooter &&
        !isCaseFlowSuspended &&
        (showNoPleadingJudgmentFooter
            || preferPleadingCloseFooter
            || !displayStage?.isPleadingsClosed
            || (isAppealStage && displayStage?.isPleadingsClosed && !hasMeritJudgmentRecorded(displayStage))
            || Boolean(displayStage?.isUnderObjection)
            || isAbsentObjectionStageName(displayStageLabel)
            || isThirdPartyObjectionStageName(displayStageLabel)
            || isRetrialPleadingStageName(displayStageLabel));

    const quickActionsVariant =
        displayStage?.isPleadingsClosed || isArt172AppealStayActive(displayStage)
            ? 'notes-only'
            : 'full';

    return {
        showOpponentAppealBtn,
        showFirstInstanceIncidentalUi,
        showAbsentJudgmentFooter,
        showAbsentJudgmentNotificationAction,
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
        showArt172StayFooter,
        showArt172ResumeFooter,
        remainingOpponentChallengeLabel: postHopChallenge.remainingOpponentChallengeLabel,
        showRemainingOpponentChallenge,
        showIndependentClientChallenge,
        showJoinCoObjectorFooter,
        joinCoObjectorCandidates,
        quickActionsVariant,
    };
}
