import {
    loadExecutionFilesRaw,
    saveExecutionFilesRaw,
} from '@/app/utils/executionFilesStorage';
import { isExecutionDossierTombstoned } from '@/app/utils/executionDossierTombstones';
import { normalizeExecutionStorageId } from '@/app/utils/executionStorageKeysLite';

/**
 * ينشر متبقي الوعاء على صف الفهرس فقط — بلا قراءة/فك لـ blob الإضبارة.
 * المصدر: الدفتر الحي بعد persist. القائمة تقرأ الحقل دون decrypt.
 */
export function syncExecutionIndexRemainingHint(executionId: string, remaining: number): boolean {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return false;
    if (isExecutionDossierTombstoned(id)) return false;

    const files = loadExecutionFilesRaw();
    const rows = Array.isArray(files) ? [...files] : [];
    const idx = rows.findIndex(
        (row) =>
            row &&
            typeof row === 'object' &&
            String((row as { id?: unknown }).id ?? '').trim() === id,
    );
    if (idx < 0) return false;

    const remainingClamped = Math.max(0, Math.round(Number(remaining) || 0));
    const existing = rows[idx] as Record<string, unknown>;
    rows[idx] = {
        ...existing,
        id,
        total_remaining_balance: remainingClamped,
        remainingDebt: remainingClamped,
        updatedAt: new Date().toISOString(),
    };
    saveExecutionFilesRaw(rows);
    return true;
}
