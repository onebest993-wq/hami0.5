import { describe, expect, it } from 'vitest';
import { isCanonicalEmptyDossierPrimary } from '@/app/services/dossierPersistence/dossierPrimaryEmpty';

describe('isCanonicalEmptyDossierPrimary', () => {
    it('treats a readable empty array as the source of truth', () => {
        expect(isCanonicalEmptyDossierPrimary([], false)).toBe(true);
    });

    it('does not treat missing or unread keys as an intentional empty vault', () => {
        expect(isCanonicalEmptyDossierPrimary(null, false)).toBe(false);
        expect(isCanonicalEmptyDossierPrimary([], true)).toBe(false);
        expect(isCanonicalEmptyDossierPrimary([{ id: '1' }], false)).toBe(false);
    });
});
