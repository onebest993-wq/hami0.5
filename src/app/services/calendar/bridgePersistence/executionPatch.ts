import { loadExecutionFilesRaw, saveExecutionFilesRaw } from '@/app/utils/executionFilesStorage';

function fileIdMatch(a: unknown, entityId: string): boolean {
    if (!a || typeof a !== 'object') return false;
    return String((a as { id?: unknown }).id) === String(entityId);
}

/** رقعة تنفيذ متزامنة — معزولة حتى لا تُسحب storage إلى shared bridge على stem */
export function patchExecutionStorage(
    executionId: string,
    mutator: (file: Record<string, unknown>) => Record<string, unknown>,
): boolean {
    const files = loadExecutionFilesRaw();
    const idx = files.findIndex((f) => fileIdMatch(f, executionId));
    if (idx < 0) return false;
    const row = files[idx];
    if (!row || typeof row !== 'object') return false;
    const next = [...files];
    next[idx] = mutator({ ...(row as Record<string, unknown>) });
    saveExecutionFilesRaw(next);
    return true;
}
