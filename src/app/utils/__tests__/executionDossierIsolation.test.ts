import { describe, expect, it } from 'vitest';
import {
    buildFreshExecutionDossierBlob,
    executionDecisionsStorageKey,
    executionStorageKey,
    generateExecutionDossierId,
    purgeExecutionStorageCache,
    seedFreshExecutionDossierStorage,
} from '@/app/utils/executionStorageKeys';
import { storageCache } from '@/app/utils/storageCache';

describe('executionDossierIsolation', () => {
    it('generateExecutionDossierId returns unique non-empty ids', () => {
        const a = generateExecutionDossierId();
        const b = generateExecutionDossierId();
        expect(a).toBeTruthy();
        expect(b).toBeTruthy();
        expect(a).not.toBe(b);
    });

    it('buildFreshExecutionDossierBlob strips procedural state', () => {
        const clean = buildFreshExecutionDossierBlob({
            id: 'exec_test_1',
            fileNumber: '1540',
            fileYear: '2026',
            timelineEvents: [{ id: 't1', title: 'قديم' }],
            seizedAssets: [{ id: 's1' }],
            seizureDraftsByDecisionId: { d1: { x: 1 } },
        });
        expect(clean.id).toBe('exec_test_1');
        expect(clean.timelineEvents).toEqual([]);
        expect(clean.seizedAssets).toEqual([]);
        expect(clean.seizureDraftsByDecisionId).toEqual({});
        expect(clean.guarantor_followup).toBeNull();
        expect(clean.procedural_guarantee).toBeNull();
        expect(clean.hasGuarantor).toBe(false);
    });

    it('seedFreshExecutionDossierStorage writes clean blob and empty decisions', () => {
        const id = 'exec_seed_test';
        storageCache.set(executionStorageKey(id), {
            id,
            timelineEvents: [{ id: 'stale', title: 'متبقي' }],
        });
        storageCache.set(executionDecisionsStorageKey(id), [{ id: 'dec-1' }]);

        seedFreshExecutionDossierStorage({
            id,
            fileNumber: '1540',
            fileYear: '2026',
            timelineEvents: [{ id: 'incoming', title: 'يجب ألا يُحفظ' }],
        });

        const blob = storageCache.get(executionStorageKey(id)) as {
            id?: string;
            timelineEvents?: unknown[];
            fileNumber?: string;
        };
        const decisions = storageCache.get(executionDecisionsStorageKey(id)) as unknown[];

        expect(blob?.id).toBe(id);
        expect(blob?.timelineEvents).toEqual([]);
        expect(blob?.fileNumber).toBe('1540');
        expect(decisions).toEqual([]);
    });

    it('purgeExecutionStorageCache removes dossier keys from cache and storage', () => {
        const id = 'exec_purge_test';
        storageCache.set(executionStorageKey(id), { id, timelineEvents: [{ id: 'x' }] });
        storageCache.set(executionDecisionsStorageKey(id), [{ id: 'd1' }]);

        purgeExecutionStorageCache(id);

        expect(storageCache.get(executionStorageKey(id))).toBeNull();
        expect(storageCache.get(executionDecisionsStorageKey(id))).toBeNull();
    });
});
