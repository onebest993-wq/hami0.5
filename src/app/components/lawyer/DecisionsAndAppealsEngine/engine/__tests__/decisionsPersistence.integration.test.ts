/**
 * تكامل: حفظ بطاقات القرارات — سيناريوهات الاختفاء الشائعة
 */
import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clearDecisionsNamespaceForTests,
    mergeExecutorDecisionsUnionForPersist,
    pruneRedundantDecisionsStorageAliases,
    readExecutorDecisionsUnionAcrossCandidateIds,
    writeExecutorDecisionsArray,
    writeExecutorDecisionsUnionForExecution,
} from '@/app/utils/executionDecisionsNamespace';
import { readDecisionsUnionAcrossCandidates } from '../readDecisionsUnionAcrossCandidates';
import {
    clearAllDecisionsSessionCachesForTests,
    clearDecisionsMemoryCacheOnlyForTests,
    readDecisionsSessionCacheBest,
    writeDecisionsSessionCache,
} from '../decisionsSessionCache';
import { clearDecisionsDiscoverCacheForTests } from '../resolveDecisionsStorageExecutionId';

function makeDossierIds() {
    const suffix = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const parentId = `e2e-parent-${suffix}`;
    const childId = `e2e-child-${suffix}`;
    const financialData = {
        id: childId,
        parentDossierId: parentId,
        claimType: 'استحصال دين مالي',
        creditors: [{ name: 'دائن', isClient: true }],
    };
    return { parentId, childId, financialData };
}

describe('decisions persistence integration', () => {
    beforeEach(() => {
        clearAllDecisionsSessionCachesForTests();
        clearDecisionsDiscoverCacheForTests();
    });

    it('سيناريو 1: طلب محضر على الفرع + قرار يدوي على الأب — لا يُمسح عند الدمج', () => {
        const { parentId, childId, financialData } = makeDossierIds();
        clearDecisionsNamespaceForTests(parentId);
        clearDecisionsNamespaceForTests(childId);

        writeExecutorDecisionsArray(
            childId,
            [
                {
                    id: 'seizure_req_e2e_salary',
                    title: 'حجز راتب',
                    requestKind: 'seizure',
                    executorOutcome: 'pending',
                    date: '2026-06-25',
                },
            ],
            financialData
        );

        const merged = mergeExecutorDecisionsUnionForPersist(
            parentId,
            [
                {
                    id: 'manual-e2e-1',
                    title: 'قرار منفذ يدوي',
                    manualExecutorLedgerEntry: true,
                    date: '2026-06-25',
                },
            ],
            financialData
        );
        writeExecutorDecisionsUnionForExecution(parentId, merged, financialData);
        pruneRedundantDecisionsStorageAliases(parentId, financialData);

        const ids = merged.map((r) => r.id).sort();
        expect(ids).toEqual(['manual-e2e-1', 'seizure_req_e2e_salary']);
    });

    it('سيناريو 2: إعادة قراءة بعد محاكاة إغلاق/فتح المركز (بدون executionData)', () => {
        const { parentId, childId, financialData } = makeDossierIds();
        clearDecisionsNamespaceForTests(parentId);
        clearDecisionsNamespaceForTests(childId);

        writeExecutorDecisionsArray(
            childId,
            [
                {
                    id: 'seizure_req_e2e_salary',
                    title: 'حجز راتب',
                    requestKind: 'seizure',
                    executorOutcome: 'pending',
                    date: '2026-06-25',
                },
            ],
            financialData
        );

        const merged = mergeExecutorDecisionsUnionForPersist(
            parentId,
            [
                {
                    id: 'manual-e2e-2',
                    title: 'قرار',
                    manualExecutorLedgerEntry: true,
                    date: '2026-06-25',
                },
            ],
            financialData
        );
        writeExecutorDecisionsUnionForExecution(parentId, merged, financialData);

        const { rows } = readDecisionsUnionAcrossCandidates(parentId, null);
        expect(rows.map((r) => r.id).sort()).toEqual(['manual-e2e-2', 'seizure_req_e2e_salary']);
    });

    it('سيناريو 3: كاش الجلسة يبقى بعد مسح الذاكرة ويُعاد تحميله من sessionStorage', () => {
        const { parentId, childId, financialData } = makeDossierIds();
        clearDecisionsNamespaceForTests(parentId);
        clearDecisionsNamespaceForTests(childId);

        writeExecutorDecisionsArray(
            childId,
            [
                {
                    id: 'seizure_req_e2e_salary',
                    title: 'حجز راتب',
                    requestKind: 'seizure',
                    executorOutcome: 'pending',
                    date: '2026-06-25',
                },
            ],
            financialData
        );

        const merged = mergeExecutorDecisionsUnionForPersist(
            parentId,
            [
                {
                    id: 'manual-e2e-3',
                    title: 'قرار',
                    manualExecutorLedgerEntry: true,
                    date: '2026-06-25',
                },
            ],
            financialData
        );
        writeExecutorDecisionsUnionForExecution(parentId, merged, financialData);

        writeDecisionsSessionCache(parentId, merged as never, [childId, parentId]);
        clearDecisionsMemoryCacheOnlyForTests();

        const hit = readDecisionsSessionCacheBest([parentId, childId]);
        expect(hit?.map((d) => d.id).sort()).toEqual(['manual-e2e-3', 'seizure_req_e2e_salary']);
    });

    it('سيناريو 4: prune يزيل المفتاح الفرعي المكرر بعد التوحيد', () => {
        const { parentId, childId, financialData } = makeDossierIds();
        clearDecisionsNamespaceForTests(parentId);
        clearDecisionsNamespaceForTests(childId);

        writeExecutorDecisionsArray(
            childId,
            [
                {
                    id: 'seizure_req_e2e_salary',
                    title: 'حجز راتب',
                    requestKind: 'seizure',
                    executorOutcome: 'pending',
                    date: '2026-06-25',
                },
            ],
            financialData
        );

        const merged = mergeExecutorDecisionsUnionForPersist(
            parentId,
            [
                {
                    id: 'manual-e2e-4',
                    title: 'قرار',
                    manualExecutorLedgerEntry: true,
                    date: '2026-06-25',
                },
            ],
            financialData
        );
        writeExecutorDecisionsUnionForExecution(parentId, merged, financialData);

        const childBefore = readExecutorDecisionsUnionAcrossCandidateIds(childId, financialData);
        expect(childBefore.length).toBeGreaterThan(0);

        const { prunedDossierIds } = pruneRedundantDecisionsStorageAliases(parentId, financialData);
        expect(prunedDossierIds).toContain(childId);

        const union = readExecutorDecisionsUnionAcrossCandidateIds(parentId, financialData);
        expect(union.map((r) => r.id).sort()).toEqual(['manual-e2e-4', 'seizure_req_e2e_salary']);
    });

    it('سيناريو 5: حفظ بحالة React فارغة لا يمسح الطلبات المخزّنة', () => {
        const { parentId, childId, financialData } = makeDossierIds();
        clearDecisionsNamespaceForTests(parentId);
        clearDecisionsNamespaceForTests(childId);

        writeExecutorDecisionsArray(
            childId,
            [
                {
                    id: 'seizure_req_e2e_salary',
                    title: 'حجز راتب',
                    requestKind: 'seizure',
                    executorOutcome: 'pending',
                    date: '2026-06-25',
                },
            ],
            financialData
        );

        const merged = mergeExecutorDecisionsUnionForPersist(parentId, [], financialData);
        writeExecutorDecisionsUnionForExecution(parentId, merged, financialData);

        expect(merged.map((r) => r.id)).toContain('seizure_req_e2e_salary');
    });

    it('سيناريو 6: محاكاة إعادة تحميل الصفحة — التخزين الدائم يبقى', () => {
        const { parentId, childId, financialData } = makeDossierIds();
        clearDecisionsNamespaceForTests(parentId);
        clearDecisionsNamespaceForTests(childId);

        writeExecutorDecisionsArray(
            childId,
            [
                {
                    id: 'seizure_req_e2e_salary',
                    title: 'حجز راتب',
                    requestKind: 'seizure',
                    executorOutcome: 'pending',
                    date: '2026-06-25',
                },
            ],
            financialData
        );

        const merged = mergeExecutorDecisionsUnionForPersist(
            parentId,
            [
                {
                    id: 'manual-e2e-6',
                    title: 'قرار',
                    manualExecutorLedgerEntry: true,
                    date: '2026-06-25',
                },
            ],
            financialData
        );
        writeExecutorDecisionsUnionForExecution(parentId, merged, financialData);

        const keys = SecureStoreService.listKeysSync().filter((k) =>
            String(k).includes(parentId)
        );
        expect(keys.some((k) => String(k).includes('_decisions'))).toBe(true);

        const afterReload = readExecutorDecisionsUnionAcrossCandidateIds(parentId, financialData);
        expect(afterReload.length).toBe(2);
    });
});
