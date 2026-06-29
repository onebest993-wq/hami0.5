import { describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { EXECUTION_FILES_STORAGE_KEY } from '@/app/utils/executionFilesStorage';
import {
    isExecutionParentDossierBlobKey,
    isExecutionSubDossierBlobKey,
    persistExecutionDossierBlob,
} from '@/app/utils/executionDossierBlobPersistence';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { storageCache } from '@/app/utils/storageCache';
import {
    computeGuarantorApprovalMergePatch,
    isGuarantorRequestDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import { writeExecutorDecisionsArray } from '@/app/utils/executionDecisionsNamespace';

describe('execution storage unified layer', () => {
    const execId = 'exec_route_test_1';
    const blobKey = executionStorageKey(execId);

    it('classifies parent vs sub dossier blob keys', () => {
        expect(isExecutionParentDossierBlobKey(blobKey)).toBe(true);
        expect(
            isExecutionSubDossierBlobKey(`execution_parent__sub__child__meta`),
        ).toBe(true);
        expect(isExecutionParentDossierBlobKey(`execution_parent__sub__child__meta`)).toBe(
            false,
        );
    });

    it('storageCache.set on parent blob syncs executionFiles index', () => {
        for (const key of SecureStoreService.listKeysSync()) {
            SecureStoreService.deleteItemSync(key);
        }
        SecureStoreService.setItemSync(
            EXECUTION_FILES_STORAGE_KEY,
            JSON.stringify([{ id: execId, fileNumber: '200' }]),
        );

        storageCache.set(blobKey, {
            id: execId,
            fileNumber: '200',
            timelineEvents: [{ id: 'ev-route', title: 'اختبار' }],
        });

        const index = JSON.parse(
            SecureStoreService.getItemSync(EXECUTION_FILES_STORAGE_KEY) || '[]',
        ) as Array<{ id?: string; timelineEvents?: unknown[] }>;
        const row = index.find((r) => r.id === execId);
        expect(row?.timelineEvents).toHaveLength(1);

        const blob = JSON.parse(SecureStoreService.getItemSync(blobKey) || '{}') as {
            timelineEvents?: unknown[];
        };
        expect(blob.timelineEvents).toHaveLength(1);
    });

    it('computeGuarantorApprovalMergePatch merges approved guarantor decision', () => {
        const financialData = {
            id: execId,
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'دائن', isClient: true }],
            debtors: [{ name: 'مدين' }],
        };
        writeExecutorDecisionsArray(
            execId,
            [
                {
                    id: 'guarantor_req_test',
                    requestKind: 'guarantor_request',
                    title: 'طلب إدخال كفيل ضامن',
                    executorOutcome: 'approved',
                    appealRequestOrigin: 'debtor_side',
                },
            ],
            financialData,
        );

        const patch = computeGuarantorApprovalMergePatch(execId, {
            id: execId,
            debtors: [{ name: 'مدين' }],
            creditors: [{ name: 'دائن' }],
        });

        expect(patch.hasGuarantor).toBe(true);
        expect((patch.guarantor_followup as { executor_approved?: boolean })?.executor_approved).toBe(
            true,
        );
        expect(isGuarantorRequestDecisionRow({ id: 'guarantor_req_x', requestKind: 'guarantor_request' })).toBe(
            true,
        );
    });

    it('persistExecutionDossierBlob rejects empty wipe of rich dossier', () => {
        persistExecutionDossierBlob(execId, {
            id: execId,
            timelineEvents: [{ id: '1', title: 'x' }],
            debtors: [{ name: 'a' }],
            creditors: [{ name: 'b' }],
        });
        const ok = persistExecutionDossierBlob(execId, { id: execId });
        expect(ok).toBe(false);
        const blob = JSON.parse(SecureStoreService.getItemSync(blobKey) || '{}') as {
            timelineEvents?: unknown[];
        };
        expect(blob.timelineEvents?.length).toBe(1);
    });

    it('storageCache.get invalidates stale cache when SecureStore key was deleted', () => {
        const key = executionStorageKey('exec_cache_coherence');
        storageCache.set(key, { id: 'exec_cache_coherence', forcedAttendanceIssued: true });
        expect(storageCache.get(key)).toBeTruthy();

        SecureStoreService.deleteItemSync(key);
        expect(storageCache.get(key)).toBeNull();
    });

    it('readExecutionDataForDomainGate reads SecureStore not stale cache', async () => {
        const { readExecutionDataForDomainGate } = await import(
            '@/app/utils/executionDomainIsolation'
        );
        const id = 'exec_domain_gate_coherence';
        const key = executionStorageKey(id);
        storageCache.touchCacheEntry(key, {
            id,
            claimType: 'نوع خاطئ من الكاش',
        });
        SecureStoreService.setItemSync(
            key,
            JSON.stringify({
                id,
                claimType: 'استحصال دين مالي',
                creditors: [{ name: 'دائن', isClient: true }],
            }),
        );

        const data = readExecutionDataForDomainGate(id);
        expect(data?.claimType).toBe('استحصال دين مالي');
    });
});
