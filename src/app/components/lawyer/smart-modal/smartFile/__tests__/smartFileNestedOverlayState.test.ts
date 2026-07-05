import { describe, expect, it } from 'vitest';
import { isSmartFileNestedOverlayOpen } from '../smartFileNestedOverlayState';
import type { SmartFileModalsPortalProps } from '../../layout/portal/smartFileModalsPortalTypes';

function basePortal(overrides: Partial<SmartFileModalsPortalProps> = {}): SmartFileModalsPortalProps {
    return {
        isViewingArchived: false,
        isActionsMenuOpen: false,
        setIsActionsMenuOpen: () => undefined,
        isPaused: false,
        isInterrupted: false,
        isTrashOpen: false,
        setIsTrashOpen: () => undefined,
        showEditInfoModal: false,
        setShowEditInfoModal: () => undefined,
        showTaskModal: false,
        setShowTaskModal: () => undefined,
        showDocModal: false,
        setShowDocModal: () => undefined,
        showNoteModal: false,
        setShowNoteModal: () => undefined,
        showPaymentModal: false,
        setShowPaymentModal: () => undefined,
        showIncidentalModal: false,
        setShowIncidentalModal: () => undefined,
        showFastTrackModal: false,
        setShowFastTrackModal: () => undefined,
        showAttachmentModal: false,
        setShowAttachmentModal: () => undefined,
        showApptModal: false,
        setShowApptModal: () => undefined,
        showPauseModal: false,
        setShowPauseModal: () => undefined,
        showInterruptionModal: false,
        setShowInterruptionModal: () => undefined,
        showResumeInterruptionModal: false,
        setShowResumeInterruptionModal: () => undefined,
        showInterlocutoryModal: false,
        setShowInterlocutoryModal: () => undefined,
        showObjectionRegistrationModal: false,
        setShowObjectionRegistrationModal: () => undefined,
        showObjectionJudgmentModal: false,
        setShowObjectionJudgmentModal: () => undefined,
        showAbsentJudgmentNotificationModal: false,
        setShowAbsentJudgmentNotificationModal: () => undefined,
        showOpponentAbsentObjectionModal: false,
        setShowOpponentAbsentObjectionModal: () => undefined,
        showJudgmentModal: false,
        setShowJudgmentModal: () => undefined,
        showAppealModal: false,
        setShowAppealModal: () => undefined,
        showAppealTransitionModal: false,
        setShowAppealTransitionModal: () => undefined,
        showCrossAppealModal: false,
        setShowCrossAppealModal: () => undefined,
        showProvisionalOrderModal: false,
        setShowProvisionalOrderModal: () => undefined,
        showNotificationModal: false,
        setShowNotificationModal: () => undefined,
        showExtraordinaryAppealModal: false,
        setShowExtraordinaryAppealModal: () => undefined,
        showMaterialErrorModal: null,
        setShowMaterialErrorModal: () => undefined,
        showJudgeRecusalModal: false,
        setShowJudgeRecusalModal: () => undefined,
        showTransferJurisdictionModal: false,
        setShowTransferJurisdictionModal: () => undefined,
        showCaseConsolidationModal: false,
        setShowCaseConsolidationModal: () => undefined,
        showCaseLinkModal: false,
        setShowCaseLinkModal: () => undefined,
        showCorrespondenceModal: false,
        setShowCorrespondenceModal: () => undefined,
        editingEvent: null,
        setEditingEvent: () => undefined,
        editingTask: null,
        setEditingTask: () => undefined,
        editingIncidental: null,
        setEditingIncidental: () => undefined,
        editingFastTrack: null,
        setEditingFastTrack: () => undefined,
        editingAttachment: null,
        setEditingAttachment: () => undefined,
        tempJudgmentData: null,
        setTempJudgmentData: () => undefined,
        appealOutcomeTask: null,
        setAppealOutcomeTask: () => undefined,
        pauseReason: '',
        linkedCaseNo: '',
        interruptionData: null,
        deletedEvents: [],
        displayStage: { stageName: 'البداءة' } as SmartFileModalsPortalProps['displayStage'],
        currentStage: { stageName: 'البداءة' } as SmartFileModalsPortalProps['currentStage'],
        stages: [],
        activeStageIndex: 0,
        parentData: { id: 1 } as SmartFileModalsPortalProps['parentData'],
        consolidationCurrentFileId: 1,
        consolidationCurrentCaseNo: '1/2026',
        consolidationCandidates: [],
        caseLinkCurrentFileId: 1,
        caseLinkCurrentCaseNo: '1/2026',
        caseLinkCandidates: [],
        handlers: {},
        appealRoute: { kind: 'none' } as SmartFileModalsPortalProps['appealRoute'],
        ...overrides,
    };
}

describe('isSmartFileNestedOverlayOpen', () => {
    it('returns false when no nested overlay is open', () => {
        expect(isSmartFileNestedOverlayOpen(basePortal())).toBe(false);
    });

    it('detects appointment modal', () => {
        expect(isSmartFileNestedOverlayOpen(basePortal({ showApptModal: true }))).toBe(true);
    });

    it('detects note modal', () => {
        expect(isSmartFileNestedOverlayOpen(basePortal({ showNoteModal: true }))).toBe(true);
    });

    it('detects legal actions menu', () => {
        expect(isSmartFileNestedOverlayOpen(basePortal({ isActionsMenuOpen: true }))).toBe(true);
    });

    it('detects extraordinary appeal string flag', () => {
        expect(isSmartFileNestedOverlayOpen(basePortal({ showExtraordinaryAppealModal: 'retrial' }))).toBe(true);
    });
});
