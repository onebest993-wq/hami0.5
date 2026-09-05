import { describe, expect, it } from 'vitest';
import {
    mergeDossierRowsById,
    resolveLoadedDossierPrimary,
} from '@/app/services/dossierPersistence/dossierKeyLoad';

describe('resolveLoadedDossierPrimary', () => {
    it('fails closed when the primary key is occupied and unread', () => {
        expect(
            resolveLoadedDossierPrimary({ primary: null, unread: true, occupied: true }),
        ).toBe('unread');
    });

    it('treats a readable empty array as canonical', () => {
        expect(
            resolveLoadedDossierPrimary({ primary: [], unread: false, occupied: true }),
        ).toBe('canonical-empty');
    });

    it('uses a non-empty primary without consulting leftover keys', () => {
        expect(
            resolveLoadedDossierPrimary({
                primary: [{ id: 'a' }],
                unread: false,
                occupied: true,
            }),
        ).toBe('use-primary');
    });

    it('migrates from leftover keys only when the primary is missing', () => {
        expect(
            resolveLoadedDossierPrimary({ primary: null, unread: false, occupied: false }),
        ).toBe('try-legacy');
    });
});

describe('mergeDossierRowsById', () => {
    it('keeps the primary row when the same id appears in leftover keys', () => {
        expect(
            mergeDossierRowsById([{ id: 'a', status: 'active' }], [
                { id: 'a', status: 'deleted' },
                { id: 'b' },
            ]),
        ).toEqual([{ id: 'a', status: 'active' }, { id: 'b' }]);
    });
});
