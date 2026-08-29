/**
 * Decisions namespace — storage keys, slug builders, index.
 */
import {
    executionStorageKey,
    normalizeExecutionStorageId,
} from '@/app/utils/executionStorageKeysLite';
import { stripExecutionDeviceStorageUserScope } from '@/app/utils/executionDeviceStorageScope';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import type {
    ExecutionClaimModule,
    ExecutionDomainContext,
} from '@/app/utils/executionDomainIsolation';
import {
    readDecisionsStoreRaw,
    writeDecisionsStoreRaw,
} from './executionDecisionsNamespaceStore';

export const DECISIONS_NAMESPACE_INDEX_VERSION = 1;

export interface DecisionsNamespaceIndex {
    v: number;
    active: string;
    legacyMigrated: boolean;
    migratedAt?: string;
}

export function sanitizeDecisionsNamespaceSlug(slug: string): string {
    const s = String(slug || 'unknown')
        .trim()
        .replace(/[^a-z0-9_]+/gi, '_')
        .replace(/^_+|_+$/g, '');
    return (s || 'unknown').slice(0, 80);
}

export function buildDecisionsNamespaceSlug(
    primaryClaimModule: ExecutionClaimModule | string,
    perspective: AppealUiPerspective,
): string {
    return sanitizeDecisionsNamespaceSlug(`${primaryClaimModule}__${perspective}`);
}

export function buildDecisionsNamespaceSlugFromContext(ctx: ExecutionDomainContext): string {
    return buildDecisionsNamespaceSlug(ctx.primaryClaimModule, ctx.perspective);
}

export function executionDecisionsNamespaceStorageKey(
    executionId: string | undefined,
    namespaceSlug: string,
): string {
    const id = normalizeExecutionStorageId(executionId);
    const slug = sanitizeDecisionsNamespaceSlug(namespaceSlug);
    return `${executionStorageKey(id)}_decisions_ns_${slug}`;
}

export function executionDecisionsNamespaceIndexKey(executionId: string | undefined): string {
    return `${executionStorageKey(executionId)}_decisions_ns_index`;
}

export function executionDecisionsLegacyArchiveKey(executionId: string | undefined): string {
    return `${executionStorageKey(executionId)}_decisions_legacy_archive`;
}

export function isExecutorDecisionsStorageKey(key: string): boolean {
    const k = stripExecutionDeviceStorageUserScope(String(key || '').trim());
    if (!k.startsWith('execution_')) return false;
    if (k.endsWith('_decisions_ns_index')) return false;
    if (k.endsWith('_decisions_legacy_archive')) return false;
    if (k.includes('_decisions_ns_')) return true;
    return k.endsWith('_decisions');
}

export function readDecisionsNamespaceIndex(
    executionId: string | undefined,
): DecisionsNamespaceIndex | null {
    const id = normalizeExecutionStorageId(executionId);
    if (!id || id === 'default') return null;
    try {
        const raw = readDecisionsStoreRaw(executionDecisionsNamespaceIndexKey(id));
        if (!raw) return null;
        const parsed = JSON.parse(raw) as DecisionsNamespaceIndex;
        if (!parsed || typeof parsed !== 'object') return null;
        if (!parsed.active) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function writeDecisionsNamespaceIndex(
    executionId: string,
    index: DecisionsNamespaceIndex,
): void {
    writeDecisionsStoreRaw(executionDecisionsNamespaceIndexKey(executionId), JSON.stringify(index));
}
