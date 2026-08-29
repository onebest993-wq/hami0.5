import { describe, expect, it } from 'vitest';
import { EXECUTION_DOSSIER_TEST_IDS } from '../executionDossierTestIds';

describe('executionDossierTestIds', () => {
    it('exposes stable dossier selectors', () => {
        expect(EXECUTION_DOSSIER_TEST_IDS.dossier).toBe('execution-dashboard-dossier');
        expect(EXECUTION_DOSSIER_TEST_IDS.followupMemo).toBe('execution-followup-memo');
        expect(EXECUTION_DOSSIER_TEST_IDS.decisions).toBe('execution-open-decisions');
    });
});
