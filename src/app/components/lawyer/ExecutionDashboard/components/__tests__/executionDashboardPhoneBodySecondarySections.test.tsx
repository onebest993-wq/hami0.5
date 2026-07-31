import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ExecutionFile } from '@/app/types/execution';
import type { VisitationScheduleBundle } from '@/app/types/visitationSchedule';
import { ExecutionDashboardPhoneBodySecondarySections } from '../ExecutionDashboardPhoneBodySecondarySections';

type SyncRollingCalendarSessions = (
    config: VisitationScheduleBundle['config'],
    sessions: VisitationScheduleBundle['sessions'],
    todayYmd: string,
) => VisitationScheduleBundle['sessions'];

vi.mock('../../executionDashboardLazyRegistry', () => ({
    LazyActionGridSection: (props: {
        onOpenAppointmentModal?: () => void;
        onOpenNotesModal?: () => void;
        onOpenDocumentsModal?: () => void;
        onOpenDecisionsModal?: () => void;
        onOpenFinancialCenter?: () => void;
        onMemoFollowupClick?: () => void;
        onOpenVisitationCalendar?: () => void;
    }) => (
        <>
            <button type="button" onClick={props.onOpenAppointmentModal}>
                appointment
            </button>
            <button type="button" onClick={props.onOpenNotesModal}>
                notes
            </button>
            <button type="button" onClick={props.onOpenDocumentsModal}>
                documents
            </button>
            <button type="button" onClick={props.onOpenDecisionsModal}>
                decisions
            </button>
            <button type="button" onClick={props.onOpenFinancialCenter}>
                financial
            </button>
            <button type="button" onClick={props.onMemoFollowupClick}>
                followup
            </button>
            <button type="button" onClick={props.onOpenVisitationCalendar}>
                visitation
            </button>
        </>
    ),
    LazyTimelineSection: (props: { onOpenTimelineModal?: () => void; executionEntityId?: string | null }) => (
        <>
            <button type="button" onClick={props.onOpenTimelineModal}>
                timeline
            </button>
            <div>{props.executionEntityId}</div>
        </>
    ),
    LazyLawReferencePanel: () => <div>law-reference</div>,
    LazyPremiumTimelineAuditLog: () => null,
    LazySmartTimelineRadar: () => null,
}));

vi.mock('@/app/domain/execution/visitation/visitationScheduleEngine', () => ({
    syncRollingCalendarSessions: () => [
        {
            id: 'session-1',
            date: '2026-07-11',
            dayLabel: 'السبت',
            status: 'completed',
            documentedAt: '2026-07-11T10:00:00.000Z',
        },
    ],
}));

describe('ExecutionDashboardPhoneBodySecondarySections', () => {
    function buildProps(): Parameters<typeof ExecutionDashboardPhoneBodySecondarySections>[0] {
        const setShowVisitationCalendarModal = vi.fn();
        return {
            secondaryStageReady: true,
            followupSpec: {},
            safeResolveCalendarUserId: () => 'user-1',
            safeSetTimelineAccordionExpanded: vi.fn(),
            safeTimelineAccordionExpanded: true,
            safeSubFilesCount: 2,
            safeOpenAppointmentModal: vi.fn(),
            directOpenNotesModal: vi.fn(),
            directOpenDocumentsModal: vi.fn(),
            directOpenTimelineModal: vi.fn(),
            directOpenFinancialCenter: vi.fn(),
            directHandleMemoFollowupClick: vi.fn(),
            directOpenDecisionsModalWithBoot: vi.fn(),
            scope: {
                debtorBrowserTabsMode: false,
                dockPinnedNotes: [],
                dockPinnedTasks: [],
                executionActionsGridLocked: false,
                executionToolsTimelineLockedUi: false,
                hasUnifiedSeizureLogContent: true,
                isEvictionExecutionModule: false,
                isHistoricalMode: false,
                isRepresentingDebtor: false,
                isVisitationClaim: true,
                mergedTimelineEvents: [],
                mergedTimelineEventsDebtorScoped: [],
                mergedTimelineRadarPreviewLimit: 3,
                moveCaseNoteToTrash: vi.fn(),
                moveTimelineEventToTrash: vi.fn(),
                openUnifiedSeizureLog: vi.fn(),
                requestEditTimelineEvent: vi.fn(),
                setActiveTimelineFilter: vi.fn(),
                setEmployeeCompulsoryBannerDismissed: vi.fn(),
                setShowOnlyActiveFileTimeline: vi.fn(),
                setShowVisitationCalendarModal,
                showEmployeeCompulsoryProceduresBanner: false,
                showOnlyActiveFileTimeline: false,
                showToast: vi.fn(),
                syncRollingCalendarSessions: vi.fn(
                    () =>
                        [
                            {
                                id: 'session-1',
                                date: '2026-07-11',
                                dayLabel: 'السبت',
                                status: 'completed',
                                documentedAt: '2026-07-11T10:00:00.000Z',
                            },
                        ] satisfies VisitationScheduleBundle['sessions'],
                ) as SyncRollingCalendarSessions,
                timelineFilterOptions: ['الكل'],
                toggleCaseNotePin: vi.fn(),
                toggleCaseTaskPin: vi.fn(),
                toggleTimelineEventPin: vi.fn(),
                viewExecutionData: {
                    id: 'exec-1',
                    fileNumber: '12',
                    visitationSchedule: {
                        config: {
                            decisionMode: 'viewing_only',
                            location: 'المحكمة',
                            startTime: '09:00',
                            executionStartDate: '2026-07-01',
                            anchorDate: '2026-07-11',
                            weekDays: [6],
                            monthWeeks: [2],
                        },
                        sessions: [
                            {
                                id: 'session-1',
                                date: '2026-07-11',
                                dayLabel: 'السبت',
                                status: 'scheduled',
                            },
                        ],
                    },
                } as unknown as ExecutionFile & { visitationSchedule?: VisitationScheduleBundle | null },
                todayYmd: '2026-07-11',
                persistExecutionMerge: vi.fn(),
                currentFileId: 'exec-1',
                activeTimelineFilter: 'الكل',
            },
        };
    }

    it('returns null before the secondary stage is ready', () => {
        const props = buildProps();
        props.secondaryStageReady = false;

        const { container } = render(<ExecutionDashboardPhoneBodySecondarySections {...props} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('forwards action handlers from the secondary sections bundle', () => {
        const props = buildProps();

        render(<ExecutionDashboardPhoneBodySecondarySections {...props} />);

        fireEvent.click(screen.getByRole('button', { name: 'appointment' }));
        fireEvent.click(screen.getByRole('button', { name: 'notes' }));
        fireEvent.click(screen.getByRole('button', { name: 'documents' }));
        fireEvent.click(screen.getByRole('button', { name: 'decisions' }));
        fireEvent.click(screen.getByRole('button', { name: 'financial' }));
        fireEvent.click(screen.getByRole('button', { name: 'followup' }));
        fireEvent.click(screen.getByRole('button', { name: 'timeline' }));

        expect(props.safeOpenAppointmentModal).toHaveBeenCalledTimes(1);
        expect(props.directOpenNotesModal).toHaveBeenCalledTimes(1);
        expect(props.directOpenDocumentsModal).toHaveBeenCalledTimes(1);
        expect(props.directOpenDecisionsModalWithBoot).toHaveBeenCalledWith({ tab: 'current' });
        expect(props.directOpenFinancialCenter).toHaveBeenCalledTimes(1);
        expect(props.directHandleMemoFollowupClick).toHaveBeenCalledTimes(1);
        expect(props.directOpenTimelineModal).toHaveBeenCalledTimes(1);
        expect(screen.getByText('exec-1')).toBeInTheDocument();
        expect(screen.getByText('law-reference')).toBeInTheDocument();
    });
});
