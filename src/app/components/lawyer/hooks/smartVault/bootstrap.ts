import { isShellAuthBypassed } from '@/app/services/auth/shellAuth';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
import { mergeCustomCategoriesFromDocs } from '@/app/services/vaultCustomCategories';
import { peekVaultDocsWarmCache, setVaultDocsWarmCache } from '@/app/services/vault/vaultDocsWarmCache';
import { readVaultLocalIndexSync } from '@/app/services/vault/vaultLocalIndex';
import { mergeSmartVaultDocs } from '@/app/services/vault/vaultDocUtils';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';

export function resolveBootstrapUid(propUserId?: string): string {
    return propUserId?.trim() || (isShellAuthBypassed() ? GUEST_LAWYER_ID : '');
}

/** دمج الفهرس المحلي + الكاش الدافئ — للعرض الفوري قبل async load */
export function getBootstrapVaultDocs(propUserId?: string): SmartVaultDoc[] {
    const uid = resolveBootstrapUid(propUserId);
    if (!uid) return [];
    const local = readVaultLocalIndexSync().filter((d) => d.authorId === uid);
    const warm = peekVaultDocsWarmCache(uid) ?? [];
    const merged = mergeSmartVaultDocs(local, warm);
    if (merged.length > 0) setVaultDocsWarmCache(uid, merged);
    return merged;
}

export function peekBootstrapVaultCache(propUserId?: string) {
    const docs = getBootstrapVaultDocs(propUserId);
    return docs.length > 0 ? docs : undefined;
}

export function getInitialCustomCategories(propUserId?: string): string[] {
    const uid = resolveBootstrapUid(propUserId);
    const cached = uid ? getBootstrapVaultDocs(propUserId) : [];
    return uid && cached.length > 0 ? mergeCustomCategoriesFromDocs(uid, cached) : [];
}
