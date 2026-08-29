import type { SmartFileChromeProps } from '../layout/SmartFileChrome';
import { shouldShowPetitionVoidFooterPanel } from './petitionVoidFlow';
import { isPersonalStatusFile } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import type { SmartFileLayoutBuildInput } from './viewPropsTypes';

export function buildChromeProps(input: SmartFileLayoutBuildInput): SmartFileChromeProps {
    const { flags } = input;
    const editable = !input.isViewingArchived;
    const isPersonalDossier = isPersonalStatusFile(input.file);
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
        onPause: editable ? input.handleOpenPauseModal : undefined,
        onResume: editable ? input.handleOpenPauseResume : undefined,
        onAbandon: editable ? input.handleAbandonment : undefined,
        onPetitionVoid: editable ? input.handleRegisterPetitionVoid : undefined,
        flowStage: input.displayStage,
        isPaused: input.isPaused,
        isInterrupted: input.isInterrupted,
        hideCaseFlowActions:
            isPersonalDossier
            || shouldShowPetitionVoidFooterPanel(input.displayStage)
            || (Boolean(input.displayStage?.isPleadingsClosed) && !input.displayStage?.petitionVoidFlow),
    };
}
