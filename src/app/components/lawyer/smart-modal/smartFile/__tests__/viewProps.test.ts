import { describe, expect, it, vi } from 'vitest';
import {
    buildChromeProps,
    buildMainPanelProps,
    buildModalsPortalProps,
    buildSmartFileLayoutProps,
} from '../viewProps';
import type { SmartFileLayoutBuildInput } from '../viewProps';

function minimalInput(overrides: Partial<SmartFileLayoutBuildInput> = {}): SmartFileLayoutBuildInput {
    const noop = vi.fn();
    return {
        onClose: noop,
        file: { id: 'f1' },
        status: 'نشطة',
        isViewingArchived: false,
        isPaused: false,
        pauseReason: '',
        isInterrupted: false,
        interruptionData: null,
        linkedCaseNo: '',
        parentData: {} as SmartFileLayoutBuildInput['parentData'],
        displayStage: { id: 's1', stageName: 'أولى', timeline: [] } as SmartFileLayoutBuildInput['displayStage'],
        displayTimeline: [],
        currentStage: { id: 's1', stageName: 'أولى', timeline: [] } as SmartFileLayoutBuildInput['currentStage'],
        stages: [],
        activeStageIndex: 0,
        viewingStageIndex: 0,
        isPleadingsClosed: false,
        lastJudgmentType: undefined,
        isEditingStageName: false,
        setIsEditingStageName: noop,
        tempStageName: '',
        setTempStageName: noop,
        onSaveStageName: noop,
        onShare: noop,
        onStageSelect: noop,
        onTouchStart: noop,
        onTouchMove: noop,
        onTouchEnd: noop,
        stepperStages: [],
        currentStageId: 'stg_1',
        deletedEvents: [],
        handlers: {},
        handleResumeAbandonment: noop,
        handleResume: noop,
        handleInterruptionToggle: noop,
        handleOpenPauseModal: noop,
        handleOpenPauseResume: noop,
        handleAbandonment: noop,
        handleRegisterPetitionVoid: noop,
        handlePetitionVoidAppeal: noop,
        handlePetitionVoidOutcome: noop,
        handlePetitionVoidWaiver: noop,
        handleToggleNotification: noop,
        handleCassationDecision: noop,
        handleClosePleadings: noop,
        handleReopenPleadings: noop,
        handleOpenDefendantCassationAppeal: noop,
        handleDefaultObjection: noop,
        handleWaiveObjection: noop,
        handleOpponentAppealWaived: noop,
        handleOtherAppeals: noop,
        handleExportPDF: noop,
        handleResolveIncidentalCase: noop,
        handleQuickAction: noop,
        handleToggleTask: noop,
        handleDeleteEvent: noop,
        handleEditEvent: noop,
        handleAddAction: noop,
        handleCancelCrossAppeal: noop,
        handleAddCrossAppeal: noop,
        setParentData: noop,
        flags: {
            showExportMenu: false,
            setShowExportMenu: noop,
            isTrashOpen: false,
            setIsTrashOpen: noop,
            setShowEditInfoModal: noop,
            isActionsMenuOpen: false,
            setIsActionsMenuOpen: noop,
            showEditInfoModal: false,
            showTaskModal: false,
            setShowTaskModal: noop,
            showDocModal: false,
            setShowDocModal: noop,
            showNoteModal: false,
            setShowNoteModal: noop,
            showPaymentModal: false,
            setShowPaymentModal: noop,
            showIncidentalModal: false,
            setShowIncidentalModal: noop,
            showFastTrackModal: false,
            setShowFastTrackModal: noop,
            showAttachmentModal: false,
            setShowAttachmentModal: noop,
            showApptModal: false,
            setShowApptModal: noop,
            showPauseModal: false,
            setShowPauseModal: noop,
            showInterruptionModal: false,
            setShowInterruptionModal: noop,
            showResumeInterruptionModal: false,
            setShowResumeInterruptionModal: noop,
            showAbandonmentRenewalModal: false,
            setShowAbandonmentRenewalModal: noop,
            showPauseResumeModal: false,
            setShowPauseResumeModal: noop,
            showInterlocutoryModal: false,
            setShowInterlocutoryModal: noop,
            showObjectionRegistrationModal: false,
            setShowObjectionRegistrationModal: noop,
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
            showExtraordinaryAppealModal: false,
            setShowExtraordinaryAppealModal: noop,
            showMaterialErrorModal: null,
            setShowMaterialErrorModal: noop,
            showJudgeRecusalModal: false,
            setShowJudgeRecusalModal: noop,
            showTransferJurisdictionModal: false,
            setShowTransferJurisdictionModal: noop,
            showCaseConsolidationModal: false,
            setShowCaseConsolidationModal: noop,
            editingEvent: null,
            setEditingEvent: noop,
            editingTask: null,
            setEditingTask: noop,
            editingIncidental: null,
            setEditingIncidental: noop,
            editingFastTrack: null,
            setEditingFastTrack: noop,
            editingAttachment: null,
            setEditingAttachment: noop,
            tempJudgmentData: null,
            setTempJudgmentData: noop,
            appealOutcomeTask: null,
            setAppealOutcomeTask: noop,
        },
        ...overrides,
    };
}

describe('viewProps builders', () => {
    it('buildSmartFileLayoutProps returns chrome, mainPanel, modalsPortal', () => {
        const input = minimalInput();
        const layout = buildSmartFileLayoutProps(input);

        expect(layout.mainPanel.file).toEqual({ id: 'f1' });
        expect(layout.mainPanel.handleStageSelect).toBe(input.onStageSelect);
        expect(layout.modalsPortal.handlers).toBe(input.handlers);
        expect(layout.modalsPortal.isTrashOpen).toBe(false);
    });

    it('individual builders match combined layout', () => {
        const input = minimalInput();
        const layout = buildSmartFileLayoutProps(input);

        expect(buildChromeProps(input)).toEqual(layout.chrome);
        expect(buildMainPanelProps(input)).toEqual(layout.mainPanel);
        expect(buildModalsPortalProps(input)).toEqual(layout.modalsPortal);
    });

    it('appealRoute uses live stage claim when file root is empty', () => {
        const input = minimalInput({
            file: { id: 'f1', isUndeterminedValue: true },
            currentStage: {
                id: 's1',
                stageName: 'البداءة',
                claimValue: '2,500,000',
                timeline: [],
            } as SmartFileLayoutBuildInput['currentStage'],
            stages: [
                {
                    id: 's1',
                    stageName: 'البداءة',
                    claimValue: '2,500,000',
                    timeline: [],
                } as SmartFileLayoutBuildInput['stages'][number],
            ],
            displayStage: {
                id: 's1',
                stageName: 'البداءة',
                claimValue: '2,500,000',
                timeline: [],
            } as SmartFileLayoutBuildInput['displayStage'],
        });

        const portal = buildModalsPortalProps(input);
        expect(portal.appealRoute.claimValue).toBe('2,500,000');
        expect(portal.appealRoute.isUndeterminedValue).toBe(false);
    });

    it('appealRoute prefers locked first-instance stage on absent-objection dossier', () => {
        const stages = [
            {
                id: 's1',
                stageName: 'بداءة بدرجة أولى',
                status: 'locked',
                claimValue: '2,500,000',
                timeline: [],
            },
            {
                id: 's2',
                stageName: 'الاعتراض على الحكم الغيابي',
                status: 'active',
                claimValue: '2,500,000',
                timeline: [],
                appealMetadata: { previousStage: 'بداءة بدرجة أولى' },
            },
        ] as SmartFileLayoutBuildInput['stages'];
        const input = minimalInput({
            file: {
                id: 'f1',
                retrialTargetStage: 'بداءة بدرجة أخيرة',
                claimValue: '2,500,000',
            },
            stages,
            activeStageIndex: 1,
            viewingStageIndex: 1,
            currentStage: stages[1],
            displayStage: stages[1],
        });

        const portal = buildModalsPortalProps(input);
        expect(portal.appealRoute.retrialTargetStage).toBe('بداءة بدرجة أولى');
        expect(buildSmartFileLayoutProps(input).modalsPortal.appealRoute).toEqual(portal.appealRoute);
    });
});
