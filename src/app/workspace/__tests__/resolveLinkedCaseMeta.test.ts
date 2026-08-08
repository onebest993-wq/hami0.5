import { describe, expect, it } from 'vitest';
import {
    buildLinkedCaseLookup,
    resolveLinkedCaseMetaFromIndex,
} from '../resolveLinkedCaseMeta';

describe('resolveLinkedCaseMetaFromIndex execution client', () => {
    it('reads debtor client from debtors[] when representedParty is debtor', () => {
        const index = buildLinkedCaseLookup([], [
            {
                id: 'exec-debtor',
                representedParty: 'debtor',
                creditors: [{ name: 'الدائن' }],
                debtors: [{ name: 'موكل المدين', isClient: true }],
                clientName: 'اسم قديم خاطئ',
            },
        ]);

        const meta = resolveLinkedCaseMetaFromIndex('exec-debtor', index);
        expect(meta.clientName).toBe('موكل المدين');
    });

    it('falls back to creditors[].isClient for creditor representation', () => {
        const index = buildLinkedCaseLookup([], [
            {
                id: 'exec-creditor',
                creditors: [{ name: 'موكل الدائن', isClient: true }],
                debtors: [{ name: 'المدين' }],
            },
        ]);

        const meta = resolveLinkedCaseMetaFromIndex('exec-creditor', index);
        expect(meta.clientName).toBe('موكل الدائن');
    });
});
