import { useState, useEffect, useRef } from 'react';
import type { CaseStage } from '../../LawyerShared';
import { buildInitialStagesFromFile } from '../smartFile/stageInit';
import { buildInitialParentDataFromFile } from '../smartFile/parentDataInit';
import { useSmartFileStageNavigation } from './useSmartFileStageNavigation';
import { useAuthUser } from '@/app/context/AuthContext';
import { useSmartFilePersist } from './useSmartFilePersist';
import { useSmartFileModalFlags } from './useSmartFileModalFlags';
import { useSmartFileModalCaseStatus } from './useSmartFileModalCaseStatus';
import { useSmartFileModalFileSync } from './useSmartFileModalFileSync';
import { useSmartFileSearchFocusScroll } from './useSmartFileSearchFocusScroll';
import { useSmartFileModalDomainActions } from './useSmartFileModalDomainActions';
import { assembleSmartFileModalLayout } from '../smartFile/assembleSmartFileModalLayout';
import { isPetitionVoidRevivalExpired } from '../smartFile/petitionVoidFlow';
import { type SmartFileModalProps } from '../smartFile/smartFileModalTypes';

export function useSmartFileModalOrchestrator(props: SmartFileModalProps) {
    const {
        file,
        onClose,
        onUpdate,
        onOpenLinkedFile,
        lawsuitFiles,
        onSpawnLinkedIncidentalCase,
        onLinkWithExistingCase,
        onStartConsolidationNewCase,
        onConsolidateWithExisting,
        consolidationNavActive = false,
        caseLinkNavActive = false,
    } = props;
    const user = useAuthUser();
    const initialStagesRef = useRef<CaseStage[] | null>(null);
    if (initialStagesRef.current === null) {
        initialStagesRef.current = buildInitialStagesFromFile(file);
    }

    useSmartFileSearchFocusScroll(file);

    const [parentData, setParentData] = useState(() => buildInitialParentDataFromFile(file));

    const {
        stages,
        setStages,
        activeStageIndex,
        setActiveStageIndex,
        viewingStageIndex,
        setViewingStageIndex,
        currentStage,
        viewedStage,
        isViewingArchived,
        displayStage,
        displayTimeline,
        deletedEvents,
        stepperStages,
        currentStageId,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
    } = useSmartFileStageNavigation(file, initialStagesRef.current);

    const [isEditingStageName, setIsEditingStageName] = useState(false);
    const [tempStageName, setTempStageName] = useState('');

    const {
        status,
        setStatus,
        isPaused,
        setIsPaused,
        pauseReason,
        setPauseReason,
        linkedCaseNo,
        setLinkedCaseNo,
        isInterrupted,
        setIsInterrupted,
        interruptionData,
        setInterruptionData,
    } = useSmartFileModalCaseStatus(file);

    const modalFlags = useSmartFileModalFlags();

    const { saveToCloud } = useSmartFilePersist({
        parentData,
        activeStageIndex,
        status,
        onUpdate,
    });

    const { lawsuitFileId, onCalendarUnlink } = useSmartFileModalFileSync({
        file,
        parentData,
        setParentData,
        stages,
        setStages,
        activeStageIndex,
        viewingStageIndex,
        setActiveStageIndex,
        setViewingStageIndex,
        saveToCloud,
        calendarUserId: user?.id,
    });

    const actions = useSmartFileModalDomainActions({
        file,
        lawsuitFiles,
        onSpawnLinkedIncidentalCase,
        onLinkWithExistingCase,
        onStartConsolidationNewCase,
        onConsolidateWithExisting,
        parentData,
        setParentData,
        stages,
        setStages,
        activeStageIndex,
        setActiveStageIndex,
        viewingStageIndex,
        setViewingStageIndex,
        currentStage,
        displayStage,
        status,
        setStatus,
        isPaused,
        setIsPaused,
        pauseReason,
        setPauseReason,
        linkedCaseNo,
        setLinkedCaseNo,
        isInterrupted,
        setIsInterrupted,
        interruptionData,
        setInterruptionData,
        isEditingStageName,
        setIsEditingStageName,
        tempStageName,
        saveToCloud,
        calendarUserId: user?.id,
        lawsuitFileId,
        onCalendarUnlink,
        modalFlags,
    });

    useEffect(() => {
        if (isPetitionVoidRevivalExpired(currentStage?.petitionVoidFlow)) {
            actions.handlePetitionVoidWaiver();
        }
    }, [currentStage?.petitionVoidFlow, actions.handlePetitionVoidWaiver]);

    useEffect(() => {
        if (!file?.id) return;
        void import('../SmartFileModals');
    }, [file?.id]);

    if (!file || !currentStage) {
        return { layout: null, consolidationNavActive, caseLinkNavActive };
    }

    const layout = assembleSmartFileModalLayout({
        onClose,
        file,
        status,
        isViewingArchived,
        isPaused,
        pauseReason,
        isInterrupted,
        interruptionData,
        linkedCaseNo,
        parentData,
        displayStage,
        displayTimeline,
        currentStage,
        stages,
        activeStageIndex,
        viewingStageIndex,
        isEditingStageName,
        setIsEditingStageName,
        tempStageName,
        setTempStageName,
        onSaveStageName: actions.handleSaveStageName,
        onShare: actions.handleShare,
        onStageSelect: actions.handleStageSelect,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        stepperStages,
        currentStageId,
        deletedEvents,
        modalHandlers: actions.modalHandlers,
        onOpenLinkedFile,
        openFileIdentity: actions.openFileIdentity,
        consolidationCandidates: actions.consolidationCandidates,
        onConsolidationCreateNew: actions.handleConsolidationCreateNew,
        onConsolidationMergeExisting: actions.handleConsolidationMergeExisting,
        onConsolidationExternalRef: actions.handleConsolidationExternalRef,
        caseLinkCandidates: actions.caseLinkCandidates,
        onCaseLinkExisting: actions.handleCaseLinkExisting,
        onCaseLinkExternal: actions.handleCaseLinkExternal,
        handleCorrespondenceResponse: actions.handleCorrespondenceResponse,
        handleResumeAbandonment: actions.handleResumeAbandonment,
        handleResume: actions.handleResume,
        handleToggleClient: actions.handleToggleClient,
        handleInterruptionToggle: actions.handleInterruptionToggle,
        handleOpenPauseModal: actions.handleOpenPauseModal,
        handleAbandonment: actions.handleAbandonment,
        handleRegisterPetitionVoid: actions.handleRegisterPetitionVoid,
        handlePetitionVoidAppeal: actions.handlePetitionVoidAppeal,
        handlePetitionVoidOutcome: actions.handlePetitionVoidOutcome,
        handlePetitionVoidWaiver: actions.handlePetitionVoidWaiver,
        handleToggleNotification: actions.handleToggleNotification,
        handleCassationDecision: actions.handleCassationDecision,
        handleClosePleadings: actions.handleClosePleadings,
        handleReopenPleadings: actions.handleReopenPleadings,
        handleOpenDefendantCassationAppeal: actions.handleOpenDefendantCassationAppeal,
        handleDefaultObjection: actions.handleDefaultObjection,
        handleWaiveObjection: actions.handleWaiveObjection,
        handleOtherAppeals: actions.handleOtherAppeals,
        handleOpenAbsentJudgmentNotification: actions.handleOpenAbsentJudgmentNotification,
        handleOpenOpponentAbsentObjection: actions.handleOpenOpponentAbsentObjection,
        handleExportPDF: actions.handleExportPDF,
        handleResolveIncidentalCase: actions.handleResolveIncidentalCase,
        handleUpdateIncidentalEntryDecision: actions.handleUpdateIncidentalEntryDecision,
        handleQuickAction: actions.handleQuickAction,
        handleToggleTask: actions.handleToggleTask,
        handleAppealBriefFile: actions.handleAppealBriefFile,
        handleAppealBriefOutcome: actions.handleAppealBriefOutcome,
        handleDeleteEvent: actions.handleDeleteEvent,
        handleEditEvent: actions.handleEditEvent,
        handleAddAction: actions.handleAddAction,
        handleSaveFastTrack: actions.handleSaveFastTrack,
        handleCancelCrossAppeal: actions.handleCancelCrossAppeal,
        handleAddCrossAppeal: actions.handleAddCrossAppeal,
        setParentData,
        modalFlags,
    });
    return { layout, consolidationNavActive: props.consolidationNavActive, caseLinkNavActive: props.caseLinkNavActive };
}
