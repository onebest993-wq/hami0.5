/**
 * Decisions namespace — active slug resolve + legacy row inference.
 */
import {
    readExecutionDataForDomainGate,
    resolveExecutionDomainContext,
    type ExecutionClaimModule,
    type ExecutionDomainContext,
} from '@/app/utils/executionDomainIsolation';
import { normalizeExecutionStorageId } from '@/app/utils/executionStorageKeysLite';
import {
    inferExecutorApprovalDecisionType,
    type EvictionExecutorWorkflowKey,
} from '@/app/utils/executorApprovalWorkflow';
import {
    buildDecisionsNamespaceSlug,
    buildDecisionsNamespaceSlugFromContext,
    executionDecisionsNamespaceStorageKey,
    readDecisionsNamespaceIndex,
    sanitizeDecisionsNamespaceSlug,
} from './executionDecisionsNamespaceKeys';

export function resolveActiveDecisionsNamespaceSlug(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): string {
    const id = normalizeExecutionStorageId(executionId);
    const data = executionData ?? readExecutionDataForDomainGate(id);
    if (!data || Object.keys(data).length === 0) {
        const index = readDecisionsNamespaceIndex(id);
        if (index?.active) return index.active;
    }
    const ctx = resolveExecutionDomainContext(data ?? {}, id);
    return buildDecisionsNamespaceSlugFromContext(ctx);
}

export function resolveActiveDecisionsStorageKey(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): string {
    const slug = resolveActiveDecisionsNamespaceSlug(executionId, executionData);
    return executionDecisionsNamespaceStorageKey(executionId, slug);
}

export function stampDecisionRowsWithNamespace(
    rows: Record<string, unknown>[],
    namespaceSlug: string,
): Record<string, unknown>[] {
    const slug = sanitizeDecisionsNamespaceSlug(namespaceSlug);
    return rows.map((row) => {
        const existing = String((row as { domainNamespace?: string }).domainNamespace || '').trim();
        if (existing === slug) return row;
        return { ...row, domainNamespace: slug };
    });
}

export function inferLegacyRowNamespaceSlug(
    row: Record<string, unknown>,
    ctx: ExecutionDomainContext,
): string {
    const tagged = String((row as { domainNamespace?: string }).domainNamespace || '').trim();
    if (tagged) return sanitizeDecisionsNamespaceSlug(tagged);

    const kind = String(row.requestKind || '').trim();
    let module: ExecutionClaimModule | string = ctx.primaryClaimModule;

    if (
        kind === 'seizure' ||
        kind === 'guarantor_request' ||
        kind === 'unified_collection' ||
        kind === 'trust_disburse' ||
        kind === 'lawyer_fee_payout' ||
        kind === 'third_party_funds_received' ||
        kind === 'case_expense'
    ) {
        module = 'financial_debt';
    } else if (kind === 'eviction_procedure') {
        const branch = inferExecutorApprovalDecisionType({
            title: String(row.title || ''),
            requestKind: 'eviction_procedure',
            evictionWorkflowKey: (row as { evictionWorkflowKey?: EvictionExecutorWorkflowKey })
                .evictionWorkflowKey,
        });
        if (branch === 'Marital Furniture Delivery') {
            module = 'marital_furniture';
        } else if (ctx.claimModules.includes('specific_delivery')) {
            module = 'specific_delivery';
        } else if (ctx.claimModules.includes('encroachment')) {
            module = 'encroachment';
        } else {
            module = 'eviction';
        }
    } else if (kind === 'personal_coercive') {
        module = ctx.flags.hidePersonalCoerciveFollowupTab
            ? ctx.primaryClaimModule
            : 'financial_debt';
    }

    return buildDecisionsNamespaceSlug(module, ctx.perspective);
}

export function resolveDecisionRowNamespaceSlug(
    row: Record<string, unknown>,
    executionData?: Record<string, unknown> | null,
    executionId?: string | undefined,
): string {
    const id = normalizeExecutionStorageId(executionId);
    const data = executionData ?? readExecutionDataForDomainGate(id);
    const ctx = resolveExecutionDomainContext(data ?? {}, id);
    return inferLegacyRowNamespaceSlug(row, ctx);
}
