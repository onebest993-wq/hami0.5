import { useState, useEffect, useRef } from 'react';
import type { CaseStage } from '../../LawyerShared';
import { buildInitialStagesFromFile } from '../smartFile/stageInit';
import { buildInitialParentDataFromFile } from '../smartFile/parentDataInit';
import { useSmartFileStageNavigation } from './useSmartFileStageNavigation';
import { useAuthUser } from '@/app/context/authHooks';
import { useSmartFilePersist } from './useSmartFilePersist';
import { useSmartFileModalFlags } from './useSmartFileModalFlags';
import { useSmartFileModalCaseStatus } from './useSmartFileModalCaseStatus';
import { useSmartFileModalFileSync } from './useSmartFileModalFileSync';
import { useSmartFileSearchFocusScroll } from './useSmartFileSearchFocusScroll';
import { useSmartFileModalDomainActions } from './useSmartFileModalDomainActions';
import { buildSmartFileOrchestratorLayout } from '../smartFile/buildSmartFileOrchestratorLayout';
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

    const navigation = useSmartFileStageNavigation(file, initialStagesRef.current);

    const [isEditingStageName, setIsEditingStageName] = useState(false);
    const [tempStageName, setTempStageName] = useState('');

    const caseStatus = useSmartFileModalCaseStatus(file);

    const modalFlags = useSmartFileModalFlags();

    const { saveToCloud } = useSmartFilePersist({
        parentData,
        activeStageIndex: navigation.activeStageIndex,
        status: caseStatus.status,
        onUpdate,
    });

    const { lawsuitFileId, onCalendarUnlink } = useSmartFileModalFileSync({
        file,
        parentData,
        setParentData,
        stages: navigation.stages,
        setStages: navigation.setStages,
        activeStageIndex: navigation.activeStageIndex,
        viewingStageIndex: navigation.viewingStageIndex,
        setActiveStageIndex: navigation.setActiveStageIndex,
        setViewingStageIndex: navigation.setViewingStageIndex,
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
        stages: navigation.stages,
        setStages: navigation.setStages,
        activeStageIndex: navigation.activeStageIndex,
        setActiveStageIndex: navigation.setActiveStageIndex,
        viewingStageIndex: navigation.viewingStageIndex,
        setViewingStageIndex: navigation.setViewingStageIndex,
        currentStage: navigation.currentStage,
        displayStage: navigation.displayStage,
        status: caseStatus.status,
        setStatus: caseStatus.setStatus,
        isPaused: caseStatus.isPaused,
        setIsPaused: caseStatus.setIsPaused,
        pauseReason: caseStatus.pauseReason,
        setPauseReason: caseStatus.setPauseReason,
        linkedCaseNo: caseStatus.linkedCaseNo,
        setLinkedCaseNo: caseStatus.setLinkedCaseNo,
        isInterrupted: caseStatus.isInterrupted,
        setIsInterrupted: caseStatus.setIsInterrupted,
        interruptionData: caseStatus.interruptionData,
        setInterruptionData: caseStatus.setInterruptionData,
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
        if (isPetitionVoidRevivalExpired(navigation.currentStage?.petitionVoidFlow)) {
            actions.handlePetitionVoidWaiver();
        }
    }, [navigation.currentStage?.petitionVoidFlow, actions.handlePetitionVoidWaiver]);

    useEffect(() => {
        if (!file?.id) return;
        void import('../layout/SmartFileModalsPortal');
    }, [file?.id]);

    if (!file || !navigation.currentStage) {
        return { layout: null, consolidationNavActive, caseLinkNavActive };
    }

    const layout = buildSmartFileOrchestratorLayout({
        onClose,
        file,
        onOpenLinkedFile,
        lawsuitFiles,
        parentData,
        setParentData,
        navigation,
        caseStatus,
        modalFlags,
        actions,
        isEditingStageName,
        setIsEditingStageName,
        tempStageName,
        setTempStageName,
    });

    return {
        layout,
        consolidationNavActive: props.consolidationNavActive,
        caseLinkNavActive: props.caseLinkNavActive,
    };
}
