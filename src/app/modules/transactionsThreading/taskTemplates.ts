import { createThreadingId } from './ids';
import { persistTransactionsSecure } from '@/app/services/transactions/persistTransactionsSecure';
import {
    readSecureOrDrainLegacySync,
    writeSecureAndClearLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';
import {
    sanitizeTransactionId,
    sanitizeTransactionIsoTimestamp,
    sanitizeTransactionTaskTitle,
    sanitizeTransactionTemplateName,
    sanitizeTransactionUserId,
} from '@/app/services/transactions/transactionsInputSecurity';

function newTemplateId(): string {
    return createThreadingId('tpl');
}

type TaskTemplateTask = {
    id: string;
    title: string;
    parentTaskId: string | null;
    deadline: string | null;
};

export type TaskTemplate = {
    id: string;
    name: string;
    createdAt: string;
    tasks: TaskTemplateTask[];
};

const STORAGE_KEY_PREFIX = 'hami:transactions:taskTemplates:v1:';
const MAX_TEMPLATES = 40;
const MAX_TEMPLATE_TASKS = 80;

let memoryFallback: TaskTemplate[] = [];

function isScopedUserId(userId: string): boolean {
    return sanitizeTransactionUserId(userId).length > 0;
}

function sanitizeTemplateTask(raw: unknown): TaskTemplateTask | null {
    if (!raw || typeof raw !== 'object') return null;
    const row = raw as Record<string, unknown>;
    const title = sanitizeTransactionTaskTitle(String(row.title ?? ''));
    if (!title) return null;
    const id = sanitizeTransactionId(row.id) || newTemplateId();
    const parentTaskId = row.parentTaskId == null ? null : sanitizeTransactionId(row.parentTaskId) || null;
    const deadline = row.deadline == null ? null : sanitizeTransactionIsoTimestamp(row.deadline, '') || null;
    return { id, title, parentTaskId, deadline };
}

function sanitizeStoredTemplate(raw: unknown): TaskTemplate | null {
    if (!raw || typeof raw !== 'object') return null;
    const row = raw as Record<string, unknown>;
    const id = sanitizeTransactionId(row.id);
    if (!id) return null;
    const name = sanitizeTransactionTemplateName(String(row.name ?? ''), 'قالب');
    const createdAt = sanitizeTransactionIsoTimestamp(row.createdAt, new Date().toISOString());
    const tasks = Array.isArray(row.tasks)
        ? row.tasks.map(sanitizeTemplateTask).filter((t): t is TaskTemplateTask => t != null).slice(0, MAX_TEMPLATE_TASKS)
        : [];
    return { id, name, createdAt, tasks };
}

function safeParseTemplates(raw: string | null): TaskTemplate[] {
    if (!raw) return [];
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map(sanitizeStoredTemplate)
            .filter((t): t is TaskTemplate => t != null)
            .slice(0, MAX_TEMPLATES);
    } catch {
        return [];
    }
}

function getStorageKey(userId: string) {
    return `${STORAGE_KEY_PREFIX}${sanitizeTransactionUserId(userId)}`;
}

function readTemplates(userId: string): TaskTemplate[] {
    if (!isScopedUserId(userId)) return [];
    const key = getStorageKey(userId);
    try {
        const raw = readSecureOrDrainLegacySync(key);
        if (raw != null) return safeParseTemplates(raw);
    } catch {
        /* fall through */
    }
    return typeof window === 'undefined' ? memoryFallback : [];
}

function writeTemplates(userId: string, templates: TaskTemplate[]) {
    if (!isScopedUserId(userId)) return;
    const next = templates.slice(0, MAX_TEMPLATES);
    const payload = JSON.stringify(next);
    const key = getStorageKey(userId);
    writeSecureAndClearLegacySync(key, payload);
    persistTransactionsSecure(key, payload);
    if (typeof window === 'undefined') memoryFallback = next;
}

export function listTaskTemplates(userId: string): TaskTemplate[] {
    return readTemplates(userId)
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveTaskTemplate(
    userId: string,
    input: { name: string; tasks: Omit<TaskTemplateTask, 'id'>[] } | { name: string; tasks: TaskTemplateTask[] },
): TaskTemplate | null {
    if (!isScopedUserId(userId)) return null;
    const now = new Date().toISOString();
    const tasks = (Array.isArray(input.tasks) ? input.tasks : [])
        .map(sanitizeTemplateTask)
        .filter((t): t is TaskTemplateTask => t != null)
        .slice(0, MAX_TEMPLATE_TASKS);

    const next: TaskTemplate = {
        id: newTemplateId(),
        name: sanitizeTransactionTemplateName(input.name, 'قالب بدون اسم'),
        createdAt: now,
        tasks,
    };

    const templates = readTemplates(userId);
    writeTemplates(userId, [next, ...templates]);
    return next;
}

export function deleteTaskTemplate(userId: string, templateId: string) {
    if (!isScopedUserId(userId)) return;
    const id = sanitizeTransactionId(templateId);
    if (!id) return;
    const templates = readTemplates(userId).filter((t) => t.id !== id);
    writeTemplates(userId, templates);
}
