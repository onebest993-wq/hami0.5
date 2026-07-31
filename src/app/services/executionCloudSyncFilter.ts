/**
 * فلترة صفوف السحابة قبل الدمج — يمنع قيامة إضبارة محذوفة محلياً.
 */
import { isExecutionDossierTombstoned } from '@/app/utils/executionDossierTombstones';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function idOf(item: unknown): string | null {
    if (!isRecord(item)) return null;
    const id = item.id;
    if (typeof id === 'string' && id.trim()) return id.trim();
    if (typeof id === 'number' && Number.isFinite(id)) return String(id);
    return null;
}

export function filterTombstonedExecutionSyncRows(rows: unknown): unknown[] {
    if (!Array.isArray(rows)) return [];
    return rows.filter((row) => {
        const id = idOf(row);
        if (!id) return false;
        return !isExecutionDossierTombstoned(id);
    });
}
