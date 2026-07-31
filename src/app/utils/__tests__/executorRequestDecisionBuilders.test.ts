import { describe, expect, it } from 'vitest';
import {
    buildEvictionExecutorDecisionRow,
    buildGuarantorFollowupDecisionRow,
    buildPersonalCoerciveDecisionRow,
    buildSeizureDecisionRow,
    buildSpecialFollowupDecisionRow,
    buildThirdPartyFundsReceivedDecisionRow,
    buildTrustDisburseDecisionRow,
} from '@/app/utils/executorRequestDecisionBuilders';

describe('executor request decision builders', () => {
    it('builds special followup rows with optional payload and appeal origin', () => {
        const row = buildSpecialFollowupDecisionRow({
            id: 'sf-1',
            title: 'طلب تنفيذي خاص',
            body: 'المتن',
            date: '2026-07-11',
            payloadJson: '  {"kind":"x"}  ',
            appealRequestOrigin: 'executor_side',
        });

        expect(row).toMatchObject({
            id: 'sf-1',
            requestKind: 'special_followup',
            payloadJson: '{"kind":"x"}',
            appealRequestOrigin: 'executor_side',
            executorOutcome: 'pending',
            appealStatus: 'pending',
            status: 'pending',
            appealPhase: null,
        });
    });

    it('builds guarantor and trust disburse rows with stable pending defaults', () => {
        expect(
            buildGuarantorFollowupDecisionRow({
                id: 'g-1',
                date: '2026-07-11',
            }),
        ).toMatchObject({
            id: 'g-1',
            requestKind: 'guarantor_request',
            appealRequestOrigin: 'debtor_side',
            executorOutcome: 'pending',
        });

        expect(
            buildTrustDisburseDecisionRow({
                id: 't-1',
                date: '2026-07-11',
            }),
        ).toMatchObject({
            id: 't-1',
            requestKind: 'trust_disburse',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'pending',
        });
    });

    it('builds third party funds and seizure rows with normalized payload fields', () => {
        const thirdParty = buildThirdPartyFundsReceivedDecisionRow({
            id: 'tp-1',
            date: '2026-07-11',
            thirdPartySeizureId: 'seiz-1',
            thirdPartyName: 'مصرف الرافدين',
            transferredAmountIqd: 125000,
        });
        const seizure = buildSeizureDecisionRow({
            id: 'sz-1',
            title: 'حجز مال المدين لدى الغير',
            body: 'طلب',
            date: '2026-07-11',
            seizurePayloadJson: '  {"id":"x"}  ',
            seizureSubtype: 'third_party',
            seizureTarget: 'guarantor',
        });

        expect(thirdParty.requestKind).toBe('third_party_funds_received');
        expect(JSON.parse(thirdParty.payloadJson)).toMatchObject({
            thirdPartySeizureId: 'seiz-1',
            thirdPartyName: 'مصرف الرافدين',
            transferredAmountIqd: 125000,
        });
        expect(seizure).toMatchObject({
            requestKind: 'seizure',
            seizurePayloadJson: '{"id":"x"}',
            seizureSubtype: 'third_party',
            seizureTarget: 'guarantor',
            appealRequestOrigin: 'creditor_side',
        });
    });

    it('builds personal coercive and eviction rows with the right specialized fields', () => {
        const personal = buildPersonalCoerciveDecisionRow({
            id: 'pc-1',
            title: 'منع سفر',
            body: 'طلب',
            date: '2026-07-11',
            subtype: 'travel_ban',
            debtorKey: ' debtor-1 ',
            encryptedPayloadJson: '  enc  ',
        });
        const eviction = buildEvictionExecutorDecisionRow({
            id: 'ev-1',
            title: 'طلب تحديد موعد الخروج الميداني',
            body: 'طلب',
            date: '2026-07-11',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
        });

        expect(personal).toMatchObject({
            requestKind: 'personal_coercive',
            personalCoerciveSubtype: 'travel_ban',
            personalCoerciveDebtorKey: 'debtor-1',
            encryptedPayloadJson: 'enc',
            appealRequestOrigin: 'creditor_side',
        });
        expect(eviction).toMatchObject({
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
            appealRequestOrigin: 'creditor_side',
            executorOutcome: 'pending',
        });
    });
});
