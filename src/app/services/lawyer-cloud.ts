import { SecureAPIClient } from './SecureAPIClient';
import { UserRole } from '../types/admin-types';
import SecureStoreService from './SecureStoreService';
import { isKvProxyNetworkEnabled } from '@/app/services/kvProxyConfig';
import { lawyerCloudKv as kv, uuidv4 } from '@/app/services/cloud/lawyerCloudKv';
export { uuidv4 } from '@/app/services/cloud/lawyerCloudKv';
export { LawyerDB } from '@/app/services/lawyerDbRuntime';
export { SmartVaultDB } from '@/app/services/vault/smartVaultRuntime';
import { isVaultIdbStoragePath } from '@/app/services/vaultBlobStore';
import { LawyerStorage } from '@/app/services/storage/lawyerStorageRuntime';
import {
    BanDB as CommunityBanDB,
    CommunityDB as CommunityRuntimeDB,
    getCommunityReports,
} from '@/app/services/cloud/lawyerCommunityCloud';
import { CalendarDB as CalendarRuntimeDB } from '@/app/services/cloud/lawyerCalendarCloud';
import {
    TransactionDB as TransactionsRuntimeDB,
    TransactionsThreadingDB as TransactionsThreadingRuntimeDB,
} from '@/app/services/cloud/lawyerTransactionsCloud';

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
        console.warn('[LawyerStorage] فشل حذف ملف(ات) من المخزن:', toRemove.join(', '));
    }
}

export type {
    CommunityAttachment,
    ForumEditHistoryEntry,
    CommunityComment,
    CommunityPost,
    NotificationType,
    ForumNotification,
    BanRecord,
    CommunityReport,
    FollowRecord,
} from '@/app/services/cloud/lawyerCommunityTypes';

/** واجهة توافق — موصولة مباشرة بمخزن المجتمع المحلي. */
export const CommunityDB = CommunityRuntimeDB;

// --- NOTIFICATION SYSTEM (unified blob — see notificationForumStorage.ts) ---
export { NotificationDB } from '@/app/services/notifications/notificationForumStorage';
export { LawyerStorage };

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
    const banned = await CommunityBanDB.listBannedUsers();
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

function parseRepositoryDocsRaw(raw: string | null | undefined): RepositoryDocument[] | null {
    if (raw == null) return null;
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed as RepositoryDocument[];
    } catch {
        return null;
    }
}

/** قراءة فورية — localStorage mirror ثم SecureStore sync cache */
function readRepositoryDocsFromMirrors(): RepositoryDocument[] | null {
    if (typeof localStorage !== 'undefined') {
        try {
            if (localStorage.getItem(REPOSITORY_LOCAL_KEY) !== null) {
                return parseRepositoryDocsRaw(localStorage.getItem(REPOSITORY_LOCAL_KEY)) ?? [];
            }
        } catch {
            /* fall through */
        }
    }
    try {
        const syncRaw = SecureStoreService.getItemSync(REPOSITORY_LOCAL_KEY);
        if (syncRaw != null) {
            return parseRepositoryDocsRaw(syncRaw) ?? [];
        }
    } catch {
        /* fall through */
    }
    return null;
}

function sortRepositoryDocs(docs: RepositoryDocument[]): RepositoryDocument[] {
    return [...docs].sort(
        (a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime(),
    );
}

const REPOSITORY_PERSIST_LOAD_MS = 2_500;

async function withRepositoryAsyncTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    try {
        return await Promise.race([
            promise,
            new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('repository-async-timeout')), ms);
            }),
        ]);
    } catch {
        return fallback;
    }
}

function normalizeRepositoryDocList(raw: unknown[]): RepositoryDocument[] {
    return raw
        .map(normalizeRepositoryDocument)
        .filter((d): d is RepositoryDocument => d !== null);
}

/** قراءة فورية من مرآة localStorage / SecureStore sync — بدون انتظار IDB */
export function listRepositoryDocumentsSync(): RepositoryDocument[] {
    const mirrored = readRepositoryDocsFromMirrors();
    if (mirrored === null) return [];
    return sortRepositoryDocs(normalizeRepositoryDocList(mirrored));
}

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
    const mirrored = readRepositoryDocsFromMirrors();
    if (mirrored !== null) return mirrored;

    try {
        const raw = await SecureStoreService.getItem(REPOSITORY_LOCAL_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(normalizeRepositoryDocument).filter((d): d is RepositoryDocument => d !== null);
    } catch {
        return readRepositoryDocsFromMirrors()?.map(normalizeRepositoryDocument).filter((d): d is RepositoryDocument => d !== null) ?? [];
    }
}

async function saveLocalRepositoryDocs(docs: RepositoryDocument[]): Promise<void> {
    const payload = JSON.stringify(docs);
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem(REPOSITORY_LOCAL_KEY, payload);
        } catch {
            /* ignore mirror write */
        }
    }
    void SecureStoreService.setItem(REPOSITORY_LOCAL_KEY, payload).catch(() => undefined);
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

let repositoryKvMergeInflight: Promise<void> | null = null;

async function mergeRepositoryDocsFromKvInBackground(localBaseline: RepositoryDocument[]): Promise<void> {
    if (!isKvProxyNetworkEnabled()) return;
    try {
        const res = await kv.getByPrefix('repository:docs:');
        const remoteDocs = Array.isArray(res)
            ? res.map(normalizeRepositoryDocument).filter((d): d is RepositoryDocument => d !== null)
            : [];
        const merged = sortRepositoryDocs(mergeRepositoryDocs(localBaseline, remoteDocs));
        await saveLocalRepositoryDocs(merged);
    } catch {
        /* background sync — لا نُعطّل التفاعل */
    }
}

function kickRepositoryKvMerge(localBaseline: RepositoryDocument[]): void {
    if (!isKvProxyNetworkEnabled() || repositoryKvMergeInflight) return;
    repositoryKvMergeInflight = mergeRepositoryDocsFromKvInBackground(localBaseline).finally(() => {
        repositoryKvMergeInflight = null;
    });
}

function kickRepositoryPersistHydrateInBackground(): void {
    void loadLocalRepositoryDocs()
        .then((docs) => {
            const sorted = sortRepositoryDocs(normalizeRepositoryDocList(docs));
            if (sorted.length > 0) {
                return saveLocalRepositoryDocs(sorted);
            }
            return undefined;
        })
        .catch(() => undefined);
}

export const RepositoryDB = {
    async listDocuments(): Promise<RepositoryDocument[]> {
        const mirrored = readRepositoryDocsFromMirrors();
        if (mirrored !== null) {
            const sorted = sortRepositoryDocs(normalizeRepositoryDocList(mirrored));
            kickRepositoryKvMerge(sorted);
            return sorted;
        }

        const persisted = await withRepositoryAsyncTimeout(
            loadLocalRepositoryDocs(),
            REPOSITORY_PERSIST_LOAD_MS,
            [],
        );
        const sorted = sortRepositoryDocs(normalizeRepositoryDocList(persisted));
        if (sorted.length > 0) {
            void saveLocalRepositoryDocs(sorted);
        } else {
            kickRepositoryPersistHydrateInBackground();
        }
        kickRepositoryKvMerge(sorted);
        return sorted;
    },

    async saveDocument(doc: RepositoryDocument): Promise<void> {
        const normalized = normalizeRepositoryDocument(doc);
        if (!normalized) throw new Error('بيانات المستند غير صالحة');
        const mirrored = readRepositoryDocsFromMirrors();
        const localDocs = mirrored !== null ? mirrored : listRepositoryDocumentsSync();
        const normalizedLocal = localDocs
            .map(normalizeRepositoryDocument)
            .filter((d): d is RepositoryDocument => d !== null);
        const merged = sortRepositoryDocs(mergeRepositoryDocs(normalizedLocal, [normalized]));
        await saveLocalRepositoryDocs(merged);
        if (isKvProxyNetworkEnabled()) {
            void kv.set(`repository:docs:${normalized.id}`, normalized).catch(() => undefined);
        }
    },

    async deleteDocument(docId: string): Promise<void> {
        const mirrored = readRepositoryDocsFromMirrors();
        const localDocs = mirrored !== null ? mirrored : await loadLocalRepositoryDocs();
        const target = localDocs
            .map(normalizeRepositoryDocument)
            .find((d) => d?.id === docId);
        await saveLocalRepositoryDocs(
            localDocs
                .map(normalizeRepositoryDocument)
                .filter((d): d is RepositoryDocument => d !== null && d.id !== docId),
        );

        const storagePath = target?.storagePath?.trim();
        if (storagePath && !storagePath.startsWith('idb:forum:')) {
            void removeStoragePathsBestEffort([storagePath]);
        }

        if (isKvProxyNetworkEnabled()) {
            void kv.del(`repository:docs:${docId}`).catch(() => undefined);
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

// ============================================================
//  SMARTER VAULT — المخزن الذكي (Smart Vault)
// ============================================================

export type { SmartVaultDocType, SmartVaultFilterTag, SmartVaultDoc } from '@/app/services/vault/vaultTypes';

export type { CalendarEventType, CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';
export const CalendarDB = CalendarRuntimeDB;

export type { TransactionsThreadingState } from '@/app/services/cloud/lawyerTransactionTypes';
export const TransactionDB = TransactionsRuntimeDB;
export const TransactionsThreadingDB = TransactionsThreadingRuntimeDB;

export { UrgentActionsDB } from './urgent-actions-db';

export { LAWYER_PROFILE_UPDATED } from '@/app/services/profile/profileEvents';
export type {
    LawyerProfileHeader,
    ProfileStat,
    ProfileLocationMode,
    ProfileAction,
    LawyerProfileSection,
    LawyerProfileData,
} from '@/app/services/cloud/lawyerProfileTypes';

/** واجهة توافق — dynamic import لتفادي circular chunk مع monolith */
export const ProfileDB = {
    async getProfile(userId: string) {
        const mod = await import('@/app/services/cloud/lawyerProfileCloud');
        return mod.ProfileDB.getProfile(userId);
    },
    async saveProfile(
        userId: string,
        profile: import('@/app/services/cloud/lawyerProfileTypes').LawyerProfileData,
        writerId: string,
    ) {
        const mod = await import('@/app/services/cloud/lawyerProfileCloud');
        return mod.ProfileDB.saveProfile(userId, profile, writerId);
    },
};
