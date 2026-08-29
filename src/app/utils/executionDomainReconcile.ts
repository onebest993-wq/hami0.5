/**
 * تنظيف صفوف القرارات المخالفة لمسار الإضبارة عند فتح الملف.
 * لا حذف — أرشفة + requestCycleSuperseded للحفاظ على السجل.
 */

import SecureStoreService from '@/app/services/SecureStoreService';
import { normalizeExecutionStorageId } from '@/app/utils/executionStorageKeys';
import {
    buildDomainReconcileSignature,
    isDecisionVisibleInDomainContext,
    resolveExecutionDomainContext,
} from '@/app/utils/executionDomainIsolation';
import { writeExecutorDecisionsUnionForExecution } from '@/app/utils/executionDecisionsNamespace';
import {
    dispatchDecisionsReload,
    isExecutorHubRowSuperseded,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';

export interface DomainReconcileResult {
    suppressed: number;
    skipped: boolean;
}

function isRowProtectedFromDomainReconcile(row: Record<string, unknown>): boolean {
    if (row.manualExecutorLedgerEntry === true) return true;
    if (String(row.appealRequestOrigin || '').trim() === 'executor_side') return true;
    if (String(row.requestKind || '').trim()) return true;
    if (String((row as { domainNamespace?: string }).domainNamespace || '').trim()) return true;
    if (isExecutorHubRowSuperseded(row)) return true;
    if ((row as { domainIsolationSuppressed?: boolean }).domainIsolationSuppressed === true) {
        return true;
    }
    return false;
}

/**
 * يُعلّم الصفوف غير المتوافقة مع سياق الإضبارة ويُعيد تحميل مركز القرارات.
 * يُشغَّل مرة واحدة لكل بصمة سياق (نوع مطالبة / منظور / مدين).
 */
export function reconcileDomainViolatingDecisions(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null
): DomainReconcileResult {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default' || id === 'undefined') {
        return { suppressed: 0, skipped: true };
    }

    const ctx = resolveExecutionDomainContext(executionData, id);
    const signature = buildDomainReconcileSignature(ctx);
    const markerKey = `domain-isolation-reconcile:${id}`;

    try {
        const prev = String(SecureStoreService.getItemSync(markerKey) || '').trim();
        if (prev === signature) {
            return { suppressed: 0, skipped: true };
        }
    } catch {
        /* continue */
    }

    const rows = readExecutorDecisionsArray(id);
    if (rows.length === 0) {
        try {
            SecureStoreService.setItemSync(markerKey, signature);
        } catch {
            /* ignore */
        }
        return { suppressed: 0, skipped: false };
    }

    const violatingHubIds = new Set<string>();
    for (const row of rows) {
        if (row.appealSourceDecisionId) continue;
        if (isRowProtectedFromDomainReconcile(row)) continue;
        if (!isDecisionVisibleInDomainContext(ctx, row)) {
            const rid = String(row.id || '').trim();
            if (rid) violatingHubIds.add(rid);
        }
    }

    if (violatingHubIds.size === 0) {
        try {
            SecureStoreService.setItemSync(markerKey, signature);
        } catch {
            /* ignore */
        }
        return { suppressed: 0, skipped: false };
    }

    const now = new Date().toISOString();
    let suppressed = 0;
    const next = rows.map((row) => {
        if (isRowProtectedFromDomainReconcile(row)) return row;

        const sourceId = String(row.appealSourceDecisionId || '').trim();
        const hubViolates = !sourceId && violatingHubIds.has(String(row.id || '').trim());
        const appealOfViolatingHub = Boolean(sourceId && violatingHubIds.has(sourceId));

        if (!hubViolates && !appealOfViolatingHub) return row;

        suppressed += 1;
        return {
            ...row,
            domainIsolationSuppressed: true,
            domainIsolationSuppressedAt: now,
            domainIsolationReason: 'مسار إضبارة غير متوافق — أُرشف تلقائياً',
            requestCycleSuperseded: true,
            requestCycleSupersededAt: now,
            isArchived: true,
        };
    });

    if (suppressed === 0) {
        try {
            SecureStoreService.setItemSync(markerKey, signature);
        } catch {
            /* ignore */
        }
        return { suppressed: 0, skipped: false };
    }

    try {
        writeExecutorDecisionsUnionForExecution(id, next, executionData);
        SecureStoreService.setItemSync(markerKey, signature);
        dispatchDecisionsReload();
    } catch {
        return { suppressed: 0, skipped: false };
    }

    return { suppressed, skipped: false };
}

/** إبطال علامة التنظيف — للاختبارات أو إعادة المزامنة بعد تغيير قواعد العزل */
export function clearDomainReconcileMarker(executionId: string | undefined): void {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return;
    try {
        SecureStoreService.deleteItemSync(`domain-isolation-reconcile:${id}`);
    } catch {
        /* ignore */
    }
}
