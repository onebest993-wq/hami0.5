import { describe, expect, it } from 'vitest';
import type { ExecutionFile } from '@/app/types/execution';
import {
    buildExecutionMergeForCreditorHeirSubstitutionApproval,
    buildExecutionMergeForCreditorPartyDeath,
} from '@/app/utils/creditorPartyDeathPersistence';

describe('creditorPartyDeathPersistence', () => {
    const file = {
        creditors: [
            {
                name: 'أحمد',
                heirs: ['وريث واحد'],
                heirs_details: [{ name: 'وريث واحد', phone: '07', address: 'بغداد' }],
            },
        ],
        debtor_party_death_case: {
            deceased_party: 'debtor',
            heir_names: ['وريث مدين'],
            flow: 'heir_substitution',
        },
    } as ExecutionFile;

    it('does not wipe creditor heirs on approval merge with empty payload names', () => {
        const merge = buildExecutionMergeForCreditorPartyDeath(file, {
            action: 'heir_substitution',
            creditorNameSnapshot: 'أحمد',
            heir_names: [],
        });
        const creditors = merge.creditors as ExecutionFile['creditors'];
        expect(creditors?.[0]?.heirs).toEqual(['وريث واحد']);
        expect(creditors?.[0]?.heirs_details?.[0]?.name).toBe('وريث واحد');
        expect(merge.debtor_party_death_case?.heir_names).toEqual(['وريث مدين']);
    });

    it('approval-only merge preserves heirs like debtor path', () => {
        const merge = buildExecutionMergeForCreditorHeirSubstitutionApproval(file, 'أحمد');
        const creditors = merge.creditors as ExecutionFile['creditors'];
        expect(creditors?.[0]?.heirs).toEqual(['وريث واحد']);
        expect(merge.creditor_party_death_case?.flow).toBe('heir_substitution');
        expect(merge.debtor_party_death_case?.heir_names).toEqual(['وريث مدين']);
    });
});
