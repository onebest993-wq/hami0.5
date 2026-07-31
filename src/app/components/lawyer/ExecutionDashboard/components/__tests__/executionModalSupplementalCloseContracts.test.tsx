import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('motion/react', () => ({
    motion: {
        div: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
    },
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    useBodyScrollLock: vi.fn(),
}));

vi.mock('../ExecutionTasksSection', () => ({
    ExecutionTasksSection: () => <div>tasks section</div>,
}));

vi.mock('../ExecutionPinnedNotesTray', () => ({
    ExecutionPinnedNotesTray: () => <div>pinned notes tray</div>,
}));

vi.mock('@/app/components/lawyer/dossier-notes/DossierFastNoteComposer', () => ({
    DossierFastNoteComposer: () => <div>fast note composer</div>,
}));

vi.mock('@/app/components/lawyer/dossier-notes/DossierNotesVault', () => ({
    DossierNotesVault: () => <div>notes vault</div>,
}));

vi.mock('@/app/utils/executorSeizureDecisionQueue', () => ({
    findApprovedBreakInventoryNeedingLedger: vi.fn(() => null),
    patchExecutorDecisionRow: vi.fn(),
}));

vi.mock('../guarantorExternalUtils', () => ({
    isGuarantorSummonsEligible: vi.fn(() => false),
}));

import { ExecutionNotesAndAppointmentModals } from '../ExecutionNotesAndAppointmentModals';
import { UnifiedSummonsModalContainer } from '../UnifiedSummonsModalContainer';
import { ExecutionSolidaryAndEvictionFollowupModalsContainer } from '../ExecutionSolidaryAndEvictionFollowupModalsContainer';

function createNotesProps(
    overrides: Partial<React.ComponentProps<typeof ExecutionNotesAndAppointmentModals>> = {},
): React.ComponentProps<typeof ExecutionNotesAndAppointmentModals> {
    return {
        showNotesModal: true,
        onCloseNotesModal: vi.fn(),
        setNoteTitle: vi.fn(),
        setNoteBody: vi.fn(),
        setIsTask: vi.fn(),
        setTaskDueDate: vi.fn(),
        setTaskStatus: vi.fn(),
        setEditingTaskId: vi.fn(),
        setSavedNotesView: vi.fn(),
        moveCaseNoteToTrash: vi.fn(),
        savedNotesSplit: { notes: [], doneTasks: [] },
        savedNotesView: 'notes',
        toggleCaseNotePin: vi.fn(),
        toggleCaseTaskPin: vi.fn(),
        decisionsStorageExecutionId: 'ex-1',
        showToast: vi.fn(),
        noteTitle: '',
        noteBody: '',
        isTask: false,
        editingTaskId: null,
        commitDossierNote: vi.fn(),
        editingNoteId: null,
        setEditingNoteId: vi.fn(),
        showAppointmentModal: false,
        onCloseAppointmentModal: vi.fn(),
        setEditingAppointmentId: vi.fn(),
        setAppointmentPurpose: vi.fn(),
        setAppointmentDateOnly: vi.fn(),
        setAppointmentTimeOptional: vi.fn(),
        editingAppointmentId: null,
        appointmentPurpose: '',
        appointmentDateOnly: '',
        handleSaveAppointment: vi.fn(),
        timelineEvents: [],
        todayYmd: '2026-07-10',
        moveTimelineEventToTrash: vi.fn(),
        caseTasksPending: [],
        handleSaveTask: vi.fn(),
        handleUpdateTask: vi.fn(),
        handleDeleteTask: vi.fn(),
        handleCompleteTask: vi.fn(),
        handleAddTimelineEvent: vi.fn(),
        ...overrides,
    };
}

function createUnifiedSummonsProps(
    overrides: Partial<React.ComponentProps<typeof UnifiedSummonsModalContainer>> = {},
): React.ComponentProps<typeof UnifiedSummonsModalContainer> {
    const LazyUnifiedSummonsHub = (props: Record<string, any>) => (
        <div>
            <button type="button" onClick={props.onClose}>
                close summons
            </button>
            <button type="button" onClick={props.onOpenCoerciveModal}>
                coercive from hub
            </button>
            <button
                type="button"
                onClick={props.evictionDebtorExecutionStrip?.onOpenCoercive}
            >
                coercive from strip
            </button>
        </div>
    );

    return {
        showUnifiedSummonsModal: true,
        EXEC_OVERLAY_LAZY_FALLBACK: <div>fallback</div>,
        LazyUnifiedSummonsHub,
        executionId: 'ex-1',
        unifiedSummonsTargetDebtorKey: 'debtor-1',
        summonsHubInitialMainTab: 'tabligh',
        onCloseUnifiedSummonsModal: vi.fn(),
        primaryDebtorKeyResolved: 'debtor-1',
        isEvictionExecutionModule: true,
        setManualGraceCalendarExtra: vi.fn(),
        executionData: { id: 'ex-1' } as never,
        notificationCount: 1,
        onUpdate: vi.fn(),
        buildDebtorNoticePatchForKey: vi.fn(() => ({})),
        executionStorageKey: vi.fn(() => 'storage-key'),
        storageCache: { set: vi.fn() },
        handleNotifyDebtor: vi.fn(),
        subsequentNoticeUnlocked: true,
        noticeKindGoalStrictBinding: false,
        forcedSummoningAnalysis: { canForceSummon: true, lockReasonAr: '' },
        followupIsDebtorGovernmentEmployee: false,
        followupIsDebtorRetired: false,
        activeCoerciveActions: [],
        activeDebtorIsEmployee: false,
        registerDebtorVoluntaryAttendance: vi.fn(),
        openExecutionSeizuresTab: vi.fn(),
        followupDebtorSummonsProfile: undefined,
        summoningRound: 1,
        debtorBrowserTabsMode: false,
        followupEarnerForcedActionUnlocked: true,
        earnerForcedActionUnlocked: true,
        forcedAttendanceIssued: false,
        handleForcedAttendance: vi.fn(),
        debtorNotifiedForEvictionGrace: true,
        voluntaryEndOptimistic: false,
        isEvictionGraceExpiredCalendar: true,
        handleDeclareEvictionVoluntaryPeriodEnd: vi.fn(),
        isEvictionGraceEffectivelyExpired: true,
        unifiedCollectionApproved: true,
        parsedLawyerFees: 0,
        debtorEvaded: false,
        handleDebtorEvasion: vi.fn(),
        noticeVoluntaryPeriodEndOptimistic: false,
        isGracePeriodExpiredNow: false,
        debtorAttendedVoluntarily: false,
        handleDeclareNoticeVoluntaryPeriodEnd: vi.fn(),
        lawyerStartedPostNoticeExecution: false,
        coerciveUiLocked: false,
        executionStatus: 'READY_FOR_COERCIVE',
        employeeAssignmentTabEnabled: false,
        resolvedEmployeeSummonsAssignment: null,
        handleEmployeeAssignmentConfirm: vi.fn(),
        handleEmployeeAssignmentAttend: vi.fn(),
        handleEmployeeAssignmentDeclareAbsent: vi.fn(),
        handleEmployeeAssignmentTerminate: vi.fn(),
        handleEmployeeAssignmentRequestInvestigation: vi.fn(),
        handleEmployeeRegisterArrestOrder: vi.fn(),
        handleEmployeeAssignmentRequestForcedBring: vi.fn(),
        forcedBringDecisionState: { pending: false, rejected: false },
        employeeForcedBringAwaitingPersonalOutcome: false,
        handleEmployeeAssignmentResolveForcedBringOutcome: vi.fn(),
        handleEmployeeWarrantOutcome: vi.fn(),
        getPublicationNoticeForDebtorKey: vi.fn(() => null),
        handlePublicationNoticeRegister: vi.fn(),
        handlePublicationNoticeTerminate: vi.fn(),
        handlePublicationNoticeDebtorAttended: vi.fn(),
        activeDebtorNoticeScope: { notificationDate: null, voluntaryPeriodEndDeclared: false },
        scopedSummonsMarker: null,
        terminateDebtorSummonsMarker: vi.fn(),
        persistExecutionMerge: vi.fn(),
        setTimelineEvents: vi.fn(),
        pushTimelineEvent: vi.fn(),
        nextTimelineId: vi.fn(() => 't-1'),
        showToast: vi.fn(),
        ...overrides,
    };
}

function createSolidaryProps(
    overrides: Partial<React.ComponentProps<typeof ExecutionSolidaryAndEvictionFollowupModalsContainer>> = {},
): React.ComponentProps<typeof ExecutionSolidaryAndEvictionFollowupModalsContainer> {
    return {
        showSolidaryCoerciveTargetModal: false,
        solidaryCoerciveActionPending: null,
        onCloseSolidaryCoerciveTargetModal: vi.fn(),
        EXEC_MODAL_BACKDROP_STRONG: 'bg-black/80',
        nestedOverUnifiedZIndex: 999,
        allDebtorsUnified: [{ id: 'd-1', name: 'المدين الأول', cleared: false }],
        coerciveSubjectRef: { current: { id: '', name: '' } },
        saveCoerciveActionRef: { current: vi.fn() },
        buildInitialExecutorSeizureDetails: vi.fn(() => ({ kind: 'salary' })),
        setShowCoerciveActionForm: vi.fn(),
        showEvictionExpenseModal: false,
        isEvictionExecutionModule: true,
        onCloseEvictionExpenseModal: vi.fn(),
        evictionExpensePayMode: 'lump_sum',
        setEvictionExpensePayMode: vi.fn(),
        evictionExpenseAmount: '',
        setEvictionExpenseAmount: vi.fn(),
        evictionExpenseNote: '',
        setEvictionExpenseNote: vi.fn(),
        runEvictionExpenseSubmit: vi.fn(),
        showEvictionLawyerFeeModal: false,
        onCloseEvictionLawyerFeeModal: vi.fn(),
        parsedLawyerFees: 1000,
        lawyerFeeDisburseMode: 'lump_sum',
        setLawyerFeeDisburseMode: vi.fn(),
        lawyerFeeDisburseNotes: '',
        setLawyerFeeDisburseNotes: vi.fn(),
        runEvictionLawyerFeeSubmit: vi.fn(),
        showEvictionResidentialGraceModal: false,
        onCloseEvictionResidentialGraceModal: vi.fn(),
        graceModalStartYmd: '',
        setGraceModalStartYmd: vi.fn(),
        graceModalEndYmd: '',
        setGraceModalEndYmd: vi.fn(),
        residentialVacateDeadlineMaxIso: '',
        residentialGraceModalShowPrimarySave: true,
        submitEvictionResidentialGraceFromModal: vi.fn(),
        ...overrides,
    };
}

describe('ExecutionNotesAndAppointmentModals', () => {
    it('uses explicit notes close intent and resets note state', () => {
        const props = createNotesProps();

        render(<ExecutionNotesAndAppointmentModals {...props} />);

        fireEvent.click(screen.getAllByRole('button')[0]);

        expect(props.onCloseNotesModal).toHaveBeenCalledTimes(1);
        expect(props.setNoteTitle).toHaveBeenCalledWith('');
        expect(props.setNoteBody).toHaveBeenCalledWith('');
        expect(props.setIsTask).toHaveBeenCalledWith(false);
        expect(props.setTaskDueDate).toHaveBeenCalledWith('');
        expect(props.setTaskStatus).toHaveBeenCalledWith('pending');
        expect(props.setEditingTaskId).toHaveBeenCalledWith(null);
        expect(props.setEditingNoteId).toHaveBeenCalledWith(null);
        expect(props.setSavedNotesView).toHaveBeenCalledWith('notes');
    });

    it('uses explicit appointment close intent and resets appointment state', () => {
        const props = createNotesProps({
            showNotesModal: false,
            showAppointmentModal: true,
        });

        render(<ExecutionNotesAndAppointmentModals {...props} />);

        fireEvent.click(screen.getAllByRole('button')[0]);

        expect(props.onCloseAppointmentModal).toHaveBeenCalledTimes(1);
        expect(props.setEditingAppointmentId).toHaveBeenCalledWith(null);
        expect(props.setAppointmentPurpose).toHaveBeenCalledWith('');
        expect(props.setAppointmentDateOnly).toHaveBeenCalledWith('');
        expect(props.setAppointmentTimeOptional).toHaveBeenCalledWith('');
    });
});

describe('UnifiedSummonsModalContainer', () => {
    it('uses explicit close intent from the hub and coercive paths', () => {
        const props = createUnifiedSummonsProps();

        render(<UnifiedSummonsModalContainer {...props} />);

        fireEvent.click(screen.getByRole('button', { name: 'close summons' }));
        fireEvent.click(screen.getByRole('button', { name: 'coercive from hub' }));
        fireEvent.click(screen.getByRole('button', { name: 'coercive from strip' }));

        expect(props.onCloseUnifiedSummonsModal).toHaveBeenCalledTimes(3);
        expect(props.openExecutionSeizuresTab).toHaveBeenCalledTimes(2);
    });
});

describe('ExecutionSolidaryAndEvictionFollowupModalsContainer', () => {
    it('uses explicit solidary close intent for backdrop and target selection', () => {
        const props = createSolidaryProps({
            showSolidaryCoerciveTargetModal: true,
            solidaryCoerciveActionPending: 'salary',
        });

        render(<ExecutionSolidaryAndEvictionFollowupModalsContainer {...props} />);

        fireEvent.click(screen.getByRole('presentation'));
        fireEvent.click(screen.getByRole('button', { name: 'المدين الأول' }));

        expect(props.onCloseSolidaryCoerciveTargetModal).toHaveBeenCalledTimes(2);
        expect(props.saveCoerciveActionRef.current).toHaveBeenCalledTimes(1);
    });

    it('uses explicit eviction close intents', () => {
        const props = createSolidaryProps({
            showEvictionExpenseModal: true,
            showEvictionLawyerFeeModal: true,
            showEvictionResidentialGraceModal: true,
            residentialGraceModalShowPrimarySave: false,
        });

        render(<ExecutionSolidaryAndEvictionFollowupModalsContainer {...props} />);

        fireEvent.click(screen.getAllByRole('button', { name: 'إلغاء' })[0]);
        fireEvent.click(screen.getAllByRole('button', { name: 'إلغاء' })[1]);
        fireEvent.click(screen.getAllByRole('button', { name: 'إلغاء' })[2]);

        expect(props.onCloseEvictionExpenseModal).toHaveBeenCalledTimes(1);
        expect(props.onCloseEvictionLawyerFeeModal).toHaveBeenCalledTimes(1);
        expect(props.onCloseEvictionResidentialGraceModal).toHaveBeenCalledTimes(1);
    });
});
