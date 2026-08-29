import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { UserRole } from '@/app/types/admin-types';
import SecureStoreService from '@/app/services/SecureStoreService';
import { uuidv4 } from '@/app/services/cloud/lawyerCloudKv';
import { isVaultIdbStoragePath } from '@/app/services/vault/vaultBlobPathLite';
import { compareCommunityPostsForFeed } from '@/app/services/forum/forumUrgentConsultation';
import {
    persistSecurePayloadWhenReady,
    readSecureOrDrainLegacySync,
    readSecurePayloadWhenReady,
    writeSecureAndClearLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';
import type {
    BanRecord,
    CommunityAttachment,
    CommunityComment,
    CommunityPost,
    CommunityReport,
    ForumEditHistoryEntry,
} from '@/app/services/cloud/lawyerCommunityTypes';

export type {
    BanRecord,
    CommunityAttachment,
    CommunityComment,
    CommunityPost,
    CommunityReport,
    FollowRecord,
    ForumEditHistoryEntry,
    ForumNotification,
    NotificationType,
} from '@/app/services/cloud/lawyerCommunityTypes';

function isRemoteStorageObjectPath(path: string): boolean {
    const p = path.trim();
    if (!p) return false;
    if (p.startsWith('idb:') || p.startsWith('local:')) return false;
    if (isVaultIdbStoragePath(p)) return false;
    return true;
}

async function removeStoragePathsBestEffort(paths: string[]): Promise<void> {
    const toRemove = [...new Set(paths.map((p) => p.trim()).filter(isRemoteStorageObjectPath))];
    if (toRemove.length === 0) return;
    try {
        await SecureAPIClient.fetchSecure('/api/upload/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paths: toRemove }),
        });
    } catch {
        console.warn('[LawyerStorage] ┘╪┤┘ ╪ص╪░┘ ┘à┘┘(╪د╪ز) ┘à┘ ╪د┘┘à╪«╪▓┘:', toRemove.join(', '));
    }
}

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

function parseCommunityPostsRaw(raw: string | null | undefined): CommunityPost[] | null {
    if (raw == null) return null;
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed as CommunityPost[];
    } catch {
        return null;
    }
}

/** قراءة فورية — SecureStore ثم ترحيل مرآة localStorage القديمة */
function readCommunityPostsFromMirrors(): CommunityPost[] | null {
    const raw = readSecureOrDrainLegacySync(COMMUNITY_LOCAL_KEY);
    if (raw == null) return null;
    return parseCommunityPostsRaw(raw);
}

async function loadLocalCommunityPosts(): Promise<CommunityPost[]> {
    if (typeof window === 'undefined') {
        return getServerDevForumPosts();
    }

    const mirrored = readCommunityPostsFromMirrors();
    if (mirrored !== null) return mirrored;

    try {
        const raw = await readSecurePayloadWhenReady(COMMUNITY_LOCAL_KEY);
        return parseCommunityPostsRaw(raw) ?? [];
    } catch {
        return readCommunityPostsFromMirrors() ?? [];
    }
}

/**
 * `hami:community:posts:v1` مفتاح محمي: حارس المسح يرفض استبداله بمصفوفة فارغة.
 * الحفظ يكتب SecureStore أولاً ويمحو مرآة localStorage — لا تظليل بـ `[]` صريح.
 *
 * الحذف المقصود يُرشَّح من `hami:community:deleted-ids:v1`، لا بكون المصفوفة فارغة.
 */
async function persistCommunityPostsToSecureStore(payload: string): Promise<void> {
    try {
        await persistSecurePayloadWhenReady(COMMUNITY_LOCAL_KEY, payload);
    } catch {
        /* setItemSync يملأ الكاش إن نجح */
    }
}

async function saveLocalCommunityPosts(posts: CommunityPost[]): Promise<void> {
    if (typeof window === 'undefined') {
        const g = globalThis as unknown as Record<symbol, CommunityPost[]>;
        g[DEV_SERVER_FORUM_STORE] = posts;
        return;
    }
    const payload = JSON.stringify(posts);
    writeSecureAndClearLegacySync(COMMUNITY_LOCAL_KEY, payload);
    void persistCommunityPostsToSecureStore(payload);
}

/** يثبّت منشوراً في SecureStore فوراً دون انتظار قفل/KV */
export function syncCommunityPostToLocalMirror(post: CommunityPost): void {
    if (typeof window === 'undefined') return;
    const normalized = normalizeCommunityPost(post);
    if (!normalized) return;
    const mirrored = readCommunityPostsFromMirrors() ?? [];
    const merged = sortCommunityPosts(mergePostsById(mirrored, [normalized]));
    writeSecureAndClearLegacySync(COMMUNITY_LOCAL_KEY, JSON.stringify(merged));
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

function parseDeletedCommunityPostIdsRaw(raw: string | null | undefined): Set<string> {
    if (!raw) return new Set();
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set();
        return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0));
    } catch {
        return new Set();
    }
}

/** قراءة فورية — SecureStore ثم ترحيل مرآة localStorage القديمة */
function readDeletedCommunityPostIdsFromMirrors(): Set<string> | null {
    const raw = readSecureOrDrainLegacySync(COMMUNITY_DELETED_IDS_KEY);
    if (raw == null) return null;
    return parseDeletedCommunityPostIdsRaw(raw);
}

async function persistDeletedCommunityPostIdsToSecureStore(payload: string): Promise<void> {
    try {
        await persistSecurePayloadWhenReady(COMMUNITY_DELETED_IDS_KEY, payload);
    } catch {
        /* setItemSync يملأ الكاش إن نجح */
    }
}

async function loadDeletedCommunityPostIds(): Promise<Set<string>> {
    if (typeof window === 'undefined') {
        return new Set(getServerDevDeletedIds());
    }

    const mirrored = readDeletedCommunityPostIdsFromMirrors();
    if (mirrored !== null) return mirrored;

    try {
        const raw = await readSecurePayloadWhenReady(COMMUNITY_DELETED_IDS_KEY);
        return parseDeletedCommunityPostIdsRaw(raw);
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
    const payload = JSON.stringify([...ids]);
    writeSecureAndClearLegacySync(COMMUNITY_DELETED_IDS_KEY, payload);
    void persistDeletedCommunityPostIdsToSecureStore(payload);
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
    if (!requesterId) return false;
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
                  const url = typeof a.url === 'string' ? a.url.trim() : '';
                  const name = typeof a.name === 'string' ? a.name : null;
                  const storagePath = typeof a.storagePath === 'string' ? a.storagePath.trim() : '';
                  if (!type || !name || (!url && !storagePath)) {
                      return null;
                  }
                  const mimeType = typeof a.mimeType === 'string' ? a.mimeType : undefined;
                  return {
                      type,
                      ...(url ? { url } : {}),
                      name,
                      mimeType,
                      storagePath: storagePath || undefined,
                  };
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
    const isLocked = typeof o.isLocked === 'boolean' ? o.isLocked : undefined;
    const groupId =
        typeof o.groupId === 'string'
            ? o.groupId
            : typeof o.group_id === 'string'
              ? o.group_id
              : o.groupId === null || o.group_id === null
                ? null
                : undefined;
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
        isLocked,
        groupId,
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

    const localCloud = isCloudStoragePath(la!.storagePath);
    const remoteCloud = isCloudStoragePath(ra!.storagePath);
    if (localCloud && !remoteCloud) return la;
    if (remoteCloud && !localCloud) return ra;

    const localStable = Boolean(la!.url && !la!.url.startsWith('blob:'));
    const remoteStable = Boolean(ra!.url && !ra!.url.startsWith('blob:'));
    if (localStable && !remoteStable) return la;
    if (remoteStable && !localStable) return ra;

    return la!.storagePath && !ra!.storagePath ? la : ra!.storagePath && !la!.storagePath ? ra : la;
}

function isCloudStoragePath(path: string | undefined | null): boolean {
    const trimmed = path?.trim() ?? '';
    return Boolean(trimmed && !trimmed.startsWith('idb:forum:'));
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
    return [...posts].sort((a, b) => compareCommunityPostsForFeed(a, b));
}

function mergePostsById(localPosts: CommunityPost[], remotePosts: CommunityPost[]): CommunityPost[] {
    return mergeCommunityPostsById(localPosts, remotePosts);
}

async function findLocalCommunityPostById(postId: string): Promise<CommunityPost | null> {
    const mirrored = readCommunityPostsFromMirrors();
    const rawPosts = mirrored !== null ? mirrored : await loadLocalCommunityPosts();
    const hit = rawPosts.find((p) => p?.id === postId);
    if (!hit) return null;
    return normalizeCommunityPost(hit);
}

export const CommunityDB = {
    async listPosts(): Promise<CommunityPost[]> {
        const deletedIds = await loadDeletedCommunityPostIds();
        const mirrored = readCommunityPostsFromMirrors();
        const rawPosts = mirrored !== null ? mirrored : await loadLocalCommunityPosts();
        const localPosts = rawPosts
            .map((p) => normalizeCommunityPost(p))
            .filter((p): p is CommunityPost => p !== null);
        const withoutDeleted = filterDeletedCommunityPosts(localPosts, deletedIds);
        const sorted = sortCommunityPosts(withoutDeleted);
        return sorted;
    },

    async savePost(post: CommunityPost): Promise<void> {
        return withCommunityPostsWriteLock(async () => {
            const normalized = normalizeCommunityPost(post);
            if (!normalized) throw new Error('╪ذ┘è╪د┘╪د╪ز ╪د┘┘à┘╪┤┘ê╪▒ ╪║┘è╪▒ ╪╡╪د┘╪ص╪ر');
            const mirrored = readCommunityPostsFromMirrors();
            const localPosts = mirrored !== null ? mirrored : await loadLocalCommunityPosts();
            const merged = mergePostsById(localPosts, [normalized]).sort((a, b) => {
                const aPin = a.isPinned ? 1 : 0;
                const bPin = b.isPinned ? 1 : 0;
                return bPin - aPin || Date.parse(b.createdAt) - Date.parse(a.createdAt);
            });
            await saveLocalCommunityPosts(merged);
        });
    },

    /** ╪ص┘╪╕ ╪»┘╪╣┘è ╪ت┘à┘ ظ¤ ┘è┘à┘╪╣ ┘┘é╪»╪د┘ ┘à┘╪┤┘ê╪▒╪د╪ز ╪╣┘╪» ╪د┘┘à╪▓╪د┘à┘╪ر */
    async persistPostsBatch(posts: CommunityPost[]): Promise<void> {
        return withCommunityPostsWriteLock(async () => {
            const deletedIds = await loadDeletedCommunityPostIds();
            const incoming = posts
                .map((p) => normalizeCommunityPost(p))
                .filter((p): p is CommunityPost => p !== null);
            const mirrored = readCommunityPostsFromMirrors();
            const existing = mirrored !== null ? mirrored : await loadLocalCommunityPosts();
            const merged = sortCommunityPosts(
                filterDeletedCommunityPosts(mergePostsById(existing, incoming), deletedIds),
            );
            await saveLocalCommunityPosts(merged);
        });
    },

    async deletePost(postId: string): Promise<void> {
        return withCommunityPostsWriteLock(async () => {
            const existing = await findLocalCommunityPostById(postId);
            const attachmentPath = existing?.attachment?.storagePath?.trim() || null;

            await markCommunityPostDeleted(postId);
            const mirrored = readCommunityPostsFromMirrors();
            const rawPosts = mirrored !== null ? mirrored : await loadLocalCommunityPosts();
            await saveLocalCommunityPosts(rawPosts.filter((p) => p?.id !== postId));

            if (attachmentPath && !attachmentPath.startsWith('idb:forum:')) {
                void removeStoragePathsBestEffort([attachmentPath]);
            }
        });
    },

    async saveReport(_report: CommunityReport): Promise<void> {
        /* تقارير المنتدى في Postgres عبر BFF — KV community:reports: مرفوض */
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

/** ╪ص┘╪╕ ╪د┘┘à┘╪┤┘ê╪▒╪د╪ز ┘┘┘é╪▒╪د╪ة╪ر ┘╪د╪ص┘é╪د┘ï ظ¤ ┘à╪ص┘┘è per-user (┘è╪╣┘à┘ ╪ذ╪»┘ê┘ Supabase). */
export const ForumBookmarkDB = {
    async listPostIds(userId: string): Promise<string[]> {
        if (!userId) return [];
        const store = await loadForumBookmarkStore();
        const ids = store[userId];
        return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
    },

    async toggle(userId: string, postId: string): Promise<boolean> {
        if (!userId || !postId) throw new Error('┘à╪╣╪▒┘ّ┘ ╪د┘┘à╪│╪ز╪«╪»┘à ╪ث┘ê ╪د┘┘à┘╪┤┘ê╪▒ ╪║┘è╪▒ ╪╡╪د┘╪ص');
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

export async function getCommunityPosts() {
    return await CommunityDB.listPosts();
}

export async function getCommunityPostsPaginated(limit: number, offset: number): Promise<{ posts: CommunityPost[]; total: number }> {
    const all = await CommunityDB.listPosts();
    return {
        posts: all.slice(offset, offset + limit),
        total: all.length,
    };
}

export async function getCommunityPostById(postId: string): Promise<CommunityPost | null> {
    const all = await CommunityDB.listPosts();
    return all.find((p) => p.id === postId) ?? null;
}

export async function addCommunityPost(post: CommunityPost) {
    await CommunityDB.savePost(post);
}

export async function addCommunityComment(postId: string, comment: CommunityComment): Promise<CommunityPost> {
    const post = await findLocalCommunityPostById(postId);
    if (!post) throw new Error('╪د┘┘à┘╪┤┘ê╪▒ ╪║┘è╪▒ ┘à┘ê╪ش┘ê╪»');
    const updated: CommunityPost = { ...post, comments: [...post.comments, comment], updatedAt: new Date().toISOString() };
    await CommunityDB.savePost(updated);
    return updated;
}

export async function deleteCommunityComment(
    postId: string,
    commentId: string,
    requesterId: string,
    requesterRole?: UserRole,
): Promise<CommunityPost> {
    const post = await findLocalCommunityPostById(postId);
    if (!post) throw new Error('╪د┘┘à┘╪┤┘ê╪▒ ╪║┘è╪▒ ┘à┘ê╪ش┘ê╪»');
    const comment = post.comments.find((c) => c.id === commentId);
    if (!comment) throw new Error('╪د┘╪ز╪╣┘┘è┘é ╪║┘è╪▒ ┘à┘ê╪ش┘ê╪»');
    const isAdmin =
        requesterRole === UserRole.SUPER_ADMIN || requesterRole === UserRole.MODERATOR;
    if (comment.authorId !== requesterId && post.authorId !== requesterId && !isAdmin) {
        throw new Error('┘┘è╪│ ┘╪»┘è┘â ╪╡┘╪د╪ص┘è╪ر ┘╪ص╪░┘ ┘ç╪░╪د ╪د┘╪ز╪╣┘┘è┘é');
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
    const post = await findLocalCommunityPostById(postId);
    if (!post) throw new Error('╪د┘┘à┘╪┤┘ê╪▒ ╪║┘è╪▒ ┘à┘ê╪ش┘ê╪»');
    const comment = post.comments.find((c) => c.id === commentId);
    if (!comment) throw new Error('╪د┘╪ز╪╣┘┘è┘é ╪║┘è╪▒ ┘à┘ê╪ش┘ê╪»');
    if (comment.authorId !== requesterId) {
        throw new Error('┘┘è╪│ ┘╪»┘è┘â ╪╡┘╪د╪ص┘è╪ر ┘╪ز╪╣╪»┘è┘ ┘ç╪░╪د ╪د┘╪ز╪╣┘┘è┘é');
    }
    const trimmed = newContent.trim();
    if (trimmed.length < 2) throw new Error('┘╪╡ ╪د┘╪ز╪╣┘┘è┘é ┘é╪╡┘è╪▒ ╪ش╪»╪د┘ï');
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
    const stored = await findLocalCommunityPostById(postId);
    const ownerId = resolveCommunityPostOwnerId(stored ?? undefined, authorId);
    if (!canActOnCommunityPost(requesterId, ownerId, authorId, requesterRole)) {
        throw new Error('┘┘è╪│ ┘╪»┘è┘â ╪╡┘╪د╪ص┘è╪ر ┘╪ص╪░┘ ┘ç╪░╪د ╪د┘┘à┘╪┤┘ê╪▒');
    }
    await CommunityDB.deletePost(postId);
}

export async function updateCommunityPost(postId: string, newContent: string, requesterId?: string) {
    const post = await findLocalCommunityPostById(postId);
    if (!post) throw new Error('╪د┘┘à┘╪┤┘ê╪▒ ╪║┘è╪▒ ┘à┘ê╪ش┘ê╪»');
    const postAuthorId = post.author_id ?? post.authorId ?? '';
    if (requesterId && requesterId !== postAuthorId) {
        throw new Error('┘┘è╪│ ┘╪»┘è┘â ╪╡┘╪د╪ص┘è╪ر ┘╪ز╪╣╪»┘è┘ ┘ç╪░╪د ╪د┘┘à┘╪┤┘ê╪▒');
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
    const post = await findLocalCommunityPostById(postId);
    if (!post) throw new Error('╪د┘┘à┘╪┤┘ê╪▒ ╪║┘è╪▒ ┘à┘ê╪ش┘ê╪»');
    const ownerId = resolveCommunityPostOwnerId(post, authorHint);
    const adminRole = requesterIsAdmin ? UserRole.SUPER_ADMIN : undefined;
    if (!canActOnCommunityPost(requesterId, ownerId, authorHint, adminRole)) {
        throw new Error('┘┘è╪│ ┘╪»┘è┘â ╪╡┘╪د╪ص┘è╪ر ┘┘é┘┘ ╪د┘┘┘é╪د╪┤');
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
        throw new Error('┘┘è╪│ ┘╪»┘è┘â ╪╡┘╪د╪ص┘è╪ر ╪ز╪س╪ذ┘è╪ز ╪د┘┘à┘╪┤┘ê╪▒╪د╪ز');
    }
    const post = await findLocalCommunityPostById(postId);
    if (!post) throw new Error('╪د┘┘à┘╪┤┘ê╪▒ ╪║┘è╪▒ ┘à┘ê╪ش┘ê╪»');
    const updated: CommunityPost = {
        ...post,
        isPinned: pinned || undefined,
        updatedAt: new Date().toISOString(),
    };
    await CommunityDB.savePost(updated);
    return updated;
}

// --- COMMUNITY REPORT TYPES ---

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
        // silent ظ¤ ╪د┘╪ث┘╪╢┘ ╪ث┘ ┘┘â┘à┘ ╪ص╪ز┘ë ┘┘ê ┘╪┤┘ ╪د┘╪ز╪«╪▓┘è┘
    }
    return { ok: true, postId, reason };
}

export async function getCommunityReports(): Promise<CommunityReport[]> {
    return [];
}

export async function dismissCommunityReport(_reportId: string, _reviewerId: string): Promise<void> {
    /* بلاغات المقر/المنتدى تُحسم في Postgres */
}

export const BanDB = {
    async banUser(_record: BanRecord): Promise<void> {
        /* الحظر في forum_bans عبر BFF — KV banned:users: مرفوض */
    },

    async unbanUser(_userId: string): Promise<void> {},

    async isBanned(_userId: string): Promise<BanRecord | null> {
        return null;
    },

    async listBannedUsers(): Promise<BanRecord[]> {
        return [];
    },
};

// --- FOLLOW SYSTEM ---

export { FollowDB } from '@/app/services/cloud/lawyerCommunityFollowDb';

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
        if (type === 'new_document') {
            const { dispatchFollowedUserNewDocument } = await import('@/app/services/forum/forumNotificationDispatch');
            await dispatchFollowedUserNewDocument({ authorId: userId, title, message, docId: postId });
            return;
        }
        const { ForumFollowRepository } = await import('@/app/services/forum/forumFollowRepository');
        const followers = await ForumFollowRepository.getFollowers(userId);
        for (const f of followers) {
            if (!f.notifyPosts) continue;
            const { NotificationDB } = await import('@/app/services/notifications/notificationForumStorage');
            await NotificationDB.addNotification({
                id: uuidv4(),
                userId: f.followerId,
                type,
                title,
                message,
                postId,
                read: false,
                createdAt: new Date().toISOString(),
                dedupeKey: postId ? `forum:legacy-post:${postId}:${f.followerId}` : undefined,
            });
        }
    } catch {
        // silent
    }
}
