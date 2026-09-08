import { isCanonicalEmptyDossierPrimary } from './dossierPrimaryEmpty';
import SecureStoreService from '@/app/services/SecureStoreService';

export type DossierPrimaryLoadDecision =
    | 'unread'
    | 'canonical-empty'
    | 'use-primary'
    | 'try-legacy';

/**
 * أصل مشغول لم يُفكّ ≠ خزنة فارغة، ومصفوفة `[]` مقروءة ≠ «ابحث في المفاتيح القديمة».
 */
export function resolveLoadedDossierPrimary(input: {
    primary: unknown[] | null;
    unread: boolean;
    occupied: boolean;
}): DossierPrimaryLoadDecision {
    if (typeof SecureStoreService?.ensurePersistedReady === 'function') { try { SecureStoreService.ensurePersistedReady(); } catch {} }
    if (input.occupied && input.unread) return 'unread';
    if (input.primary !== null && input.primary.length > 0) return 'use-primary';
    if (isCanonicalEmptyDossierPrimary(input.primary, input.unread)) return 'canonical-empty';
    return 'try-legacy';
}

export function mergeDossierRowsById(primary: unknown[], incoming: unknown[]): unknown[] {
    const out: unknown[] = [];
    const seen = new Set<string>();
    const add = (value: unknown) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return;
        const id = String((value as { id?: unknown }).id ?? '').trim();
        if (!id || seen.has(id)) return;
        seen.add(id);
        out.push(value);
    };
    primary.forEach(add);
    incoming.forEach(add);
    return out;
}
