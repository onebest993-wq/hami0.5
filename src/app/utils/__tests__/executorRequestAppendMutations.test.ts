import { describe, expect, it } from 'vitest';
import {
    appendEvictionExecutorRequestRows,
    appendGuarantorFollowupRequestRows,
    appendThirdPartyFundsReceivedDecisionRows,
    appendTrustDisburseRequestRows,
} from '@/app/utils/executorRequestAppendMutations';

describe('executorRequestAppendMutations', () => {
    it('blocks duplicate pending guarantor request', () => {
        const result = appendGuarantorFollowupRequestRows({
            rows: [
                {
                    id: 'g_pending',
                    requestKind: 'guarantor_request',
                    executorOutcome: 'pending',
                    date: '2026-07-11',
                },
            ],
            todayYmd: '2026-07-11',
            decisionId: 'g_new',
        });

        expect(result.ok).toBe(false);
        expect(result.rows).toHaveLength(1);
    });

    it('blocks duplicate pending trust disburse request', () => {
        const result = appendTrustDisburseRequestRows({
            rows: [
                {
                    id: 'trust_pending',
                    requestKind: 'trust_disburse',
                    executorOutcome: 'pending',
                    date: '2026-07-11',
                },
            ],
            todayYmd: '2026-07-11',
            decisionId: 'trust_new',
        });

        expect(result.ok).toBe(false);
    });

    it('blocks duplicate pending third-party funds request by seizure id', () => {
        const result = appendThirdPartyFundsReceivedDecisionRows({
            rows: [
                {
                    id: 'third_party_pending',
                    requestKind: 'third_party_funds_received',
                    executorOutcome: 'pending',
                    payloadJson: JSON.stringify({ thirdPartySeizureId: 'tp-1' }),
                    date: '2026-07-11',
                },
            ],
            thirdPartySeizureId: 'tp-1',
            thirdPartyName: 'مصرف',
            transferredAmountIqd: 5000,
            todayYmd: '2026-07-11',
            decisionId: 'third_party_new',
        });

        expect(result.ok).toBe(false);
    });

    it('allows new eviction procedure after completed prior workflow', () => {
        const result = appendEvictionExecutorRequestRows({
            rows: [
                {
                    id: 'eviction_done',
                    title: 'طلب تحديد موعد الخروج الميداني',
                    body: 'قديم',
                    requestKind: 'eviction_procedure',
                    evictionWorkflowKey: 'field_visit_or_grace',
                    executorOutcome: 'approved',
                    executorScheduleLabel: 'مجدول',
                    date: '2026-07-10',
                },
            ],
            title: 'طلب تحديد موعد الخروج الميداني',
            body: 'جديد',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
            supersedeCompletedHub: true,
            todayYmd: '2026-07-11',
            decisionId: 'eviction_new',
            nowIso: '2026-07-11T10:00:00.000Z',
        });

        expect(result.ok).toBe(true);
        expect(result.rows[0]?.id).toBe('eviction_new');
        expect(
            result.rows.find((row) => String(row.id) === 'eviction_done')?.requestCycleSuperseded,
        ).toBe(true);
    });

    it('blocks duplicate pending unified collection request', () => {
        const result = appendEvictionExecutorRequestRows({
            rows: [
                {
                    id: 'uc_pending',
                    requestKind: 'unified_collection',
                    executorOutcome: 'pending',
                    date: '2026-07-11',
                },
            ],
            title: 'طلب وعاء موحد',
            body: 'طلب قائم',
            requestKind: 'unified_collection',
            todayYmd: '2026-07-11',
            decisionId: 'uc_new',
            nowIso: '2026-07-11T10:00:00.000Z',
        });

        expect(result.ok).toBe(false);
    });
});
