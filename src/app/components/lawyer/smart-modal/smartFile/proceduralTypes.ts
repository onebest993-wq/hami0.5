import type { Dispatch, SetStateAction } from 'react';
import { formatDateToLocalYmd } from '@/app/utils/executionStateMachine';
import type {
    CaseStage,
    IncidentalCase,
    Task,
    TimelineEvent,
} from '../../LawyerShared';
import type { SmartFileParentData } from './parentDataInit';
import type { SmartFileAttachment } from './judgmentTypes';

export type SaveToCloudFn = (
    updatedStages: CaseStage[],
    updatedParent?: SmartFileParentData,
) => void;

export type FastTrackRecord = {
    id?: string;
    type?: string;
    status?: string;
    submissionDate?: string;
    createdDate?: string;
    [key: string]: unknown;
};

export type UseSmartFileProceduralActionsOptions = {
    stages: CaseStage[];
    setStages: Dispatch<SetStateAction<CaseStage[]>>;
    activeStageIndex: number;
    viewingStageIndex: number;
    currentStage: CaseStage;
    parentData: SmartFileParentData;
    setParentData: Dispatch<SetStateAction<SmartFileParentData>>;
    saveToCloud: SaveToCloudFn;
    setStatus: Dispatch<SetStateAction<string>>;
    setIsPaused: Dispatch<SetStateAction<boolean>>;
    setPauseReason: Dispatch<SetStateAction<string>>;
    setLinkedCaseNo: Dispatch<SetStateAction<string>>;
    setIsInterrupted: Dispatch<SetStateAction<boolean>>;
    setInterruptionData: Dispatch<SetStateAction<Record<string, unknown> | null>>;
    setEditingTask: (t: Task | null) => void;
    setEditingIncidental: (c: IncidentalCase | null) => void;
    setEditingFastTrack: (v: Record<string, unknown> | null) => void;
    setEditingAttachment: (v: Record<string, unknown> | null) => void;
    setEditingEvent: (e: TimelineEvent | null) => void;
    setShowFastTrackModal: (v: boolean) => void;
    setShowAttachmentModal: (v: boolean) => void;
    setShowJudgeRecusalModal: (v: boolean) => void;
    setShowTransferJurisdictionModal: (v: boolean) => void;
    setShowCaseConsolidationModal: (v: boolean) => void;
    setShowMaterialErrorModal: (v: string | null) => void;
    setShowPauseModal: (v: boolean) => void;
    setShowInterruptionModal: (v: boolean) => void;
    setShowResumeInterruptionModal: (v: boolean) => void;
    setShowExtraordinaryAppealModal: (v: boolean) => void;
    setShowProvisionalOrderModal: (v: boolean) => void;
    setShowInterlocutoryModal: (v: boolean) => void;
    isPaused: boolean;
    pauseReason: string;
    isInterrupted: boolean;
    interruptionData: Record<string, unknown> | null;
    status: string;
    /** للربط الصامت بالتقويم — لا يغيّر الواجهة */
    calendarUserId?: string | null;
    setAppealOutcomeTask: (task: Task | null) => void;
};

export function stageTasks(stage: CaseStage): Task[] {
    return stage.tasks ?? [];
}

export function stageTimeline(stage: CaseStage): TimelineEvent[] {
    return stage.timeline ?? [];
}

export function stageIncidentalCases(stage: CaseStage): IncidentalCase[] {
    return stage.incidentalCases ?? [];
}

export function stageFastTrackPetitions(stage: CaseStage): FastTrackRecord[] {
    if (!Array.isArray(stage.fastTrackPetitions)) return [];
    return stage.fastTrackPetitions as FastTrackRecord[];
}

export function stageAttachmentsList(stage: CaseStage): SmartFileAttachment[] {
    if (!Array.isArray(stage.attachments)) return [];
    return stage.attachments as SmartFileAttachment[];
}

export function ymdPlusDays(base: Date | string, days: number): string {
    const d = typeof base === 'string' ? new Date(base) : new Date(base.getTime());
    d.setDate(d.getDate() + days);
    return formatDateToLocalYmd(d);
}

export { formatDateToLocalYmd };
