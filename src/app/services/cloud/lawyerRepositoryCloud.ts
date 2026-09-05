import SecureStoreService from '@/app/services/SecureStoreService';
import { isKvProxyNetworkEnabled } from '@/app/services/kvProxyConfig';
import { isLawyerWorkCloudLive } from '@/app/services/settings/lawyerWorkCloudGate';
import { lawyerCloudKv as kv } from '@/app/services/cloud/lawyerCloudKv';
import { getLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import {
    filterDeletedRepositoryDocs,
    markRepositoryDocDeleted,
} from '@/app/services/forum/repositoryDocsTombstonesLite';
import { removeRemoteStoragePathsBestEffort } from '@/app/services/storage/removeRemoteStoragePaths';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
    readSecurePayloadWhenReady,
    writeSecureAndClearLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

import type { RepositoryDocument } from '@/app/services/vault/vaultTypes';

export type { RepositoryDocument } from '@/app/services/vault/vaultTypes';

const REPOSITORY_LOCAL_KEY = 'hami:repository:docs:v1';

function repositoryCloudDocKey(authorId: string, docId: string): string {
    return `repository:docs:${authorId}:${docId}`;
}

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

/** قراءة فورية — SecureStore ثم ترحيل مرآة localStorage القديمة */
function readRepositoryDocsFromMirrors(): RepositoryDocument[] | null {
    const raw = readSecureOrDrainLegacySync(REPOSITORY_LOCAL_KEY);
    if (raw == null) return null;
    return parseRepositoryDocsRaw(raw);
}

function sortRepositoryDocs(docs: RepositoryDocument[]): RepositoryDocument[] {
    return [...docs].sort(
        (a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime(),
    );
}

/*
 * نقطة العبور الوحيدة لكل قراءة: المرآة، والقرص، والترطيب الخلفي. فتصفية شواهد
 * القبر هنا تكفي لمنع بعث المحذوف من أي مصدر منها بمصفاة واحدة لا خمس.
 */
function normalizeRepositoryDocList(raw: unknown[]): RepositoryDocument[] {
    return filterDeletedRepositoryDocs(
        raw.map(normalizeRepositoryDocument).filter((d): d is RepositoryDocument => d !== null),
    );
}

/** قراءة فورية من SecureStore / ترحيل المرآة — بدون انتظار IDB */
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
        updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : undefined,
        fileName,
        mimeType,
        storagePath,
        fileSize,
        tags,
        indexSync: o.indexSync === 'create' || o.indexSync === 'update' ? o.indexSync : undefined,
    };
}

async function loadLocalRepositoryDocs(): Promise<RepositoryDocument[]> {
    const mirrored = readRepositoryDocsFromMirrors();
    if (mirrored !== null) return mirrored;

    try {
        const raw = await readSecurePayloadWhenReady(REPOSITORY_LOCAL_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(normalizeRepositoryDocument).filter((d): d is RepositoryDocument => d !== null);
    } catch {
        return (
            readRepositoryDocsFromMirrors()
                ?.map(normalizeRepositoryDocument)
                .filter((d): d is RepositoryDocument => d !== null) ?? []
        );
    }
}

/**
 * الحفظ يكتب SecureStore أولاً ويمحو مرآة localStorage.
 * حارس المسح يرفض `[]` فوق أصل موجود — بلا تظليل صريح على القرص.
 */
async function persistRepositoryDocsToSecureStore(payload: string): Promise<void> {
    try {
        await SecureStoreService.setItem(REPOSITORY_LOCAL_KEY, payload);
        clearLegacyPlaintextMirror(REPOSITORY_LOCAL_KEY);
    } catch {
        /* setItemSync يملأ الكاش إن نجح */
    }
}

async function saveLocalRepositoryDocs(docs: RepositoryDocument[]): Promise<void> {
    const payload = JSON.stringify(docs);
    writeSecureAndClearLegacySync(REPOSITORY_LOCAL_KEY, payload);
    void persistRepositoryDocsToSecureStore(payload);
}

function mergeRepositoryDocs(
    local: RepositoryDocument[],
    remote: RepositoryDocument[],
): RepositoryDocument[] {
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

async function persistRepositoryDocToKv(doc: RepositoryDocument): Promise<void> {
    const { sealWorkCloudKvValue } = await import('@/app/services/cloud/workCloudKvSeal');
    await kv.set(repositoryCloudDocKey(doc.authorId, doc.id), await sealWorkCloudKvValue(doc));
}

async function mergeRepositoryDocsFromKvInBackground(
    localBaseline: RepositoryDocument[],
): Promise<void> {
    if (!isKvProxyNetworkEnabled() || !isLawyerWorkCloudLive()) return;
    const uid = getLiveAuthUserId()?.trim();
    if (!uid) return;
    try {
        const res = await kv.getByPrefix(`repository:docs:${uid}:`);
        const { unsealWorkCloudKvValue } = await import('@/app/services/cloud/workCloudKvSeal');
        const remoteDocs: RepositoryDocument[] = [];
        if (Array.isArray(res)) {
            for (const item of res) {
                const plain = await unsealWorkCloudKvValue(item);
                const doc = normalizeRepositoryDocument(plain);
                if (doc) remoteDocs.push(doc);
            }
        }
        /*
         * المصفاة على ناتج الدمج لا على `remoteDocs` وحدها: القاعدة المحلية قد تحمل
         * مستنداً حُذف في تبويب آخر بعد قراءتها.
         */
        const merged = sortRepositoryDocs(
            filterDeletedRepositoryDocs(mergeRepositoryDocs(localBaseline, remoteDocs)),
        );
        await saveLocalRepositoryDocs(merged);
    } catch {
        /* background sync — لا نُعطّل التفاعل */
    }
}

function kickRepositoryKvMerge(localBaseline: RepositoryDocument[]): void {
    if (!isKvProxyNetworkEnabled() || !isLawyerWorkCloudLive() || repositoryKvMergeInflight) return;
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

        const persisted = await loadLocalRepositoryDocs();
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
        if (isKvProxyNetworkEnabled() && isLawyerWorkCloudLive() && normalized.authorId) {
            void persistRepositoryDocToKv(normalized).catch(() => undefined);
        }
    },

    async deleteDocument(docId: string): Promise<void> {
        const mirrored = readRepositoryDocsFromMirrors();
        const localDocs = mirrored !== null ? mirrored : await loadLocalRepositoryDocs();
        const target = localDocs.map(normalizeRepositoryDocument).find((d) => d?.id === docId);

        /*
         * الشاهد يُسجَّل قبل الحفظ: حذف آخر مستند يكتب `[]`، والمفتاح محميّ فيرفضه
         * الحارس. الشاهد هو ما يُخبر الحارس أن هذا الفراغ قصدُ المستخدم لا خطأ قراءة،
         * وهو أيضاً ما يمنع دمج KV من إعادة المستند بعد حذفه.
         */
        if (target?.authorId) markRepositoryDocDeleted(target.authorId, docId);

        await saveLocalRepositoryDocs(
            localDocs
                .map(normalizeRepositoryDocument)
                .filter((d): d is RepositoryDocument => d !== null && d.id !== docId),
        );

        const storagePath = target?.storagePath?.trim();
        if (storagePath && !storagePath.startsWith('idb:forum:')) {
            void removeRemoteStoragePathsBestEffort([storagePath]);
        }

        const cloudAuthor = (target?.authorId || getLiveAuthUserId() || '').trim();
        if (isKvProxyNetworkEnabled() && isLawyerWorkCloudLive() && cloudAuthor) {
            void kv.del(repositoryCloudDocKey(cloudAuthor, docId)).catch(() => undefined);
        }
    },
};

export async function getRepositoryDocuments(): Promise<RepositoryDocument[]> {
    return await RepositoryDB.listDocuments();
}

export async function addRepositoryDocument(doc: RepositoryDocument): Promise<void> {
    await RepositoryDB.saveDocument(doc);
}
