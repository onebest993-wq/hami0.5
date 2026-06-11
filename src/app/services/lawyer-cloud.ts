import { supabase } from '../lib/supabase-client';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import { SecureAPIClient, getCurrentAccessToken } from './SecureAPIClient';
import { UserRole } from '../types/admin-types';
import SecureStoreService from './SecureStoreService';
import { stripImageMetadata } from '@/app/utils/stripMetadata';
import { sanitizeLawyerProfile } from '@/app/services/profileSanitizer';
import { refreshProfileMediaUrl } from '@/app/services/profileMediaService';
import { isKvProxyNetworkEnabled } from '@/app/services/kvProxyConfig';
import { deleteVaultBlobByPath, isVaultIdbStoragePath } from '@/app/services/vaultBlobStore';

// --- INITIALIZATION ---
// Supabase client imported from singleton

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-f09713ba`;

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

export function uuidv4(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}

const CLOUD_KV_TIMEOUT_MS = 6_000;

class KvLocalOnlyError extends Error {
    constructor() {
        super('kv_local_only');
        this.name = 'KvLocalOnlyError';
    }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`${label}: timeout`)), ms);
        promise
            .then((v) => {
                clearTimeout(timer);
                resolve(v);
            })
            .catch((e) => {
                clearTimeout(timer);
                reject(e);
            });
    });
}

// --- KV PROXY HELPER ---
// 🔐 يستخدم JWT للمستخدم الحالي (وليس publicAnonKey) ليمرّ فحص ownership الجديد على الـ Edge Function.
// publicAnonKey يبقى احتياطياً للـ headers الإلزامية فقط لـ Supabase (apikey)، أما Authorization فيحمل JWT الحقيقي.

async function buildAuthHeaders(): Promise<Record<string, string>> {
    const token = await getCurrentAccessToken();
    // إذا لا توجد جلسة (مستخدم غير مسجّل) — نتعامل كـ local-only لتفادي 401
    if (!token) throw new KvLocalOnlyError();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': publicAnonKey,
    };
}

const kv = {
    async set(key: string, value: unknown) {
        if (!isKvProxyNetworkEnabled()) throw new KvLocalOnlyError();
        const headers = await buildAuthHeaders();
        await withTimeout(
            SecureAPIClient.fetchSecure(
                `${SERVER_URL}/kv-proxy`,
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ action: 'set', key, value }),
                },
            ),
            CLOUD_KV_TIMEOUT_MS,
            'kv.set',
        );
    },
    async get(key: string) {
        if (!isKvProxyNetworkEnabled()) throw new KvLocalOnlyError();
        const headers = await buildAuthHeaders();
        return await withTimeout(
            SecureAPIClient.fetchSecure(
                `${SERVER_URL}/kv-proxy`,
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ action: 'get', key }),
                }
            ),
            CLOUD_KV_TIMEOUT_MS,
            'kv.get',
        );
    },
    async getByPrefix(prefix: string) {
        if (!isKvProxyNetworkEnabled()) throw new KvLocalOnlyError();
        const headers = await buildAuthHeaders();
        return await SecureAPIClient.fetchSecure(
            `${SERVER_URL}/kv-proxy`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'getByPrefix', prefix }),
            }
        );
    },
    async del(key: string) {
        if (!isKvProxyNetworkEnabled()) throw new KvLocalOnlyError();
        const headers = await buildAuthHeaders();
        await SecureAPIClient.fetchSecure(
            `${SERVER_URL}/kv-proxy`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify({ action: 'del', key }),
            }
        );
    }
};

// --- 1. CLOUD FIRESTORE EQUIVALENT (KV STORE STRUCTURE) ---
// Structure: user:{uid}:{collection}:{id}

const LAWYER_LOCAL_PREFIX = 'hami:lawyerdb:';

export const LawyerDB = {
    // A. Users Collection
    async saveUserProfile(userId: string, data: Record<string, unknown>) {
        try {
            await kv.set(`user:${userId}:profile`, data);
        } catch {
            const key = `${LAWYER_LOCAL_PREFIX}${userId}:profile`;
            await SecureStoreService.setItem(key, JSON.stringify(data));
        }
    },

    async getUserProfile(userId: string) {
        try {
            return await kv.get(`user:${userId}:profile`);
        } catch {
            const key = `${LAWYER_LOCAL_PREFIX}${userId}:profile`;
            const raw = await SecureStoreService.getItem(key);
            return raw ? JSON.parse(raw) : null;
        }
    },

    // B. Cases Collection (Sub-collection)
    async saveCase(userId: string, caseData: Record<string, unknown>) {
        const providedId = typeof caseData.id === 'string' ? caseData.id : undefined;
        const id = providedId ?? uuidv4();
        const key = `user:${userId}:cases:${id}`;
        try {
            await kv.set(key, { ...caseData, id, updatedAt: new Date().toISOString() });
        } catch {
            const localKey = `${LAWYER_LOCAL_PREFIX}${key}`;
            const existing = await this.getCases(userId);
            const updated = [...(Array.isArray(existing) ? existing : []).filter((c: any) => c.id !== id), { ...caseData, id, updatedAt: new Date().toISOString() }];
            await SecureStoreService.setItem(`${LAWYER_LOCAL_PREFIX}${userId}:cases`, JSON.stringify(updated));
        }
        return id;
    },

    async getCases(userId: string) {
        try {
            const cases = await kv.getByPrefix(`user:${userId}:cases:`);
            return cases || [];
        } catch {
            const raw = await SecureStoreService.getItem(`${LAWYER_LOCAL_PREFIX}${userId}:cases`);
            return raw ? JSON.parse(raw) : [];
        }
    },

    // C. Notes Vault (Sub-collection)
    async saveNote(userId: string, noteData: Record<string, unknown>) {
        const providedId = typeof noteData.id === 'string' ? noteData.id : undefined;
        const id = providedId ?? uuidv4();
        const key = `user:${userId}:notes:${id}`;
        try {
            await kv.set(key, { ...noteData, id, createdAt: new Date().toISOString() });
        } catch {
            const existing = await this.getNotes(userId);
            const updated = [...(Array.isArray(existing) ? existing : []).filter((n: any) => n.id !== id), { ...noteData, id, createdAt: new Date().toISOString() }];
            await SecureStoreService.setItem(`${LAWYER_LOCAL_PREFIX}${userId}:notes`, JSON.stringify(updated));
        }
        return id;
    },

    async getNotes(userId: string) {
        try {
            const notes = await kv.getByPrefix(`user:${userId}:notes:`);
            return notes || [];
        } catch {
            const raw = await SecureStoreService.getItem(`${LAWYER_LOCAL_PREFIX}${userId}:notes`);
            return raw ? JSON.parse(raw) : [];
        }
    },

    // D. Deadlines (Sub-collection for Notifications)
    async saveDeadline(userId: string, deadlineData: Record<string, unknown>) {
        const providedId = typeof deadlineData.id === 'string' ? deadlineData.id : undefined;
        const id = providedId ?? uuidv4();
        const key = `user:${userId}:deadlines:${id}`;
        try {
            await kv.set(key, { ...deadlineData, id, status: 'pending' });
        } catch {
            const existing = await this.getDeadlines(userId);
            const updated = [...(Array.isArray(existing) ? existing : []).filter((d: any) => d.id !== id), { ...deadlineData, id, status: 'pending' }];
            await SecureStoreService.setItem(`${LAWYER_LOCAL_PREFIX}${userId}:deadlines`, JSON.stringify(updated));
        }
        return id;
    },

    async checkUpcomingDeadlines(userId: string) {
        const deadlines = await this.getDeadlines(userId);
        const list = Array.isArray(deadlines) ? deadlines : [];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        return list.filter((d) => {
            if (!isRecord(d) || typeof d.date !== 'string') return false;
            const date = new Date(d.date);
            const t = date.getTime();
            return t >= tomorrow.getTime() && t < tomorrow.getTime() + 86400000;
        });
    },

    async getDeadlines(userId: string) {
        try {
            return await kv.getByPrefix(`user:${userId}:deadlines:`) || [];
        } catch {
            const raw = await SecureStoreService.getItem(`${LAWYER_LOCAL_PREFIX}${userId}:deadlines`);
            return raw ? JSON.parse(raw) : [];
        }
    }
};

export type CommunityAttachment = {
    type: 'image' | 'document' | 'audio';
    url: string;
    name: string;
    mimeType?: string;
    storagePath?: string;
};

export type ForumEditHistoryEntry = {
    content: string;
    editedAt: string;
};

export type CommunityComment = {
    id: string;
    postId: string;
    authorId: string;
    author_id?: string;
    authorName: string;
    content: string;
    createdAt: string;
    parentId?: string;
    /** قائمة معرّفات من صوّت على هذا التعليق */
    upvoterIds?: string[];
};

export type CommunityPost = {
    id: string;
    authorId: string;
    author_id?: string;
    authorName: string;
    content: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    attachment: CommunityAttachment | null;
    upvoterIds: string[];
    comments: CommunityComment[];
    bestCommentId?: string | null;
    isUrgent?: boolean;
    isAnonymous?: boolean;
    isEdited?: boolean;
    /** عدد مرات التعديل (يُزاد عند كل حفظ) */
    editCount?: number;
    /** آخر نسخ قبل التعديل (محلي — حتى 10) */
    editHistory?: ForumEditHistoryEntry[];
    isPinned?: boolean;
    /** قفل التعليقات على المنشور (المالك أو الأدمن) */
    isLocked?: boolean;
};

export type NotificationType = 'comment' | 'upvote' | 'best_answer' | 'report_update' | 'system' | 'new_post' | 'new_document';

export type ForumNotification = {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    postId?: string;
    read: boolean;
    createdAt: string;
};

export type BanRecord = {
    userId: string;
    userName: string;
    reason: string;
    bannedBy: string;
    bannedAt: string;
    expiresAt?: string;
};

const COMMUNITY_LOCAL_KEY = 'hami:community:posts:v1';
const COMMUNITY_DELETED_IDS_KEY = 'hami:community:deleted-ids:v1';
const ANONYMOUS_FORUM_AUTHOR_ID = '__anonymous__';
const DEV_SERVER_FORUM_STORE = Symbol.for('HAMI_DEV_COMMUNITY_POSTS_V1');
const DEV_SERVER_DELETED_STORE = Symbol.for('HAMI_DEV_COMMUNITY_DELETED_IDS_V1');

function getServerDevForumPosts(): CommunityPost[] {
    const g = globalThis as unknown as Record<symbol, CommunityPost[]>;
    if (!Array.isArray(g[DEV_SERVER_FORUM_STORE])) {
        g[DEV_SERVER_FORUM_STORE] = [];
    }
    return g[DEV_SERVER_FORUM_STORE];
}

async function loadLocalCommunityPosts(): Promise<CommunityPost[]> {
    if (typeof window === 'undefined') {
        return getServerDevForumPosts();
    }
    try {
        const raw = await SecureStoreService.getItem(COMMUNITY_LOCAL_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed as CommunityPost[];
        }
    } catch {
        /* fallback below */
    }
    try {
        const fallback = window.localStorage.getItem(COMMUNITY_LOCAL_KEY);
        if (!fallback) return [];
        const parsed = JSON.parse(fallback);
        return Array.isArray(parsed) ? (parsed as CommunityPost[]) : [];
    } catch {
        return [];
    }
}

async function saveLocalCommunityPosts(posts: CommunityPost[]): Promise<void> {
    if (typeof window === 'undefined') {
        const g = globalThis as unknown as Record<symbol, CommunityPost[]>;
        g[DEV_SERVER_FORUM_STORE] = posts;
        return;
    }
    const payload = JSON.stringify(posts);
    try {
        await SecureStoreService.setItem(COMMUNITY_LOCAL_KEY, payload);
        try {
            window.localStorage.setItem(COMMUNITY_LOCAL_KEY, payload);
        } catch {
            /* optional mirror */
        }
        return;
    } catch {
        try {
            window.localStorage.setItem(COMMUNITY_LOCAL_KEY, payload);
        } catch {
            console.warn('[CommunityDB] فشل حفظ المنشورات محلياً');
        }
    }
}

let communityPostsWriteChain: Promise<void> = Promise.resolve();

function withCommunityPostsWriteLock<T>(operation: () => Promise<T>): Promise<T> {
    const run = communityPostsWriteChain.then(operation, operation);
    communityPostsWriteChain = run.then(
        () => undefined,
        () => undefined,
    );
    return run;
}

function getServerDevDeletedIds(): Set<string> {
    const g = globalThis as unknown as Record<symbol, Set<string>>;
    if (!(g[DEV_SERVER_DELETED_STORE] instanceof Set)) {
        g[DEV_SERVER_DELETED_STORE] = new Set<string>();
    }
    return g[DEV_SERVER_DELETED_STORE] as Set<string>;
}

async function loadDeletedCommunityPostIds(): Promise<Set<string>> {
    if (typeof window === 'undefined') {
        return new Set(getServerDevDeletedIds());
    }
    try {
        const raw = await SecureStoreService.getItem(COMMUNITY_DELETED_IDS_KEY);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set();
        return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0));
    } catch {
        return new Set();
    }
}

async function saveDeletedCommunityPostIds(ids: Set<string>): Promise<void> {
    if (typeof window === 'undefined') {
        const g = globalThis as unknown as Record<symbol, Set<string>>;
        g[DEV_SERVER_DELETED_STORE] = new Set(ids);
        return;
    }
    try {
        await SecureStoreService.setItem(COMMUNITY_DELETED_IDS_KEY, JSON.stringify([...ids]));
    } catch {
    }
}

export async function markCommunityPostDeleted(postId: string): Promise<void> {
    const ids = await loadDeletedCommunityPostIds();
    ids.add(postId);
    await saveDeletedCommunityPostIds(ids);
}

export async function getDeletedCommunityPostIds(): Promise<Set<string>> {
    return loadDeletedCommunityPostIds();
}

export function filterDeletedCommunityPosts(
    posts: CommunityPost[],
    deletedIds: Set<string>,
): CommunityPost[] {
    if (deletedIds.size === 0) return posts;
    return posts.filter((p) => !deletedIds.has(p.id));
}

function resolveCommunityPostOwnerId(
    stored: CommunityPost | undefined,
    authorHint?: string,
): string {
    const fromStored = stored?.author_id ?? stored?.authorId ?? '';
    if (fromStored && fromStored !== ANONYMOUS_FORUM_AUTHOR_ID) return fromStored;
    if (authorHint && authorHint !== ANONYMOUS_FORUM_AUTHOR_ID) return authorHint;
    return fromStored || authorHint || '';
}

function canActOnCommunityPost(
    requesterId: string | undefined,
    ownerId: string,
    authorHint: string | undefined,
    requesterRole?: UserRole,
): boolean {
    if (!requesterId) return true;
    const isAdmin =
        requesterRole === UserRole.SUPER_ADMIN || requesterRole === UserRole.MODERATOR;
    if (isAdmin) return true;
    if (ownerId && requesterId === ownerId) return true;
    if (authorHint && requesterId === authorHint) return true;
    return false;
}

function normalizeCommunityPost(raw: unknown): CommunityPost | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id : null;
    const authorIdRaw = typeof o.authorId === 'string' ? o.authorId : typeof o.author_id === 'string' ? o.author_id : null;
    const authorName = typeof o.authorName === 'string' ? o.authorName : null;
    const content = typeof o.content === 'string' ? o.content : null;
    const createdAt = typeof o.createdAt === 'string' ? o.createdAt : null;
    const updatedAt = typeof o.updatedAt === 'string' ? o.updatedAt : createdAt;
    if (!id || !authorIdRaw || !authorName || !content || !createdAt || !updatedAt) return null;
    const tags = Array.isArray(o.tags) ? (o.tags.filter((t) => typeof t === 'string') as string[]) : [];
    const upvoterIds = Array.isArray(o.upvoterIds) ? (o.upvoterIds.filter((t) => typeof t === 'string') as string[]) : [];
    const comments = Array.isArray(o.comments)
        ? (o.comments
              .map((c) => {
                  if (!c || typeof c !== 'object') return null;
                  const cc = c as Record<string, unknown>;
                  const cid = typeof cc.id === 'string' ? cc.id : null;
                  const postId = typeof cc.postId === 'string' ? cc.postId : id;
                  const cauthorIdRaw =
                      typeof cc.authorId === 'string' ? cc.authorId : typeof cc.author_id === 'string' ? cc.author_id : null;
                  const cauthorName = typeof cc.authorName === 'string' ? cc.authorName : null;
                  const ccontent = typeof cc.content === 'string' ? cc.content : null;
                  const ccreatedAt = typeof cc.createdAt === 'string' ? cc.createdAt : null;
                  if (!cid || !postId || !cauthorIdRaw || !cauthorName || !ccontent || !ccreatedAt) return null;
                  const parentId = typeof cc.parentId === 'string' ? cc.parentId : undefined;
                  return {
                      id: cid,
                      postId,
                      authorId: cauthorIdRaw,
                      author_id: cauthorIdRaw,
                      authorName: cauthorName,
                      content: ccontent,
                      createdAt: ccreatedAt,
                      parentId,
                  } as CommunityComment;
              })
              .filter((x) => x !== null) as CommunityComment[])
        : [];
    const attachment =
        o.attachment && typeof o.attachment === 'object'
            ? (() => {
                  const a = o.attachment as Record<string, unknown>;
                  const type: CommunityAttachment['type'] | null =
                      a.type === 'image'
                          ? 'image'
                          : a.type === 'document'
                            ? 'document'
                            : a.type === 'audio'
                              ? 'audio'
                              : null;
                  const url = typeof a.url === 'string' ? a.url : null;
                  const name = typeof a.name === 'string' ? a.name : null;
                  if (!type || !url || !name) return null;
                  const mimeType = typeof a.mimeType === 'string' ? a.mimeType : undefined;
                  const storagePath = typeof a.storagePath === 'string' ? a.storagePath : undefined;
                  return { type, url, name, mimeType, storagePath };
              })()
            : null;
    const bestCommentId =
        typeof o.bestCommentId === 'string'
            ? o.bestCommentId
            : o.bestCommentId === null
              ? null
              : null;
    const isUrgent = typeof o.isUrgent === 'boolean' ? o.isUrgent : undefined;
    const isAnonymous = typeof o.isAnonymous === 'boolean' ? o.isAnonymous : undefined;
    const isEdited = typeof o.isEdited === 'boolean' ? o.isEdited : undefined;
    const editCount = typeof o.editCount === 'number' && o.editCount >= 0 ? o.editCount : undefined;
    const editHistory = Array.isArray(o.editHistory)
        ? (o.editHistory
              .map((entry) => {
                  if (!entry || typeof entry !== 'object') return null;
                  const e = entry as Record<string, unknown>;
                  const content = typeof e.content === 'string' ? e.content : null;
                  const editedAt = typeof e.editedAt === 'string' ? e.editedAt : null;
                  if (!content || !editedAt) return null;
                  return { content, editedAt };
              })
              .filter((x): x is ForumEditHistoryEntry => x !== null))
        : undefined;
    const isPinned = typeof o.isPinned === 'boolean' ? o.isPinned : undefined;
    return {
        id,
        authorId: authorIdRaw,
        author_id: authorIdRaw,
        authorName,
        content,
        tags,
        createdAt,
        updatedAt,
        attachment,
        upvoterIds,
        comments,
        bestCommentId,
        isUrgent,
        isAnonymous,
        isEdited,
        editCount,
        editHistory,
        isPinned,
    };
}

function mergeCommunityComments(
    left: CommunityComment[],
    right: CommunityComment[],
): CommunityComment[] {
    const map = new Map<string, CommunityComment>();
    for (const c of left) map.set(c.id, c);
    for (const c of right) {
        const prev = map.get(c.id);
        if (!prev) {
            map.set(c.id, c);
            continue;
        }
        map.set(c.id, c.content.length >= prev.content.length ? c : prev);
    }
    return Array.from(map.values()).sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
    );
}

function pickBestCommunityAttachment(
    local: CommunityPost,
    remote: CommunityPost,
): CommunityPost['attachment'] {
    const la = local.attachment;
    const ra = remote.attachment;
    if (la && !ra) return la;
    if (ra && !la) return ra;
    if (!la && !ra) return null;
    if (la!.storagePath && !ra!.storagePath) return la;
    if (ra!.storagePath && !la!.storagePath) return ra;
    if (la!.storagePath?.startsWith('idb:forum:') && !ra!.storagePath?.startsWith('idb:forum:')) return la;
    return la!.url && !ra!.url ? la : ra!.url && !la!.url ? ra : la;
}

function mergeSingleCommunityPost(local: CommunityPost, remote: CommunityPost): CommunityPost {
    const localTime = Number.isFinite(Date.parse(local.updatedAt)) ? Date.parse(local.updatedAt) : 0;
    const remoteTime = Number.isFinite(Date.parse(remote.updatedAt)) ? Date.parse(remote.updatedAt) : 0;
    const newer = remoteTime >= localTime ? remote : local;
    const older = remoteTime >= localTime ? local : remote;

    let content = local.content;
    let isEdited = Boolean(local.isEdited || remote.isEdited);
    let editCount = Math.max(local.editCount ?? 0, remote.editCount ?? 0);
    let editHistory =
        (local.editHistory?.length ?? 0) >= (remote.editHistory?.length ?? 0)
            ? local.editHistory
            : remote.editHistory;
    if (local.content !== remote.content) {
        if (local.isEdited && !remote.isEdited) {
            content = local.content;
        } else if (!local.isEdited && remote.isEdited) {
            content = remote.content;
        } else if (remoteTime > localTime) {
            content = remote.content;
        } else {
            content = local.content;
        }
    }

    const upvoterIds = [...new Set([...(local.upvoterIds ?? []), ...(remote.upvoterIds ?? [])])];
    const comments = mergeCommunityComments(local.comments ?? [], remote.comments ?? []);
    const tags = Array.from(new Set([...(local.tags ?? []), ...(remote.tags ?? [])]));

    return {
        ...newer,
        content,
        tags,
        isEdited,
        editCount: editCount || undefined,
        editHistory,
        attachment: pickBestCommunityAttachment(local, remote),
        upvoterIds,
        comments,
        bestCommentId: newer.bestCommentId ?? older.bestCommentId ?? null,
        isPinned: local.isPinned || remote.isPinned,
        isLocked: local.isLocked || remote.isLocked,
        isUrgent: local.isUrgent || remote.isUrgent,
        isAnonymous: local.isAnonymous || remote.isAnonymous,
        updatedAt: new Date(Math.max(localTime, remoteTime)).toISOString(),
    };
}

export function mergeCommunityPostsById(
    localPosts: CommunityPost[],
    remotePosts: CommunityPost[],
): CommunityPost[] {
    const map = new Map<string, CommunityPost>();
    for (const p of localPosts) map.set(p.id, p);
    for (const p of remotePosts) {
        const prev = map.get(p.id);
        if (!prev) {
            map.set(p.id, p);
            continue;
        }
        map.set(p.id, mergeSingleCommunityPost(prev, p));
    }
    return Array.from(map.values());
}

export function sortCommunityPosts(posts: CommunityPost[]): CommunityPost[] {
    return [...posts].sort((a, b) => {
        const aPin = a.isPinned ? 1 : 0;
        const bPin = b.isPinned ? 1 : 0;
        return bPin - aPin || Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
}

function mergePostsById(localPosts: CommunityPost[], remotePosts: CommunityPost[]): CommunityPost[] {
    return mergeCommunityPostsById(localPosts, remotePosts);
}

export const CommunityDB = {
    async listPosts(): Promise<CommunityPost[]> {
        const deletedIds = await loadDeletedCommunityPostIds();
        const localPosts = (await loadLocalCommunityPosts()).map((p) => normalizeCommunityPost(p)).filter((p): p is CommunityPost => p !== null);
        const withoutDeleted = filterDeletedCommunityPosts(localPosts, deletedIds);
        if (!isKvProxyNetworkEnabled()) {
            return withoutDeleted.sort((a, b) => {
                const aPin = a.isPinned ? 1 : 0;
                const bPin = b.isPinned ? 1 : 0;
                return bPin - aPin || Date.parse(b.createdAt) - Date.parse(a.createdAt);
            });
        }
        try {
            const res = await kv.getByPrefix('community:posts:');
            const remotePosts = Array.isArray(res) ? res.map((p) => normalizeCommunityPost(p)).filter((p): p is CommunityPost => p !== null) : [];
            const merged = filterDeletedCommunityPosts(
                mergePostsById(withoutDeleted, remotePosts),
                deletedIds,
            ).sort((a, b) => {
                const aPin = a.isPinned ? 1 : 0;
                const bPin = b.isPinned ? 1 : 0;
                return bPin - aPin || Date.parse(b.createdAt) - Date.parse(a.createdAt);
            });
            await saveLocalCommunityPosts(merged);
            return merged;
        } catch {
            return withoutDeleted.sort((a, b) => {
                const aPin = a.isPinned ? 1 : 0;
                const bPin = b.isPinned ? 1 : 0;
                return bPin - aPin || Date.parse(b.createdAt) - Date.parse(a.createdAt);
            });
        }
    },

    async savePost(post: CommunityPost): Promise<void> {
        return withCommunityPostsWriteLock(async () => {
            const normalized = normalizeCommunityPost(post);
            if (!normalized) throw new Error('بيانات المنشور غير صالحة');
            const localPosts = await loadLocalCommunityPosts();
            const merged = mergePostsById(localPosts, [normalized]).sort((a, b) => {
                const aPin = a.isPinned ? 1 : 0;
                const bPin = b.isPinned ? 1 : 0;
                return bPin - aPin || Date.parse(b.createdAt) - Date.parse(a.createdAt);
            });
            await saveLocalCommunityPosts(merged);
            if (isKvProxyNetworkEnabled()) {
                try {
                    await kv.set(`community:posts:${normalized.id}`, normalized);
                } catch {
                    /* المحلي محفوظ — kv اختياري في التطوير */
                }
            }
        });
    },

    /** حفظ دفعي آمن — يمنع فقدان منشورات عند المزامنة */
    async persistPostsBatch(posts: CommunityPost[]): Promise<void> {
        return withCommunityPostsWriteLock(async () => {
            const deletedIds = await loadDeletedCommunityPostIds();
            const normalized = posts
                .map((p) => normalizeCommunityPost(p))
                .filter((p): p is CommunityPost => p !== null);
            const filtered = filterDeletedCommunityPosts(normalized, deletedIds);
            await saveLocalCommunityPosts(sortCommunityPosts(filtered));
        });
    },

    async deletePost(postId: string): Promise<void> {
        return withCommunityPostsWriteLock(async () => {
            await markCommunityPostDeleted(postId);
            const localPosts = (await loadLocalCommunityPosts()).filter((p) => p?.id !== postId);
            await saveLocalCommunityPosts(localPosts);

        let attachmentPath: string | null = null;
        try {
            const raw = await kv.get(`community:posts:${postId}`);
            const post = normalizeCommunityPost(raw);
            if (post?.attachment?.storagePath) {
                attachmentPath = post.attachment.storagePath;
            }
        } catch {
            // لا يمكن جلب بيانات المنشور — نكمل الحذف على أي حال
        }

        if (attachmentPath) {
            try {
                await supabase.storage.from('make-f09713ba').remove([attachmentPath]);
            } catch {
                console.warn('[CommunityDB] فشل حذف الملف من المخزن:', attachmentPath);
            }
        }

        if (isKvProxyNetworkEnabled()) {
            try {
                await kv.del(`community:posts:${postId}`);
            } catch {
                /* المحلي محدّث — kv اختياري في التطوير */
            }
        }
        });
    },

    async saveReport(report: CommunityReport): Promise<void> {
        if (!isKvProxyNetworkEnabled()) return;
        try {
            await kv.set(`community:reports:${report.id}`, report);
        } catch {
            /* ignore */
        }
    },
};

const FORUM_BOOKMARKS_KEY = 'hami:forum:bookmarks:v1';
const DEV_SERVER_BOOKMARKS = Symbol.for('HAMI_DEV_FORUM_BOOKMARKS_V1');

type ForumBookmarkStore = Record<string, string[]>;

function getServerBookmarkStore(): ForumBookmarkStore {
    const g = globalThis as unknown as Record<symbol, ForumBookmarkStore>;
    if (!g[DEV_SERVER_BOOKMARKS] || typeof g[DEV_SERVER_BOOKMARKS] !== 'object') {
        g[DEV_SERVER_BOOKMARKS] = {};
    }
    return g[DEV_SERVER_BOOKMARKS];
}

async function loadForumBookmarkStore(): Promise<ForumBookmarkStore> {
    if (typeof window === 'undefined') {
        return getServerBookmarkStore();
    }
    try {
        const raw = await SecureStoreService.getItem(FORUM_BOOKMARKS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object') return {};
        return parsed as ForumBookmarkStore;
    } catch {
        return {};
    }
}

async function saveForumBookmarkStore(store: ForumBookmarkStore): Promise<void> {
    if (typeof window === 'undefined') {
        const g = globalThis as unknown as Record<symbol, ForumBookmarkStore>;
        g[DEV_SERVER_BOOKMARKS] = store;
        return;
    }
    try {
        await SecureStoreService.setItem(FORUM_BOOKMARKS_KEY, JSON.stringify(store));
    } catch {
    }
}

/** حفظ المنشورات للقراءة لاحقاً — محلي per-user (يعمل بدون Supabase). */
export const ForumBookmarkDB = {
    async listPostIds(userId: string): Promise<string[]> {
        if (!userId) return [];
        const store = await loadForumBookmarkStore();
        const ids = store[userId];
        return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
    },

    async toggle(userId: string, postId: string): Promise<boolean> {
        if (!userId || !postId) throw new Error('معرّف المستخدم أو المنشور غير صالح');
        const store = await loadForumBookmarkStore();
        const current = new Set(
            Array.isArray(store[userId]) ? store[userId].filter((id) => typeof id === 'string') : [],
        );
        let bookmarked: boolean;
        if (current.has(postId)) {
            current.delete(postId);
            bookmarked = false;
        } else {
            current.add(postId);
            bookmarked = true;
        }
        store[userId] = [...current];
        await saveForumBookmarkStore(store);
        return bookmarked;
    },
};

async function listCommunityPostsFromApi(limit: number, offset: number): Promise<{ posts: CommunityPost[]; total: number } | null> {
    if (typeof window === 'undefined') return null;
    try {
        const { ForumApiService } = await import('@/app/services/forumApiService');
        return await ForumApiService.listPostsPaginated(limit, offset);
    } catch {
        return null;
    }
}

export async function getCommunityPosts() {
    const fromApi = await listCommunityPostsFromApi(500, 0);
    if (fromApi) return fromApi.posts;
    return await CommunityDB.listPosts();
}

export async function getCommunityPostsPaginated(limit: number, offset: number): Promise<{ posts: CommunityPost[]; total: number }> {
    const fromApi = await listCommunityPostsFromApi(limit, offset);
    if (fromApi) return fromApi;
    const all = await CommunityDB.listPosts();
    return {
        posts: all.slice(offset, offset + limit),
        total: all.length,
    };
}

export async function getCommunityPostById(postId: string): Promise<CommunityPost | null> {
    if (typeof window !== 'undefined') {
        try {
            const { ForumApiService } = await import('@/app/services/forumApiService');
            return await ForumApiService.getPostById(postId);
        } catch {
            /* fallback */
        }
    }
    const all = await CommunityDB.listPosts();
    return all.find((p) => p.id === postId) ?? null;
}

export async function addCommunityPost(post: CommunityPost) {
    await CommunityDB.savePost(post);
}

export async function addCommunityComment(postId: string, comment: CommunityComment): Promise<CommunityPost> {
    const posts = await CommunityDB.listPosts();
    const post = posts.find((p) => p.id === postId);
    if (!post) throw new Error('المنشور غير موجود');
    const updated: CommunityPost = { ...post, comments: [...post.comments, comment], updatedAt: new Date().toISOString() };
    await CommunityDB.savePost(updated);

    if (comment.authorId !== post.authorId) {
        await NotificationDB.addNotification({
            id: uuidv4(),
            userId: post.authorId,
            type: 'comment',
            title: 'تعليق جديد على منشورك',
            message: `علق ${comment.authorName} على منشورك "${post.content.slice(0, 50)}..."`,
            postId: post.id,
            read: false,
            createdAt: new Date().toISOString(),
        });
    }
    return updated;
}

export async function deleteCommunityComment(
    postId: string,
    commentId: string,
    requesterId: string,
    requesterRole?: UserRole,
): Promise<CommunityPost> {
    const posts = await CommunityDB.listPosts();
    const post = posts.find((p) => p.id === postId);
    if (!post) throw new Error('المنشور غير موجود');
    const comment = post.comments.find((c) => c.id === commentId);
    if (!comment) throw new Error('التعليق غير موجود');
    const isAdmin =
        requesterRole === UserRole.SUPER_ADMIN || requesterRole === UserRole.MODERATOR;
    if (comment.authorId !== requesterId && post.authorId !== requesterId && !isAdmin) {
        throw new Error('ليس لديك صلاحية لحذف هذا التعليق');
    }
    const updated: CommunityPost = {
        ...post,
        comments: post.comments.filter((c) => c.id !== commentId && c.parentId !== commentId),
        updatedAt: new Date().toISOString(),
    };
    await CommunityDB.savePost(updated);
    return updated;
}

export async function editCommunityComment(
    postId: string,
    commentId: string,
    newContent: string,
    requesterId: string,
): Promise<CommunityPost> {
    const posts = await CommunityDB.listPosts();
    const post = posts.find((p) => p.id === postId);
    if (!post) throw new Error('المنشور غير موجود');
    const comment = post.comments.find((c) => c.id === commentId);
    if (!comment) throw new Error('التعليق غير موجود');
    if (comment.authorId !== requesterId) {
        throw new Error('ليس لديك صلاحية لتعديل هذا التعليق');
    }
    const trimmed = newContent.trim();
    if (trimmed.length < 2) throw new Error('نص التعليق قصير جداً');
    const updated: CommunityPost = {
        ...post,
        comments: post.comments.map((c) => (c.id === commentId ? { ...c, content: trimmed } : c)),
        updatedAt: new Date().toISOString(),
    };
    await CommunityDB.savePost(updated);
    return updated;
}

export async function deleteCommunityPost(
    postId: string,
    requesterId?: string,
    requesterRole?: UserRole,
    authorId?: string,
): Promise<void> {
    const rawPosts = await loadLocalCommunityPosts();
    const stored = rawPosts.find((p) => p?.id === postId);
    const ownerId = resolveCommunityPostOwnerId(
        stored ? normalizeCommunityPost(stored) ?? undefined : undefined,
        authorId,
    );
    if (!canActOnCommunityPost(requesterId, ownerId, authorId, requesterRole)) {
        throw new Error('ليس لديك صلاحية لحذف هذا المنشور');
    }
    await CommunityDB.deletePost(postId);
}

export async function updateCommunityPost(postId: string, newContent: string, requesterId?: string) {
    const posts = await CommunityDB.listPosts();
    const post = posts.find((p) => p.id === postId);
    if (!post) throw new Error('المنشور غير موجود');
    const postAuthorId = post.author_id ?? post.authorId ?? '';
    if (requesterId && requesterId !== postAuthorId) {
        throw new Error('ليس لديك صلاحية لتعديل هذا المنشور');
    }
    const { buildForumEditPatch } = await import('@/app/services/forum/forumEditUtils');
    const updated: CommunityPost = {
        ...post,
        ...buildForumEditPatch(post, newContent),
    };
    await CommunityDB.savePost(updated);
    return updated;
}

export async function toggleLockCommunityPost(
    postId: string,
    locked: boolean,
    requesterId: string,
    requesterIsAdmin: boolean,
    authorHint?: string,
): Promise<CommunityPost> {
    const posts = await CommunityDB.listPosts();
    const post = posts.find((p) => p.id === postId);
    if (!post) throw new Error('المنشور غير موجود');
    const ownerId = resolveCommunityPostOwnerId(post, authorHint);
    const adminRole = requesterIsAdmin ? UserRole.SUPER_ADMIN : undefined;
    if (!canActOnCommunityPost(requesterId, ownerId, authorHint, adminRole)) {
        throw new Error('ليس لديك صلاحية لقفل النقاش');
    }
    const updated: CommunityPost = {
        ...post,
        isLocked: locked || undefined,
        updatedAt: new Date().toISOString(),
    };
    await CommunityDB.savePost(updated);
    return updated;
}

export async function togglePinCommunityPost(
    postId: string,
    pinned: boolean,
    requesterRole?: UserRole,
): Promise<CommunityPost> {
    if (
        requesterRole !== UserRole.SUPER_ADMIN &&
        requesterRole !== UserRole.MODERATOR
    ) {
        throw new Error('ليس لديك صلاحية تثبيت المنشورات');
    }
    const posts = await CommunityDB.listPosts();
    const post = posts.find((p) => p.id === postId);
    if (!post) throw new Error('المنشور غير موجود');
    const updated: CommunityPost = {
        ...post,
        isPinned: pinned || undefined,
        updatedAt: new Date().toISOString(),
    };
    await CommunityDB.savePost(updated);
    return updated;
}

// --- COMMUNITY REPORT TYPES ---
export type CommunityReport = {
    id: string;
    postId: string;
    reporterId: string;
    reason: string;
    createdAt: string;
    status: 'pending' | 'dismissed' | 'resolved';
    reviewedById?: string;
    reviewedAt?: string;
};

export async function reportCommunityPost(
    postId: string,
    reason: string,
    requesterId?: string,
): Promise<{ ok: boolean; postId: string; reason: string; duplicate?: boolean }> {
    if (!requesterId) {
        return { ok: true, postId, reason };
    }
    const existing = await getCommunityReports();
    if (
        existing.some(
            (r) =>
                r.postId === postId &&
                r.reporterId === requesterId &&
                r.status === 'pending',
        )
    ) {
        return { ok: false, postId, reason, duplicate: true };
    }
    const reportId = uuidv4();
    const report: CommunityReport = {
        id: reportId,
        postId,
        reporterId: requesterId,
        reason,
        createdAt: new Date().toISOString(),
        status: 'pending',
    };
    try {
        await CommunityDB.saveReport(report);
    } catch {
        // silent — الأفضل أن نكمل حتى لو فشل التخزين
    }
    return { ok: true, postId, reason };
}

export async function getCommunityReports(): Promise<CommunityReport[]> {
    try {
        const res = await kv.getByPrefix('community:reports:');
        return Array.isArray(res) ? res.filter((r): r is CommunityReport => {
            if (!r || typeof r !== 'object') return false;
            const o = r as Record<string, unknown>;
            return typeof o.id === 'string' && typeof o.postId === 'string' && typeof o.reason === 'string' && typeof o.status === 'string';
        }) : [];
    } catch {
        return [];
    }
}

export async function dismissCommunityReport(reportId: string, reviewerId: string): Promise<void> {
    try {
        const raw = await kv.get(`community:reports:${reportId}`);
        if (!raw) return;
        const report = raw as CommunityReport;
        report.status = 'dismissed';
        report.reviewedById = reviewerId;
        report.reviewedAt = new Date().toISOString();
        await kv.set(`community:reports:${reportId}`, report);
    } catch {
        // silent
    }
}

// --- BAN SYSTEM ---

export const BanDB = {
    async banUser(record: BanRecord): Promise<void> {
        await kv.set(`banned:users:${record.userId}`, record);
    },

    async unbanUser(userId: string): Promise<void> {
        await kv.del(`banned:users:${userId}`);
    },

    async isBanned(userId: string): Promise<BanRecord | null> {
        try {
            const raw = await kv.get(`banned:users:${userId}`);
            if (!raw || typeof raw !== 'object') return null;
            const r = raw as BanRecord;
            if (r.expiresAt && Date.now() > Date.parse(r.expiresAt)) {
                await kv.del(`banned:users:${userId}`);
                return null;
            }
            return r.userId ? (raw as BanRecord) : null;
        } catch {
            return null;
        }
    },

    async listBannedUsers(): Promise<BanRecord[]> {
        try {
            const res = await kv.getByPrefix('banned:users:');
            return Array.isArray(res) ? res.filter((r): r is BanRecord => {
                if (!r || typeof r !== 'object') return false;
                const o = r as Record<string, unknown>;
                return typeof o.userId === 'string';
            }) : [];
        } catch {
            return [];
        }
    },
};

// --- FOLLOW SYSTEM ---

export type FollowRecord = {
    followerId: string;
    followingId: string;
    createdAt: string;
};

export const FollowDB = {
    async follow(followerId: string, followingId: string): Promise<void> {
        if (followerId === followingId) return;
        const record: FollowRecord = { followerId, followingId, createdAt: new Date().toISOString() };
        await kv.set(`follow:${followerId}:${followingId}`, record);
    },

    async unfollow(followerId: string, followingId: string): Promise<void> {
        await kv.del(`follow:${followerId}:${followingId}`);
    },

    async isFollowing(followerId: string, followingId: string): Promise<boolean> {
        try {
            const raw = await kv.get(`follow:${followerId}:${followingId}`);
            return !!raw && typeof raw === 'object' && !!(raw as FollowRecord).followerId;
        } catch {
            return false;
        }
    },

    async getFollowers(userId: string): Promise<FollowRecord[]> {
        try {
            const all = await kv.getByPrefix('follow:');
            if (!Array.isArray(all)) return [];
            return all.filter((r): r is FollowRecord => {
                if (!r || typeof r !== 'object') return false;
                const o = r as Record<string, unknown>;
                return typeof o.followerId === 'string' && typeof o.followingId === 'string' && o.followingId === userId;
            }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        } catch {
            return [];
        }
    },

    async getFollowing(userId: string): Promise<FollowRecord[]> {
        try {
            const all = await kv.getByPrefix('follow:');
            if (!Array.isArray(all)) return [];
            return all.filter((r): r is FollowRecord => {
                if (!r || typeof r !== 'object') return false;
                const o = r as Record<string, unknown>;
                return typeof o.followerId === 'string' && typeof o.followingId === 'string' && o.followerId === userId;
            }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        } catch {
            return [];
        }
    },

    async getFollowerCount(userId: string): Promise<number> {
        const followers = await this.getFollowers(userId);
        return followers.length;
    },

    async getFollowingCount(userId: string): Promise<number> {
        const following = await this.getFollowing(userId);
        return following.length;
    },
};

export async function getUserPostCount(userId: string): Promise<number> {
    try {
        const posts = await CommunityDB.listPosts();
        return posts.filter((p) => (p.author_id ?? p.authorId ?? '') === userId).length;
    } catch {
        return 0;
    }
}

export async function notifyFollowers(userId: string, type: 'new_post' | 'new_document', title: string, message: string, postId?: string): Promise<void> {
    try {
        const followers = await FollowDB.getFollowers(userId);
        for (const f of followers) {
            const notif: ForumNotification = {
                id: uuidv4(),
                userId: f.followerId,
                type,
                title,
                message,
                postId,
                read: false,
                createdAt: new Date().toISOString(),
            };
            await NotificationDB.addNotification(notif);
        }
    } catch {
        // silent
    }
}

// --- NOTIFICATION SYSTEM ---

const NOTIFICATION_LOCAL_KEY = 'hami:notifications:v1';

async function loadLocalNotifications(): Promise<ForumNotification[]> {
    try {
        const raw = await SecureStoreService.getItem(NOTIFICATION_LOCAL_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async function saveLocalNotifications(notifs: ForumNotification[]): Promise<void> {
    try {
        await SecureStoreService.setItem(NOTIFICATION_LOCAL_KEY, JSON.stringify(notifs));
    } catch { /* silent */ }
}

export const NotificationDB = {
    async addNotification(notif: ForumNotification): Promise<void> {
        const local = await loadLocalNotifications();
        local.unshift(notif);
        await saveLocalNotifications(local);
        try {
            await kv.set(`notifications:${notif.userId}:${notif.id}`, notif);
        } catch { /* silent — local fallback */ }
    },

    async getNotifications(userId: string): Promise<ForumNotification[]> {
        const local = await loadLocalNotifications();
        const userLocal = local.filter((n) => n.userId === userId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
        try {
            const res = await kv.getByPrefix(`notifications:${userId}:`);
            const remote = Array.isArray(res) ? res.filter((n): n is ForumNotification => {
                if (!n || typeof n !== 'object') return false;
                const o = n as Record<string, unknown>;
                return typeof o.id === 'string' && typeof o.userId === 'string';
            }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)) : [];
            const mergedMap = new Map<string, ForumNotification>();
            for (const n of userLocal) mergedMap.set(n.id, n);
            for (const n of remote) {
                const existing = mergedMap.get(n.id);
                if (existing && Date.parse(existing.createdAt) > Date.parse(n.createdAt)) continue;
                mergedMap.set(n.id, n);
            }
            const merged = Array.from(mergedMap.values()).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
            await saveLocalNotifications(merged);
            return merged;
        } catch {
            return userLocal;
        }
    },

    async markAsRead(notificationId: string, userId: string): Promise<void> {
        const local = (await loadLocalNotifications()).map((n) =>
            n.id === notificationId && n.userId === userId ? { ...n, read: true } : n
        );
        await saveLocalNotifications(local);
        try {
            const raw = await kv.get(`notifications:${userId}:${notificationId}`);
            if (raw && typeof raw === 'object') {
                const notif = raw as ForumNotification;
                notif.read = true;
                await kv.set(`notifications:${userId}:${notificationId}`, notif);
            }
        } catch { /* silent */ }
    },

    async markAllAsRead(userId: string): Promise<void> {
        const local = (await loadLocalNotifications()).map((n) =>
            n.userId === userId ? { ...n, read: true } : n
        );
        await saveLocalNotifications(local);
        try {
            const remote = await kv.getByPrefix(`notifications:${userId}:`);
            if (Array.isArray(remote)) {
                // الكتابة بالتوازي بدلاً من sequential — أسرع بـ N× وأقل round-trips ضائعة
                await Promise.allSettled(
                    remote
                        .filter((n): n is ForumNotification => !!n && typeof n === 'object')
                        .map((n) => {
                            n.read = true;
                            return kv.set(`notifications:${n.userId}:${n.id}`, n);
                        }),
                );
            }
        } catch { /* silent */ }
    },

    async getUnreadCount(userId: string): Promise<number> {
        const notifs = await this.getNotifications(userId);
        return notifs.filter((n) => !n.read).length;
    },
};

// --- FORUM STATS ---

export async function getForumStats(): Promise<{
    totalPosts: number;
    totalComments: number;
    totalUpvotes: number;
    totalReports: number;
    pendingReports: number;
    totalDocuments: number;
    totalBannedUsers: number;
    topTags: { tag: string; count: number }[];
}> {
    const posts = await CommunityDB.listPosts();
    const reports = await getCommunityReports();
    const banned = await BanDB.listBannedUsers();
    const docs = await RepositoryDB.listDocuments();

    const tagCount = new Map<string, number>();
    for (const p of posts) {
        for (const t of p.tags) {
            tagCount.set(t, (tagCount.get(t) || 0) + 1);
        }
    }
    const topTags = Array.from(tagCount.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    return {
        totalPosts: posts.length,
        totalComments: posts.reduce((sum, p) => sum + p.comments.length, 0),
        totalUpvotes: posts.reduce((sum, p) => sum + p.upvoterIds.length, 0),
        totalReports: reports.length,
        pendingReports: reports.filter((r) => r.status === 'pending').length,
        totalDocuments: docs.length,
        totalBannedUsers: banned.length,
        topTags,
    };
}

// --- 2. CLOUD STORAGE INTELLIGENT VAULT ---

export type RepositoryDocument = {
    id: string;
    title: string;
    description: string;
    type: 'عقد' | 'قرار حكم' | 'عريضة' | 'بحث قانوني' | 'أخرى';
    authorId: string;
    authorName: string;
    uploadDate: string;
    fileName: string;
    mimeType: string;
    storagePath: string;
    fileSize: number;
    /** وسوم تصنيف إضافية (#تنفيذ، #مدني، …) */
    tags?: string[];
};

const REPOSITORY_LOCAL_KEY = 'hami:repository:docs:v1';

function normalizeRepositoryDocument(raw: unknown): RepositoryDocument | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id : null;
    const title = typeof o.title === 'string' ? o.title : null;
    const description = typeof o.description === 'string' ? o.description : null;
    const type = o.type;
    const authorId = typeof o.authorId === 'string' ? o.authorId : null;
    const authorName = typeof o.authorName === 'string' ? o.authorName : null;
    const uploadDate = typeof o.uploadDate === 'string' ? o.uploadDate : null;
    const fileName = typeof o.fileName === 'string' ? o.fileName : null;
    const mimeType = typeof o.mimeType === 'string' ? o.mimeType : '';
    const storagePath = typeof o.storagePath === 'string' ? o.storagePath : null;
    const fileSize = typeof o.fileSize === 'number' ? o.fileSize : 0;
    const validTypes = ['عقد', 'قرار حكم', 'عريضة', 'بحث قانوني', 'أخرى'] as const;
    if (
        !id ||
        !title ||
        !description ||
        !validTypes.includes(type as (typeof validTypes)[number]) ||
        !authorId ||
        !authorName ||
        !uploadDate ||
        !fileName ||
        !storagePath
    ) {
        return null;
    }
    const tags = Array.isArray(o.tags)
        ? (o.tags.filter((t) => typeof t === 'string') as string[])
        : undefined;
    return {
        id,
        title,
        description,
        type: type as RepositoryDocument['type'],
        authorId,
        authorName,
        uploadDate,
        fileName,
        mimeType,
        storagePath,
        fileSize,
        tags,
    };
}

async function loadLocalRepositoryDocs(): Promise<RepositoryDocument[]> {
    try {
        const raw = await SecureStoreService.getItem(REPOSITORY_LOCAL_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(normalizeRepositoryDocument).filter((d): d is RepositoryDocument => d !== null);
    } catch {
        return [];
    }
}

async function saveLocalRepositoryDocs(docs: RepositoryDocument[]): Promise<void> {
    try {
        await SecureStoreService.setItem(REPOSITORY_LOCAL_KEY, JSON.stringify(docs));
    } catch {
        // silent
    }
}

function mergeRepositoryDocs(local: RepositoryDocument[], remote: RepositoryDocument[]): RepositoryDocument[] {
    const map = new Map<string, RepositoryDocument>();
    for (const d of local) map.set(d.id, d);
    for (const d of remote) {
        const prev = map.get(d.id);
        if (!prev) {
            map.set(d.id, d);
            continue;
        }
        const prevTime = Number.isFinite(Date.parse(prev.uploadDate)) ? Date.parse(prev.uploadDate) : 0;
        const nextTime = Number.isFinite(Date.parse(d.uploadDate)) ? Date.parse(d.uploadDate) : 0;
        map.set(d.id, nextTime >= prevTime ? d : prev);
    }
    return Array.from(map.values());
}

export const RepositoryDB = {
    async listDocuments(): Promise<RepositoryDocument[]> {
        const localDocs = await loadLocalRepositoryDocs();
        try {
            const res = await kv.getByPrefix('repository:docs:');
            const remoteDocs = Array.isArray(res)
                ? res
                      .map(normalizeRepositoryDocument)
                      .filter((d): d is RepositoryDocument => d !== null)
                : [];
            const merged = mergeRepositoryDocs(localDocs, remoteDocs).sort(
                (a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
            );
            await saveLocalRepositoryDocs(merged);
            return merged;
        } catch {
            return localDocs.sort(
                (a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
            );
        }
    },

    async saveDocument(doc: RepositoryDocument): Promise<void> {
        const normalized = normalizeRepositoryDocument(doc);
        if (!normalized) throw new Error('بيانات المستند غير صالحة');
        const localDocs = await loadLocalRepositoryDocs();
        const merged = mergeRepositoryDocs(localDocs, [normalized]);
        await saveLocalRepositoryDocs(merged);
        if (isKvProxyNetworkEnabled()) {
            try {
                await kv.set(`repository:docs:${normalized.id}`, normalized);
            } catch {
                /* المحلي محفوظ — kv اختياري في التطوير */
            }
        }
    },

    async deleteDocument(docId: string): Promise<void> {
        const localDocs = await loadLocalRepositoryDocs();
        const target = localDocs.find((d) => d?.id === docId);
        await saveLocalRepositoryDocs(localDocs.filter((d) => d?.id !== docId));

        const storagePath = target?.storagePath?.trim();
        if (storagePath && !storagePath.startsWith('idb:forum:')) {
            try {
                await supabase.storage.from('make-f09713ba').remove([storagePath]);
            } catch {
                /* الملف قد يكون محذوفاً مسبقاً */
            }
        }

        if (isKvProxyNetworkEnabled()) {
            try {
                await kv.del(`repository:docs:${docId}`);
            } catch {
                /* المحلي محدّث — kv اختياري في التطوير */
            }
        }
    },
};

export async function getRepositoryDocuments(): Promise<RepositoryDocument[]> {
    return await RepositoryDB.listDocuments();
}

export async function addRepositoryDocument(doc: RepositoryDocument): Promise<void> {
    await RepositoryDB.saveDocument(doc);
}

export async function deleteRepositoryDocument(
    docId: string,
    requesterId?: string,
    requesterRole?: UserRole
): Promise<void> {
    if (requesterId) {
        const docs = await RepositoryDB.listDocuments();
        const doc = docs.find((d) => d.id === docId);
        if (!doc) throw new Error('المستند غير موجود');
        if (
            requesterId !== doc.authorId &&
            requesterRole !== UserRole.SUPER_ADMIN &&
            requesterRole !== UserRole.MODERATOR
        ) {
            throw new Error('ليس لديك صلاحية لحذف هذا المستند');
        }
    }
    await RepositoryDB.deleteDocument(docId);
}

export async function updateRepositoryDocument(
    doc: RepositoryDocument,
    requesterId?: string,
    requesterRole?: UserRole
): Promise<void> {
    if (requesterId) {
        const docs = await RepositoryDB.listDocuments();
        const existing = docs.find((d) => d.id === doc.id);
        if (!existing) throw new Error('المستند غير موجود');
        if (
            requesterId !== existing.authorId &&
            requesterRole !== UserRole.SUPER_ADMIN &&
            requesterRole !== UserRole.MODERATOR
        ) {
            throw new Error('ليس لديك صلاحية لتعديل هذا المستند');
        }
    }
    await RepositoryDB.saveDocument(doc);
}

export const LawyerStorage = {
    /**
     * Uploads a file to the specified smart folder.
     * @param userId The lawyer's ID
     * @param file The file object
     * @param category 'scans' | 'audio' | 'drafts' | 'repository'
     */
    async uploadSmartFile(userId: string, file: File, category: 'scans' | 'audio' | 'drafts' | 'repository' | 'vault') {
        const timestamp = Date.now();
        const looksLikeImage =
            file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name);
        let uploadFile = file;
        if (looksLikeImage) {
            try {
                uploadFile = await stripImageMetadata(file);
            } catch {
                uploadFile = file;
            }
        }
        const cleanName = uploadFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `${userId}/${category}/${timestamp}_${cleanName}`;

        const { data, error } = await supabase.storage
            .from('make-f09713ba')
            .upload(path, uploadFile);

        if (error) throw error;

        const { data: signedData } = await supabase.storage
            .from('make-f09713ba')
            .createSignedUrl(path, 60 * 60 * 24 * 7);

        return {
            path: path,
            fullPath: data.path,
            downloadUrl: signedData?.signedUrl
        };
    },

    async getSignedUrl(path: string): Promise<string | null> {
        try {
            const { data } = await supabase.storage
                .from('make-f09713ba')
                .createSignedUrl(path, 60 * 60 * 24 * 7);
            return data?.signedUrl ?? null;
        } catch {
            return null;
        }
    }
};

// ============================================================
//  SMARTER VAULT — المخزن الذكي (Smart Vault)
// ============================================================

export type SmartVaultDocType = 'pdf' | 'image';
export type SmartVaultFilterTag = 'الكل' | 'عقود' | 'طابو' | 'عرائض' | 'أخرى';

export type SmartVaultDoc = {
    id: string;
    title: string;
    type: SmartVaultDocType;
    tags: string[];
    authorId: string;
    createdAt: string;
    updatedAt: string;
    fileSize: number;
    fileName: string;
    mimeType: string;
    storagePath: string;
    signedUrl?: string | null;
    aiSummary?: string | null;
    /** ملاحظة/وصف يدوي من المحامي */
    lawyerNote?: string | null;
    /** تصنيف مخصص يختاره المحامي */
    customCategory?: string | null;
    isProcessing?: boolean;
    boundDossierId?: string | null;
};

const VAULT_LOCAL_KEY = 'hami:smartvault:docs:v1';

async function loadLocalVaultDocs(): Promise<SmartVaultDoc[]> {
    try {
        const raw = await SecureStoreService.getItem(VAULT_LOCAL_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed as SmartVaultDoc[];
    } catch {
        try {
            const raw = localStorage.getItem(VAULT_LOCAL_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed as SmartVaultDoc[];
        } catch {
            return [];
        }
    }
}

async function saveLocalVaultDocs(docs: SmartVaultDoc[]): Promise<void> {
    const payload = JSON.stringify(docs);
    try {
        await SecureStoreService.setItem(VAULT_LOCAL_KEY, payload);
        return;
    } catch {
        try {
            localStorage.setItem(VAULT_LOCAL_KEY, payload);
            return;
        } catch (e) {
            console.error('[Vault] Failed to persist vault docs:', e);
            throw new Error('vault persist failed');
        }
    }
}

function vaultDocPayloadForKv(doc: SmartVaultDoc): SmartVaultDoc {
    const path = doc.storagePath || '';
    if (isVaultIdbStoragePath(path)) {
        return { ...doc, signedUrl: null };
    }
    if (path.startsWith('local:vault:') && doc.signedUrl?.startsWith('data:')) {
        return { ...doc, signedUrl: null };
    }
    return doc;
}

function vaultDocsPersistSignature(docs: SmartVaultDoc[]): string {
    return docs
        .map(
            (d) =>
                `${d.id}\0${d.updatedAt}\0${d.storagePath}\0${d.signedUrl ? 1 : 0}\0${d.customCategory ?? ''}\0${d.title}`,
        )
        .join('\x01');
}

function mergeVaultDocs(local: SmartVaultDoc[], remote: SmartVaultDoc[]): SmartVaultDoc[] {
    const map = new Map<string, SmartVaultDoc>();
    for (const d of local) map.set(d.id, d);
    for (const d of remote) {
        const prev = map.get(d.id);
        if (!prev) {
            map.set(d.id, d);
            continue;
        }
        const prevTime = Number.isFinite(Date.parse(prev.updatedAt)) ? Date.parse(prev.updatedAt) : 0;
        const nextTime = Number.isFinite(Date.parse(d.updatedAt)) ? Date.parse(d.updatedAt) : 0;
        const winner = nextTime > prevTime ? d : prev;
        const other = nextTime > prevTime ? prev : d;
        map.set(d.id, {
            ...winner,
            signedUrl: winner.signedUrl ?? other.signedUrl ?? null,
            storagePath: winner.storagePath || other.storagePath,
        });
    }
    return Array.from(map.values());
}

export const SmartVaultDB = {
    async listDocs(userId?: string): Promise<SmartVaultDoc[]> {
        if (!userId?.trim()) return [];
        const uid = userId.trim();
        const localDocs = (await loadLocalVaultDocs()).filter((d) => d.authorId === uid);
        try {
            const raw = await kv.getByPrefix(`vault:docs:${uid}:`);
            const remoteDocs = Array.isArray(raw)
                ? raw.filter((d): d is SmartVaultDoc => {
                      if (!d || typeof d !== 'object') return false;
                      const o = d as Record<string, unknown>;
                      return (
                          typeof o.id === 'string' &&
                          typeof o.title === 'string' &&
                          o.authorId === uid
                      );
                  })
                : [];
            const mergedForUser = mergeVaultDocs(localDocs, remoteDocs)
                .filter((d) => d.authorId === uid)
                .sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
            const allLocal = await loadLocalVaultDocs();
            const others = allLocal.filter((d) => d.authorId !== uid);
            const nextLocal = [...others, ...mergedForUser];
            const prevUserSig = vaultDocsPersistSignature(allLocal.filter((d) => d.authorId === uid));
            const nextUserSig = vaultDocsPersistSignature(mergedForUser);
            if (prevUserSig !== nextUserSig) {
                await saveLocalVaultDocs(nextLocal);
            }
            return mergedForUser;
        } catch {
            return localDocs.sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
        }
    },

    async saveDoc(doc: SmartVaultDoc): Promise<void> {
        if (!doc.authorId || typeof doc.authorId !== 'string') {
            throw new Error('authorId مطلوب لحفظ الملف');
        }
        const localDocs = await loadLocalVaultDocs();
        const merged = mergeVaultDocs(localDocs, [doc]);
        try {
            await kv.set(`vault:docs:${doc.authorId}:${doc.id}`, vaultDocPayloadForKv(doc));
        } catch {
            // Cloud-First: save locally even if remote fails
        }
        await saveLocalVaultDocs(merged);
    },

    async deleteDoc(docId: string, authorId: string): Promise<void> {
        if (!authorId || !docId) throw new Error('معرف الملف والمستخدم مطلوب');
        const localDocs = await loadLocalVaultDocs();
        const localDoc = localDocs.find((d) => d?.id === docId && d.authorId === authorId);
        try {
            const raw = await kv.get(`vault:docs:${authorId}:${docId}`);
            if (raw && typeof raw === 'object') {
                const doc = raw as SmartVaultDoc;
                const path = doc.storagePath || '';
                if (path && !path.startsWith('local:') && !isVaultIdbStoragePath(path)) {
                    await supabase.storage.from('make-f09713ba').remove([path]);
                }
            }
        } catch {
            // continue — try KV deletion even if Storage fails
        }
        try {
            await kv.del(`vault:docs:${authorId}:${docId}`);
        } catch {
            // Cloud-First: delete locally even if remote fails
        }
        if (localDoc?.storagePath && isVaultIdbStoragePath(localDoc.storagePath)) {
            await deleteVaultBlobByPath(localDoc.storagePath);
        }
        const remaining = localDocs.filter((d) => d?.id !== docId);
        await saveLocalVaultDocs(remaining);
    },

    async updateDoc(doc: SmartVaultDoc, requesterId?: string): Promise<void> {
        if (requesterId && doc.authorId !== requesterId) {
            throw new Error('غير مصرح بتعديل هذا الملف');
        }
        await this.saveDoc(doc);
    },

    async bindToDossier(docId: string, authorId: string, dossierId: string): Promise<void> {
        if (!docId || !authorId || !dossierId) throw new Error('جميع الحقول مطلوبة');

        let doc: SmartVaultDoc | null = null;
        const localDocs = await loadLocalVaultDocs();
        const localIdx = localDocs.findIndex((d) => d.id === docId);
        if (localIdx !== -1) {
            doc = localDocs[localIdx];
        } else {
            try {
                const raw = await kv.get(`vault:docs:${authorId}:${docId}`);
                if (raw && typeof raw === 'object') {
                    doc = raw as SmartVaultDoc;
                }
            } catch {
                // not found remotely either
            }
        }
        if (!doc) throw new Error('الملف غير موجود');
        if (doc.authorId !== authorId) throw new Error('غير مصرح بربط هذا الملف');

        const updated: SmartVaultDoc = { ...doc, boundDossierId: dossierId, updatedAt: new Date().toISOString() };
        try {
            await kv.set(`vault:docs:${authorId}:${docId}`, vaultDocPayloadForKv(updated));
        } catch {
            // Cloud-First: save locally even if remote fails
        }
        const merged = mergeVaultDocs(localDocs, [updated]);
        await saveLocalVaultDocs(merged);
    },

    async getSignedUrl(storagePath: string): Promise<string | null> {
        return await LawyerStorage.getSignedUrl(storagePath);
    },
};

// ============================================================
//  CALENDAR EVENTS — التقويم الذكي
// ============================================================

export type CalendarEventType = 'hearing' | 'deadline' | 'consultation' | 'execution' | 'custom';

export type CalendarEvent = {
    id: string;
    userId: string;
    title: string;
    date: string;       // YYYY-MM-DD
    time?: string;       // HH:MM
    endTime?: string;    // HH:MM
    type: CalendarEventType;
    location?: string;
    notes?: string;
    clientName?: string;
    clientPhone?: string;
    caseId?: string;
    caseNo?: string;
    isCompleted?: boolean;
    revenue?: string;
    createdAt: string;
    updatedAt: string;
    /** حقول اختيارية — ربط التقويم بالأقسام (لا تؤثر على الواجهات القديمة) */
    sourceModule?:
        | 'lawsuit'
        | 'execution'
        | 'urgent'
        | 'transaction'
        | 'criminal'
        | 'threading'
        | 'task'
        | 'note'
        | 'manual';
    sourceEntityId?: string;
    sourceEventId?: string;
    partiesSummary?: string;
    court?: string;
    sourceLabel?: string;
};

const CALENDAR_LOCAL_KEY = 'hami:calendar:events:v1';

// ============== في-tick dedup لـ kv.getByPrefix ==============
// المشكلة الأصلية كانت: في tick واحد قد يُستدعى `kv.getByPrefix('calendar:uid:')`
// عشرات المرات (كل upsert من dossier sync يُستدعيها). نُجمّع هذه الطلبات في
// promise واحد، ونُلغيها فور انتهائها (لا تُسرّب staleness بين الاختبارات).
const inFlightPrefixFetches = new Map<string, Promise<unknown[]>>();
function fetchPrefixOnceInTick(prefix: string): Promise<unknown[]> {
    const existing = inFlightPrefixFetches.get(prefix);
    if (existing) return existing;
    const p = (async (): Promise<unknown[]> => {
        try {
            const res = await kv.getByPrefix(prefix);
            return Array.isArray(res) ? res : [];
        } catch {
            return [];
        }
    })();
    inFlightPrefixFetches.set(prefix, p);
    // تنظيف فوري بعد resolve/reject
    p.finally(() => {
        if (inFlightPrefixFetches.get(prefix) === p) {
            inFlightPrefixFetches.delete(prefix);
        }
    });
    return p;
}

async function loadLocalCalendarEvents(): Promise<CalendarEvent[]> {
    try {
        const raw = await SecureStoreService.getItem(CALENDAR_LOCAL_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed as CalendarEvent[];
    } catch {
        try {
            const raw = localStorage.getItem(CALENDAR_LOCAL_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed as CalendarEvent[];
        } catch {
            return [];
        }
    }
}

async function saveLocalCalendarEvents(events: CalendarEvent[]): Promise<void> {
    const payload = JSON.stringify(events);
    try {
        await SecureStoreService.setItem(CALENDAR_LOCAL_KEY, payload);
    } catch {
        try {
            localStorage.setItem(CALENDAR_LOCAL_KEY, payload);
        } catch {
            console.error('[Calendar] Failed to persist events');
        }
    }
}

function mergeCalendarEvents(local: CalendarEvent[], remote: CalendarEvent[]): CalendarEvent[] {
    const map = new Map<string, CalendarEvent>();
    for (const e of local) map.set(e.id, e);
    for (const e of remote) {
        const prev = map.get(e.id);
        if (!prev) { map.set(e.id, e); continue; }
        const prevTime = Number.isFinite(Date.parse(prev.updatedAt)) ? Date.parse(prev.updatedAt) : 0;
        const nextTime = Number.isFinite(Date.parse(e.updatedAt)) ? Date.parse(e.updatedAt) : 0;
        map.set(e.id, nextTime > prevTime ? e : prev);
    }
    return Array.from(map.values());
}

export const CalendarDB = {
    /** كل الأحداث المحلية بغض النظر عن userId — للتنظيف والترحيل */
    async getAllStoredEvents(): Promise<CalendarEvent[]> {
        return loadLocalCalendarEvents();
    },

    /**
     * يقرأ أحداث المستخدم. يُسقط الأحداث المحذوفة (tombstones) لمنع
     * deletion-resurrection بين الأجهزة.
     *
     * تحسين الأداء: عند تكرار `kv.getByPrefix` في نفس الـ tick (مثل تركيب
     * عدة `useEntityCalendarEvents` معاً) → نُجمّعها في طلب واحد.
     */
    async getEvents(userId: string): Promise<CalendarEvent[]> {
        // قراءة tombstones سريعة (localStorage فقط، cloud sync في الخلفية)
        const tombstonesPromise = (async (): Promise<Set<string>> => {
            try {
                const m = await import('@/app/services/calendarTombstones');
                return await m.loadTombstoneIds(userId);
            } catch {
                return new Set<string>();
            }
        })();
        const [local, tombstones] = await Promise.all([
            loadLocalCalendarEvents(),
            tombstonesPromise,
        ]);
        const userLocal = local.filter((e) => e.userId === userId && !tombstones.has(e.id));

        try {
            const res = await fetchPrefixOnceInTick(`calendar:${userId}:`);
            const remote = res.filter((e): e is CalendarEvent => {
                if (!e || typeof e !== 'object') return false;
                const o = e as Record<string, unknown>;
                if (typeof o.id !== 'string' || typeof o.title !== 'string') return false;
                return !tombstones.has(o.id);
            });
            const merged = mergeCalendarEvents(userLocal, remote).sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            await saveLocalCalendarEvents(merged);
            return merged;
        } catch {
            return userLocal.sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        }
    },

    async saveEvent(event: CalendarEvent): Promise<void> {
        if (!event.userId) throw new Error('userId مطلوب لحفظ الموعد');
        const local = await loadLocalCalendarEvents();
        const merged = mergeCalendarEvents(local, [event]);
        try {
            await kv.set(`calendar:${event.userId}:${event.id}`, event);
        } catch {
            // Cloud-First
        }
        await saveLocalCalendarEvents(merged);
    },

    /**
     * يحفظ مجموعة أحداث دفعة واحدة (O(N + K) بدل O(N * K)).
     * - يقرأ localStorage مرة واحدة
     * - يدمج كل الأحداث في صف واحد
     * - يكتب localStorage مرة واحدة
     * - يُرسل kv.set بالتوازي (مع احترام rate limit)
     *
     * الفشل في cloud لا يُلقي خطأ (cloud-first).
     */
    async saveEventsBatch(events: CalendarEvent[]): Promise<void> {
        if (!Array.isArray(events) || events.length === 0) return;
        // فلترة الأحداث بدون userId
        const valid = events.filter((e) => e && typeof e.userId === 'string' && e.userId);
        if (valid.length === 0) return;

        const local = await loadLocalCalendarEvents();
        const merged = mergeCalendarEvents(local, valid);
        await saveLocalCalendarEvents(merged);

        // الكتابة السحابية بالتوازي — كل failure مستقل
        await Promise.allSettled(
            valid.map((e) => kv.set(`calendar:${e.userId}:${e.id}`, e)),
        );
    },

    /**
     * يحذف حدثاً ويُسجّل tombstone لمنع الإحياء من جهاز آخر.
     */
    async deleteEvent(eventId: string, userId: string): Promise<void> {
        if (!eventId || !userId) throw new Error('معرف الموعد والمستخدم مطلوب');

        // tombstone أولاً (سحابة + محلي) — يمنع الإحياء عند المزامنة التالية
        try {
            const tomb = await import('@/app/services/calendarTombstones');
            await tomb.recordTombstone(userId, eventId);
        } catch {
            /* غير حاسم */
        }

        try {
            await kv.del(`calendar:${userId}:${eventId}`);
        } catch {
            // Cloud-First
        }
        const local = (await loadLocalCalendarEvents()).filter((e) => e.id !== eventId);
        await saveLocalCalendarEvents(local);
    },

    async updateEvent(event: CalendarEvent): Promise<void> {
        await this.saveEvent(event);
    },
};

// ============================================================
//  TRANSACTIONS — نظام المعاملات
// ============================================================

const TRANSACTIONS_LOCAL_KEY = 'hami:transactions:v1';

type DateProps<T> = T extends Date ? string : T;

function serializeTransaction(tx: any): any {
    return JSON.parse(JSON.stringify(tx));
}

function reviveDates(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
            obj[key] = new Date(val);
        } else if (Array.isArray(val)) {
            obj[key] = val.map(reviveDates);
        } else if (val && typeof val === 'object') {
            obj[key] = reviveDates(val);
        }
    }
    return obj;
}

async function loadLocalTransactions(): Promise<any[]> {
    try {
        const raw = await SecureStoreService.getItem(TRANSACTIONS_LOCAL_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(reviveDates) : [];
    } catch {
        try {
            const raw = localStorage.getItem(TRANSACTIONS_LOCAL_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.map(reviveDates) : [];
        } catch {
            return [];
        }
    }
}

async function saveLocalTransactions(transactions: any[]): Promise<void> {
    const payload = JSON.stringify(transactions.map(serializeTransaction));
    try {
        await SecureStoreService.setItem(TRANSACTIONS_LOCAL_KEY, payload);
    } catch {
        try {
            localStorage.setItem(TRANSACTIONS_LOCAL_KEY, payload);
        } catch {
            console.error('[TransactionDB] Failed to persist');
        }
    }
}

export const TransactionDB = {
    async getTransactions(userId: string): Promise<any[]> {
        const local = await loadLocalTransactions();
        const userLocal = local.filter((t: any) => t.userId === userId);
        try {
            const res = await kv.getByPrefix(`transactions:${userId}:`);
            const remote = Array.isArray(res) ? res.filter((t: any) => t && typeof t.id === 'string').map(reviveDates) : [];
            const merged = mergeTransactions(userLocal, remote);
            await saveLocalTransactions(merged);
            return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } catch {
            return userLocal.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
    },

    async saveTransaction(transaction: any): Promise<void> {
        if (!transaction.userId || !transaction.id) throw new Error('userId و id مطلوبان');
        const local = await loadLocalTransactions();
        const merged = mergeTransactions(local, [transaction]);
        try {
            await kv.set(`transactions:${transaction.userId}:${transaction.id}`, serializeTransaction(transaction));
        } catch { /* Cloud-First */ }
        await saveLocalTransactions(merged);
    },

    async deleteTransaction(txId: string, userId: string): Promise<void> {
        try {
            await kv.del(`transactions:${userId}:${txId}`);
        } catch { /* Cloud-First */ }
        const local = (await loadLocalTransactions()).filter((t: any) => t.id !== txId);
        await saveLocalTransactions(local);
    },

    async updateTransaction(transaction: any): Promise<void> {
        await this.saveTransaction(transaction);
    },
};

function mergeTransactions(local: any[], remote: any[]): any[] {
    const map = new Map<string, any>();
    for (const t of local) map.set(t.id, t);
    for (const t of remote) {
        const prev = map.get(t.id);
        if (!prev) { map.set(t.id, t); continue; }
        const prevTime = prev.updatedAt ? new Date(prev.updatedAt).getTime() : 0;
        const nextTime = t.updatedAt ? new Date(t.updatedAt).getTime() : 0;
        map.set(t.id, nextTime > prevTime ? t : prev);
    }
    return Array.from(map.values());
}

type TransactionsThreadingState = {
    schemaVersion: 1;
    userId: string;
    updatedAt: string;
    transactions: any[];
    tasks: any[];
    financeRecords: any[];
    documents: any[];
};

const TRANSACTIONS_THREADING_LOCAL_KEY_PREFIX = 'hami:transactionsThreading:v1:';

function getTransactionsThreadingLocalKey(userId: string) {
    return `${TRANSACTIONS_THREADING_LOCAL_KEY_PREFIX}${userId}`;
}

async function loadLocalTransactionsThreadingState(userId: string): Promise<TransactionsThreadingState | null> {
    const key = getTransactionsThreadingLocalKey(userId);
    try {
        const raw = await SecureStoreService.getItem(key);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        const s = parsed as Partial<TransactionsThreadingState>;
        if (s.userId !== userId) return null;
        if (!Array.isArray(s.transactions) || !Array.isArray(s.tasks) || !Array.isArray(s.financeRecords) || !Array.isArray(s.documents)) return null;
        const schemaVersion = s.schemaVersion === 1 ? 1 : 1;
        return { schemaVersion, userId, updatedAt: String(s.updatedAt ?? ''), transactions: s.transactions, tasks: s.tasks, financeRecords: s.financeRecords, documents: s.documents };
    } catch {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed: unknown = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            const s = parsed as Partial<TransactionsThreadingState>;
            if (s.userId !== userId) return null;
            if (!Array.isArray(s.transactions) || !Array.isArray(s.tasks) || !Array.isArray(s.financeRecords) || !Array.isArray(s.documents)) return null;
            const schemaVersion = s.schemaVersion === 1 ? 1 : 1;
            return { schemaVersion, userId, updatedAt: String(s.updatedAt ?? ''), transactions: s.transactions, tasks: s.tasks, financeRecords: s.financeRecords, documents: s.documents };
        } catch {
            return null;
        }
    }
}

async function saveLocalTransactionsThreadingState(userId: string, state: TransactionsThreadingState): Promise<void> {
    const key = getTransactionsThreadingLocalKey(userId);
    const payload = JSON.stringify(state);
    try {
        await SecureStoreService.setItem(key, payload);
    } catch {
        try {
            localStorage.setItem(key, payload);
        } catch {
            console.error('[TransactionsThreadingDB] Failed to persist');
        }
    }
}

export const TransactionsThreadingDB = {
    async getState(userId: string): Promise<TransactionsThreadingState | null> {
        const local = await loadLocalTransactionsThreadingState(userId);
        try {
            const remote = await kv.get(`transactionsThreading:${userId}:state`);
            if (remote && typeof remote === 'object') {
                const r0 = remote as Partial<TransactionsThreadingState>;
                const r: TransactionsThreadingState | null =
                    r0.userId === userId && Array.isArray(r0.transactions) && Array.isArray(r0.tasks) && Array.isArray(r0.financeRecords) && Array.isArray(r0.documents)
                        ? {
                              schemaVersion: 1,
                              userId,
                              updatedAt: String(r0.updatedAt ?? ''),
                              transactions: r0.transactions,
                              tasks: r0.tasks,
                              financeRecords: r0.financeRecords,
                              documents: r0.documents,
                          }
                        : null;
                if (!r) return local;
                const rTime = Number.isFinite(Date.parse(r.updatedAt)) ? Date.parse(r.updatedAt) : 0;
                const lTime = local && Number.isFinite(Date.parse(local.updatedAt)) ? Date.parse(local.updatedAt) : 0;
                const merged = rTime >= lTime ? r : local;
                if (merged) {
                    await saveLocalTransactionsThreadingState(userId, merged);
                    if (merged === local && local) {
                        try {
                            await kv.set(`transactionsThreading:${userId}:state`, local);
                        } catch {
                            // Cloud-First
                        }
                    }
                }
                return merged ?? null;
            }
        } catch {
            // Cloud-First
        }
        if (local) {
            try {
                await kv.set(`transactionsThreading:${userId}:state`, local);
            } catch {
                // Cloud-First
            }
        }
        return local;
    },

    async saveState(
        userId: string,
        input: { transactions: any[]; tasks: any[]; financeRecords: any[]; documents: any[] },
    ): Promise<void> {
        const state: TransactionsThreadingState = {
            schemaVersion: 1,
            userId,
            updatedAt: new Date().toISOString(),
            transactions: Array.isArray(input.transactions) ? input.transactions : [],
            tasks: Array.isArray(input.tasks) ? input.tasks : [],
            financeRecords: Array.isArray(input.financeRecords) ? input.financeRecords : [],
            documents: Array.isArray(input.documents) ? input.documents : [],
        };
        try {
            await kv.set(`transactionsThreading:${userId}:state`, state);
        } catch {
            // Cloud-First
        }
        await saveLocalTransactionsThreadingState(userId, state);
    },

    async clearState(userId: string): Promise<void> {
        try {
            await kv.del(`transactionsThreading:${userId}:state`);
        } catch {
            // Cloud-First
        }
        const key = getTransactionsThreadingLocalKey(userId);
        try {
            await SecureStoreService.setItem(key, '');
        } catch {
            try {
                localStorage.removeItem(key);
            } catch {
                // ignore
            }
        }
    },
};

export { UrgentActionsDB } from './urgent-actions-db';

// ============================================================
//  PROFILE — بيانات الملف الشخصي
// ============================================================

const PROFILE_LOCAL_KEY_PREFIX = 'hami:profile:v1:';

export const LAWYER_PROFILE_UPDATED = 'hami:lawyer-profile-updated';

export interface LawyerProfileHeader {
    name: string;
    title: string;
    coverImage: string;
    profileImage: string;
    profileImagePath?: string;
    coverImagePath?: string;
    phone?: string;
    city?: string;
    workplace?: string;
    specialization?: string;
    practiceSinceYear?: number;
    syndicateId?: string;
}

export interface ProfileStat {
    id: string;
    label: string;
    value: string;
}

export interface ProfileAction {
    id: string;
    type: 'whatsapp' | 'call' | 'email' | 'website' | 'location';
    label: string;
    value: string;
}

export interface LawyerProfileSection {
    id: string;
    type: 'stats' | 'bio' | 'gallery' | 'actions';
    data: ProfileStat[] | string[] | string | ProfileAction[];
}

export interface LawyerProfileData {
    header: LawyerProfileHeader;
    sections: LawyerProfileSection[];
}

const DEFAULT_PROFILE: LawyerProfileData = {
    header: {
        name: '',
        title: 'المحامي والمستشار القانوني',
        coverImage: '',
        profileImage: '',
        phone: '',
        city: '',
        workplace: '',
        specialization: '',
    },
    sections: [
        { id: 'bio-1', type: 'bio', data: '' },
        { id: 'actions-1', type: 'actions', data: [] },
        { id: 'gallery-1', type: 'gallery', data: [] },
    ],
};

function getProfileLocalKey(userId: string): string {
    return `${PROFILE_LOCAL_KEY_PREFIX}${userId}`;
}

async function loadLocalProfile(userId: string): Promise<LawyerProfileData | null> {
    try {
        const raw = await SecureStoreService.getItem(getProfileLocalKey(userId));
        if (!raw) return null;
        return JSON.parse(raw) as LawyerProfileData;
    } catch { return null; }
}

async function saveLocalProfile(userId: string, profile: LawyerProfileData): Promise<void> {
    try {
        await SecureStoreService.setItem(getProfileLocalKey(userId), JSON.stringify(profile));
    } catch { /* ignore */ }
}

async function resolveProfileMedia(header: LawyerProfileHeader): Promise<LawyerProfileHeader> {
    const next = { ...header };
    next.profileImage = await refreshProfileMediaUrl(next.profileImagePath, next.profileImage);
    next.coverImage = await refreshProfileMediaUrl(next.coverImagePath, next.coverImage);
    return next;
}

async function finalizeProfile(raw: LawyerProfileData, userId: string): Promise<LawyerProfileData> {
    const cleaned = sanitizeLawyerProfile(raw);
    const header = await resolveProfileMedia(cleaned.header);
    const profile = { ...cleaned, header };
    await saveLocalProfile(userId, profile);
    return profile;
}

export const ProfileDB = {
    async getProfile(userId: string): Promise<LawyerProfileData> {
        try {
            const res = await kv.get(`profile:${userId}`);
            if (res) {
                const remote = res as LawyerProfileData;
                return finalizeProfile(remote, userId);
            }
        } catch { /* Cloud-First */ }
        const local = await loadLocalProfile(userId);
        if (local) return finalizeProfile(local, userId);
        return { ...DEFAULT_PROFILE, header: { ...DEFAULT_PROFILE.header } };
    },

    async saveProfile(userId: string, profile: LawyerProfileData): Promise<void> {
        try {
            await kv.set(`profile:${userId}`, profile);
        } catch { /* Cloud-First */ }
        await saveLocalProfile(userId, profile);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(LAWYER_PROFILE_UPDATED, { detail: { userId } }));
        }
    },
};
