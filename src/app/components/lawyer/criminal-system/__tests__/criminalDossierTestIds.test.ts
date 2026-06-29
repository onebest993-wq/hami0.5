import { describe, expect, it } from 'vitest';
import { CRIMINAL_DOSSIER_TEST_IDS } from '../criminalDossierTestIds';

describe('criminalDossierTestIds', () => {
    it('exposes stable dossier and card selectors', () => {
        expect(CRIMINAL_DOSSIER_TEST_IDS.dossier).toBe('criminal-dashboard-dossier');
        expect(CRIMINAL_DOSSIER_TEST_IDS.caseCard('abc')).toBe('criminal-case-abc');
    });
});
