import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useExecutionDashboardExecutorApprovalActions } from '../useExecutionDashboardExecutorApprovalActions';
import { patchExecutorDecisionRow } from '@/app/utils/executorSeizureDecisionQueue';
import { storageCache } from '@/app/utils/storageCache';
import { syncExecutionTimelineAppointment } from '@/app/services/calendar/dossierSync/incrementalSync';

vi.mock('@/app/utils/executorSeizureDecisionQueue', () => ({
    patchExecutorDecisionRow: vi.fn(),
}));

vi.mock('@/app/utils/storageCache', () => ({
    storageCache: {
        get: vi.fn(),
    },
}));

vi.mock('@/app/services/calendar/dossierSync/incrementalSync', () => ({
    syncExecutionTimelineAppointment: vi.fn(),
}));

describe('useExecutionDashboardExecutorApprovalActions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('opens the scheduled date flow and appends tasks and notes with typed state updaters', async () => {
        const setShowDecisionsModal = vi.fn();
        const setShowUnifiedExecutionModal = vi.fn();
        const setUnifiedModalTab = vi.fn();
        const setFollowupExpandProcedureKey = vi.fn();
        const setCaseTasksPending = vi.fn();
        const setTimelineEvents = vi.fn();
        const setExecutionReportPrompt = vi.fn();
        const setJudicialCustodianModalCtx = vi.fn();
        const setJudicialCustodianModalOpen = vi.fn();
        const setCaseNotesLog = vi.fn();
        const showToast = vi.fn();
        const persistExecutionMerge = vi.fn();

        vi.mocked(storageCache.get).mockReturnValue(null);

        const { result } = renderHook(() =>
            useExecutionDashboardExecutorApprovalActions({
                executionData: { id: 'ex-1' } as never,
                executionId: 'ex-1',
                file: null,
                currentFileId: 'ex-1',
                isMaritalFurnitureClaim: false,
                nextTimelineId: vi.fn(() => 'tl-1'),
                timelineEventsRef: { current: [] },
                persistExecutionMergeRef: { current: persistExecutionMerge },
                executionFileSnapshotRef: { current: null },
                showToast,
                setShowDecisionsModal,
                setShowUnifiedExecutionModal,
                setUnifiedModalTab,
                setFollowupExpandProcedureKey,
                setCaseTasksPending,
                setTimelineEvents,
                setExecutionReportPrompt,
                setJudicialCustodianModalCtx,
                setJudicialCustodianModalOpen,
                setCaseNotesLog,
            }),
        );

        act(() => {
            result.current.openScheduledDateModal({
                decisionId: 'decision-1',
                requestTitle: 'طلب موعد ميداني',
                onSaved: vi.fn(),
            });
        });

        expect(setShowDecisionsModal).toHaveBeenCalledWith(false);
        expect(setShowUnifiedExecutionModal).toHaveBeenCalledWith(true);
        expect(setUnifiedModalTab).toHaveBeenCalledWith('coercive');
        expect(setFollowupExpandProcedureKey).toHaveBeenCalledWith('field_visit');
        expect(showToast).toHaveBeenCalledWith(
            expect.stringContaining('أكمل تسجيل الموعد'),
            'info',
        );

        act(() => {
            result.current.appendDossierTask({
                title: 'متابعة القرار',
                body: 'تفاصيل المتابعة',
                dueDate: '2026-07-16T00:00:00.000Z',
            });
        });

        const taskUpdater = vi.mocked(setCaseTasksPending).mock.calls[0]?.[0];
        expect(taskUpdater).toBeTypeOf('function');
        const taskRows = taskUpdater([]);
        expect(taskRows[0]).toMatchObject({
            id: 'tl-1',
            title: 'متابعة القرار',
            body: 'تفاصيل المتابعة',
        });

        const timelineUpdater = vi.mocked(setTimelineEvents).mock.calls[0]?.[0];
        expect(timelineUpdater).toBeTypeOf('function');
        const timelineRows = timelineUpdater([]);
        expect(timelineRows[0]).toMatchObject({
            id: 'tl-1',
            type: 'other',
            title: expect.stringContaining('متابعة القرار'),
        });

        act(() => {
            result.current.appendCaseNote({
                title: 'ملاحظة تنفيذية',
                body: 'تمت إضافة الملاحظة',
            });
        });

        const noteUpdater = vi.mocked(setCaseNotesLog).mock.calls[0]?.[0];
        expect(noteUpdater).toBeTypeOf('function');
        const noteRows = noteUpdater([]);
        expect(noteRows[0]).toMatchObject({
            title: 'ملاحظة تنفيذية',
            body: 'تمت إضافة الملاحظة',
        });
        await Promise.resolve();
        expect(persistExecutionMerge).toHaveBeenCalledWith({ caseNotesLog: noteRows });
    });

    it('syncs calendar appointments and persists judicial custodian details against the execution snapshot', async () => {
        const setTimelineEvents = vi.fn();
        const showToast = vi.fn();
        const persistExecutionMerge = vi.fn();

        vi.mocked(storageCache.get).mockReturnValue(null);

        const { result } = renderHook(() =>
            useExecutionDashboardExecutorApprovalActions({
                executionData: {
                    id: 'ex-1',
                    fileNumber: '42',
                    creditors: [{ name: 'الدائن الأول' }],
                } as never,
                executionId: 'ex-1',
                file: null,
                currentFileId: 'ex-1',
                isMaritalFurnitureClaim: false,
                nextTimelineId: vi.fn(() => 'tl-2'),
                timelineEventsRef: {
                    current: [
                        {
                            id: 'apt-1',
                            type: 'appointment',
                            date: '2026-07-20T10:00:00.000Z',
                            timestamp: '2026-07-20T10:00:00.000Z',
                            title: 'موعد ميداني',
                            source: 'موعد ميداني',
                        },
                    ] as never,
                },
                persistExecutionMergeRef: { current: persistExecutionMerge },
                executionFileSnapshotRef: {
                    current: {
                        eviction_judicial_custodian: {
                            fullName: 'الحارس القديم',
                            salary: '1000',
                            decisionId: 'legacy',
                            savedAt: '2026-07-01T00:00:00.000Z',
                        },
                    } as never,
                },
                showToast,
                setShowDecisionsModal: vi.fn(),
                setShowUnifiedExecutionModal: vi.fn(),
                setUnifiedModalTab: vi.fn(),
                setFollowupExpandProcedureKey: vi.fn(),
                setCaseTasksPending: vi.fn(),
                setTimelineEvents,
                setExecutionReportPrompt: vi.fn(),
                setJudicialCustodianModalCtx: vi.fn(),
                setJudicialCustodianModalOpen: vi.fn(),
                setCaseNotesLog: vi.fn(),
            }),
        );

        expect(result.current.getFieldVisitDeadlineIso()).toBe('2026-07-20T10:00:00.000Z');

        act(() => {
            result.current.pushCalendarAppointment({
                dossierId: 'ex-1',
                decisionId: 'decision-2',
                purpose: 'خروج ميداني',
                eventIso: '2026-07-25T09:00:00.000Z',
                recordedAt: '2026-07-11T09:00:00.000Z',
            });
        });

        const timelineUpdater = vi.mocked(setTimelineEvents).mock.calls[0]?.[0];
        const pushedTimeline = timelineUpdater([]);
        expect(pushedTimeline[0]).toMatchObject({
            id: 'tl-2',
            type: 'appointment',
            title: '📅 خروج ميداني',
        });
        await waitFor(() => {
            expect(syncExecutionTimelineAppointment).toHaveBeenCalledWith(
                expect.objectContaining({
                    executionId: 'ex-1',
                    caseNo: '42',
                    clientName: 'الدائن الأول',
                }),
            );
        });
        expect(showToast).toHaveBeenCalledWith('تم ربط الموعد بالسجل الزمني', 'success');

        act(() => {
            result.current.patchDecision('decision-2', { approved: true });
        });
        expect(patchExecutorDecisionRow).toHaveBeenCalledWith('ex-1', 'decision-2', {
            approved: true,
        });

        act(() => {
            result.current.persistJudicialCustodianDetails({
                decisionId: 'decision-3',
                fullName: 'الحارس الجديد',
                salary: '2500',
            });
        });

        await Promise.resolve();
        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                eviction_judicial_custodian: null,
                eviction_judicial_custodians: expect.arrayContaining([
                    expect.objectContaining({
                        fullName: 'الحارس الجديد',
                        salary: '2500',
                        decisionId: 'decision-3',
                    }),
                    expect.objectContaining({
                        id: 'legacy_custodian',
                        fullName: 'الحارس القديم',
                    }),
                ]),
            }),
        );
    });
});
