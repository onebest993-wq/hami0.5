import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('motion/react', () => ({
    motion: {
        div: ({ children, ...props }: Record<string, unknown>) => (
            <div {...props}>{children as React.ReactNode}</div>
        ),
    },
}));

vi.mock('../guarantorExternalUtils', () => ({
    isGuarantorSummonsEligible: vi.fn(() => false),
}));

import { UnifiedSummonsHub } from '@/app/components/lawyer/Modal_Unified_Summons_Hub';
import { UnifiedSummonsModalContainer } from '../UnifiedSummonsModalContainer';
import {
    registerExecutionHandlerStubNotifier,
    resetExecutionHandlerStubNotifierForTests,
} from '../../hooks/executionHandlerClusterStubs';

/**
 * نافذة الـ stubs: قبل وصول handler clusters الكسولة، يصل scope bag
 * بمفاتيح معالجات مسطّحة undefined (تسطيح Object.assign يتخطى الـ stub functions).
 * الانحدار السابق: النقر على «تأكيد التكليف بالحضور» كان يرمي
 * "employeeAssignmentFeature.onConfirm is not a function" ويُسقط التطبيق.
 */
function createStubWindowProps(): React.ComponentProps<typeof UnifiedSummonsModalContainer> {
    const undefinedHandler = undefined as unknown as () => void;
    return {
        showUnifiedSummonsModal: true,
        EXEC_OVERLAY_LAZY_FALLBACK: <div>fallback</div>,
        LazyUnifiedSummonsHub: UnifiedSummonsHub,
        executionId: 'ex-1',
        unifiedSummonsTargetDebtorKey: 'debtor-1',
        summonsHubInitialMainTab: 'taklif',
        onCloseUnifiedSummonsModal: vi.fn(),
        primaryDebtorKeyResolved: 'debtor-1',
        isEvictionExecutionModule: false,
        setManualGraceCalendarExtra: vi.fn(),
        executionData: { id: 'ex-1' } as never,
        notificationCount: 0,
        onUpdate: vi.fn(),
        buildDebtorNoticePatchForKey: vi.fn(() => ({})),
        executionStorageKey: vi.fn(() => 'storage-key'),
        storageCache: { set: vi.fn() },
        handleNotifyDebtor: undefinedHandler,
        subsequentNoticeUnlocked: false,
        noticeKindGoalStrictBinding: false,
        forcedSummoningAnalysis: { canForceSummon: false, lockReasonAr: '' },
        followupIsDebtorGovernmentEmployee: true,
        followupIsDebtorRetired: false,
        activeCoerciveActions: [],
        activeDebtorIsEmployee: true,
        registerDebtorVoluntaryAttendance: undefinedHandler,
        openExecutionSeizuresTab: vi.fn(),
        followupDebtorSummonsProfile: undefined,
        summoningRound: 1,
        debtorBrowserTabsMode: false,
        followupEarnerForcedActionUnlocked: false,
        earnerForcedActionUnlocked: false,
        forcedAttendanceIssued: false,
        handleForcedAttendance: undefinedHandler,
        debtorNotifiedForEvictionGrace: false,
        voluntaryEndOptimistic: false,
        isEvictionGraceExpiredCalendar: false,
        handleDeclareEvictionVoluntaryPeriodEnd: undefinedHandler,
        isEvictionGraceEffectivelyExpired: false,
        unifiedCollectionApproved: false,
        parsedLawyerFees: 0,
        debtorEvaded: false,
        handleDebtorEvasion: undefinedHandler,
        noticeVoluntaryPeriodEndOptimistic: false,
        isGracePeriodExpiredNow: false,
        // أرشفة التبليغ حتى يظهر تبويب «التكليف بالحضور» في الهَب
        debtorAttendedVoluntarily: true,
        handleDeclareNoticeVoluntaryPeriodEnd: undefinedHandler,
        lawyerStartedPostNoticeExecution: false,
        coerciveUiLocked: false,
        executionStatus: 'ACTIVE',
        employeeAssignmentTabEnabled: true,
        resolvedEmployeeSummonsAssignment: null,
        handleEmployeeAssignmentConfirm: undefined as never,
        handleEmployeeAssignmentAttend: undefinedHandler,
        handleEmployeeAssignmentDeclareAbsent: undefinedHandler,
        handleEmployeeAssignmentTerminate: undefinedHandler,
        handleEmployeeAssignmentRequestInvestigation: undefinedHandler,
        handleEmployeeRegisterArrestOrder: undefinedHandler,
        handleEmployeeAssignmentRequestForcedBring: undefinedHandler,
        forcedBringDecisionState: { pending: false, rejected: false },
        employeeForcedBringAwaitingPersonalOutcome: false,
        handleEmployeeAssignmentResolveForcedBringOutcome: undefined as never,
        handleEmployeeWarrantOutcome: undefined as never,
        getPublicationNoticeForDebtorKey: vi.fn(() => null),
        handlePublicationNoticeRegister: undefined as never,
        handlePublicationNoticeTerminate: undefinedHandler,
        handlePublicationNoticeDebtorAttended: undefinedHandler,
        activeDebtorNoticeScope: { notificationDate: null, voluntaryPeriodEndDeclared: false },
        scopedSummonsMarker: null,
        terminateDebtorSummonsMarker: undefinedHandler,
        persistExecutionMerge: vi.fn(),
        setTimelineEvents: vi.fn((updater) => {
            if (typeof updater === 'function') updater([]);
        }),
        pushTimelineEvent: vi.fn(),
        nextTimelineId: vi.fn(() => 't-1'),
        showToast: vi.fn(),
    };
}

afterEach(() => {
    resetExecutionHandlerStubNotifierForTests();
});

describe('UnifiedSummonsModalContainer — نافذة الـ stubs (معالجات لم تصل بعد)', () => {
    it('تأكيد التكليف بالحضور أثناء غياب onConfirm لا يرمي خطأ بل يستدعي إشعار «جاري التجهيز»', () => {
        const stubNotified = vi.fn();
        registerExecutionHandlerStubNotifier(stubNotified);

        render(<UnifiedSummonsModalContainer {...createStubWindowProps()} />);

        fireEvent.change(screen.getByLabelText('الغاية من التكليف'), {
            target: { value: 'الحضور أمام المنفذ العدل' },
        });
        fireEvent.change(screen.getByLabelText('تاريخ التبليغ بالتكليف'), {
            target: { value: '2020-01-05' },
        });

        expect(() => {
            fireEvent.click(screen.getByRole('button', { name: 'تأكيد التكليف بالحضور' }));
        }).not.toThrow();

        expect(stubNotified).toHaveBeenCalledWith(
            'employeeAssignmentHandlers.handleEmployeeAssignmentConfirm',
        );
    });

    it('تسجيل التبليغ بالنشر أثناء غياب onRegister لا يرمي خطأ ويُسجّل عبر الحاوية', () => {
        const persistExecutionMerge = vi.fn();
        const pushTimelineEvent = vi.fn();

        render(
            <UnifiedSummonsModalContainer
                {...createStubWindowProps()}
                activeDebtorIsEmployee={false}
                summonsHubInitialMainTab="nashr"
                persistExecutionMerge={persistExecutionMerge}
                pushTimelineEvent={pushTimelineEvent}
            />,
        );

        fireEvent.change(screen.getByLabelText('تاريخ النشر في الجريدة'), {
            target: { value: '2020-01-05' },
        });
        const newspaperInputs = screen.getAllByRole('textbox');
        fireEvent.change(newspaperInputs[0], { target: { value: 'الوقائع' } });
        fireEvent.change(newspaperInputs[1], { target: { value: 'الصباح' } });

        expect(() => {
            fireEvent.click(screen.getByRole('button', { name: 'تسجيل التبليغ بالنشر' }));
        }).not.toThrow();

        expect(persistExecutionMerge).toHaveBeenCalled();
        expect(pushTimelineEvent).toHaveBeenCalled();
    });

    it('حضر المدين أثناء غياب registerDebtorVoluntaryAttendance يُسجّل عبر الحاوية', () => {
        const persistExecutionMerge = vi.fn(() => true);
        const setTimelineEvents = vi.fn((updater) => {
            if (typeof updater === 'function') updater([]);
        });
        const onCloseUnifiedSummonsModal = vi.fn();

        render(
            <UnifiedSummonsModalContainer
                {...createStubWindowProps()}
                summonsHubInitialMainTab="tabligh"
                notificationCount={0}
                debtorAttendedVoluntarily={false}
                activeDebtorNoticeScope={{
                    notificationDate: '2020-01-05',
                    voluntaryPeriodEndDeclared: false,
                }}
                persistExecutionMerge={persistExecutionMerge}
                setTimelineEvents={setTimelineEvents}
                onCloseUnifiedSummonsModal={onCloseUnifiedSummonsModal}
            />,
        );

        expect(() => {
            fireEvent.click(screen.getByRole('button', { name: /حضر المدين/ }));
        }).not.toThrow();

        expect(setTimelineEvents).toHaveBeenCalled();
        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                debtorAttendedVoluntarily: true,
                timelineEvents: expect.any(Array),
            }),
        );
        expect(onCloseUnifiedSummonsModal).toHaveBeenCalled();
    });
});
