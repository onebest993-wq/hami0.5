import { describe, expect, it, vi } from 'vitest';
import { buildSmartFileModalHandlers } from '../buildSmartFileModalHandlers';

describe('buildSmartFileModalHandlers', () => {
    it('includes resume flow handlers used by NextHearingResumeModal', () => {
        const noop = vi.fn();
        const handlers = buildSmartFileModalHandlers({
            handleUpdateCaseInfo: noop,
            handleAddTask: noop,
            handleAddDoc: noop,
            handleAddNote: noop,
            handleAddPayment: noop,
            handleAddIncidentalCase: noop,
            handleSpawnLinkedIncidentalCase: noop,
            handleSaveFastTrack: noop,
            handleSaveAttachment: noop,
            handleAddAction: noop,
            handleAddAppointment: noop,
            handlePauseConfirm: noop,
            handleInterruptionConfirm: noop,
            handleResumeInterruptionConfirm: noop,
            handleInterlocutoryAppealConfirm: noop,
            handleRegisterObjection: noop,
            handleAbsentJudgmentNotification: noop,
            handleOpponentAbsentObjection: noop,
            handleRestoreEvent: noop,
            handleHardDeleteEvent: noop,
            handleDeleteEvent: noop,
            handleEmptyTrash: noop,
            handleJudgmentConfirm: noop,
            handleAppealRegistration: noop,
            handleAppealTransition: noop,
            handleCrossAppeal: noop,
            handleProvisionalOrderConfirm: noop,
            handleSaveNotification: noop,
            handleExtraordinaryAppeal: noop,
            handleMaterialErrorCorrection: noop,
            handleJudgeRecusal: noop,
            handleTransferJurisdiction: noop,
            handleCourtReferralAcceptance: noop,
            handleCaseConsolidation: noop,
            handleCaseLinkExternal: noop,
            handleCorrespondence: noop,
            handleQuickAction: noop,
            handleAbandonment: noop,
            handleInterruptionToggle: noop,
            handleResumeAbandonment: noop,
            handleResume: noop,
            handleAppealBriefOutcome: noop,
        });

        expect(typeof handlers.handleResumeAbandonment).toBe('function');
        expect(typeof handlers.handleResumeInterruptionConfirm).toBe('function');
        expect(typeof handlers.handleResume).toBe('function');
    });
});
