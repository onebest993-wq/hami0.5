import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clearDecisionsNamespaceForTests,
    writeExecutorDecisionsArray,
} from '@/app/utils/executionDecisionsNamespace';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import {
    appendEvictionExecutorRequest,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';

const EXEC_ID = 'exec-eviction-append-test';

const EVICTION_EXEC_DATA = {
    id: EXEC_ID,
    claimType: 'إخلاء',
    creditors: [{ name: 'مالك', isClient: true }],
    debtors: [{ name: 'مستأجر' }],
};

function seedEvictionExecutionFile() {
    SecureStoreService.setItemSync(executionStorageKey(EXEC_ID), JSON.stringify(EVICTION_EXEC_DATA));
}

describe('appendEvictionExecutorRequest', () => {
    beforeEach(() => {
        clearDecisionsNamespaceForTests(EXEC_ID);
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
        seedEvictionExecutionFile();
    });

    it('allows new field visit after executor rejection when UI shows no active request', () => {
        writeExecutorDecisionsArray(
            EXEC_ID,
            [
                {
                    id: 'eviction_rejected',
                    title: 'طلب تحديد موعد الخروج الميداني',
                    body: 'طلب سابق',
                    date: '2026-06-04',
                    appealStatus: 'pending',
                    executorOutcome: 'rejected',
                    requestKind: 'eviction_procedure',
                    evictionWorkflowKey: 'field_visit_or_grace',
                    appealRequestOrigin: 'creditor_side',
                },
            ],
            EVICTION_EXEC_DATA
        );

        const ok = appendEvictionExecutorRequest({
            executionId: EXEC_ID,
            title: 'طلب تحديد موعد الخروج الميداني',
            body: 'طلب جديد',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
        });

        expect(ok).toBe(true);
        const rows = readExecutorDecisionsArray(EXEC_ID);
        expect(rows.filter((r) => String(r.requestKind) === 'eviction_procedure').length).toBe(2);
    });

    it('allows new field visit after lifecycle_reset appeal closure on stale hub', () => {
        writeExecutorDecisionsArray(
            EXEC_ID,
            [
                {
                    id: 'eviction_reset',
                    title: 'طلب تحديد موعد الخروج الميداني',
                    body: 'طلب سابق',
                    date: '2026-06-04',
                    appealStatus: 'final',
                    appealResult: 'نقض القرار',
                    appealActor: 'debtor',
                    appealMethod: 'tamyeez',
                    appealWorkflowState: 'REVOKED_BY_APPEAL',
                    executorOutcome: 'rejected',
                    requestKind: 'eviction_procedure',
                    evictionWorkflowKey: 'field_visit_or_grace',
                    appealRequestOrigin: 'creditor_side',
                },
            ],
            EVICTION_EXEC_DATA
        );

        const ok = appendEvictionExecutorRequest({
            executionId: EXEC_ID,
            title: 'طلب تحديد موعد الخروج الميداني',
            body: 'طلب جديد بعد إعادة الدورة',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
        });

        expect(ok).toBe(true);
        const pending = readExecutorDecisionsArray(EXEC_ID).find(
            (r) => String(r.executorOutcome ?? 'pending') === 'pending'
        );
        expect(pending?.title).toContain('طلب تحديد موعد الخروج الميداني');
    });

    it('allows new field visit after prior workflow is complete', () => {
        writeExecutorDecisionsArray(
            EXEC_ID,
            [
                {
                    id: 'eviction_done',
                    title: 'طلب تحديد موعد الخروج الميداني',
                    body: 'طلب سابق',
                    date: '2026-06-03',
                    appealStatus: 'pending',
                    executorOutcome: 'approved',
                    executorScheduleLabel: 'مجدول: الخميس',
                    requestKind: 'eviction_procedure',
                    evictionWorkflowKey: 'field_visit_or_grace',
                    appealRequestOrigin: 'creditor_side',
                },
            ],
            EVICTION_EXEC_DATA
        );

        const ok = appendEvictionExecutorRequest({
            executionId: EXEC_ID,
            title: 'طلب تحديد موعد الخروج الميداني',
            body: 'دورة جديدة',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
            supersedeCompletedHub: true,
        });

        expect(ok).toBe(true);
        const rows = readExecutorDecisionsArray(EXEC_ID);
        const pending = rows.find((r) => String(r.executorOutcome ?? 'pending') === 'pending');
        expect(pending?.title).toContain('طلب تحديد موعد الخروج الميداني');
        const archived = rows.find((r) => String(r.id) === 'eviction_done') as {
            requestCycleSuperseded?: boolean;
        };
        expect(archived?.requestCycleSuperseded).toBe(true);
    });

    it('blocks duplicate while grievance pause is still open on approved hub', () => {
        writeExecutorDecisionsArray(
            EXEC_ID,
            [
                {
                    id: 'eviction_paused',
                    title: 'طلب تحديد موعد الخروج الميداني',
                    body: 'طلب قائم',
                    date: '2026-06-04',
                    appealStatus: 'pending',
                    appealResult: 'قبول التظلم',
                    awaitingCassationEntryBy: 'lawyer',
                    executorOutcome: 'approved',
                    requestKind: 'eviction_procedure',
                    evictionWorkflowKey: 'field_visit_or_grace',
                    appealRequestOrigin: 'creditor_side',
                },
            ],
            EVICTION_EXEC_DATA
        );

        const ok = appendEvictionExecutorRequest({
            executionId: EXEC_ID,
            title: 'طلب تحديد موعد الخروج الميداني',
            body: 'محاولة مكررة',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'field_visit_or_grace',
        });

        expect(ok).toBe(false);
        expect(readExecutorDecisionsArray(EXEC_ID).length).toBe(1);
    });

    it('allows marital furniture delivery on أثاث زوجية dossier', () => {
        const MF_EXEC_ID = 'exec-marital-furniture-append';
        const maritalData = {
            id: MF_EXEC_ID,
            claimType: 'أثاث زوجية',
            creditors: [{ name: 'زوجة', isClient: true }],
            debtors: [{ name: 'زوج' }],
        };
        SecureStoreService.setItemSync(
            executionStorageKey(MF_EXEC_ID),
            JSON.stringify(maritalData),
        );
        clearDecisionsNamespaceForTests(MF_EXEC_ID);

        const ok = appendEvictionExecutorRequest({
            executionId: MF_EXEC_ID,
            title: '🛋️ طلب تسليم أثاث',
            body: 'طلب موحّد لمنفذ العدل',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'marital_furniture_delivery',
        });

        expect(ok).toBe(true);
        const rows = readExecutorDecisionsArray(MF_EXEC_ID);
        expect(rows.some((r) => String(r.requestKind) === 'eviction_procedure')).toBe(true);
    });

    it('does not block new request when only archived duplicate exists', () => {
        writeExecutorDecisionsArray(
            EXEC_ID,
            [
                {
                    id: 'eviction_archived',
                    title: '🛋️ طلب تسليم أثاث',
                    body: 'طلب سابق',
                    date: '2026-06-04',
                    appealStatus: 'pending',
                    executorOutcome: 'pending',
                    requestKind: 'eviction_procedure',
                    evictionWorkflowKey: 'marital_furniture_delivery',
                    appealRequestOrigin: 'creditor_side',
                    domainIsolationSuppressed: true,
                    requestCycleSuperseded: true,
                    isArchived: true,
                },
            ],
            EVICTION_EXEC_DATA
        );

        const ok = appendEvictionExecutorRequest({
            executionId: EXEC_ID,
            title: '🛋️ طلب تسليم أثاث',
            body: 'طلب جديد',
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: 'marital_furniture_delivery',
        });

        expect(ok).toBe(true);
    });
});
