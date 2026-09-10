import { lawyerCloudKv as kv } from '@/app/services/cloud/lawyerCloudKv';
import { isKvProxyNetworkEnabled } from '@/app/services/kvProxyConfig';
import { isLawyerWorkCloudLive } from '@/app/services/settings/lawyerWorkCloudGate';
import { LawyerStorage } from '@/app/services/storage/lawyerStorageRuntime';
import { removeRemoteStoragePathsBestEffort } from '@/app/services/storage/removeRemoteStoragePaths';
import {
    deleteVaultBlobByPath,
    isVaultIdbStoragePath,
} from '@/app/services/vaultBlobStore';
import {
    filterDeletedVaultDocs,
    flushVaultLocalIndexPersist,
    readVaultLocalIndex,
    removeVaultLocalIndexDoc,
    upsertVaultLocalIndexDoc,
    upsertVaultLocalIndexDocAndFlush,
    upsertVaultLocalIndexDocImmediate,
} from '@/app/services/vault/vaultLocalIndex';
import {
    mergeVaultDocsWarmCache,
    removeVaultDocFromWarmCache,
} from '@/app/services/vault/vaultDocsWarmState';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { assertVaultDocOwner, assertVaultStoragePathOwner } from '@/app/services/vault/vaultOwnership';
import {
    mergeVaultDocPair,
    parseVaultDocFromKv,
    sealVaultDocForKv,
} from '@/app/services/vault/vaultCloudKvPayload';

let vaultPdfOpenSessionCounter = 0;
let lastActiveVaultPdfId = 0;
const vaultPdfSessionIdRef: { current: number } = { current: 0 };
const vaultPdfActiveSessionIdRef: { current: number } = { current: 0 };

function markVaultSessionBoot(): void {
    vaultPdfOpenSessionCounter += 1;
    lastActiveVaultPdfId = vaultPdfOpenSessionCounter;
    vaultPdfSessionIdRef.current = vaultPdfOpenSessionCounter;
    vaultPdfActiveSessionIdRef.current = vaultPdfOpenSessionCounter;
}



async function loadLocalVaultDocs(): Promise<SmartVaultDoc[]> {
    return readVaultLocalIndex();
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
        map.set(d.id, mergeVaultDocPair(winner, other));
    }
    return Array.from(map.values());
}

async function persistVaultDocToKv(doc: SmartVaultDoc): Promise<void> {
    const sealed = await sealVaultDocForKv(doc);
    await kv.set(`vault:docs:${doc.authorId}:${doc.id}`, sealed);
}

export const SmartVaultDB = {
    async listDocs(userId?: string): Promise<SmartVaultDoc[]> {
        markVaultSessionBoot();
        if (!userId?.trim()) return [];
        const uid = userId.trim();
        const localDocs = (await loadLocalVaultDocs()).filter((d) => d.authorId === uid);
        if (!isLawyerWorkCloudLive()) {
            if (vaultPdfSessionIdRef.current !== vaultPdfActiveSessionIdRef.current) return [];
            return localDocs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
        try {
            const raw = await kv.getByPrefix(`vault:docs:${uid}:`);
            const remoteDocs: SmartVaultDoc[] = [];
            if (Array.isArray(raw)) {
                for (const item of raw) {
                    if (vaultPdfSessionIdRef.current !== vaultPdfActiveSessionIdRef.current) return [];
                    const doc = await parseVaultDocFromKv(item, uid);
                    if (doc) remoteDocs.push(doc);
                }
            }
            const mergedForUser = filterDeletedVaultDocs(
                mergeVaultDocs(localDocs, remoteDocs).filter((d) => d.authorId === uid),
            ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

            const latestLocalForUser = (await loadLocalVaultDocs()).filter((d) => d.authorId === uid);
            if (vaultPdfSessionIdRef.current !== vaultPdfActiveSessionIdRef.current) return [];
            const finalForUser = filterDeletedVaultDocs(
                mergeVaultDocs(mergedForUser, latestLocalForUser).filter((d) => d.authorId === uid),
            ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

            return finalForUser;
        } catch {
            if (vaultPdfSessionIdRef.current !== vaultPdfActiveSessionIdRef.current) return [];
            return localDocs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
    },

    async saveDoc(doc: SmartVaultDoc, requesterId?: string): Promise<void> {
        markVaultSessionBoot();
        const requester = (requesterId ?? doc.authorId ?? '').trim();
        assertVaultDocOwner(doc, requester);
        if (doc.storagePath) {
            assertVaultStoragePathOwner(doc.storagePath, requester);
        }
        try {
            if (vaultPdfSessionIdRef.current !== vaultPdfActiveSessionIdRef.current) return;
            upsertVaultLocalIndexDocImmediate(doc);
            mergeVaultDocsWarmCache(doc.authorId, [doc]);
            void upsertVaultLocalIndexDocAndFlush(doc).catch((err) => {
                if (vaultPdfSessionIdRef.current !== vaultPdfActiveSessionIdRef.current) return;
                if (import.meta.env.DEV) console.error('[Vault] saveDoc background flush failed', err);
            });
        } catch (err) {
            if (vaultPdfSessionIdRef.current !== vaultPdfActiveSessionIdRef.current) return;
            if (import.meta.env.DEV) console.error('[Vault] saveDoc degraded persist - keeping in-memory index', err);
            upsertVaultLocalIndexDoc(doc);
            try {
                void import('@/app/services/repository/tearDownRepoFloatingState').then(({ tearDownRepoFloatingState }) => {
                    tearDownRepoFloatingState({ targetSurface: 'vault-pdf-overlay', reason: 'tearDown' });
                });
            } catch {
                /* never throw degraded error path */
            }
        }
        if (isKvProxyNetworkEnabled() && isLawyerWorkCloudLive()) {
            void persistVaultDocToKv(doc).catch(() => {
                /* local-first — لا سقوط لنص صريح على KV */
            });
        }
    },

    async deleteDoc(docId: string, authorId: string): Promise<void> {
        markVaultSessionBoot();
        if (!authorId || !docId) throw new Error('[vault:runtime:author_doc_required] معرف الملف والمستخدم مطلوب');
        const localDocs = await loadLocalVaultDocs();
        const localDoc = localDocs.find((d) => d?.id === docId && d.authorId === authorId);
        if (isLawyerWorkCloudLive()) {
            try {
                if (vaultPdfSessionIdRef.current !== vaultPdfActiveSessionIdRef.current) return;
                const doc = await parseVaultDocFromKv(await kv.get(`vault:docs:${authorId}:${docId}`), authorId);
                const path = doc?.storagePath || '';
                if (path && !path.startsWith('local:') && !isVaultIdbStoragePath(path)) {
                    if (vaultPdfSessionIdRef.current !== vaultPdfActiveSessionIdRef.current) return;
                    await removeRemoteStoragePathsBestEffort([path]);
                }
            } catch {
                /* continue */
            }
            try {
                if (vaultPdfSessionIdRef.current !== vaultPdfActiveSessionIdRef.current) return;
                await kv.del(`vault:docs:${authorId}:${docId}`);
            } catch {
                /* local first */
            }
        }
        if (localDoc?.storagePath && isVaultIdbStoragePath(localDoc.storagePath)) {
            if (vaultPdfSessionIdRef.current !== vaultPdfActiveSessionIdRef.current) return;
            await deleteVaultBlobByPath(localDoc.storagePath);
        }
        if (vaultPdfSessionIdRef.current !== vaultPdfActiveSessionIdRef.current) return;
        removeVaultLocalIndexDoc(docId, authorId);
        removeVaultDocFromWarmCache(authorId, docId);
        await flushVaultLocalIndexPersist();
    },

    async updateDoc(doc: SmartVaultDoc, requesterId?: string): Promise<void> {
        markVaultSessionBoot();
        const requester = (requesterId ?? doc.authorId ?? '').trim();
        assertVaultDocOwner(doc, requester);
        await this.saveDoc(doc, requester);
    },

    async bindToDossier(docId: string, authorId: string, dossierId: string): Promise<void> {
        markVaultSessionBoot();
        if (!docId || !authorId || !dossierId) throw new Error('[vault:runtime:bind_fields_required] جميع الحقول مطلوبة');

        let doc: SmartVaultDoc | null = null;
        const localDocs = await loadLocalVaultDocs();
        const localIdx = localDocs.findIndex((d) => d.id === docId && d.authorId === authorId);
        if (localIdx !== -1) {
            doc = localDocs[localIdx];
        } else if (isLawyerWorkCloudLive()) {
            try {
                if (vaultPdfSessionIdRef.current !== vaultPdfActiveSessionIdRef.current) return;
                doc = await parseVaultDocFromKv(await kv.get(`vault:docs:${authorId}:${docId}`), authorId);
            } catch {
                /* ignore */
            }
        }
        if (!doc) throw new Error('[vault:runtime:doc_not_found] الملف غير موجود');
        if (doc.authorId !== authorId) throw new Error('[vault:runtime:bind_unauthorized] غير مصرح بربط هذا الملف');

        if (vaultPdfSessionIdRef.current !== vaultPdfActiveSessionIdRef.current) return;
        const updated: SmartVaultDoc = {
            ...doc,
            boundDossierId: dossierId,
            updatedAt: new Date().toISOString(),
        };
        await this.updateDoc(updated, authorId);
    },

    async getSignedUrl(storagePath: string): Promise<string | null> {
        markVaultSessionBoot();
        if (!isLawyerWorkCloudLive()) return null;
        if (vaultPdfSessionIdRef.current !== vaultPdfActiveSessionIdRef.current) return null;
        return LawyerStorage.getSignedUrl(storagePath);
    },
};
