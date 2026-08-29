import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { lawyerCloudKv as kv } from '@/app/services/cloud/lawyerCloudKv';
import { isKvProxyNetworkEnabled } from '@/app/services/kvProxyConfig';
import { isLawyerWorkCloudLive } from '@/app/services/settings/lawyerWorkCloudGate';
import { LawyerStorage } from '@/app/services/storage/lawyerStorageRuntime';
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

function isRemoteStorageObjectPath(path: string): boolean {
    const p = path.trim();
    if (!p) return false;
    if (p.startsWith('idb:') || p.startsWith('local:')) return false;
    if (isVaultIdbStoragePath(p)) return false;
    return true;
}

async function removeStoragePathsBestEffort(paths: string[]): Promise<void> {
    if (!isLawyerWorkCloudLive()) return;
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

async function loadLocalVaultDocs(): Promise<SmartVaultDoc[]> {
    return readVaultLocalIndex();
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
        if (!isLawyerWorkCloudLive()) {
            return localDocs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
        try {
            const raw = await kv.getByPrefix(`vault:docs:${uid}:`);
            const remoteDocs = Array.isArray(raw)
                ? raw.filter((d): d is SmartVaultDoc => {
                      if (!d || typeof d !== 'object') return false;
                      const o = d as Record<string, unknown>;
                      return typeof o.id === 'string' && typeof o.title === 'string' && o.authorId === uid;
                  })
                : [];
            const mergedForUser = filterDeletedVaultDocs(
                mergeVaultDocs(localDocs, remoteDocs).filter((d) => d.authorId === uid),
            ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

            const latestLocalForUser = (await loadLocalVaultDocs()).filter((d) => d.authorId === uid);
            const finalForUser = filterDeletedVaultDocs(
                mergeVaultDocs(mergedForUser, latestLocalForUser).filter((d) => d.authorId === uid),
            ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

            return finalForUser;
        } catch {
            return localDocs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
    },

    async saveDoc(doc: SmartVaultDoc, requesterId?: string): Promise<void> {
        const requester = (requesterId ?? doc.authorId ?? '').trim();
        assertVaultDocOwner(doc, requester);
        if (doc.storagePath) {
            assertVaultStoragePathOwner(doc.storagePath, requester);
        }
        try {
            upsertVaultLocalIndexDocImmediate(doc);
            mergeVaultDocsWarmCache(doc.authorId, [doc]);
            void upsertVaultLocalIndexDocAndFlush(doc).catch((err) => {
                console.error('[Vault] saveDoc background flush failed', err);
            });
        } catch (err) {
            console.error('[Vault] saveDoc degraded persist - keeping in-memory index', err);
            upsertVaultLocalIndexDoc(doc);
        }
        if (isKvProxyNetworkEnabled() && isLawyerWorkCloudLive()) {
            void kv.set(`vault:docs:${doc.authorId}:${doc.id}`, vaultDocPayloadForKv(doc)).catch(() => {
                /* local-first */
            });
        }
    },

    async deleteDoc(docId: string, authorId: string): Promise<void> {
        if (!authorId || !docId) throw new Error('معرف الملف والمستخدم مطلوب');
        const localDocs = await loadLocalVaultDocs();
        const localDoc = localDocs.find((d) => d?.id === docId && d.authorId === authorId);
        if (isLawyerWorkCloudLive()) {
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
                /* continue */
            }
            try {
                await kv.del(`vault:docs:${authorId}:${docId}`);
            } catch {
                /* local first */
            }
        }
        if (localDoc?.storagePath && isVaultIdbStoragePath(localDoc.storagePath)) {
            await deleteVaultBlobByPath(localDoc.storagePath);
        }
        removeVaultLocalIndexDoc(docId, authorId);
        removeVaultDocFromWarmCache(authorId, docId);
        await flushVaultLocalIndexPersist();
    },

    async updateDoc(doc: SmartVaultDoc, requesterId?: string): Promise<void> {
        const requester = (requesterId ?? doc.authorId ?? '').trim();
        assertVaultDocOwner(doc, requester);
        await this.saveDoc(doc, requester);
    },

    async bindToDossier(docId: string, authorId: string, dossierId: string): Promise<void> {
        if (!docId || !authorId || !dossierId) throw new Error('جميع الحقول مطلوبة');

        let doc: SmartVaultDoc | null = null;
        const localDocs = await loadLocalVaultDocs();
        const localIdx = localDocs.findIndex((d) => d.id === docId && d.authorId === authorId);
        if (localIdx !== -1) {
            doc = localDocs[localIdx];
        } else if (isLawyerWorkCloudLive()) {
            try {
                const raw = await kv.get(`vault:docs:${authorId}:${docId}`);
                if (raw && typeof raw === 'object') {
                    doc = raw as SmartVaultDoc;
                }
            } catch {
                /* ignore */
            }
        }
        if (!doc) throw new Error('الملف غير موجود');
        if (doc.authorId !== authorId) throw new Error('غير مصرح بربط هذا الملف');

        const updated: SmartVaultDoc = {
            ...doc,
            boundDossierId: dossierId,
            updatedAt: new Date().toISOString(),
        };
        await this.updateDoc(updated, authorId);
    },

    async getSignedUrl(storagePath: string): Promise<string | null> {
        if (!isLawyerWorkCloudLive()) return null;
        return LawyerStorage.getSignedUrl(storagePath);
    },
};
