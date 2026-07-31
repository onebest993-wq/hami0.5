import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { clearDecisionsNamespaceForTests } from '@/app/utils/executionDecisionsNamespace';
import { readExecutorDecisionsUnionAcrossCandidateIds } from '@/app/utils/executionDecisionsNamespace';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { resolveMaritalFurnitureDeliveryState, readFollowupMergedExecutorDecisions } from '@/app/utils/maritalFurnitureDeliveryWorkflow';
import { appendEvictionProcedureRequest } from '@/app/utils/appendEvictionProcedureRequest';
import { appendEvictionExecutorRequest } from '@/app/utils/executorSeizureDecisionQueue';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionEvictionActionIds';

const PARENT_ID = 'parent-mf-delivery';
const CHILD_ID = 'child-mf-delivery';

const maritalChildData = {
    id: CHILD_ID,
    parentDossierId: PARENT_ID,
    claimType: 'أثاث زوجية',
    creditors: [{ name: 'زوجة', isClient: true }],
    debtors: [{ name: 'زوج' }],
};

function seedParentShell() {
    SecureStoreService.setItemSync(
        executionStorageKey(PARENT_ID),
        JSON.stringify({
            id: PARENT_ID,
            claimType: 'أثاث زوجية',
            creditors: [{ name: 'زوجة', isClient: true }],
            debtors: [{ name: 'زوج' }],
        }),
    );
    SecureStoreService.setItemSync(executionStorageKey(CHILD_ID), JSON.stringify(maritalChildData));
}

describe('marital furniture delivery parent/child storage', () => {
    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        clearDecisionsNamespaceForTests(PARENT_ID);
        clearDecisionsNamespaceForTests(CHILD_ID);
        seedParentShell();
    });

    it('append under parent id with child executionData is visible in union read + state resolver', () => {
        const ok = appendEvictionExecutorRequest({
            executionId: PARENT_ID,
            title: '🛋️ طلب تسليم أثاث',
            body: 'طلب موحّد لمنفذ العدل',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'marital_furniture_delivery',
            executionData: maritalChildData,
        });
        expect(ok).toBe(true);

        const union = readExecutorDecisionsUnionAcrossCandidateIds(PARENT_ID, maritalChildData);
        expect(union.some((r) => String(r.requestKind) === 'eviction_procedure')).toBe(true);

        const state = resolveMaritalFurnitureDeliveryState(union);
        expect(state.mode).toBe('unified');
        expect(state.unifiedRow?.id).toBeTruthy();
    });

    it('appendEvictionProcedureRequest end-to-end surfaces row for followup card state', () => {
        const toasts: Array<{ msg: string; type: string }> = [];
        appendEvictionProcedureRequest(
            {
                locked: false,
                decisionsStorageExecutionId: PARENT_ID,
                executionData: maritalChildData,
                appendEvictionExecutorRequest: (request) =>
                    appendEvictionExecutorRequest({
                        ...request,
                        executionData: request.executionData ?? maritalChildData,
                    }),
                showToast: (msg, type) => {
                    toasts.push({ msg, type });
                },
            },
            {
                actionId: EVICTION_TIMELINE_ACTION_IDS.MARITAL_FURNITURE_DELIVERY,
                title: '🛋️ طلب تسليم أثاث',
                description: 'طلب موحّد لمنفذ العدل',
            },
        );

        expect(toasts.some((t) => t.type === 'info')).toBe(true);

        const rows = readFollowupMergedExecutorDecisions(PARENT_ID, maritalChildData);
        const state = resolveMaritalFurnitureDeliveryState(rows);
        expect(state.mode).not.toBe('none');
        expect(state.unifiedRow?.id).toBeTruthy();
    });
});
