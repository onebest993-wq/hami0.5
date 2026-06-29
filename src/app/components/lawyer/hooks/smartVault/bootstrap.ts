import { isShellAuthBypassed } from '@/app/services/auth/shellAuth';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
import { mergeCustomCategoriesFromDocs } from '@/app/services/vaultCustomCategories';
import { peekVaultDocsWarmCache } from '@/app/services/vault/vaultDocsWarmCache';

export function resolveBootstrapUid(propUserId?: string): string {
    return propUserId?.trim() || (isShellAuthBypassed() ? GUEST_LAWYER_ID : '');
}

export function peekBootstrapVaultCache(propUserId?: string) {
    const uid = resolveBootstrapUid(propUserId);
    return uid ? peekVaultDocsWarmCache(uid) : undefined;
}

export function getInitialCustomCategories(propUserId?: string): string[] {
    const uid = resolveBootstrapUid(propUserId);
    const cached = uid ? peekVaultDocsWarmCache(uid) : undefined;
    return uid && cached ? mergeCustomCategoriesFromDocs(uid, cached) : [];
}
