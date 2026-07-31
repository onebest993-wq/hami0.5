import { describe, expect, it } from 'vitest';
import {
    buildCreditorPartyDeathDecisionRow,
    buildDebtorHeirSubstitutionDecisionRow,
    creditorPartyDeathDecisionTitle,
    parseDebtorPartyDeathPayload,
    stringifyDebtorPartyDeathPayload,
} from '@/app/utils/executorPartyDeathDecisionBuilders';

describe('executor party death decision builders', () => {
    it('builds creditor party death decision rows with normalized heirs and pending hub defaults', () => {
        const row = buildCreditorPartyDeathDecisionRow({
            decisionId: 'cred-1',
            action: 'heir_substitution',
            creditorNameSnapshot: 'الدائن',
            heirNames: [' وارث 1 ', '', 'وارث 2'],
            date: '2026-07-11',
        });

        expect(creditorPartyDeathDecisionTitle('seek_heir')).toBe(
            'طلب — تسجيل وريث بعد مسار دون ورثة',
        );
        expect(row).toMatchObject({
            id: 'cred-1',
            title: 'طلب — إحلال الورثة محل الدائن المتوفى',
            requestKind: 'creditor_party_death',
            executorOutcome: 'pending',
            appealStatus: 'pending',
            status: 'pending',
            appealPhase: null,
            date: '2026-07-11',
        });
        expect(row.creditorPartyDeathPayloadJson).toContain('وارث 1');
        expect(row.creditorPartyDeathPayloadJson).toContain('وارث 2');
    });

    it('round-trips debtor heir substitution payloads and builds pending debtor rows', () => {
        const payloadJson = stringifyDebtorPartyDeathPayload({
            action: 'heir_substitution',
            debtorNameSnapshot: 'المدين',
            heir_names: [' وارث أ ', '', 'وارث ب'],
        });

        expect(parseDebtorPartyDeathPayload(payloadJson)).toEqual({
            action: 'heir_substitution',
            debtorNameSnapshot: 'المدين',
            heir_names: ['وارث أ', 'وارث ب'],
        });

        const row = buildDebtorHeirSubstitutionDecisionRow({
            decisionId: 'debtor-1',
            debtorNameSnapshot: 'المدين',
            date: '2026-07-12',
        });

        expect(row).toMatchObject({
            id: 'debtor-1',
            title: 'طلب — إحلال الورثة محل المدين المتوفى',
            requestKind: 'debtor_party_death',
            executorOutcome: 'pending',
            appealStatus: 'pending',
            status: 'pending',
            appealPhase: null,
            date: '2026-07-12',
        });
        expect(parseDebtorPartyDeathPayload(row.debtorPartyDeathPayloadJson)).toEqual({
            action: 'heir_substitution',
            debtorNameSnapshot: 'المدين',
            heir_names: [],
        });
    });
});
