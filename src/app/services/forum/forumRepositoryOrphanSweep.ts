import type { SupabaseClient } from '@supabase/supabase-js';
import { isCloudForumStoragePath } from '@/app/services/forum/forumPostCreateGuard';
import { parseForumRepositoryRef } from '@/app/services/forum/forumRepositoryDocsMap';
import { loadForumSupabaseAdmin } from '@/app/services/forum/loadForumSupabaseAdmin';
import { isStoragePathOwnedByUser, resolveUploadBucket } from '@/app/api/upload/uploadStorageUtils';

export const FORUM_REPOSITORY_ORPHAN_TABLE = 'forum_repository_orphan_paths';
export const FORUM_REPOSITORY_ORPHAN_GRACE_MS = 120_000;
const QUEUE_LIMIT = 40;
const PREFIX_LIST_LIMIT = 100;
const PREFIX_REMOVE_CAP = 20;
const SWEEP_DEBOUNCE_MS = 30_000;

const lastSweepAt = new Map<string, number>();

export function isForumRepositorySweepablePath(authorId: string, storagePath: string): boolean {
    const path = storagePath.trim();
    if (!path || parseForumRepositoryRef(path)) return false;
    if (!isCloudForumStoragePath(path)) return false;
    return isStoragePathOwnedByUser(path, authorId);
}

export function isMissingOrphanTableError(message: string): boolean {
    return /forum_repository_orphan_paths/i.test(message);
}

/** ملفات في بادئة المالك غير الموجودة في الفهرس، مع مهلة للرفع الجاري. */
export function repositoryPrefixOrphanPaths(params: {
    userId: string;
    catalogPaths: Iterable<string>;
    objects: Array<{ name?: string; id?: string | null; created_at?: string | null }>;
    nowMs: number;
    graceMs?: number;
}): string[] {
    const catalog = new Set(params.catalogPaths);
    const prefix = `${params.userId}/repository`;
    const grace = params.graceMs ?? FORUM_REPOSITORY_ORPHAN_GRACE_MS;
    const out: string[] = [];
    for (const obj of params.objects) {
        if (!obj.id || !obj.name || obj.name.includes('/') || obj.name === '.' || obj.name === '..') {
            continue;
        }
        const path = `${prefix}/${obj.name}`;
        if (catalog.has(path)) continue;
        const created = obj.created_at ? Date.parse(obj.created_at) : Number.NaN;
        if (!Number.isFinite(created) || params.nowMs - created < grace) continue;
        out.push(path);
    }
    return out;
}

export async function enqueueForumRepositoryOrphanPath(
    admin: SupabaseClient,
    authorId: string,
    storagePath: string,
): Promise<void> {
    if (!isForumRepositorySweepablePath(authorId, storagePath)) return;
    try {
        const { error } = await admin.from(FORUM_REPOSITORY_ORPHAN_TABLE).insert({
            author_id: authorId,
            storage_path: storagePath,
        });
        if (error && error.code !== '23505' && !isMissingOrphanTableError(error.message)) {
            /* الطابور أفضل جهد — الفهرس سقط مسبقاً */
        }
    } catch {
        /* الجدول غير مُطبَّق أو التخزين غير متاح */
    }
}

export async function removeForumRepositoryStorageOrEnqueue(
    admin: SupabaseClient,
    authorId: string,
    storagePath: string,
): Promise<void> {
    if (!isForumRepositorySweepablePath(authorId, storagePath)) return;
    try {
        const { error } = await admin.storage.from(resolveUploadBucket()).remove([storagePath]);
        if (!error) {
            await dropOrphanQueueRow(admin, storagePath);
            return;
        }
    } catch {
        /* يسقط إلى الطابور */
    }
    await enqueueForumRepositoryOrphanPath(admin, authorId, storagePath);
}

async function dropOrphanQueueRow(admin: SupabaseClient, storagePath: string): Promise<void> {
    try {
        const { error } = await admin.from(FORUM_REPOSITORY_ORPHAN_TABLE).delete().eq('storage_path', storagePath);
        if (error && !isMissingOrphanTableError(error.message)) return;
    } catch {
        /* الجدول غير موجود */
    }
}

type QueuedOrphan = { id: string; storage_path: string };

async function retryQueuedOrphans(admin: SupabaseClient, userId: string, live: Set<string>): Promise<void> {
    let queued: QueuedOrphan[] = [];
    try {
        const { data, error } = await admin
            .from(FORUM_REPOSITORY_ORPHAN_TABLE)
            .select('id, storage_path')
            .eq('author_id', userId)
            .limit(QUEUE_LIMIT);
        if (error) return;
        queued = (data ?? []) as QueuedOrphan[];
    } catch {
        return;
    }

    for (const row of queued) {
        const path = typeof row.storage_path === 'string' ? row.storage_path.trim() : '';
        if (!path) continue;
        if (live.has(path)) {
            await dropOrphanQueueRow(admin, path);
            continue;
        }
        await removeForumRepositoryStorageOrEnqueue(admin, userId, path);
    }
}

async function sweepPrefixOrphans(admin: SupabaseClient, userId: string, live: Set<string>): Promise<void> {
    const { data, error } = await admin.storage.from(resolveUploadBucket()).list(`${userId}/repository`, {
        limit: PREFIX_LIST_LIMIT,
    });
    if (error || !data) return;
    const orphans = repositoryPrefixOrphanPaths({
        userId,
        catalogPaths: live,
        objects: data,
        nowMs: Date.now(),
    }).slice(0, PREFIX_REMOVE_CAP);
    for (const path of orphans) {
        await removeForumRepositoryStorageOrEnqueue(admin, userId, path);
    }
}

export async function sweepForumRepositoryOrphansForUser(
    userId: string,
    options?: { force?: boolean },
): Promise<void> {
    const id = userId.trim();
    if (!id) return;
    const now = Date.now();
    if (!options?.force) {
        const prev = lastSweepAt.get(id) ?? 0;
        if (now - prev < SWEEP_DEBOUNCE_MS) return;
    }
    lastSweepAt.set(id, now);

    const admin = await loadForumSupabaseAdmin();
    if (!admin) return;

    const { data: catalog, error } = await admin
        .from('forum_repository_docs')
        .select('storage_path')
        .eq('author_id', id)
        .limit(500);
    if (error) return;
    const live = new Set<string>();
    for (const row of (catalog ?? []) as Array<{ storage_path?: string | null }>) {
        const path = typeof row.storage_path === 'string' ? row.storage_path.trim() : '';
        if (path) live.add(path);
    }

    await retryQueuedOrphans(admin, id, live);
    await sweepPrefixOrphans(admin, id, live);
}
