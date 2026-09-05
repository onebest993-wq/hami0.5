import type { SmartFileChromeProps } from '../layout/SmartFileChrome';
import { shouldShowPetitionVoidFooterPanel } from './petitionVoidFlow';
import { isPersonalStatusFile } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import type { SmartFileLayoutBuildInput } from './viewPropsTypes';
import { CIVIL_LAWSUIT_TEST_IDS } from './civilLawsuitTestIds';
import {
    ART172_STAY_CONFIRM_MESSAGE,
    ART172_STAY_LABEL,
    canOfferArt172AppealResume,
    canOfferArt172AppealStay,
    isArt172AppealStayActive,
} from './art172AppealStay';
import { resolvePostHopChallengeChromeActions } from '../layout/mainPanel/postHopChallengeChrome';

export function buildChromeProps(input: SmartFileLayoutBuildInput): SmartFileChromeProps {
    const { flags } = input;
    const editable = !input.isViewingArchived;
    const isPersonalDossier = isPersonalStatusFile(input.file);
    const art172Stay =
        editable
        && canOfferArt172AppealStay({
            currentStage: input.displayStage,
            stages: input.stages,
            parentIntegrity: input.parentData?.disputeIntegrity,
        });
    const art172Active = isArt172AppealStayActive(input.displayStage);
    const art172Resume = editable && canOfferArt172AppealResume(input.displayStage);
    const displayLabel = String(input.displayStage?.stageName ?? input.displayStage?.name ?? '');
    const postHop = resolvePostHopChallengeChromeActions({
        stages: input.stages,
        displayStage: input.displayStage,
        displayStageLabel: displayLabel,
        representedParty: input.parentData?.representedParty,
        isViewingArchived: input.isViewingArchived,
        viewingStageIndex: input.viewingStageIndex,
        activeStageIndex: input.activeStageIndex,
        suppressForArt172Resume: art172Resume,
        file: input.file as { lawsuitJurisdiction?: string; selectedType?: string; type?: string },
        parentIntegrity: input.parentData?.disputeIntegrity as string | null | undefined,
    });
    return {
        onClose: input.onClose,
        setShowEditInfoModal: flags.setShowEditInfoModal,
        isTrashOpen: flags.isTrashOpen,
        setIsTrashOpen: flags.setIsTrashOpen,
        isEditingStageName: input.isEditingStageName,
        setIsEditingStageName: input.setIsEditingStageName,
        tempStageName: input.tempStageName,
        setTempStageName: input.setTempStageName,
        onSaveStageName: input.onSaveStageName,
        stages: input.stages,
        viewingStageIndex: input.viewingStageIndex,
        activeStageIndex: input.activeStageIndex,
        isViewingArchived: input.isViewingArchived,
        onStageSelect: input.onStageSelect,
        onInterrupt: editable ? input.handleInterruptionToggle : undefined,
        onPause: editable
            ? (art172Stay ? input.handleArt172AppealStay : input.handleOpenPauseModal)
            : undefined,
        onResume: editable
            ? (art172Resume || art172Active
                ? input.handleArt172AppealResume
                : input.handleOpenPauseResume)
            : undefined,
        onAbandon: editable ? input.handleAbandonment : undefined,
        onPetitionVoid: editable ? input.handleRegisterPetitionVoid : undefined,
        flowStage: input.displayStage,
        isPaused: input.isPaused || art172Active,
        isInterrupted: input.isInterrupted,
        pauseLabel: art172Stay ? ART172_STAY_LABEL : undefined,
        pauseConfirmTitle: art172Stay ? ART172_STAY_LABEL : undefined,
        pauseConfirmMessage: art172Stay ? ART172_STAY_CONFIRM_MESSAGE : undefined,
        pauseTestId: art172Stay ? CIVIL_LAWSUIT_TEST_IDS.art172Stay : undefined,
        hideCaseFlowActions:
            (isPersonalDossier
            || shouldShowPetitionVoidFooterPanel(input.displayStage)
            || (Boolean(input.displayStage?.isPleadingsClosed) && !input.displayStage?.petitionVoidFlow))
            && !art172Stay
            && !art172Resume
            && !art172Active,
        showRemainingOpponentChallenge: postHop.showRemainingOpponentChallenge,
        remainingOpponentChallengeLabel: postHop.remainingOpponentChallengeLabel,
        onRemainingOpponentChallenge: postHop.showRemainingOpponentChallenge
            ? () => flags.setShowAppealModal(true)
            : undefined,
        showIndependentClientChallenge: postHop.showIndependentClientChallenge,
        onIndependentClientChallenge: postHop.showIndependentClientChallenge
            ? () => input.handleOpenDefendantCassationAppeal(undefined, { forceIndependentSpawn: true })
            : undefined,
        namedChallengeActions: postHop.namedChallengeActions,
        onNamedChallengeAction:
            postHop.namedChallengeActions.length > 0
                ? (challengerId: string) =>
                      input.handleOpenDefendantCassationAppeal(challengerId, {
                          forceIndependentSpawn: true,
                      })
                : undefined,
    };
}
