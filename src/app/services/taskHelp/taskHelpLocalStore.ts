import type { TaskHelpRequest } from '@/app/types/taskHelpTypes';
import { persistSecureJsonValue, readSecureJsonRaw } from '@/app/services/storage/syncSecureJson';

const STORAGE_KEY = 'hami_task_help_requests_v1';

export async function loadTaskHelpRecords(): Promise<TaskHelpRequest[]> {
    try {
        const raw = await readSecureJsonRaw(STORAGE_KEY);
        if (!raw?.trim()) return [];
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (r) => r && typeof r === 'object' && typeof (r as TaskHelpRequest).id === 'string',
        ) as TaskHelpRequest[];
    } catch {
        return [];
    }
}

export async function saveTaskHelpRecords(rows: TaskHelpRequest[]): Promise<void> {
    await persistSecureJsonValue(STORAGE_KEY, rows);
}
