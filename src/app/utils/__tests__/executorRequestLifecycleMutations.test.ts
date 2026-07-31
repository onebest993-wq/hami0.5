import { describe, expect, it } from 'vitest';
import {
    appendPendingExecutorSeizureDecisionRows,
    appendPersonalCoerciveByExecutorOrderRows,
    appendPersonalCoerciveExecutorRequestRows,
    closePersonalCoerciveSubtypeDecisionCycleRows,
    closeSeizureSubtypeDecisionCycleRows,
} from '@/app/utils/executorRequestLifecycleMutations';

describe('executorRequestLifecycleMutations', () => {
    it('supersedes approved coercive cycle rows without archiving on close', () => {
        const rows = closePersonalCoerciveSubtypeDecisionCycleRows({
            rows: [
                {
                    id: 'coercive_1',
                    requestKind: 'personal_coercive',
                    personalCoerciveSubtype: 'forced_bring_in',
                    executorOutcome: 'approved',
                    date: '2026-07-11',
                },
            ],
            subtype: 'forced_bring_in',
            nowIso: '2026-07-11T10:00:00.000Z',
        });

        expect(rows[0]?.requestCycleSuperseded).toBe(true);
        expect(rows[0]?.isArchived).toBeUndefined();
    });

    it('reuses existing pending personal coercive request instead of appending duplicate', () => {
        const result = appendPersonalCoerciveExecutorRequestRows({
            rows: [
                {
                    id: 'existing_pending',
                    requestKind: 'personal_coercive',
                    personalCoerciveSubtype: 'travel_ban',
                    executorOutcome: 'pending',
                    date: '2026-07-10',
                },
            ],
            subtype: 'travel_ban',
            title: 'منع سفر',
            body: 'طلب قائم',
            todayYmd: '2026-07-11',
            decisionId: 'new_pending',
            nowIso: '2026-07-11T10:00:00.000Z',
        });

        expect(result.ok).toBe(true);
        expect(result.decisionId).toBe('existing_pending');
        expect(result.rows).toHaveLength(1);
    });

    it('appends approved by-executor-order coercive row after archived cycle', () => {
        const result = appendPersonalCoerciveByExecutorOrderRows({
            rows: [
                {
                    id: 'archived_old',
                    requestKind: 'personal_coercive',
                    personalCoerciveSubtype: 'forced_bring_in',
                    executorOutcome: 'approved',
                    isArchived: true,
                    date: '2026-07-10',
                },
            ],
            subtype: 'forced_bring_in',
            title: 'إحضار جبري بقرار المنفذ',
            body: 'تفعيل جديد',
            todayYmd: '2026-07-11',
            decisionId: 'approved_new',
            nowIso: '2026-07-11T10:00:00.000Z',
        });

        expect(result.ok).toBe(true);
        expect(result.rows[0]?.id).toBe('approved_new');
        expect(result.rows[0]?.executorOutcome).toBe('approved');
    });

    it('returns null decision id when duplicate pending seizure already governs', () => {
        const result = appendPendingExecutorSeizureDecisionRows({
            rows: [
                {
                    id: 'seizure_pending',
                    requestKind: 'seizure',
                    seizureSubtype: 'third_party',
                    executorOutcome: 'pending',
                    date: '2026-07-10',
                },
            ],
            requestTitle: 'حجز مال المدين لدى الغير',
            requestBody: 'طلب قائم',
            seizureSubtype: 'third_party',
            todayYmd: '2026-07-11',
            decisionId: 'seizure_new',
            nowIso: '2026-07-11T10:00:00.000Z',
        });

        expect(result.decisionId).toBeNull();
        expect(result.rows).toHaveLength(1);
    });

    it('supersedes approved seizure cycle rows without archiving on close', () => {
        const rows = closeSeizureSubtypeDecisionCycleRows({
            rows: [
                {
                    id: 'seizure_1',
                    requestKind: 'seizure',
                    seizureSubtype: 'third_party',
                    executorOutcome: 'approved',
                    date: '2026-07-11',
                },
            ],
            subtype: 'third_party',
            nowIso: '2026-07-11T10:00:00.000Z',
        });

        expect(rows[0]?.requestCycleSuperseded).toBe(true);
        expect(rows[0]?.isArchived).toBeUndefined();
    });
});
