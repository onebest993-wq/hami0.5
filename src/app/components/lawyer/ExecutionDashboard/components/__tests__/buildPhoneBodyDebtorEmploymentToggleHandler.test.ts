import { describe, expect, it, vi } from 'vitest';
import { buildPhoneBodyDebtorEmploymentToggleHandler } from '../buildPhoneBodyDebtorEmploymentToggleHandler';
import { EXECUTION_HANDLER_CLUSTER_STUBS } from '../../hooks/executionHandlerClusterStubs';

describe('buildPhoneBodyDebtorEmploymentToggleHandler', () => {
    it('uses persist fallback when cluster handler is stub', () => {
        const persistExecutionMerge = vi.fn(() => true);
        const showToast = vi.fn();
        const stubHandler = (EXECUTION_HANDLER_CLUSTER_STUBS.debtorEmploymentHandler as Record<string, unknown>)
            .handleDebtorEmploymentToggle as (payload: unknown) => void;
        const scopeRef = {
            current: {
                handleDebtorEmploymentToggle: stubHandler,
                executionData: {
                    id: 'exec-1',
                    debtors: [
                        {
                            id: 'primary_debtor',
                            name: 'مدين',
                            isEmployee: true,
                            occupation: 'موظف',
                        },
                    ],
                    parties: [
                        {
                            id: 'primary_debtor',
                            role: 'debtor',
                            isEmployee: true,
                            occupation: 'موظف',
                        },
                    ],
                    timelineEvents: [],
                },
                debtorWorkspaceEntries: [{ key: 'primary_debtor', label: 'مدين' }],
                nextTimelineId: () => 'tl-1',
                persistExecutionMerge,
                showToast,
            },
        };

        const handler = buildPhoneBodyDebtorEmploymentToggleHandler(scopeRef, {});
        handler({ debtorKey: 'primary_debtor', isPrimary: true });

        expect(persistExecutionMerge).toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith('تم التحويل إلى كاسب.', 'success');
    });
});
