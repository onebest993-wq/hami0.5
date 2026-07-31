import { describe, expect, it, vi } from 'vitest';
import {
    matchesDecisionsModalOpenTarget,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';
import {
    dispatchOpenDecisionsModalFromFollowup,
    OPEN_DECISIONS_MODAL_EVENT,
} from '@/app/utils/openDecisionsModalFromFollowup';

describe('matchesDecisionsModalOpenTarget', () => {
    it('matches parent storage id when viewing child sub-dossier', () => {
        const parentId = 'parent-abc';
        const childId = 'child-xyz';
        const childData = {
            id: childId,
            parentDossierId: parentId,
            claimType: 'أثاث زوجية',
        };

        expect(
            matchesDecisionsModalOpenTarget(parentId, {
                executionDataId: childId,
                executionId: childId,
                decisionsStorageExecutionId: parentId,
                executionData: childData,
            })
        ).toBe(true);
    });

    it('rejects unrelated dossier id', () => {
        expect(
            matchesDecisionsModalOpenTarget('other-dossier', {
                executionDataId: 'child-xyz',
                decisionsStorageExecutionId: 'parent-abc',
                executionData: { id: 'child-xyz', parentDossierId: 'parent-abc' },
            })
        ).toBe(false);
    });
});

describe('mergeFollowupDecisionRows', () => {
    it('prefers storage rows and merges prop updates by id', async () => {
        const { mergeFollowupDecisionRows } = await import('@/app/utils/maritalFurnitureDeliveryWorkflow');
        const merged = mergeFollowupDecisionRows(
            [{ id: 'a', executorOutcome: 'approved' }],
            [{ id: 'a', executorOutcome: 'pending', title: 'from storage' }]
        );
        expect(merged).toHaveLength(1);
        expect(merged[0].executorOutcome).toBe('approved');
        expect(merged[0].title).toBe('from storage');
    });
});

describe('findMaritalFurnitureDeliveryRowLoose', () => {
    it('finds marital row even when governing filters would skip archived hub', async () => {
        const { findMaritalFurnitureDeliveryRowLoose } = await import(
            '@/app/utils/maritalFurnitureDeliveryWorkflow'
        );
        const row = findMaritalFurnitureDeliveryRowLoose([
            {
                id: 'mf-1',
                requestKind: 'eviction_procedure',
                evictionWorkflowKey: 'marital_furniture_delivery',
                title: '🛋️ طلب تسليم أثاث',
                executorOutcome: 'pending',
                isArchived: true,
            },
        ]);
        expect(row?.id).toBe('mf-1');
    });
});

describe('resolveFollowupDecisionsStorageId', () => {
    it('resolves parent storage id from decision row context', async () => {
        const { resolveFollowupDecisionsStorageId } = await import(
            '@/app/utils/openDecisionsModalFromFollowup'
        );
        const { appendEvictionExecutorRequest } = await import(
            '@/app/utils/executorSeizureDecisionQueue'
        );
        const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
        const { executionStorageKey } = await import('@/app/utils/executionStorageKeys');
        const { clearDecisionsNamespaceForTests } = await import(
            '@/app/utils/executionDecisionsNamespace'
        );

        const PARENT_ID = 'parent-open-decisions';
        const CHILD_ID = 'child-open-decisions';
        const childData = {
            id: CHILD_ID,
            parentDossierId: PARENT_ID,
            claimType: 'أثاث زوجية',
        };

        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        clearDecisionsNamespaceForTests(PARENT_ID);
        clearDecisionsNamespaceForTests(CHILD_ID);
        SecureStoreService.setItemSync(executionStorageKey(PARENT_ID), JSON.stringify({ id: PARENT_ID }));
        SecureStoreService.setItemSync(executionStorageKey(CHILD_ID), JSON.stringify(childData));

        appendEvictionExecutorRequest({
            executionId: PARENT_ID,
            title: '🛋️ طلب تسليم أثاث',
            body: 'test',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'marital_furniture_delivery',
            executionData: childData,
        });

        const { readFollowupMergedExecutorDecisions } = await import(
            '@/app/utils/maritalFurnitureDeliveryWorkflow'
        );
        const rows = readFollowupMergedExecutorDecisions(CHILD_ID, childData);
        const row = rows[0];
        expect(row?.id).toBeTruthy();

        const resolved = resolveFollowupDecisionsStorageId({
            storageExecutionId: CHILD_ID,
            decisionId: String(row.id),
            decisionRow: row,
            executionData: childData,
        });
        expect(resolved).toBe(PARENT_ID);
    });
});

describe('dispatchOpenDecisionsModalFromFollowup', () => {
    it('opens current tab for pending executor row', () => {
        const handler = vi.fn();
        window.addEventListener(OPEN_DECISIONS_MODAL_EVENT, handler as EventListener);

        dispatchOpenDecisionsModalFromFollowup({
            storageExecutionId: 'parent-abc',
            decisionId: 'eviction_req_1',
            decisionRow: {
                id: 'eviction_req_1',
                executorOutcome: 'pending',
            },
        });

        expect(handler).toHaveBeenCalledTimes(1);
        const event = handler.mock.calls[0][0] as CustomEvent<{
            executionId?: string;
            tab?: string;
            decisionId?: string;
        }>;
        expect(event.detail?.executionId).toBe('parent-abc');
        expect(event.detail?.tab).toBe('current');
        expect(event.detail?.decisionId).toBe('eviction_req_1');

        window.removeEventListener(OPEN_DECISIONS_MODAL_EVENT, handler as EventListener);
    });
});
