import { describe, expect, it } from 'vitest';
import {
    appendCreditorPartyDeathRequestRows,
    appendDebtorHeirSubstitutionRequestRows,
    findLatestHeirSubstitutionDecisionNeedingEntryFromRows,
} from '@/app/utils/executorPartyDeathMutations';

describe('executorPartyDeathMutations', () => {
    it('blocks duplicate pending creditor party death request', () => {
        const result = appendCreditorPartyDeathRequestRows({
            rows: [
                {
                    id: 'creditor_pending',
                    requestKind: 'creditor_party_death',
                    executorOutcome: 'pending',
                    date: '2026-07-11',
                },
            ],
            action: 'heir_substitution',
            creditorNameSnapshot: 'دائن',
            heirNames: ['وارث 1'],
            todayYmd: '2026-07-11',
            decisionId: 'creditor_new',
        });

        expect(result.ok).toBe(false);
        expect(result.rows).toHaveLength(1);
    });

    it('blocks debtor heir substitution when another pending request exists', () => {
        const result = appendDebtorHeirSubstitutionRequestRows({
            rows: [
                {
                    id: 'debtor_pending',
                    requestKind: 'debtor_party_death',
                    title: 'طلب — إحلال الورثة محل المدين المتوفى',
                    debtorPartyDeathPayloadJson: JSON.stringify({
                        action: 'heir_substitution',
                        debtorNameSnapshot: 'مدين',
                        heir_names: [],
                    }),
                    executorOutcome: 'pending',
                    date: '2026-07-11',
                },
            ],
            debtorNameSnapshot: 'مدين',
            todayYmd: '2026-07-11',
            decisionId: 'debtor_new',
        });

        expect(result.ok).toBe(false);
    });

    it('finds latest approved heir substitution decision needing entry', () => {
        const creditorId = findLatestHeirSubstitutionDecisionNeedingEntryFromRows(
            [
                {
                    id: 'creditor_old',
                    requestKind: 'creditor_party_death',
                    executorOutcome: 'approved',
                    creditorPartyDeathPayloadJson: JSON.stringify({
                        v: 1,
                        action: 'heir_substitution',
                        creditorNameSnapshot: 'دائن',
                        heir_names: ['وارث'],
                    }),
                    date: '2026-07-10',
                },
                {
                    id: 'creditor_new',
                    requestKind: 'creditor_party_death',
                    executorOutcome: 'alternative',
                    creditorPartyDeathPayloadJson: JSON.stringify({
                        v: 1,
                        action: 'heir_substitution',
                        creditorNameSnapshot: 'دائن',
                        heir_names: ['وارث'],
                    }),
                    resolvedAt: '2026-07-11T10:00:00.000Z',
                    date: '2026-07-11',
                },
            ],
            'creditor',
        );

        expect(creditorId).toBe('creditor_new');
    });
});
