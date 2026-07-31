import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import {
    clearDecisionsNamespaceForTests,
    readExecutorDecisionsUnionForExecution,
    writeExecutorDecisionsArray,
} from '@/app/utils/executionDecisionsNamespace';
import {
    mergeExecutorDecisionsIntoStorage,
    patchExecutorDecisionRowEverywhereInStorage,
    patchExecutorDecisionRowInStorage,
} from '@/app/utils/executorDecisionPersistenceOps';

describe('executorDecisionPersistenceOps', () => {
    const targetId = 'exec-persist-target';
    const sourceId = 'exec-persist-source';
    const executionData = {
        id: targetId,
        claimType: 'استحصال دين مالي',
        creditors: [{ name: 'دائن', isClient: true }],
        debtors: [{ name: 'مدين' }],
    };

    beforeEach(() => {
        clearDecisionsNamespaceForTests(targetId);
        clearDecisionsNamespaceForTests(sourceId);
        for (const key of SecureStoreService.listKeysSync()) {
            SecureStoreService.deleteItemSync(key);
        }
        SecureStoreService.setItemSync(executionStorageKey(targetId), JSON.stringify(executionData));
        SecureStoreService.setItemSync(
            executionStorageKey(sourceId),
            JSON.stringify({ ...executionData, id: sourceId }),
        );
    });

    it('patches decision row in storage and triggers reload callback', () => {
        writeExecutorDecisionsArray(
            targetId,
            [{ id: 'decision_1', requestKind: 'special_followup', executorOutcome: 'pending' }],
            executionData,
        );
        const onReload = vi.fn();

        const ok = patchExecutorDecisionRowInStorage({
            executionId: targetId,
            decisionId: 'decision_1',
            patch: { executorOutcome: 'approved' },
            onReload,
        });

        expect(ok).toBe(true);
        expect(onReload).toHaveBeenCalled();
        expect(
            readExecutorDecisionsUnionForExecution(targetId, executionData).find(
                (row) => row.id === 'decision_1',
            )?.executorOutcome,
        ).toBe('approved');
    });

    it('patches decision row across storage keys within scoped execution', () => {
        writeExecutorDecisionsArray(
            targetId,
            [{ id: 'decision_2', requestKind: 'guarantor_request', executorOutcome: 'pending' }],
            executionData,
        );
        const onReload = vi.fn();

        const result = patchExecutorDecisionRowEverywhereInStorage({
            decisionId: 'decision_2',
            patch: { executorOutcome: 'alternative' },
            scopeExecutionId: targetId,
            onReload,
        });

        expect(result.ok).toBe(true);
        expect(result.patchedKeys).toBeGreaterThan(0);
        expect(onReload).toHaveBeenCalled();
    });

    it('merges source decisions into target storage without wiping target rows', () => {
        writeExecutorDecisionsArray(
            targetId,
            [{ id: 'target_row', requestKind: 'special_followup', executorOutcome: 'pending' }],
            executionData,
        );
        writeExecutorDecisionsArray(
            sourceId,
            [{ id: 'source_row', requestKind: 'trust_disburse', executorOutcome: 'pending' }],
            { ...executionData, id: sourceId },
        );
        const onReload = vi.fn();

        const result = mergeExecutorDecisionsIntoStorage({
            targetExecutionId: targetId,
            sourceExecutionIds: [sourceId],
            onReload,
        });

        expect(result.merged).toBe(true);
        expect(result.countAfter).toBe(2);
        expect(onReload).toHaveBeenCalled();
        expect(
            readExecutorDecisionsUnionForExecution(targetId, executionData)
                .map((row) => row.id)
                .sort(),
        ).toEqual(['source_row', 'target_row']);
    });
});
