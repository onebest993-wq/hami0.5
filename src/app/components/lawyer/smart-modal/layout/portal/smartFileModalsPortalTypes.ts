import type { CaseStage, IncidentalCase, Task, TimelineEvent } from '../../../LawyerShared';
import type { SmartFileParentData } from '../../smartFile/parentDataInit';
import type { JudgmentPayload } from '../../smartFile/judgmentTypes';
import type { SmartFileModalVisualVariant } from '../../smartFile/smartFileModalTheme';
import type { AppealRouteContext } from '../../smartFile/appealRouteEligibility';
import type { ConsolidationCandidate } from '../../smartFile/caseConsolidationLinking';

/** Legacy modal widgets expect string party ids; CaseStage uses numeric Party.id. */
export function partiesForLegacyModals(
    parties: CaseStage['parties'] | undefined,
): Array<{ id: string; name: string; role?: string; isClient?: boolean; side?: 'right' | 'left'; lawyer?: { isMyOffice?: boolean } }> {
    return (parties ?? []).map((p) => ({
        id: String(p.id),
        name: p.name,
        role: p.role,
        isClient: p.isClient,
        side: p.side,
        isMyOffice: (p as { isMyOffice?: boolean }).isMyOffice,
        lawyer: p.lawyer,
    }));
}

export type SmartFileModalsPortalProps = {
    isViewingArchived: boolean;
    isActionsMenuOpen: boolean;
    setIsActionsMenuOpen: (v: boolean) => void;
    isPaused: boolean;
    isInterrupted: boolean;
    isTrashOpen: boolean;
    setIsTrashOpen: (v: boolean) => void;
    showEditInfoModal: boolean;
    setShowEditInfoModal: (v: boolean) => void;
    showTaskModal: boolean;
    setShowTaskModal: (v: boolean) => void;
    showDocModal: boolean;
    setShowDocModal: (v: boolean) => void;
    showNoteModal: boolean;
    setShowNoteModal: (v: boolean) => void;
    showPaymentModal: boolean;
    setShowPaymentModal: (v: boolean) => void;
    showIncidentalModal: boolean;
    setShowIncidentalModal: (v: boolean) => void;
    showFastTrackModal: boolean;
    setShowFastTrackModal: (v: boolean) => void;
    showAttachmentModal: boolean;
    setShowAttachmentModal: (v: boolean) => void;
    showApptModal: boolean;
    setShowApptModal: (v: boolean) => void;
    showPauseModal: boolean;
    setShowPauseModal: (v: boolean) => void;
    showInterruptionModal: boolean;
    setShowInterruptionModal: (v: boolean) => void;
    showResumeInterruptionModal: boolean;
    setShowResumeInterruptionModal: (v: boolean) => void;
    showInterlocutoryModal: boolean;
    setShowInterlocutoryModal: (v: boolean) => void;
    showObjectionRegistrationModal: boolean;
    setShowObjectionRegistrationModal: (v: boolean) => void;
    showObjectionJudgmentModal: boolean;
    setShowObjectionJudgmentModal: (v: boolean) => void;
    showAbsentJudgmentNotificationModal: boolean;
    setShowAbsentJudgmentNotificationModal: (v: boolean) => void;
    showOpponentAbsentObjectionModal: boolean;
    setShowOpponentAbsentObjectionModal: (v: boolean) => void;
    showJudgmentModal: boolean;
    setShowJudgmentModal: (v: boolean) => void;
    showAppealModal: boolean;
    setShowAppealModal: (v: boolean) => void;
    showAppealTransitionModal: boolean;
    setShowAppealTransitionModal: (v: boolean) => void;
    showCrossAppealModal: boolean;
    setShowCrossAppealModal: (v: boolean) => void;
    showProvisionalOrderModal: boolean;
    setShowProvisionalOrderModal: (v: boolean) => void;
    showNotificationModal: boolean;
    setShowNotificationModal: (v: boolean) => void;
    showExtraordinaryAppealModal: boolean | string;
    setShowExtraordinaryAppealModal: (v: boolean | string) => void;
    showMaterialErrorModal: string | null;
    setShowMaterialErrorModal: (v: string | null) => void;
    showJudgeRecusalModal: boolean;
    setShowJudgeRecusalModal: (v: boolean) => void;
    showTransferJurisdictionModal: boolean;
    setShowTransferJurisdictionModal: (v: boolean) => void;
    showCaseConsolidationModal: boolean;
    setShowCaseConsolidationModal: (v: boolean) => void;
    showCaseLinkModal: boolean;
    setShowCaseLinkModal: (v: boolean) => void;
    showCorrespondenceModal: boolean;
    setShowCorrespondenceModal: (v: boolean) => void;
    editingEvent: TimelineEvent | null;
    setEditingEvent: (e: TimelineEvent | null) => void;
    editingTask: Task | null;
    setEditingTask: (t: Task | null) => void;
    editingIncidental: IncidentalCase | null;
    setEditingIncidental: (c: IncidentalCase | null) => void;
    editingFastTrack: Record<string, unknown> | null;
    setEditingFastTrack: (v: Record<string, unknown> | null) => void;
    editingAttachment: Record<string, unknown> | null;
    setEditingAttachment: (v: Record<string, unknown> | null) => void;
    tempJudgmentData: JudgmentPayload | null;
    setTempJudgmentData: (v: JudgmentPayload | null) => void;
    appealOutcomeTask: Task | null;
    setAppealOutcomeTask: (t: Task | null) => void;
    pauseReason: string;
    linkedCaseNo: string;
    interruptionData: Record<string, unknown> | null;
    deletedEvents: TimelineEvent[];
    displayStage: CaseStage;
    currentStage: CaseStage;
    stages: CaseStage[];
    activeStageIndex: number;
    parentData: SmartFileParentData;
    displayStageName?: string;
    consolidationCurrentFileId: number;
    consolidationCurrentCaseNo: string;
    consolidationCurrentClientName?: string;
    consolidationCurrentCourt?: string;
    consolidationCurrentStageLabel?: string;
    consolidationCandidates: ConsolidationCandidate[];
    onConsolidationCreateNew?: (data: { consolidationDate: string; notes?: string }) => void;
    onConsolidationMergeExisting?: (data: {
        secondaryFileId: number;
        consolidationDate: string;
        notes?: string;
    }) => void;
    onConsolidationExternalRef?: (data: {
        peerCaseNo: string;
        consolidationDate: string;
        notes?: string;
    }) => void;
    caseLinkCurrentFileId: number;
    caseLinkCurrentCaseNo: string;
    caseLinkCandidates: ConsolidationCandidate[];
    onCaseLinkExisting?: (data: {
        secondaryFileId: number;
        linkDate: string;
        reason?: string;
    }) => void;
    onCaseLinkExternal?: (data: { peerCaseNo: string; linkDate: string; reason?: string }) => void;
    handlers: Record<string, (...args: unknown[]) => void>;
    appealRoute: AppealRouteContext;
    modalVisualVariant?: SmartFileModalVisualVariant;
};
