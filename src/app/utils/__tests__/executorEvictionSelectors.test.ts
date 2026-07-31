import { describe, expect, it } from 'vitest';
import {
    getGoverningEvictionProcedureRowForNewRequest,
    getNewestEvictionProcedureRowForBranch,
    isEvictionBranchBlockingNewRequest,
    isEvictionBranchResendBlocked,
    isEvictionProcedureRowActive,
    isEvictionProcedureRowWorkflowComplete,
    normalizeEvictionProcedureTitle,
} from '@/app/utils/executorEvictionSelectors';

describe('executorEvictionSelectors', () => {
    it('normalizes decorated titles and resolves governing legacy rows by branch', () => {
        const legacyRow = {
            id: 'eviction_legacy',
            title: '📍 طلب تحديد موعد الخروج الميداني',
            requestKind: 'eviction_procedure',
            executorOutcome: 'approved',
            executorScheduleLabel: 'مجدول',
            date: '2026-07-11',
        } as const;

        expect(normalizeEvictionProcedureTitle(legacyRow.title)).toBe(
            'طلب تحديد موعد الخروج الميداني',
        );
        expect(
            getGoverningEvictionProcedureRowForNewRequest([legacyRow], {
                evictionWorkflowKey: 'field_visit_or_grace',
                title: legacyRow.title,
            })?.id,
        ).toBe('eviction_legacy');
    });

    it('blocks only when newest eviction row is still active', () => {
        const olderApproved = {
            id: 'eviction_old',
            title: 'طلب تحديد موعد الخروج الميداني',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
            executorOutcome: 'approved',
            date: '2026-07-01',
        } as const;
        const newerRejected = {
            id: 'eviction_new',
            title: 'طلب تحديد موعد الخروج الميداني',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
            executorOutcome: 'rejected',
            date: '2026-07-04',
        } as const;
        const rows = [olderApproved, newerRejected];

        expect(getNewestEvictionProcedureRowForBranch(rows, 'Field Visit Date')?.id).toBe(
            'eviction_new',
        );
        expect(isEvictionProcedureRowActive(olderApproved, rows)).toBe(true);
        expect(isEvictionBranchBlockingNewRequest(rows, { branch: 'Field Visit Date' })).toBe(
            false,
        );
    });

    it('marks workflow-complete approved field visit as non-blocking for resend', () => {
        const completed = {
            id: 'eviction_done',
            title: 'طلب تحديد موعد الخروج الميداني',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
            executorOutcome: 'approved',
            executorScheduleLabel: 'الخميس',
            date: '2026-07-11',
        } as const;

        expect(isEvictionProcedureRowWorkflowComplete(completed)).toBe(true);
        expect(isEvictionProcedureRowActive(completed, [completed])).toBe(false);
        expect(isEvictionBranchResendBlocked([completed], { branch: 'Field Visit Date' })).toBe(
            false,
        );
    });
});
