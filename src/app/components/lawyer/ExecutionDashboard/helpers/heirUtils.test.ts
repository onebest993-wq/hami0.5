import { describe, expect, it } from 'vitest';
import type { ExecutionFile, Party } from '@/app/types/execution';
import { collectPartyHeirDetailRows } from '@/app/components/lawyer/ExecutionDashboard/helpers/heirUtils';
import { buildPartyEditPersistPatch } from '@/app/components/lawyer/ExecutionDashboard/helpers/partyEditPersistence';

describe('collectPartyHeirDetailRows', () => {
    it('merges heirs_details, heirs[], and death case without dropping names', () => {
        const party = {
            name: 'دائن',
            heirs: ['علي', 'فاطمة'],
            heirs_details: [{ name: 'علي', phone: '1', address: '' }],
        } as Party;
        const file = {
            creditor_party_death_case: {
                deceased_party: 'creditor',
                heir_names: ['حسن'],
                flow: 'heir_substitution',
            },
        } as ExecutionFile;

        const rows = collectPartyHeirDetailRows(party, file, 'creditor');
        expect(rows.map((r) => r.name).sort()).toEqual(['علي', 'حسن', 'فاطمة'].sort());
    });
});

describe('buildPartyEditPersistPatch creditor heirs', () => {
    it('syncs creditor_party_death_case when editing multiple heirs', () => {
        const base = {
            is_creditor_deceased: true,
            creditors: [{ id: 'c1', name: 'أحمد', heirs: ['قديم'], isDeceased: true }],
            creditor_party_death_case: {
                deceased_party: 'creditor',
                heir_names: ['قديم'],
                flow: 'heir_substitution',
            },
        } as ExecutionFile;

        const patch = buildPartyEditPersistPatch(
            base,
            { kind: 'creditor', index: 0, partyId: 'c1' },
            {
                name: 'أحمد',
                phone: '',
                address: '',
                lockBaseInfo: true,
                includeHeirsInForm: true,
                heirs: [
                    { rowId: '1', name: 'وريث أ', phone: '', address: '', isClient: false },
                    { rowId: '2', name: 'وريث ب', phone: '', address: '', isClient: false },
                ],
            }
        );

        expect((patch?.creditors as { heirs?: string[] }[])?.[0]?.heirs).toEqual(['وريث أ', 'وريث ب']);
        expect(patch?.creditor_party_death_case?.heir_names).toEqual(['وريث أ', 'وريث ب']);
    });
});
