import { supabase } from '../lib/supabase-client';
import { SecureAPIClient } from './SecureAPIClient';
import { UserRole } from '../types/admin-types';
import SecureStoreService from './SecureStoreService';
import { stripImageMetadata } from '@/app/utils/stripMetadata';
import { isKvProxyNetworkEnabled } from '@/app/services/kvProxyConfig';
import { lawyerCloudKv as kv, uuidv4 } from '@/app/services/cloud/lawyerCloudKv';
export { uuidv4 } from '@/app/services/cloud/lawyerCloudKv';
import { deleteVaultBlobByPath, isVaultIdbStoragePath } from '@/app/services/vaultBlobStore';

// --- INITIALIZATION ---
// Supabase client imported from singleton

function isRemoteStorageObjectPath(path: string): boolean {
    const p = path.trim();
    if (!p) return false;
    if (p.startsWith('idb:') || p.startsWith('local:')) return false;
    if (isVaultIdbStoragePath(p)) return false;
    return true;
}

/** WIFE-protected BFF delete — best effort (لا يُوقف حذف السجل المحلي). */
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

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object';
}

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

/** واجهة توافق — dynamic import لتفادي circular chunk مع monolith */
export const CommunityDB = {
    async listPosts() {
        const mod = await import('@/app/services/cloud/lawyerCommunityCloud');
        return mod.CommunityDB.listPosts();
    },
    async savePost(post: import('@/app/services/cloud/lawyerCommunityTypes').CommunityPost) {
        const mod = await import('@/app/services/cloud/lawyerCommunityCloud');
        return mod.CommunityDB.savePost(post);
    },
    async persistPostsBatch(posts: import('@/app/services/cloud/lawyerCommunityTypes').CommunityPost[]) {
        const mod = await import('@/app/services/cloud/lawyerCommunityCloud');
        return mod.CommunityDB.persistPostsBatch(posts);
    },
    async deletePost(postId: string) {
        const mod = await import('@/app/services/cloud/lawyerCommunityCloud');
        return mod.CommunityDB.deletePost(postId);
    },
    async saveReport(report: import('@/app/services/cloud/lawyerCommunityTypes').CommunityReport) {
        const mod = await import('@/app/services/cloud/lawyerCommunityCloud');
        return mod.CommunityDB.saveReport(report);
    },
};

// --- NOTIFICATION SYSTEM (unified blob — see notificationForumStorage.ts) ---
export { NotificationDB } from '@/app/services/notifications/notificationForumStorage';

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
    const { BanDB, getCommunityReports } = await import('@/app/services/cloud/lawyerCommunityCloud');
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
            await removeStoragePathsBestEffort([storagePath]);
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
     * Uploads a file via WIFE-protected /api/upload (malware scan + ownership on server).
     */
    async uploadSmartFile(userId: string, file: File, category: 'scans' | 'audio' | 'drafts' | 'repository' | 'vault') {
        const sessionUserId = (await supabase.auth.getSession()).data.session?.user?.id ?? null;
        if (!sessionUserId || sessionUserId !== userId) {
            throw new Error('Unauthorized upload: session user mismatch');
        }

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

        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('category', category);

        const response = await SecureAPIClient.fetchSecureResponse('/api/upload', {
            method: 'POST',
            body: formData,
        });
        const text = await response.text().catch(() => '');
        let body: Record<string, unknown> = {};
        try {
            body = JSON.parse(text) as Record<string, unknown>;
        } catch {
            /* ignore */
        }
        if (!response.ok) {
            const message =
                typeof body.error === 'string' && body.error.trim()
                    ? body.error.trim()
                    : `Upload failed (${response.status})`;
            throw new Error(message);
        }

        const path = typeof body.path === 'string' ? body.path : '';
        const downloadUrl = typeof body.downloadUrl === 'string' ? body.downloadUrl : null;
        if (!path) {
            throw new Error('Upload response missing path');
        }

        return {
            path,
            fullPath: path,
            downloadUrl,
        };
    },

    async getSignedUrl(path: string): Promise<string | null> {
        try {
            const res = await SecureAPIClient.fetchSecure<{ ok: boolean; downloadUrl?: string }>(
                '/api/upload/signed-url',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path }),
                },
            );
            return res?.downloadUrl?.trim() || null;
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
        return [];
    }
}

async function saveLocalVaultDocs(docs: SmartVaultDoc[]): Promise<void> {
    const payload = JSON.stringify(docs);
    try {
        await SecureStoreService.setItem(VAULT_LOCAL_KEY, payload);
    } catch (e) {
        console.error('[Vault] Failed to persist vault docs:', e);
        throw new Error('vault persist failed');
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
                    await removeStoragePathsBestEffort([path]);
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

export type { CalendarEventType, CalendarEvent } from '@/app/services/cloud/lawyerCalendarTypes';

/** واجهة توافق — dynamic import لتفادي circular chunk مع monolith */
export const CalendarDB = {
    async getAllStoredEvents() {
        const mod = await import('@/app/services/cloud/lawyerCalendarCloud');
        return mod.CalendarDB.getAllStoredEvents();
    },
    async getEvents(userId: string, options?: { forceRefresh?: boolean }) {
        const mod = await import('@/app/services/cloud/lawyerCalendarCloud');
        return mod.CalendarDB.getEvents(userId, options);
    },
    async saveEvent(event: import('@/app/services/cloud/lawyerCalendarTypes').CalendarEvent) {
        const mod = await import('@/app/services/cloud/lawyerCalendarCloud');
        return mod.CalendarDB.saveEvent(event);
    },
    async saveEventsBatch(events: import('@/app/services/cloud/lawyerCalendarTypes').CalendarEvent[]) {
        const mod = await import('@/app/services/cloud/lawyerCalendarCloud');
        return mod.CalendarDB.saveEventsBatch(events);
    },
    async deleteEvent(eventId: string, userId: string) {
        const mod = await import('@/app/services/cloud/lawyerCalendarCloud');
        return mod.CalendarDB.deleteEvent(eventId, userId);
    },
    async updateEvent(event: import('@/app/services/cloud/lawyerCalendarTypes').CalendarEvent) {
        const mod = await import('@/app/services/cloud/lawyerCalendarCloud');
        return mod.CalendarDB.updateEvent(event);
    },
};

export type { TransactionsThreadingState } from '@/app/services/cloud/lawyerTransactionTypes';

/** واجهة توافق — dynamic import لتفادي circular chunk مع monolith */
export const TransactionDB = {
    async getTransactions(userId: string) {
        const mod = await import('@/app/services/cloud/lawyerTransactionsCloud');
        return mod.TransactionDB.getTransactions(userId);
    },
    async saveTransaction(transaction: unknown) {
        const mod = await import('@/app/services/cloud/lawyerTransactionsCloud');
        return mod.TransactionDB.saveTransaction(transaction);
    },
    async updateTransaction(transaction: unknown) {
        const mod = await import('@/app/services/cloud/lawyerTransactionsCloud');
        return mod.TransactionDB.updateTransaction(transaction);
    },
};

export const TransactionsThreadingDB = {
    async getState(userId: string) {
        const mod = await import('@/app/services/cloud/lawyerTransactionsCloud');
        return mod.TransactionsThreadingDB.getState(userId);
    },
    async saveState(
        userId: string,
        input: import('@/app/services/cloud/lawyerTransactionTypes').TransactionsThreadingSaveInput,
    ) {
        const mod = await import('@/app/services/cloud/lawyerTransactionsCloud');
        return mod.TransactionsThreadingDB.saveState(userId, input);
    },
};

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
