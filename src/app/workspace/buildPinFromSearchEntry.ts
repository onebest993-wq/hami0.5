import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import type { WorkspacePinnedItem } from './types';
import {
    buildCriminalWorkspacePin,
    buildExecutionWorkspacePin,
    buildLawsuitWorkspacePin,
    buildNoteWorkspacePin,
    buildTaskWorkspacePin,
    buildThreadingWorkspacePin,
    buildTransactionWorkspacePin,
    buildUrgentWorkspacePin,
} from './workspacePinBuilders';

export type WorkspacePinLookupContext = {
    files: unknown[];
    executionFiles: unknown[];
    /** دعاوى للربط برقم القضية عند تثبيت إضبارة تنفيذ */
    lawsuitFiles?: unknown[];
    notes: unknown[];
    tasks: unknown[];
    urgentCases: unknown[];
    criminalCases?: unknown[];
    threadingTransactions?: unknown[];
};

function findById(list: unknown[], id: string): unknown | null {
    for (const raw of list) {
        if (!raw || typeof raw !== 'object') continue;
        if (String((raw as Record<string, unknown>).id) === id) return raw;
    }
    return null;
}

const PINNABLE_CATEGORIES = new Set([
    'lawsuit',
    'transaction',
    'execution',
    'note',
    'voice',
    'urgent',
    'task',
    'party',
    'criminal',
    'threading',
]);

export function canPinSearchEntry(entry: GlobalSearchEntry): boolean {
    return PINNABLE_CATEGORIES.has(entry.category);
}

/** بناء عنصر تثبيت من نتيجة بحث — دون تعديل فهرس البحث */
export function buildPinFromSearchEntry(
    entry: GlobalSearchEntry,
    ctx: WorkspacePinLookupContext,
): WorkspacePinnedItem | null {
    if (!canPinSearchEntry(entry)) return null;

    const nav = entry.navigate;

    if (nav.type === 'file') {
        const id = String(nav.fileId);
        const fromFiles = findById(ctx.files, id);
        if (fromFiles) {
            const f = fromFiles as Record<string, unknown>;
            if (f.type === 'transaction') return buildTransactionWorkspacePin(fromFiles);
            if (f.type === 'execution') {
                return buildExecutionWorkspacePin(fromFiles, ctx.lawsuitFiles ?? ctx.files);
            }
            return buildLawsuitWorkspacePin(fromFiles);
        }
        const fromExec = findById(ctx.executionFiles, id);
        if (fromExec) return buildExecutionWorkspacePin(fromExec, ctx.lawsuitFiles ?? ctx.files);
        return null;
    }

    if (nav.type === 'note' || nav.type === 'voice') {
        const noteId = nav.noteId != null ? String(nav.noteId) : entry.id.replace(/^(note|voice)-/, '');
        const note = findById(ctx.notes, noteId);
        return note ? buildNoteWorkspacePin(note) : null;
    }

    if (nav.type === 'urgent') {
        const id = nav.urgentId != null ? String(nav.urgentId) : '';
        if (!id) return null;
        const raw = findById(ctx.urgentCases, id);
        return raw ? buildUrgentWorkspacePin(raw) : null;
    }

    if (nav.type === 'tasks_manager') {
        const id = nav.taskId != null ? String(nav.taskId) : '';
        if (!id) return null;
        const raw = findById(ctx.tasks, id);
        return raw ? buildTaskWorkspacePin(raw, ctx.files, ctx.executionFiles) : null;
    }

    if (nav.type === 'transactions' && nav.transactionId) {
        const id = String(nav.transactionId);
        const threading = findById(ctx.threadingTransactions ?? [], id);
        if (threading) return buildThreadingWorkspacePin(threading);
        const fileRaw = findById(ctx.files, id);
        return fileRaw ? buildTransactionWorkspacePin(fileRaw) : null;
    }

    if (nav.type === 'criminal') {
        const raw = findById(ctx.criminalCases ?? [], nav.criminalId);
        return raw ? buildCriminalWorkspacePin(raw) : null;
    }

    return null;
}
