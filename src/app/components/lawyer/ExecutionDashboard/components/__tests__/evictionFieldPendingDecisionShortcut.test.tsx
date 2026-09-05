import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useEvictionFieldActionRenderers } from '@/app/components/lawyer/execution/evictionField/hooks/useEvictionFieldActionRenderers';

function Harness({
    row,
    openAppeals,
}: {
    row: Record<string, unknown>;
    openAppeals: (id: string, r?: Record<string, unknown> | null) => void;
}) {
    const { renderBranchExecutorActionsStrip } = useEvictionFieldActionRenderers({
        resolvePanelExecutionId: () => 'ex-1',
        openAppeals,
        handleWaiveCassationFromPanel: vi.fn(),
        syncForBranch: () =>
            ({
                followupBlock: null,
                decisionId: null,
                blocksFieldwork: false,
                cycleSuperseded: false,
                workflowComplete: false,
                governingRow: row,
            }) as never,
        decisions: [row],
        decisionList: [row],
        branchFollowupBlocked: () => false,
        locked: false,
        toast: vi.fn(),
        setInlineExpandedByBranch: vi.fn(),
    });
    return <>{renderBranchExecutorActionsStrip('Field Visit Date', row, 'قرار المنفذ — قيد البت')}</>;
}

describe('eviction field pending executor shortcut', () => {
    it('يعرض اختصار قرار المنفذ بدل رفض/موافقة', () => {
        const openAppeals = vi.fn();
        const row = {
            id: 'ev_fv_1',
            executorOutcome: 'pending',
            requestKind: 'eviction_procedure',
            evictionProcedureBranch: 'Field Visit Date',
            lawyerWithdrawn: false,
        };
        render(<Harness row={row} openAppeals={openAppeals} />);
        expect(screen.getByTestId('eviction-field-pending-executor-decision')).toBeInTheDocument();
        expect(screen.getByTestId('seizure-executor-decision-shortcut')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'رفض' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'موافقة' })).toBeNull();
        fireEvent.click(screen.getByTestId('seizure-executor-decision-shortcut'));
        expect(openAppeals).toHaveBeenCalledWith('ev_fv_1', row);
    });
});
