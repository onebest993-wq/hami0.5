import { useMemo } from 'react';
import type { ActiveOrderFileProps } from '../types';
import { todayYmd } from '../utils/ymd';
import { useOrderFilePersist } from './useOrderFilePersist';
import { useOrderFileConfirm } from './useOrderFileConfirm';
import { useOrderFileWorkspace } from './useOrderFileWorkspace';
import { useOrderFileMetaPartyEdit } from './useOrderFileMetaPartyEdit';
import { useOrderFileHydrate } from './useOrderFileHydrate';
import { useOrderFileCasePathway } from './useOrderFileCasePathway';
import { useOrderFilePartyWorkspace } from './useOrderFilePartyWorkspace';
import type { useOrderFileLifecycleState } from './useOrderFileLifecycleState';

type LifecycleState = ReturnType<typeof useOrderFileLifecycleState>;

type ActiveOrderFileWorkspaceClusterInput = {
    fileData: ActiveOrderFileProps['fileData'];
    caseId: string | null;
    userId: string | null;
    onCaseUpdated: ActiveOrderFileProps['onCaseUpdated'];
    fd: Record<string, unknown>;
    lifecycleState: LifecycleState;
};

export function useActiveOrderFileWorkspaceCluster(input: ActiveOrderFileWorkspaceClusterInput) {
    const { fileData, caseId, userId, onCaseUpdated, fd, lifecycleState } = input;

    const {
        caseData,
        setCaseData,
        fileStatus,
        setHasIntervention,
        setFileStatus,
        setIsSecretMode,
        setActiveLifecycleStep,
        setJudgeDecision,
        setExecutionData,
        setGrievanceData,
        setGrievanceLegalEndDate,
        setGrievanceDecisionNotificationConfirmed,
        setGrievancePetitionNotificationDate,
        setGrievancePetitionNotificationConfirmed,
        setGrievanceTimingConfirmed,
        setGrievanceDetailsConfirmed,
        setPhase2FirstHearingDate,
        setGrievanceDecision,
        setCassationData,
        setCassationDecision,
        setGuaranteeSubmitted,
        setGuaranteeDetails,
        setHearings,
        setExpertModule,
        setPreDecisionClosed,
        setExpectedDecisionDate,
        setRegistrationData,
        setCaseEvents,
        setCaseNotes,
        setCaseAttachments,
        setCaseFollowups,
        judgeDecision,
        guaranteeSubmitted,
        activeLifecycleStep,
        grievanceDecision,
        hearings,
        preDecisionClosed,
        caseEvents,
        caseNotes,
        caseAttachments,
        caseFollowups,
    } = lifecycleState;

    const todayYmdValue = todayYmd();
    const requestDateYmd = useMemo(() => {
        const raw = String(caseData?.requestDate ?? '').trim();
        return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
    }, [caseData?.requestDate]);

    const { persistPatch, flushPersistPatch, persistAndMerge, appendCaseEvent } = useOrderFilePersist({
        caseId,
        userId,
        caseEvents,
        setCaseEvents,
        setCaseData,
        onCaseUpdated,
    });
    const { confirmDialog, requestConfirm, resolveConfirm } = useOrderFileConfirm();

    useOrderFileHydrate({
        caseId,
        userId,
        fileData,
        caseData,
        setters: {
            setCaseData,
            setHasIntervention,
            setFileStatus,
            setIsSecretMode,
            setActiveLifecycleStep,
            setJudgeDecision,
            setExecutionData,
            setGrievanceData,
            setGrievanceLegalEndDate,
            setGrievanceDecisionNotificationConfirmed,
            setGrievancePetitionNotificationDate,
            setGrievancePetitionNotificationConfirmed,
            setGrievanceTimingConfirmed,
            setGrievanceDetailsConfirmed,
            setPhase2FirstHearingDate,
            setGrievanceDecision,
            setCassationData,
            setCassationDecision,
            setGuaranteeSubmitted,
            setGuaranteeDetails,
            setHearings,
            setExpertModule,
            setPreDecisionClosed,
            setExpectedDecisionDate,
            setRegistrationData,
            setCaseEvents,
            setCaseNotes,
            setCaseAttachments,
            setCaseFollowups,
        },
    });

    const casePathway = useOrderFileCasePathway({
        caseData,
        fd,
        fileStatus,
        activeLifecycleStep,
        judgeDecision,
        grievanceDecision,
        hearings,
        preDecisionClosed,
    });

    const partyWorkspaceBundle = useOrderFilePartyWorkspace({
        caseData,
        judgeDecision,
        guaranteeSubmitted,
        resolvedWorkspaceRequestType: casePathway.resolvedWorkspaceRequestType,
        isIqrarContext: casePathway.isIqrarContext,
        isStateOrder: casePathway.isStateOrder,
        isOrderOnPetition: casePathway.isOrderOnPetition,
        isUrgentLawsuit: casePathway.isUrgentLawsuit,
        isUrgentJustice: casePathway.isUrgentJustice,
    });

    const metaPartyEditBundle = useOrderFileMetaPartyEdit({
        caseData,
        party1Entries: partyWorkspaceBundle.party1Entries,
        party2Entries: partyWorkspaceBundle.party2Entries,
        persistAndMerge,
        appendCaseEvent,
    });

    const orderWorkspaceBundle = useOrderFileWorkspace({
        caseId,
        isFinalized: partyWorkspaceBundle.isFinalized,
        requestDateYmd,
        caseEvents,
        caseNotes,
        setCaseNotes,
        caseAttachments,
        setCaseAttachments,
        caseFollowups,
        setCaseFollowups,
        persistAndMerge,
        appendCaseEvent,
    });

    return {
        todayYmdValue,
        requestDateYmd,
        persistPatch,
        flushPersistPatch,
        persistAndMerge,
        appendCaseEvent,
        confirmDialog,
        requestConfirm,
        resolveConfirm,
        casePathway,
        partyWorkspaceBundle,
        metaPartyEditBundle,
        orderWorkspaceBundle,
        caseData,
        caseEvents,
        caseNotes,
        caseAttachments,
        caseFollowups,
    };
}
