import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionDashboardCoreWorkspacePipeline } from '../useExecutionDashboardCoreWorkspacePipeline';

describe('useExecutionDashboardCoreWorkspacePipeline', () => {
    it('composes the three workspace clusters and forwards cross-cluster bridges', () => {
        const input = {
            modals: {
                showUnifiedExecutionModal: false,
                showUnifiedSummonsModal: false,
                showLedgerModal: false,
            },
            executionData: { id: 'exec-1' },
            executionDataRef: { current: { id: 'exec-1' } },
            executionFileKey: 'file-key',
            executionDashboardFileId: 'dash-1',
            executionId: 'exec-1',
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
        };

        const { result } = renderHook(() =>
            useExecutionDashboardCoreWorkspacePipeline(input as never),
        );

        expect(result.current.followupOrchestrator).toBeTruthy();
        expect(result.current.seizureOrchestrator).toBeTruthy();
        expect(result.current.coercionOrchestrator).toBeTruthy();
        expect(result.current.showToast).toEqual(expect.any(Function));
        expect(result.current.openDecisionsModalWithBoot).toEqual(expect.any(Function));
        expect(result.current.timelineEvents).toEqual(expect.any(Array));
    });
});
