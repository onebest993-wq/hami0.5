/**
 * Decisions namespace — row merge helpers + namespace key listing.
 */
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    executionStorageKey,
    normalizeExecutionStorageId,
} from '@/app/utils/executionStorageKeysLite';
import { stripExecutionDeviceStorageUserScope } from '@/app/utils/executionDeviceStorageScope';

export function mergeRowsById(
    existing: Record<string, unknown>[],
    incoming: Record<string, unknown>[],
): Record<string, unknown>[] {
    const byId = new Map<string, Record<string, unknown>>();
    for (const row of existing) {
        const id = String(row.id || '').trim();
        if (id) byId.set(id, row);
    }
    for (const row of incoming) {
        const id = String(row.id || '').trim();
        if (!id) continue;
        byId.set(id, row);
    }
    return Array.from(byId.values());
}

export function listDecisionsNamespaceStorageKeys(executionId: string): string[] {
    const id = normalizeExecutionStorageId(executionId);
    const prefix = `${executionStorageKey(id)}_decisions_ns_`;
    const logicalKeys = new Set<string>();
    try {
        for (const raw of SecureStoreService.listKeysSync()) {
            const logical = stripExecutionDeviceStorageUserScope(String(raw || '').trim());
            if (!logical.startsWith(prefix)) continue;
            if (logical.endsWith('_index')) continue;
            logicalKeys.add(logical);
        }
    } catch {
        return [];
    }
    return [...logicalKeys];
}

export function mergeDecisionRowsById(
    target: Map<string, Record<string, unknown>>,
    rows: Record<string, unknown>[],
): void {
    for (const row of rows) {
        const rid = String(row.id ?? '').trim();
        if (!rid) continue;
        const prev = target.get(rid);
        if (!prev) {
            target.set(rid, row);
            continue;
        }
        const pd = String(prev.resolvedAt ?? prev.date ?? '');
        const nd = String(row.resolvedAt ?? row.date ?? '');
        const cmp = nd.localeCompare(pd, undefined, { numeric: true });
        if (cmp > 0) {
            target.set(rid, row);
        } else if (cmp < 0) {
            /* keep prev */
        } else {
            // نفس التاريخ — اللقطة الواردة تحمل تحديثاً (مثلاً تسجيل طعن يدوي)
            target.set(rid, { ...prev, ...row });
        }
    }
}
