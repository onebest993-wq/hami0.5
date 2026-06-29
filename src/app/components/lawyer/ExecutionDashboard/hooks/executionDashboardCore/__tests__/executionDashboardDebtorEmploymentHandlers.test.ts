import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionDashboardDebtorEmploymentHandlers } from '../useExecutionDashboardDebtorEmploymentHandlers';

describe('useExecutionDashboardDebtorEmploymentHandlers', () => {
    it('handleDebtorEmploymentToggle warns when additional debtor missing', () => {
        const showToast = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardDebtorEmploymentHandlers({
                executionDataRef: {
                    current: {
                        id: 'exec-1',
                        debtors: [{ id: 'primary_debtor', name: 'مدين' }],
                        party_multiplicity: { additionalDebtors: [] },
                    },
                },
                debtorWorkspaceEntries: [{ key: 'primary_debtor', label: 'مدين' }],
                nextTimelineId: () => 'tl-1',
                persistExecutionMerge: vi.fn(),
                showToast,
                setTimelineEvents: vi.fn(),
            }),
        );

        act(() => {
            result.current.handleDebtorEmploymentToggle({ debtorKey: 'missing', isPrimary: false });
        });

        expect(showToast).toHaveBeenCalledWith(expect.stringContaining('تعذّر ربط المدين'), 'warning');
    });
});
