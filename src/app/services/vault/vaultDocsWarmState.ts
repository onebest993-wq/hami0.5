import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { mergeSmartVaultDocs } from '@/app/services/vault/vaultDocUtils';

export const SMART_VAULT_DOCS_UPDATED_EVENT = 'hami:smart-vault-docs-updated';

export const vaultDocsWarmCacheStore = new Map<string, SmartVaultDoc[]>();
export const vaultDocsWarmInflightStore = new Map<string, Promise<SmartVaultDoc[]>>();

export function sortVaultDocs(docs: SmartVaultDoc[]): SmartVaultDoc[] {
    return [...docs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function peekVaultDocsWarmCache(userId: string): SmartVaultDoc[] | undefined {
    const uid = userId.trim();
    return uid ? vaultDocsWarmCacheStore.get(uid) : undefined;
}

export function setVaultDocsWarmCache(userId: string, docs: SmartVaultDoc[]): void {
    const uid = userId.trim();
    if (uid) vaultDocsWarmCacheStore.set(uid, sortVaultDocs(docs));
}

export function mergeVaultDocsWarmCache(userId: string, docs: SmartVaultDoc[]): SmartVaultDoc[] {
    const uid = userId.trim();
    if (!uid) return docs;
    const prev = vaultDocsWarmCacheStore.get(uid) ?? [];
    const merged = sortVaultDocs(mergeSmartVaultDocs(prev, docs));
    vaultDocsWarmCacheStore.set(uid, merged);
    return merged;
}

export function removeVaultDocFromWarmCache(userId: string, docId: string): SmartVaultDoc[] {
    const uid = userId.trim();
    const id = docId.trim();
    if (!uid || !id) return [];
    const next = (vaultDocsWarmCacheStore.get(uid) ?? []).filter((doc) => doc.id !== id);
    vaultDocsWarmCacheStore.set(uid, next);
    vaultDocsWarmInflightStore.delete(uid);
    return next;
}

export function invalidateVaultDocsWarmCache(userId?: string): void {
    if (userId?.trim()) vaultDocsWarmCacheStore.delete(userId.trim());
    else vaultDocsWarmCacheStore.clear();
}
