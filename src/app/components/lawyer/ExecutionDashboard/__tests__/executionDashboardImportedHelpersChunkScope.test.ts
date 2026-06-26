import { describe, expect, it } from 'vitest';
import { spreadExecutionDashboardImportedHelpersChunkScope } from '../executionDashboardImportedHelpersChunkScope';

describe('executionDashboardImportedHelpersChunkScope', () => {
    it('exposes shell overlay helper keys', () => {
        const scope = spreadExecutionDashboardImportedHelpersChunkScope();
        expect(typeof scope.buildDebtorNoticePatchForKey).toBe('function');
        expect(typeof scope.commitDossierNote).toBe('undefined');
        expect(typeof scope.storageCache).toBe('object');
        expect(typeof scope.readUnifiedFundsLedger).toBe('function');
        expect(typeof scope.notificationModalZIndex).toBe('number');
        expect(typeof scope.nestedOverUnifiedZIndex).toBe('number');
    });
});
