import { describe, expect, it } from 'vitest';
import { buildFileDataFromNewCaseSave } from '@/app/domain/lawsuit/lawsuitFileFactory';
import { buildInitialStagesFromFile } from '../stageInit';
import { buildInitialParentDataFromFile } from '../parentDataInit';
import { buildSmartFileLayoutProps } from '../viewProps';
import type { CaseStage } from '../../../LawyerShared';

function buildLayoutInput(
    file: Record<string, unknown>,
    stages: CaseStage[],
    activeStageIndex = 0,
) {
    const parentData = buildInitialParentDataFromFile(file);
    const currentStage = stages[activeStageIndex] ?? stages[0]!;
    const displayStage = currentStage;
    const noop = () => undefined;

    return {
        onClose: noop,
        file,
        status: 'نشطة',
        isViewingArchived: false,
        isPaused: false,
        pauseReason: '',
        isInterrupted: false,
        interruptionData: null,
        linkedCaseNo: '',
        parentData,
        displayStage,
        displayTimeline: displayStage.timeline ?? [],
        currentStage,
        stages,
        activeStageIndex,
        viewingStageIndex: activeStageIndex,
        isPleadingsClosed: currentStage.isPleadingsClosed,
        lastJudgmentType: currentStage.lastJudgmentType,
        isEditingStageName: false,
        setIsEditingStageName: noop,
        tempStageName: '',
        setTempStageName: noop,
        onSaveStageName: noop,
        onShare: noop,
        onStageSelect: noop,
        onTouchStart: noop as never,
        onTouchMove: noop as never,
        onTouchEnd: noop,
        stepperStages: [],
        currentStageId: String(currentStage.id ?? 's0'),
        deletedEvents: [],
        handlers: {},
        consolidationCurrentFileId: Number(file.id ?? 0),
        consolidationCurrentCaseNo: String(file.caseNo ?? ''),
        consolidationCandidates: [],
        caseLinkCurrentFileId: Number(file.id ?? 0),
        caseLinkCurrentCaseNo: String(file.caseNo ?? ''),
        caseLinkCandidates: [],
        handleResumeAbandonment: noop as never,
        handleResume: noop as never,
        handleToggleClient: noop as never,
        handleInterruptionToggle: noop as never,
        handleOpenPauseModal: noop,
        handleOpenPauseResume: noop,
        handleAbandonment: noop as never,
        handleRegisterPetitionVoid: noop,
        handlePetitionVoidAppeal: noop as never,
        handlePetitionVoidOutcome: noop as never,
        handlePetitionVoidWaiver: noop,
        handleToggleNotification: noop as never,
        handleCassationDecision: noop as never,
        handleClosePleadings: noop as never,
        handleReopenPleadings: noop as never,
        handleOpenDefendantCassationAppeal: noop,
        handleDefaultObjection: noop as never,
        handleWaiveObjection: noop as never,
        handleOpponentAppealWaived: noop as never,
        handleOtherAppeals: noop as never,
        handleOpenAbsentJudgmentNotification: noop,
        handleOpenOpponentAbsentObjection: noop,
        handleExportPDF: noop as never,
        handleResolveIncidentalCase: noop as never,
        handleQuickAction: noop as never,
        handleToggleTask: noop as never,
        handleDeleteEvent: noop as never,
        handleEditEvent: noop as never,
        handleAddAction: noop as never,
        handleSaveFastTrack: noop as never,
        handleSaveAttachment: noop as never,
        handleSaveAppointment: noop as never,
        handleSaveDocument: noop as never,
        handleSaveNote: noop as never,
        handleSavePayment: noop as never,
        handleSaveProvisionalOrder: noop as never,
        handleSaveTask: noop as never,
        handleJudgmentConfirm: noop as never,
        handleAppealRegistration: noop as never,
        handleAppealTransition: noop as never,
        handleCrossAppeal: noop as never,
        handleSaveNotification: noop as never,
        handleIncidentalCaseConfirm: noop as never,
        handleProvisionalOrderConfirm: noop as never,
        handleEditCaseInfoConfirm: noop as never,
        handleFastTrackConfirm: noop as never,
        handleAttachmentShieldConfirm: noop as never,
        flags: {
            showJudgmentModal: false,
            setShowJudgmentModal: noop,
            showAppealModal: false,
            setShowAppealModal: noop,
            showAppealTransitionModal: false,
            setShowAppealTransitionModal: noop,
            showCrossAppealModal: false,
            setShowCrossAppealModal: noop,
            showProvisionalOrderModal: false,
            setShowProvisionalOrderModal: noop,
            showNotificationModal: false,
            setShowNotificationModal: noop,
            showDocModal: false,
            setShowDocModal: noop,
            showNoteModal: false,
            setShowNoteModal: noop,
            showPaymentModal: false,
            setShowPaymentModal: noop,
            showApptModal: false,
            setShowApptModal: noop,
            showIncidentalModal: false,
            setShowIncidentalModal: noop,
            showFastTrackModal: false,
            setShowFastTrackModal: noop,
            showAttachmentModal: false,
            setShowAttachmentModal: noop,
            showEditInfoModal: false,
            setShowEditInfoModal: noop,
            showPauseModal: false,
            setShowPauseModal: noop,
            showPauseResumeModal: false,
            setShowPauseResumeModal: noop,
            showAbandonmentRenewalModal: false,
            setShowAbandonmentRenewalModal: noop,
            showResumeInterruptionModal: false,
            setShowResumeInterruptionModal: noop,
            showTrashModal: false,
            setShowTrashModal: noop,
            showConsolidationModal: false,
            setShowConsolidationModal: noop,
            showCaseLinkModal: false,
            setShowCaseLinkModal: noop,
            showLegalActionsModal: false,
            setShowLegalActionsModal: noop,
            showTaskModal: false,
            setShowTaskModal: noop,
            editingEvent: null,
            setEditingEvent: noop,
            editingIncidental: null,
            setEditingIncidental: noop,
            editingFastTrack: null,
            setEditingFastTrack: noop,
            editingAttachment: null,
            setEditingAttachment: noop,
            editingTask: null,
            setEditingTask: noop,
            tempJudgmentData: null,
            setTempJudgmentData: noop,
            isTrashOpen: false,
            setIsTrashOpen: noop,
            isActionsMenuOpen: false,
            setIsActionsMenuOpen: noop,
        },
    };
}

describe('dossier layout smoke (no crash on build)', () => {
    it('civil lawsuit dossier layout builds', () => {
        const file = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            details: { number: '100/2026', court: 'بداءة الكرخ', type: 'مدنية' },
            parties1: [{ name: 'المدعي', isClient: true }],
            parties2: [{ name: 'المدعى عليه' }],
        });
        expect(file).not.toBeNull();
        const stages = buildInitialStagesFromFile(file as Record<string, unknown>);
        const layout = buildSmartFileLayoutProps(
            buildLayoutInput(file as Record<string, unknown>, stages),
        );
        expect(layout.mainPanel).toBeDefined();
        expect(layout.modalsPortal).toBeDefined();
    });

    it('personal status dossier layout builds', () => {
        const file = buildFileDataFromNewCaseSave({
            mainCategory: 'lawsuit',
            selectedType: 'personal',
            details: {
                number: '1 / أ / 2026',
                court: 'محكمة الأحوال الشخصية',
                type: 'نفقة',
                stage: 'أحوال شخصية',
            },
            parties1: [{ name: 'المدعي', isClient: true }],
            parties2: [{ name: 'المدعى عليه' }],
        });
        expect(file).not.toBeNull();
        const stages = buildInitialStagesFromFile(file as Record<string, unknown>);
        const layout = buildSmartFileLayoutProps(
            buildLayoutInput(file as Record<string, unknown>, stages),
        );
        expect(layout.mainPanel).toBeDefined();
        expect(layout.modalsPortal).toBeDefined();
    });

    it('judgment modal modules load without circular undefined exports', async () => {
        const judgmentTypes = await import('../judgmentTypes');
        const absentFlow = await import('../absentJudgmentFlow');
        const modal = await import('../../SmartJudgmentModal');

        expect(typeof judgmentTypes.shouldShowOpponentAppealRegisterButton).toBe('function');
        expect(typeof judgmentTypes.isSubjectMatterJudgmentType).toBe('function');
        expect(typeof absentFlow.shouldShowAbsentJudgmentFooter).toBe('function');
        expect(typeof modal.SmartJudgmentModal).toBe('function');
    });
});
