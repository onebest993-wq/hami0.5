import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const lazyExecutorWorkflowPortalProps = vi.fn();

vi.mock('@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell', () => ({
    EXEC_OVERLAY_LAZY_FALLBACK: <div>lazy fallback</div>,
    LazyExecutorWorkflowPortalModals: (props: Record<string, unknown>) => {
        lazyExecutorWorkflowPortalProps(props);
        return <div>executor workflow overlays mounted</div>;
    },
}));

import { ExecutionDashboardExecutorWorkflowOverlays } from '../ExecutionDashboardExecutorWorkflowOverlays';

describe('ExecutionDashboardExecutorWorkflowOverlays', () => {
    it('does not render when all executor workflow overlays are closed', () => {
        render(
            <ExecutionDashboardExecutorWorkflowOverlays
                executorScheduleModalOpen={false}
                policeAssistanceModalOpen={false}
                breakInventoryFurnitureModalOpen={false}
                judicialCustodianModalOpen={false}
                executionReportPrompt={null}
                onCloseDecisionsModal={vi.fn()}
            />,
        );

        expect(screen.queryByText('executor workflow overlays mounted')).toBeNull();
        expect(lazyExecutorWorkflowPortalProps).not.toHaveBeenCalled();
    });

    it('forwards explicit decisions close callback to lazy executor workflow portal', () => {
        const onCloseDecisionsModal = vi.fn();

        render(
            <ExecutionDashboardExecutorWorkflowOverlays
                executorScheduleModalOpen={false}
                policeAssistanceModalOpen={false}
                breakInventoryFurnitureModalOpen={false}
                judicialCustodianModalOpen={false}
                executionReportPrompt={{ onConfirm: vi.fn() }}
                onCloseDecisionsModal={onCloseDecisionsModal}
            />,
        );

        expect(screen.getByText('executor workflow overlays mounted')).toBeTruthy();
        expect(lazyExecutorWorkflowPortalProps).toHaveBeenCalledWith(
            expect.objectContaining({
                onCloseDecisionsModal,
            }),
        );
    });
});
