import { describe, expect, it, vi } from 'vitest';
import { EXECUTION_HANDLER_CLUSTER_STUBS } from '../executionHandlerClusterStubs';
import { hasFollowupModalStubHandlerUpgrade } from '../followupModalSnapshotHydration';

describe('hasFollowupModalStubHandlerUpgrade', () => {
    it('detects stub → live handler upgrade in followup snapshot', () => {
        const stub = EXECUTION_HANDLER_CLUSTER_STUBS.dossierFollowupHandlers as Record<string, unknown>;
        const live = vi.fn();
        const prev = { handleDossierAction: stub.handleDossierAction };
        const next = { handleDossierAction: live };
        expect(hasFollowupModalStubHandlerUpgrade(prev, next)).toBe(true);
    });

    it('returns false when both handlers are live', () => {
        const a = vi.fn();
        const b = vi.fn();
        expect(hasFollowupModalStubHandlerUpgrade({ handleDossierAction: a }, { handleDossierAction: b })).toBe(
            false,
        );
    });
});
