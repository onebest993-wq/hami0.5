import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { executionDecisionsStorageKey } from '@/app/utils/executionStorageKeys';
import {
    buildDecisionsNamespaceSlug,
    clearDecisionsNamespaceForTests,
    ensureDecisionsNamespaceMigrated,
    executionDecisionsNamespaceStorageKey,
    readExecutorDecisionsFromActiveNamespace,
    writeExecutorDecisionsArray,
} from '../executionDecisionsNamespace';
import { clearDomainReconcileMarker } from '../executionDomainReconcile';

describe('executionDecisionsNamespace', () => {
    const execId = 'exec-ns-test';

    beforeEach(() => {
        clearDecisionsNamespaceForTests(execId);
        clearDomainReconcileMarker(execId);
    });

    it('builds stable namespace slug from module and perspective', () => {
        expect(buildDecisionsNamespaceSlug('financial_debt', 'creditor_agent')).toBe(
            'financial_debt__creditor_agent'
        );
        expect(buildDecisionsNamespaceSlug('visitation_personal', 'debtor_agent')).toBe(
            'visitation_personal__debtor_agent'
        );
    });

    it('migrates legacy unified decisions into active namespace bucket', () => {
        const legacyKey = executionDecisionsStorageKey(execId);
        const rows = [
            {
                id: 'sz-legacy',
                requestKind: 'seizure',
                appealRequestOrigin: 'creditor_side',
                executorOutcome: 'pending',
            },
        ];
        SecureStoreService.setItemSync(legacyKey, JSON.stringify(rows));

        const migrated = ensureDecisionsNamespaceMigrated(execId, {
            id: execId,
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'دائن', isClient: true }],
            debtors: [{ name: 'مدين' }],
        });
        expect(migrated).toBe(true);

        const active = readExecutorDecisionsFromActiveNamespace(execId, {
            id: execId,
            claimType: 'استحصال دين مالي',
            creditors: [{ name: 'دائن', isClient: true }],
            debtors: [{ name: 'مدين' }],
        });
        expect(active.map((r) => r.id)).toContain('sz-legacy');
        expect(active[0]?.domainNamespace).toBe('financial_debt__creditor_agent');

        const legacyAfter = JSON.parse(SecureStoreService.getItemSync(legacyKey) || '[]') as unknown[];
        expect(legacyAfter).toEqual([]);
    });

    it('isolates decisions when claim module context changes', () => {
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
                    id: 'fin-1',
                    requestKind: 'seizure',
                    appealRequestOrigin: 'creditor_side',
                    executorOutcome: 'pending',
                },
            ],
            financialData
        );

        const visitationData = {
            id: execId,
            claimType: 'مشاهدة',
            classification: 'أحوال شخصية',
            creditors: [{ name: 'أم', isClient: true }],
            debtors: [{ name: 'أب' }],
        };
        const visitationRows = readExecutorDecisionsFromActiveNamespace(execId, visitationData);
        expect(visitationRows).toEqual([]);

        const finSlug = buildDecisionsNamespaceSlug('financial_debt', 'creditor_agent');
        const finKey = executionDecisionsNamespaceStorageKey(execId, finSlug);
        const finStored = JSON.parse(SecureStoreService.getItemSync(finKey) || '[]') as Array<{
            id?: string;
        }>;
        expect(finStored.map((r) => r.id)).toContain('fin-1');
    });
});
