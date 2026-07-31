import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import SecureStoreService from '@/app/services/SecureStoreService';
import { isVaultIdbStoragePath } from '@/app/services/vault/vaultBlobPathLite';
import type { CommunityPost } from '@/app/services/cloud/lawyerCommunityTypes';

function isRemoteStorageObjectPath(path: string): boolean {
    const p = path.trim();
    if (!p) return false;
    if (p.startsWith('idb:') || p.startsWith('local:')) return false;
    if (isVaultIdbStoragePath(p)) return false;
    return true;
}

export async function removeStoragePathsBestEffort(paths: string[]): Promise<void> {
    const toRemove = [...new Set(paths.map((p) => p.trim()).filter(isRemoteStorageObjectPath))];
    if (toRemove.length === 0) return;
    try {
        await SecureAPIClient.fetchSecure('/api/upload/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paths: toRemove }),
        });
    } catch {
        console.warn('[LawyerStorage] فشل حذف ملف(ات) من المخزن:', toRemove.join(', '));
    }
}

const COMMUNITY_LOCAL_KEY = 'hami:community:posts:v1';
const COMMUNITY_DELETED_IDS_KEY = 'hami:community:deleted-ids:v1';
const COMMUNITY_SECURE_READY_MS = 4_000;
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

/** قراءة فورية — localStorage mirror ثم SecureStore sync cache */
export function readCommunityPostsFromMirrors(): CommunityPost[] | null {
    if (typeof localStorage !== 'undefined') {
        try {
            if (localStorage.getItem(COMMUNITY_LOCAL_KEY) !== null) {
                const parsed = parseCommunityPostsRaw(localStorage.getItem(COMMUNITY_LOCAL_KEY)) ?? [];
                return parsed;
            }
        } catch {
            /* fall through */
        }
    }
    try {
        const syncRaw = SecureStoreService.getItemSync(COMMUNITY_LOCAL_KEY);
        if (syncRaw != null) {
            const parsed = parseCommunityPostsRaw(syncRaw) ?? [];
            return parsed;
        }
    } catch {
        /* fall through */
    }
    return null;
}

export async function loadLocalCommunityPosts(): Promise<CommunityPost[]> {
    if (typeof window === 'undefined') {
        return getServerDevForumPosts();
    }

    const mirrored = readCommunityPostsFromMirrors();
    if (mirrored !== null) return mirrored;

    try {
        await Promise.race([
            SecureStoreService.ensurePersistedReady(),
            new Promise<void>((resolve) => setTimeout(resolve, COMMUNITY_SECURE_READY_MS)),
        ]);
        const syncRaw = SecureStoreService.getItemSync(COMMUNITY_LOCAL_KEY);
        const fromSync = parseCommunityPostsRaw(syncRaw);
        if (fromSync !== null) return fromSync;
        const raw = await SecureStoreService.getItem(COMMUNITY_LOCAL_KEY);
        return parseCommunityPostsRaw(raw) ?? [];
    } catch {
        return readCommunityPostsFromMirrors() ?? [];
    }
}

async function persistCommunityPostsToSecureStore(payload: string): Promise<void> {
    try {
        await Promise.race([
            SecureStoreService.ensurePersistedReady(),
            new Promise<void>((resolve) => setTimeout(resolve, COMMUNITY_SECURE_READY_MS)),
        ]);
        const existing = await SecureStoreService.getItem(COMMUNITY_LOCAL_KEY);
        if (existing === payload) return;
        await SecureStoreService.setItem(COMMUNITY_LOCAL_KEY, payload);
    } catch {
        /* localStorage mirror already written */
    }
}

export async function saveLocalCommunityPosts(posts: CommunityPost[]): Promise<void> {
    if (typeof window === 'undefined') {
        const g = globalThis as unknown as Record<symbol, CommunityPost[]>;
        g[DEV_SERVER_FORUM_STORE] = posts;
        return;
    }
    const payload = JSON.stringify(posts);
    try {
        window.localStorage.setItem(COMMUNITY_LOCAL_KEY, payload);
    } catch (error) {
        void error;
    }
    void persistCommunityPostsToSecureStore(payload);
}

let communityPostsWriteChain: Promise<void> = Promise.resolve();

export function withCommunityPostsWriteLock<T>(operation: () => Promise<T>): Promise<T> {
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

/** قراءة فورية — localStorage mirror ثم SecureStore sync cache */
function readDeletedCommunityPostIdsFromMirrors(): Set<string> | null {
    if (typeof localStorage !== 'undefined') {
        try {
            if (localStorage.getItem(COMMUNITY_DELETED_IDS_KEY) !== null) {
                return parseDeletedCommunityPostIdsRaw(localStorage.getItem(COMMUNITY_DELETED_IDS_KEY));
            }
        } catch {
            /* fall through */
        }
    }
    try {
        const syncRaw = SecureStoreService.getItemSync(COMMUNITY_DELETED_IDS_KEY);
        if (syncRaw != null) {
            return parseDeletedCommunityPostIdsRaw(syncRaw);
        }
    } catch {
        /* fall through */
    }
    return null;
}

async function persistDeletedCommunityPostIdsToSecureStore(payload: string): Promise<void> {
    try {
        await Promise.race([
            SecureStoreService.ensurePersistedReady(),
            new Promise<void>((resolve) => setTimeout(resolve, COMMUNITY_SECURE_READY_MS)),
        ]);
        const existing = await SecureStoreService.getItem(COMMUNITY_DELETED_IDS_KEY);
        if (existing === payload) return;
        await SecureStoreService.setItem(COMMUNITY_DELETED_IDS_KEY, payload);
    } catch {
        /* localStorage mirror already written */
    }
}

export async function loadDeletedCommunityPostIds(): Promise<Set<string>> {
    if (typeof window === 'undefined') {
        return new Set(getServerDevDeletedIds());
    }

    if (typeof localStorage !== 'undefined') {
        try {
            const raw = localStorage.getItem(COMMUNITY_DELETED_IDS_KEY);
            if (raw !== null) {
                return parseDeletedCommunityPostIdsRaw(raw);
            }
            return new Set();
        } catch {
            /* fall through */
        }
    }

    const mirrored = readDeletedCommunityPostIdsFromMirrors();
    if (mirrored !== null) return mirrored;

    try {
        await Promise.race([
            SecureStoreService.ensurePersistedReady(),
            new Promise<void>((resolve) => setTimeout(resolve, COMMUNITY_SECURE_READY_MS)),
        ]);
        const syncRaw = SecureStoreService.getItemSync(COMMUNITY_DELETED_IDS_KEY);
        if (syncRaw != null) {
            return parseDeletedCommunityPostIdsRaw(syncRaw);
        }
        const raw = await SecureStoreService.getItem(COMMUNITY_DELETED_IDS_KEY);
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
    try {
        window.localStorage.setItem(COMMUNITY_DELETED_IDS_KEY, payload);
    } catch {
        /* optional mirror */
    }
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
