import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useExecutionDashboardTimelineAssetsCluster } from '../useExecutionDashboardTimelineAssetsCluster';

const useMergedTimelineEventsMock = vi.fn();
const useCaseTasksAndNotesMock = vi.fn();
const useSeizureRegistryAssetsMock = vi.fn();
const useExecutionDashboardSalarySeizureTabRowsMock = vi.fn();
const useExecutionDashboardEvictionGraceUiStateMock = vi.fn();
const useExecutionDashboardDebtorNotificationSyncMock = vi.fn();
const useExecutionDashboardLegacyNoticeStateBackfillMock = vi.fn();
const useExecutionDashboardEarnerFeeSmSyncMock = vi.fn();
const useExecutionDashboardStandaloneMarksSyncMock = vi.fn();
const useExecutionDashboardSubDossierTimelineLifecycleMock = vi.fn();
const useExecutionDashboardExecutionFileCoerciveRefreshMock = vi.fn();
const useExecutionSeizureOrchestratorMock = vi.fn();

vi.mock('../../useMergedTimelineEvents', () => ({
    useMergedTimelineEvents: (...args: unknown[]) => useMergedTimelineEventsMock(...args),
}));

vi.mock('../../useCaseTasksAndNotes', () => ({
    useCaseTasksAndNotes: (...args: unknown[]) => useCaseTasksAndNotesMock(...args),
}));

vi.mock('../../useSeizureRegistryAssets', () => ({
    useSeizureRegistryAssets: (...args: unknown[]) => useSeizureRegistryAssetsMock(...args),
}));

vi.mock('../useExecutionDashboardSalarySeizureTabRows', () => ({
    useExecutionDashboardSalarySeizureTabRows: (...args: unknown[]) =>
        useExecutionDashboardSalarySeizureTabRowsMock(...args),
}));

vi.mock('../useExecutionDashboardTimelineAndGraceSync', () => ({
    useExecutionDashboardEvictionGraceUiState: (...args: unknown[]) =>
        useExecutionDashboardEvictionGraceUiStateMock(...args),
}));

vi.mock('../useExecutionDashboardRuntimeSyncEffects', () => ({
    useExecutionDashboardDebtorNotificationSync: (...args: unknown[]) =>
        useExecutionDashboardDebtorNotificationSyncMock(...args),
    useExecutionDashboardLegacyNoticeStateBackfill: (...args: unknown[]) =>
        useExecutionDashboardLegacyNoticeStateBackfillMock(...args),
    useExecutionDashboardEarnerFeeSmSync: (...args: unknown[]) =>
        useExecutionDashboardEarnerFeeSmSyncMock(...args),
    useExecutionDashboardStandaloneMarksSync: (...args: unknown[]) =>
        useExecutionDashboardStandaloneMarksSyncMock(...args),
}));

vi.mock('../useExecutionDashboardSubDossierTimelineLifecycle', () => ({
    useExecutionDashboardSubDossierTimelineLifecycle: (...args: unknown[]) =>
        useExecutionDashboardSubDossierTimelineLifecycleMock(...args),
    useExecutionDashboardExecutionFileCoerciveRefresh: (...args: unknown[]) =>
        useExecutionDashboardExecutionFileCoerciveRefreshMock(...args),
}));

vi.mock('../../../orchestrators/useExecutionSeizureOrchestrator', () => ({
    useExecutionSeizureOrchestrator: (...args: unknown[]) =>
        useExecutionSeizureOrchestratorMock(...args),
}));

describe('useExecutionDashboardTimelineAssetsCluster', () => {
    it('keeps timeline and seizure wiring intact while exposing the ledger modal control', () => {
        useMergedTimelineEventsMock.mockReturnValue([{ id: 'merged-1' }]);
        useCaseTasksAndNotesMock.mockReturnValue({
            completedTaskTitles: ['t1'],
            savedNotesSplit: { notes: [], tasks_done: [] },
            activeCaseTasksPendingAll: [],
            activeGraceTasks: [],
            activeCaseTasksPending: [],
            trashedTimelineEvents: [],
            trashedCaseNotes: [],
            trashedCaseTasks: [],
        });
        useSeizureRegistryAssetsMock.mockReturnValue({
            salarySeizureRegistryAssets: [{ id: 'salary-1' }],
            realEstateSeizureRegistryAssets: [{ id: 'estate-1' }],
            thirdPartySeizureRegistryAssets: [{ id: 'third-1' }],
        });
        useExecutionDashboardSalarySeizureTabRowsMock.mockReturnValue([{ id: 'tab-1' }]);
        useExecutionDashboardEvictionGraceUiStateMock.mockReturnValue({
            evictionGracePinned: false,
            setEvictionGracePinned: vi.fn(),
            evictionGraceHidden: false,
            setEvictionGraceHidden: vi.fn(),
            toggleEvictionGracePinned: vi.fn(),
            gracePinnedKey: 'gracePinned',
            graceHiddenKey: 'graceHidden',
        });
        useExecutionSeizureOrchestratorMock.mockReturnValue({ openSeizureFlow: vi.fn() });

        const setExecutionModal = vi.fn();
        const setForcedAttendanceIssued = vi.fn();
        const setActiveNoticeState = vi.fn();
        const executionData = {
            id: 'exec-1',
            financialLedger: [],
            timelineEvents: [{ id: 'timeline-1', trashedAt: null }],
            caseNotesLog: [{ id: 'note-1', trashedAt: null, pinned: true }],
            caseTasksPending: [{ id: 'task-1', trashedAt: null, pinned: true }],
            seizedAssets: [{ id: 'asset-1', status: 'approved', subjectType: 'movable' }],
            realEstateSeizureAssets: [],
            thirdPartySeizureAssets: [],
            standaloneExecutionMarks: [],
            seizureDraftsByDecisionId: {},
            activeCoerciveActions: ['salary'],
        };

        const { result } = renderHook(() =>
            useExecutionDashboardTimelineAssetsCluster({
                p: {
                    modals: {
                        showUnifiedExecutionModal: false,
                        showUnifiedSummonsModal: false,
                        showLedgerModal: false,
                    },
                    executionData: executionData as never,
                    executionDataRef: { current: executionData } as never,
                    executionFileKey: 'file-key',
                    executionDashboardFileId: 'dashboard-file-1',
                    executionId: 'exec-1',
                    decisionsStorageExecutionId: 'decisions-1',
                    executionStorageTick: 3,
                    setExecutionModal,
                    showDecisionsModal: false,
                    setShowDecisionsModal: vi.fn(),
                    setShowNotesModal: vi.fn(),
                    setShowDocumentsModal: vi.fn(),
                    setShowAppointmentModal: vi.fn(),
                    setShowTimelineModal: vi.fn(),
                    setShowNotificationModal: vi.fn(),
                    setShowCoerciveModal: vi.fn(),
                    subFiles: [],
                    activeSubFileId: null,
                    isInabaActive: false,
                    parentDossierId: 'parent-1',
                } as never,
                coercionOrchestrator: { setActiveNoticeState },
                setForcedAttendanceIssued,
            }),
        );

        act(() => {
            result.current.setShowLedgerModal(true);
        });

        expect(useExecutionDashboardLegacyNoticeStateBackfillMock).toHaveBeenCalledWith({
            executionData,
            setActiveNoticeState,
        });
        expect(useExecutionDashboardSubDossierTimelineLifecycleMock).toHaveBeenCalledWith(
            expect.objectContaining({
                executionData,
                executionDashboardFileId: 'dashboard-file-1',
                activeSubFileId: null,
            }),
        );
        expect(useExecutionDashboardExecutionFileCoerciveRefreshMock).toHaveBeenCalledWith(
            expect.objectContaining({
                executionData,
                setForcedAttendanceIssued,
                setActiveNoticeState,
            }),
        );
        expect(useExecutionDashboardSalarySeizureTabRowsMock).toHaveBeenCalledWith({
            salarySeizureRegistryAssets: [{ id: 'salary-1' }],
            seizureDraftsByDecisionId: {},
            executionData,
            decisionsStorageExecutionId: 'decisions-1',
            executionId: 'exec-1',
        });
        expect(setExecutionModal).toHaveBeenCalledWith('showLedgerModal', true);
        expect(result.current.mergedTimelineEvents).toEqual([{ id: 'merged-1' }]);
        expect(result.current.salarySeizureTabRows).toEqual([{ id: 'tab-1' }]);
        expect(result.current.approvedSeizedAssets).toHaveLength(1);
        // انحدار مستمع التراجع عن الدفعة — setFinancialLedger يجب أن يمرّ عبر حقيبة الجدول الزمني
        expect(typeof result.current.setFinancialLedger).toBe('function');
    });

    it('does not crash when caseNotesLog / caseTasksPending / seizedAssets are corrupt non-arrays from storage', () => {
        useMergedTimelineEventsMock.mockReturnValue([]);
        useCaseTasksAndNotesMock.mockReturnValue({
            completedTaskTitles: [],
            savedNotesSplit: { notes: [], tasks_done: [] },
            activeCaseTasksPendingAll: [],
            activeGraceTasks: [],
            activeCaseTasksPending: [],
            trashedTimelineEvents: [],
            trashedCaseNotes: [],
            trashedCaseTasks: [],
        });
        useSeizureRegistryAssetsMock.mockReturnValue({
            salarySeizureRegistryAssets: [],
            realEstateSeizureRegistryAssets: [],
            thirdPartySeizureRegistryAssets: [],
        });
        useExecutionDashboardSalarySeizureTabRowsMock.mockReturnValue([]);
        useExecutionDashboardEvictionGraceUiStateMock.mockReturnValue({
            evictionGracePinned: false,
            setEvictionGracePinned: vi.fn(),
            evictionGraceHidden: false,
            setEvictionGraceHidden: vi.fn(),
            toggleEvictionGracePinned: vi.fn(),
            gracePinnedKey: 'gracePinned',
            graceHiddenKey: 'graceHidden',
        });
        useExecutionSeizureOrchestratorMock.mockReturnValue({});

        const executionData = {
            id: 'exec-corrupt',
            financialLedger: [],
            timelineEvents: { bad: true } as unknown as [],
            // فساد شائع في localStorage: كائن بدل مصفوفة — كان يسقط boot بـ .filter is not a function
            caseNotesLog: { id: 'bad' } as unknown as [],
            caseTasksPending: 'broken' as unknown as [],
            seizedAssets: { id: 'asset-bad' } as unknown as [],
            realEstateSeizureAssets: 1 as unknown as [],
            thirdPartySeizureAssets: true as unknown as [],
            standaloneExecutionMarks: { x: 1 } as unknown as [],
            seizureDraftsByDecisionId: [],
            activeCoerciveActions: { a: 1 } as unknown as [],
        };

        const { result } = renderHook(() =>
            useExecutionDashboardTimelineAssetsCluster({
                p: {
                    modals: {
                        showUnifiedExecutionModal: false,
                        showUnifiedSummonsModal: false,
                        showLedgerModal: false,
                    },
                    executionData: executionData as never,
                    executionDataRef: { current: executionData } as never,
                    executionFileKey: 'file-key',
                    executionDashboardFileId: 'exec-corrupt',
                    executionId: 'exec-corrupt',
                    decisionsStorageExecutionId: 'decisions-1',
                    executionStorageTick: 0,
                    setExecutionModal: vi.fn(),
                    showDecisionsModal: false,
                    setShowDecisionsModal: vi.fn(),
                    setShowNotesModal: vi.fn(),
                    setShowDocumentsModal: vi.fn(),
                    setShowAppointmentModal: vi.fn(),
                    setShowTimelineModal: vi.fn(),
                    setShowNotificationModal: vi.fn(),
                    setShowCoerciveModal: vi.fn(),
                    subFiles: [],
                    activeSubFileId: null,
                    isInabaActive: false,
                    parentDossierId: 'parent-1',
                } as never,
                coercionOrchestrator: { setActiveNoticeState: vi.fn() },
                setForcedAttendanceIssued: vi.fn(),
            }),
        );

        expect(result.current.caseNotesLog).toEqual([]);
        expect(result.current.caseTasksPending).toEqual([]);
        expect(result.current.seizedAssets).toEqual([]);
        expect(result.current.timelineEvents).toEqual([]);
        expect(result.current.approvedSeizedAssets).toEqual([]);
        expect(Array.isArray(result.current.activeCoerciveActions)).toBe(true);

        act(() => {
            result.current.setCaseNotesLog((prev) => [
                { id: 'n1', title: 'ok', body: '', createdAt: '2026-01-01' },
                ...prev,
            ]);
        });
        expect(result.current.caseNotesLog).toHaveLength(1);
        expect(result.current.caseNotesLog[0]?.id).toBe('n1');
    });
});
