import { describe, expect, it } from 'vitest';
import {
    buildScopedPartyDeathPersistPatch,
    getPartyDeathCaseForRole,
} from '@/app/utils/partyDeathCaseScope';
import type { ExecutionFile } from '@/app/types/execution';

describe('partyDeathCaseScope', () => {
    it('reads scoped creditor case without mixing debtor legacy case', () => {
        const file = {
            party_death_case: {
                deceased_party: 'debtor' as const,
                heir_names: ['وريث مدين'],
                flow: 'heir_substitution' as const,
            },
            creditor_party_death_case: {
                deceased_party: 'creditor' as const,
                heir_names: ['وريث دائن'],
                flow: 'heir_substitution' as const,
            },
        } as ExecutionFile;

        expect(getPartyDeathCaseForRole(file, 'creditor')?.heir_names).toEqual(['وريث دائن']);
        expect(getPartyDeathCaseForRole(file, 'debtor')?.heir_names).toEqual(['وريث مدين']);
    });

    it('preserves other party case when saving one side', () => {
        const base = {
            debtor_party_death_case: {
                deceased_party: 'debtor' as const,
                heir_names: ['أ'],
                flow: 'heir_substitution' as const,
            },
        } as ExecutionFile;

        const patch = buildScopedPartyDeathPersistPatch(base, 'creditor', {
            deceased_party: 'creditor',
            heir_names: ['ب'],
            flow: 'heir_substitution',
            heir_certificate_file_name: null,
        });

        expect(patch.debtor_party_death_case?.heir_names).toEqual(['أ']);
        expect(patch.creditor_party_death_case?.heir_names).toEqual(['ب']);
    });
});
