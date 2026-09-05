import { describe, expect, it } from 'vitest';
import { stringifyCreditorPartyDeathPayload } from '@/app/utils/creditorPartyDeathPersistence';
import { stringifyDebtorPartyDeathPayload } from '@/app/utils/executorPartyDeathDecisionBuilders';
import { buildHeirSubstitutionExecutorMerge } from '@/app/utils/heirSubstitutionExecutorMerge';

describe('buildHeirSubstitutionExecutorMerge', () => {
    it('merges debtor heir substitution approval and opens heirs entry when no names exist', () => {
        const result = buildHeirSubstitutionExecutorMerge(
            {
                id: 'debtor_heir_req_1',
                requestKind: 'debtor_party_death',
                debtorPartyDeathPayloadJson: stringifyDebtorPartyDeathPayload({
                    action: 'heir_substitution',
                    debtorNameSnapshot: 'مدين',
                    heir_names: [],
                }),
            },
            {
                id: 'x1',
                debtors: [{ name: 'مدين', type: 'debtor' }],
            } as never,
        );

        expect(result?.party).toBe('debtor');
        expect(result?.openHeirsEntry).toBe(true);
        expect(result?.merge.is_debtor_deceased).toBe(true);
        expect((result?.merge.debtor_party_death_case as { flow?: string } | undefined)?.flow).toBe(
            'heir_substitution',
        );
    });

    it('does not auto-open heirs entry when debtor heirs are already on the file', () => {
        const result = buildHeirSubstitutionExecutorMerge(
            {
                requestKind: 'debtor_party_death',
                debtorPartyDeathPayloadJson: stringifyDebtorPartyDeathPayload({
                    action: 'heir_substitution',
                    debtorNameSnapshot: 'مدين',
                    heir_names: [],
                }),
            },
            {
                debtors: [{ name: 'مدين', type: 'debtor', heirs: ['وريث أ'] }],
            } as never,
        );

        expect(result?.openHeirsEntry).toBe(false);
    });

    it('opens creditor heirs entry for empty heir_substitution payloads', () => {
        const result = buildHeirSubstitutionExecutorMerge(
            {
                id: 'creditor_death_req_1',
                requestKind: 'creditor_party_death',
                creditorPartyDeathPayloadJson: stringifyCreditorPartyDeathPayload({
                    action: 'heir_substitution',
                    creditorNameSnapshot: 'دائن',
                    heir_names: [],
                }),
            },
            {
                creditors: [{ name: 'دائن', type: 'creditor' }],
            } as never,
        );

        expect(result?.party).toBe('creditor');
        expect(result?.openHeirsEntry).toBe(true);
        expect(result?.merge.is_creditor_deceased).toBe(true);
    });
});
