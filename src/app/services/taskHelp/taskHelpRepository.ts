import type {
    CollaborationStatus,
    SharedTaskNote,
    ShareScope,
    TaskHelpRequest,
} from '@/app/types/taskHelpTypes';
import { loadTaskHelpRecords, saveTaskHelpRecords } from './taskHelpLocalStore';

const MAX_SHARED_NOTES = 50;

type KvAdmin = {
    kvSet: (key: string, value: unknown) => Promise<void>;
    kvGet: (key: string) => Promise<unknown>;
    kvDel: (key: string) => Promise<void>;
    kvGetByPrefix: (prefix: string) => Promise<unknown[]>;
};

/** لا يسحب Vite kvStoreAdmin إلى حزمة العميل (@vite-ignore + حارس window). */
async function loadKvAdmin(): Promise<KvAdmin | null> {
    if (typeof window !== 'undefined') return null;
    const spec = '@/app/api/security/kvStoreAdmin.ts';
    return import(/* @vite-ignore */ spec) as Promise<KvAdmin>;
}

function createId(): string {
    const c = globalThis.crypto as Crypto | undefined;
    if (c?.randomUUID) return c.randomUUID();
    return `thr_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function serverKvSet(key: string, value: unknown): Promise<void> {
    try {
        const kv = await loadKvAdmin();
        if (!kv) return;
        await kv.kvSet(key, value);
    } catch {
        /* silent */
    }
}

async function serverKvDel(key: string): Promise<void> {
    try {
        const kv = await loadKvAdmin();
        if (!kv) return;
        await kv.kvDel(key);
    } catch {
        /* silent */
    }
}

async function serverKvGet(key: string): Promise<unknown> {
    try {
        const kv = await loadKvAdmin();
        if (!kv) return null;
        return kv.kvGet(key);
    } catch {
        return null;
    }
}

async function serverKvGetByPrefix(prefix: string): Promise<unknown[]> {
    try {
        const kv = await loadKvAdmin();
        if (!kv) return [];
        const res = await kv.kvGetByPrefix(prefix);
        return Array.isArray(res) ? res : [];
    } catch {
        return [];
    }
}

async function persistRecord(record: TaskHelpRequest): Promise<void> {
    const rows = await loadTaskHelpRecords();
    const next = [record, ...rows.filter((r) => r.id !== record.id)];
    await saveTaskHelpRecords(next);
    await serverKvSet(`task_help:${record.id}`, record);
    await serverKvSet(`task_help:requester:${record.requesterId}:${record.id}`, record.id);
    if (record.targetColleagueId) {
        await serverKvSet(`task_help:recipient:${record.targetColleagueId}:${record.id}`, record.id);
    }
    if (record.assigneeId) {
        await serverKvSet(`task_help:assignee:${record.assigneeId}:${record.id}`, record.id);
    }
    const openKey = `task_help:open:${record.id}`;
    if (record.shareScope === 'PUBLIC_FORUM' && record.collaborationStatus === 'PENDING') {
        await serverKvSet(openKey, record.id);
    } else {
        // يمنع تضخّم فهرس الطلبات العامة المفتوحة بعد القبول/الإكمال
        await serverKvDel(openKey);
    }
}

async function loadRecordById(id: string): Promise<TaskHelpRequest | null> {
    const rows = await loadTaskHelpRecords();
    const localHit = rows.find((r) => r.id === id);
    if (localHit) return localHit;
    const raw = await serverKvGet(`task_help:${id}`);
    if (raw && typeof raw === 'object') return raw as TaskHelpRequest;
    return null;
}

async function collectIdsForUser(userId: string): Promise<Set<string>> {
    const ids = new Set<string>();
    const prefixes = [
        `task_help:requester:${userId}:`,
        `task_help:recipient:${userId}:`,
        `task_help:assignee:${userId}:`,
    ];
    for (const prefix of prefixes) {
        for (const row of await serverKvGetByPrefix(prefix)) {
            if (typeof row === 'string') ids.add(row);
        }
    }
    const openIds = await serverKvGetByPrefix('task_help:open:');
    for (const row of openIds) {
        if (typeof row === 'string') ids.add(row);
    }
    return ids;
}

function canView(record: TaskHelpRequest, userId: string): boolean {
    if (record.requesterId === userId) return true;
    if (record.assigneeId === userId) return true;
    if (record.targetColleagueId === userId) return true;
    if (record.shareScope === 'PUBLIC_FORUM' && record.collaborationStatus === 'PENDING') return true;
    return false;
}

export type CreateTaskHelpParams = {
    sourceTaskId: string;
    requesterId: string;
    requesterName?: string;
    shareScope: ShareScope;
    title: string;
    location?: string | null;
    dueDate?: string | null;
    instructions?: string;
    isSanitised: boolean;
    targetColleagueId?: string;
    targetColleagueName?: string;
    forumPostId?: string | null;
};

export const TaskHelpRepository = {
    async create(params: CreateTaskHelpParams): Promise<TaskHelpRequest> {
        const now = new Date().toISOString();
        const record: TaskHelpRequest = {
            id: createId(),
            sourceTaskId: params.sourceTaskId,
            requesterId: params.requesterId,
            requesterName: params.requesterName,
            shareScope: params.shareScope,
            collaborationStatus: 'PENDING',
            isSanitised: params.isSanitised,
            title: params.title,
            location: params.location ?? null,
            dueDate: params.dueDate ?? null,
            instructions: params.instructions,
            targetColleagueId: params.targetColleagueId,
            targetColleagueName: params.targetColleagueName,
            forumPostId: params.forumPostId ?? null,
            sharedNotes: [],
            createdAt: now,
            updatedAt: now,
        };
        await persistRecord(record);
        return record;
    },

    async getById(id: string, requesterId: string): Promise<TaskHelpRequest | null> {
        const existing = await loadRecordById(id);
        if (!existing || !canView(existing, requesterId)) return null;
        return existing;
    },

    async listForUser(userId: string): Promise<TaskHelpRequest[]> {
        const local = await loadTaskHelpRecords();
        const ids = await collectIdsForUser(userId);
        const map = new Map<string, TaskHelpRequest>();
        for (const r of local) {
            if (canView(r, userId)) map.set(r.id, r);
        }
        for (const id of ids) {
            if (map.has(id)) continue;
            const raw = await serverKvGet(`task_help:${id}`);
            if (raw && typeof raw === 'object') {
                const rec = raw as TaskHelpRequest;
                if (canView(rec, userId)) map.set(rec.id, rec);
            }
        }
        return [...map.values()].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    },

    /**
     * قفل قبول ذري: فقط إن كانت الحالة PENDING.
     * ملاحظة: بدون CAS على KV يبقى سباق نادر تحت حمل عالٍ.
     */
    async accept(id: string, colleagueId: string, colleagueName?: string): Promise<
        | { ok: true; request: TaskHelpRequest }
        | { ok: false; code: 'NOT_FOUND' | 'ALREADY_ACCEPTED' | 'FORBIDDEN' }
    > {
        const existing = await loadRecordById(id);
        if (!existing) return { ok: false, code: 'NOT_FOUND' };
        if (existing.requesterId === colleagueId) return { ok: false, code: 'FORBIDDEN' };
        if (existing.shareScope === 'PRIVATE_DIRECT' && existing.targetColleagueId !== colleagueId) {
            return { ok: false, code: 'FORBIDDEN' };
        }
        if (existing.collaborationStatus !== 'PENDING') {
            return { ok: false, code: 'ALREADY_ACCEPTED' };
        }
        const now = new Date().toISOString();
        const updated: TaskHelpRequest = {
            ...existing,
            assigneeId: colleagueId,
            assigneeName: colleagueName,
            collaborationStatus: 'ACCEPTED',
            updatedAt: now,
        };
        await persistRecord(updated);
        return { ok: true, request: updated };
    },

    async addNote(
        id: string,
        authorId: string,
        text: string,
        authorName?: string,
    ): Promise<TaskHelpRequest | null> {
        const existing = await loadRecordById(id);
        if (!existing) return null;
        const isParty = existing.requesterId === authorId || existing.assigneeId === authorId;
        if (!isParty) return null;
        if (
            existing.collaborationStatus !== 'ACCEPTED' &&
            existing.collaborationStatus !== 'AWAITING_OWNER_REVIEW'
        ) {
            return null;
        }
        const note: SharedTaskNote = {
            id: createId(),
            authorId,
            authorName,
            text: text.trim().slice(0, 2000),
            timestamp: new Date().toISOString(),
        };
        if (!note.text) return null;
        const nextNotes = [...existing.sharedNotes, note].slice(-MAX_SHARED_NOTES);
        const updated: TaskHelpRequest = {
            ...existing,
            sharedNotes: nextNotes,
            updatedAt: note.timestamp,
        };
        await persistRecord(updated);
        return updated;
    },

    async complete(
        id: string,
        actorId: string,
        mode: 'helper_done' | 'owner_confirm',
    ): Promise<
        | { ok: true; request: TaskHelpRequest }
        | { ok: false; code: 'NOT_FOUND' | 'FORBIDDEN' | 'INVALID_STATE' }
    > {
        const existing = await loadRecordById(id);
        if (!existing) return { ok: false, code: 'NOT_FOUND' };
        const now = new Date().toISOString();

        if (mode === 'helper_done') {
            if (existing.assigneeId !== actorId) return { ok: false, code: 'FORBIDDEN' };
            if (existing.collaborationStatus !== 'ACCEPTED') {
                return { ok: false, code: 'INVALID_STATE' };
            }
            const updated: TaskHelpRequest = {
                ...existing,
                collaborationStatus: 'AWAITING_OWNER_REVIEW',
                updatedAt: now,
            };
            await persistRecord(updated);
            return { ok: true, request: updated };
        }

        if (existing.requesterId !== actorId) return { ok: false, code: 'FORBIDDEN' };
        if (existing.collaborationStatus !== 'AWAITING_OWNER_REVIEW') {
            return { ok: false, code: 'INVALID_STATE' };
        }
        const updated: TaskHelpRequest = {
            ...existing,
            collaborationStatus: 'COMPLETED' satisfies CollaborationStatus,
            updatedAt: now,
        };
        await persistRecord(updated);
        return { ok: true, request: updated };
    },

    async attachForumPost(id: string, requesterId: string, forumPostId: string): Promise<TaskHelpRequest | null> {
        const existing = await loadRecordById(id);
        if (!existing || existing.requesterId !== requesterId) return null;
        const updated: TaskHelpRequest = {
            ...existing,
            forumPostId,
            updatedAt: new Date().toISOString(),
        };
        await persistRecord(updated);
        return updated;
    },
};
