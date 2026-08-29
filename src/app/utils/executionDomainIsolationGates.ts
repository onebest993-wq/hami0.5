/**
 * Domain isolation — persist gates + other-party catalog allow-lists.
 */
import { isLegalEntityDebtorKind } from '@/app/utils/debtorEntityKindUtils';
import { FIELD_PROCEDURE_CLAIM_MODULES } from './executionDomainIsolationClaimModules';
import {
    isAdminRequestsTabGate,
    isCommunicationJournalGate,
    isOtherPartyFollowupGate,
    type DomainGateResult,
    type ExecutionDomainContext,
    type ExecutorRequestGateMeta,
    type ExecutorRequestKind,
    type HiddenGuarantorCatalogKey,
} from './executionDomainIsolationTypes';
import { resolveExecutionDataForDomainGate } from './executionDomainIsolationRead';
import { resolveExecutionDomainContext } from './executionDomainIsolationContext';

/** بوابة إنشاء طلب تنفيذ — تمنع التسرب بين أنواع المطالبات */
export function canPersistExecutorRequestKind(
    ctx: ExecutionDomainContext,
    requestKind: ExecutorRequestKind | string,
    meta?: ExecutorRequestGateMeta,
): DomainGateResult {
    const kind = String(requestKind || '').trim() as ExecutorRequestKind;
    const flags = ctx.flags;

    if (kind === 'creditor_party_death' || kind === 'debtor_party_death' || kind === 'case_expense') {
        return { allowed: true };
    }

    if (kind === 'seizure') {
        if (flags.hideFollowupSeizureRequestsTab && flags.hideDossierFinancialTools) {
            return { allowed: false, reasonAr: 'حجز مالي غير مسموح لهذا النوع من المطالبة' };
        }
        if (isLegalEntityDebtorKind(ctx.debtorEntityKind)) {
            if (!flags.isFinancialDebtCollection || flags.hideDossierFinancialTools) {
                return { allowed: false, reasonAr: 'لا حجز مالي لمدين معنوي خارج مسار الدين المالي' };
            }
            return { allowed: true };
        }
        if (flags.hideFollowupSeizureRequestsTab && !flags.isFinancialDebtCollection) {
            return { allowed: false, reasonAr: 'حجز مالي غير مسموح لهذا النوع من المطالبة' };
        }
        return { allowed: true };
    }

    if (kind === 'personal_coercive') {
        if (flags.hidePersonalCoerciveFollowupTab || flags.suppressHiddenPersonalCoerciveRequests) {
            return { allowed: false, reasonAr: 'التنفيذ الجبري الشخصي غير مسموح لهذه الإضبارة' };
        }
        if (isLegalEntityDebtorKind(ctx.debtorEntityKind)) {
            return { allowed: false, reasonAr: 'لا إجراءات جبريّة شخصية لمدين معنوي' };
        }
        return { allowed: true };
    }

    if (kind === 'guarantor_request') {
        if (!flags.isFinancialDebtCollection || flags.hideAllGuarantorPresence) {
            return { allowed: false, reasonAr: 'طلب الكفيل غير مسموح لهذا المسار' };
        }
        return { allowed: true };
    }

    if (kind === 'eviction_procedure') {
        if (!ctx.claimModules.some((m) => FIELD_PROCEDURE_CLAIM_MODULES.includes(m))) {
            return { allowed: false, reasonAr: 'إجراءات ميدانية غير مسموحة لهذا النوع من المطالبة' };
        }
        return { allowed: true };
    }

    if (kind === 'trust_disburse' || kind === 'unified_collection' || kind === 'lawyer_fee_payout') {
        if (flags.hideDossierFinancialTools) {
            return { allowed: false, reasonAr: 'العمليات المالية غير مسموحة لهذا النوع من المطالبة' };
        }
        return { allowed: true };
    }

    if (kind === 'third_party_funds_received') {
        if (flags.hideDossierFinancialTools) {
            return { allowed: false, reasonAr: 'استلام أموال الغير غير مسموح في هذا المسار' };
        }
        return { allowed: true };
    }

    if (kind === 'special_followup') {
        if (
            isCommunicationJournalGate(meta) ||
            isAdminRequestsTabGate(meta) ||
            isOtherPartyFollowupGate(meta)
        ) {
            return { allowed: true };
        }
        if (
            ctx.jurisdiction === 'sharia' &&
            flags.hideFollowupCoerciveTab &&
            flags.hideDossierFinancialTools &&
            !flags.showEncroachmentRemovalRequestCards &&
            !flags.showSpecificDeliveryFieldProcedures
        ) {
            return { allowed: false, reasonAr: 'طلب المتابعة الخاص غير متاح لهذا الاختصاص' };
        }
        return { allowed: true };
    }

    return { allowed: true };
}

export function gateExecutorRequestPersist(
    executionId: string | undefined,
    requestKind: ExecutorRequestKind | string,
    meta?: ExecutorRequestGateMeta,
): DomainGateResult {
    const data = resolveExecutionDataForDomainGate(executionId, meta?.executionData);
    const ctx = resolveExecutionDomainContext(data, executionId);
    return canPersistExecutorRequestKind(ctx, requestKind, meta);
}

export const DOMAIN_ISOLATION_BLOCKED_EVENT = 'hami-domain-isolation-blocked';

export function hiddenGuarantorCatalogKeyToRequestKind(
    key: HiddenGuarantorCatalogKey | string,
): ExecutorRequestKind {
    if (key === 'guarantor_request') return 'guarantor_request';
    return 'seizure';
}

export function isHiddenGuarantorCatalogItemAllowed(
    ctx: ExecutionDomainContext,
    key: HiddenGuarantorCatalogKey | string,
): boolean {
    return canPersistExecutorRequestKind(ctx, hiddenGuarantorCatalogKeyToRequestKind(key)).allowed;
}

export function isHiddenPersonalCoerciveCatalogAllowed(ctx: ExecutionDomainContext): boolean {
    return canPersistExecutorRequestKind(ctx, 'personal_coercive').allowed;
}

export function isHiddenBreakInventoryRequestAllowed(ctx: ExecutionDomainContext): boolean {
    return canPersistExecutorRequestKind(ctx, 'special_followup').allowed;
}

export function otherPartyCatalogIdToRequestKind(optionId: string): ExecutorRequestKind | null {
    const id = String(optionId || '').trim();
    if (id.startsWith('sz-')) return 'seizure';
    if (id.startsWith('pc-')) return 'personal_coercive';
    if (id === 'gu-request') return 'guarantor_request';
    if (id === 'break-inventory') return 'special_followup';
    return null;
}

export function isOtherPartyCatalogOptionAllowed(
    ctx: ExecutionDomainContext,
    optionId: string,
): boolean {
    const kind = otherPartyCatalogIdToRequestKind(optionId);
    if (!kind) return true;
    return canPersistExecutorRequestKind(ctx, kind).allowed;
}

export function filterOtherPartyCatalogOptionIds(
    ctx: ExecutionDomainContext,
    optionIds: string[],
): string[] {
    return optionIds.filter((id) => isOtherPartyCatalogOptionAllowed(ctx, id));
}

/** واجهة موحّدة لمحضر المتابعة قبل إظهار زر الطلب */
export function isFollowupRequestKindAllowed(
    executionData: Record<string, unknown> | null | undefined,
    executionId: string | undefined,
    requestKind: ExecutorRequestKind | string,
    meta?: ExecutorRequestGateMeta,
): DomainGateResult {
    const ctx = resolveExecutionDomainContext(executionData, executionId);
    return canPersistExecutorRequestKind(ctx, requestKind, meta);
}

export function dispatchDomainIsolationBlocked(reasonAr: string, requestKind?: string): void {
    if (typeof window === 'undefined') return;
    const message = String(reasonAr || 'هذا الإجراء غير متاح في مسار هذه الإضبارة').trim();
    try {
        window.dispatchEvent(
            new CustomEvent(DOMAIN_ISOLATION_BLOCKED_EVENT, {
                detail: { requestKind, reasonAr: message },
            }),
        );
        window.dispatchEvent(
            new CustomEvent('hami-toast', {
                detail: { message, type: 'warning' as const },
            }),
        );
    } catch {
        /* ignore */
    }
}
