import { describe, expect, it } from 'vitest';
import {
    computeGuarantorApprovalMergePatchFromRows,
    getGuarantorRequestOutcomeFromRows,
    getLatestRequestKindDecisionStateFromRows,
    hasApprovedRequestKindFromRows,
    resolveExecutorOutcomeFlags,
} from '@/app/utils/executorDecisionStateSelectors';

describe('executorDecisionStateSelectors', () => {
    it('resolves executor outcome flags from governing row', () => {
        expect(resolveExecutorOutcomeFlags(undefined)).toEqual({
            pending: false,
            approved: false,
            rejected: false,
            alternative: false,
        });

        expect(resolveExecutorOutcomeFlags({ executorOutcome: 'pending' })).toEqual({
            pending: true,
            approved: false,
            rejected: false,
            alternative: false,
        });

        expect(resolveExecutorOutcomeFlags({ executorOutcome: 'alternative' })).toEqual({
            pending: false,
            approved: false,
            rejected: false,
            alternative: true,
        });
    });

    it('derives guarantor and request-kind states from rows', () => {
        const rows = [
            {
                id: 'guarantor_new',
                requestKind: 'guarantor_request',
                executorOutcome: 'approved',
                date: '2026-07-10',
            },
            {
                id: 'unified_new',
                requestKind: 'unified_collection',
                executorOutcome: 'rejected',
                date: '2026-07-11',
            },
            {
                id: 'fee_old',
                requestKind: 'lawyer_fee_payout',
                executorOutcome: 'approved',
                date: '2026-07-09',
            },
        ];

        expect(getGuarantorRequestOutcomeFromRows(rows).approved).toBe(true);
        expect(hasApprovedRequestKindFromRows(rows, 'lawyer_fee_payout')).toBe(true);
        expect(getLatestRequestKindDecisionStateFromRows(rows, 'unified_collection')).toBe(
            'rejected',
        );
    });

    it('builds guarantor approval patch from approved rows', () => {
        const patch = computeGuarantorApprovalMergePatchFromRows(
            [
                {
                    id: 'guarantor_req_1',
                    requestKind: 'guarantor_request',
                    executorOutcome: 'approved',
                    date: '2026-07-11',
                },
            ],
            {
                debtors: [{ name: 'مدين' }],
                creditors: [{ name: 'دائن' }],
                guarantor_followup: {
                    details_saved: true,
                    guarantor_name: 'كفيل',
                },
            },
        );

        expect(patch.hasGuarantor).toBe(true);
        expect((patch.guarantor_followup as { executor_approved?: boolean })?.executor_approved).toBe(
            true,
        );
        expect(((patch.debtors as Array<{ hasGuarantor?: boolean }>)?.[0])?.hasGuarantor).toBe(
            true,
        );
        expect(
            ((patch.creditors as Array<{ guarantorExecutionNotation?: boolean }>)?.[0])
                ?.guarantorExecutionNotation,
        ).toBe(true);
    });
});
