import { describe, expect, it, vi } from 'vitest';
import { runDebtorEmploymentToggle } from '../executionDashboardDebtorEmploymentToggle';

describe('runDebtorEmploymentToggle', () => {
    it('toggles primary debtor employment and persists patch', () => {
        const persistExecutionMerge = vi.fn(() => true);
        const showToast = vi.fn();
        const base = {
            id: 'exec-1',
            debtors: [{ id: 'primary_debtor', name: 'مدين', isEmployee: true, occupation: 'موظف' }],
            parties: [
                { id: 'primary_debtor', role: 'debtor', isEmployee: true, occupation: 'موظف' },
            ],
            timelineEvents: [],
        };

        runDebtorEmploymentToggle({
            base: base as never,
            debtorWorkspaceEntries: [{ key: 'primary_debtor', label: 'مدين' }],
            ctx: { debtorKey: 'primary_debtor', isPrimary: true },
            nextTimelineId: () => 'tl-1',
            persistExecutionMerge,
            showToast,
        });

        expect(persistExecutionMerge).toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith('تم التحويل إلى كاسب.', 'success');
        const patch = persistExecutionMerge.mock.calls[0][0] as {
            debtors: Array<{ isEmployee?: boolean }>;
        };
        expect(patch.debtors[0].isEmployee).toBe(false);
    });
});
