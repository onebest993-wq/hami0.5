import { describe, expect, it } from 'vitest';
import {
    buildPartyEditPersistPatch,
    resolvePartyIndexInList,
} from '../partyEditPersistence';
import type { ExecutionFile } from '@/app/types/execution';

describe('partyEditPersistence', () => {
    it('resolvePartyIndexInList finds by id', () => {
        const list = [{ id: 'a' }, { id: 'b' }];
        expect(resolvePartyIndexInList(list, 0, { id: 'b' })).toBe(1);
    });

    it('buildPartyEditPersistPatch syncs legacy creditor singleton', () => {
        const base = {
            id: 'exec-1',
            creditors: [{ id: 'c1', name: 'قديم', phone: '1', address: 'ع1', role: 'الدائن' }],
            creditor: { id: 'c1', name: 'قديم', phone: '1', address: 'ع1' },
            debtors: [{ id: 'd1', name: 'مدين', phone: '', address: '', role: 'المدين' }],
        } as unknown as ExecutionFile;

        const patch = buildPartyEditPersistPatch(
            base,
            { kind: 'creditor', index: 0, partyId: 'c1' },
            {
                name: 'جديد',
                phone: '0770',
                address: 'بغداد',
                heirs: [],
                lockBaseInfo: false,
            }
        );

        expect(patch).not.toBeNull();
        expect((patch!.creditors as { name: string }[])[0].name).toBe('جديد');
        expect((patch!.creditor as { name: string }).name).toBe('جديد');
        expect((patch!.creditor as { phone: string }).phone).toBe('0770');
    });

    it('buildPartyEditPersistPatch syncs debtor fullName for display', () => {
        const base = {
            id: 'exec-1',
            debtors: [
                {
                    id: 'd1',
                    name: 'قديم',
                    fullName: 'قديم',
                    phone: '',
                    address: '',
                    role: 'المدين',
                },
            ],
            debtor: { id: 'd1', name: 'قديم', fullName: 'قديم', phone: '', address: '' },
        } as unknown as ExecutionFile;

        const patch = buildPartyEditPersistPatch(
            base,
            { kind: 'debtor', index: 0, partyId: 'd1' },
            {
                name: 'ابلا',
                phone: '',
                address: '',
                heirs: [],
                lockBaseInfo: false,
            }
        );

        expect(patch).not.toBeNull();
        expect((patch!.debtors as { name: string; fullName: string }[])[0].name).toBe('ابلا');
        expect((patch!.debtors as { name: string; fullName: string }[])[0].fullName).toBe('ابلا');
        expect((patch!.debtor as { name: string; fullName: string }).fullName).toBe('ابلا');
    });
});
