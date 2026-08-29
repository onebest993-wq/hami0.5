import {
    isHiddenBreakInventoryRequestAllowed,
    isHiddenGuarantorCatalogItemAllowed,
    isHiddenPersonalCoerciveCatalogAllowed,
} from '@/app/utils/executionDomainIsolation';
import type { ExecutionDomainContext } from '@/app/utils/executionDomainIsolation';
import {
    getGoverningEvictionProcedureRowForBranch,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    isEvictionBranchResendBlocked,
    isEvictionProcedureRowWorkflowComplete,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { resolveExecutorRequestAppealSyncFromRow } from '@/app/utils/executorRequestAppealSync';
import { resolveAmountGuarantorRequestVisible } from '@/app/slices/financial/specialtyPublic';
import { hasActiveFinancialGuarantorFollowup } from './guarantorExternalUtils';
import {
    HIDDEN_GUARANTOR_CATALOG,
    HIDDEN_PERSONAL_COERCIVE_CATALOG,
    shouldListGuarantorRequestInHiddenRequests,
} from './hiddenFollowupRequestCatalogs';

export const HIDDEN_BREAK_INVENTORY_REQUEST_TITLE = 'طلب كسر الأقفال';

export const HIDDEN_BREAK_INVENTORY_REQUEST_BODY =
    'طلب عرض على منفذ العدل بشأن كسر الأقفال للوصول إلى العين موضوع التنفيذ.';

export type {
    HiddenFollowupVisibilityInput,
    HiddenPersonalCoerciveRequestKey,
    HiddenGuarantorRequestKey,
    HiddenPersonalCoerciveCatalogItem,
    HiddenGuarantorCatalogItem,
    HiddenGuarantorContext,
} from './hiddenFollowupRequestsUtils.types';
import type {
    HiddenFollowupVisibilityInput,
    HiddenPersonalCoerciveRequestKey,
    HiddenGuarantorContext,
} from './hiddenFollowupRequestsUtils.types';

export { shouldListGuarantorRequestInHiddenRequests };

export function isPersonalCoerciveDetentionPathAllowedForDebtor(
    key: HiddenPersonalCoerciveRequestKey,
    opts?: { activeDebtorIsEmployee?: boolean; isCustodyRemovalClaim?: boolean },
): boolean {
    if (opts?.isCustodyRemovalClaim) return true;
    if (!opts?.activeDebtorIsEmployee) return true;
    return (
        key !== 'arrest_warrant_investigation' &&
        key !== 'executive_dossier_presentation' &&
        key !== 'executive_detention_judge'
    );
}

export function isEmployeeCoerciveDetentionRestricted(
    flags: Pick<HiddenFollowupVisibilityInput, 'activeDebtorIsEmployee' | 'isCustodyRemovalClaim'>,
): boolean {
    return Boolean(flags.activeDebtorIsEmployee) && !flags.isCustodyRemovalClaim;
}

export function shouldShowGuarantorRequestInSeizureTab(
    flags: HiddenFollowupVisibilityInput,
    ctx: HiddenGuarantorContext,
): boolean {
    if (ctx.activeDebtorIsDeceased) return false;
    if (flags.hideAllGuarantorPresence) return false;
    if (ctx.activeDebtorIsEmployee) return false;
    if (hasActiveFinancialGuarantorFollowup(ctx.executionData)) return true;

    const amountGuarantorVisible = resolveAmountGuarantorRequestVisible({
        isFinancialDebtCollectionClaim: flags.isFinancialDebtCollection,
        financialCenterTotalIqd: ctx.financialCenterTotalIqd,
        settlementBreachTriggeredAt: ctx.settlementBreachTriggeredAt,
        pendingSettlement: ctx.ledgerPendingSettlement as never,
        hideAllGuarantorPresence: false,
    });

    if (flags.isFinancialDebtCollection) {
        return amountGuarantorVisible && Boolean(flags.showFinancialGuarantorRequestOnly);
    }

    return true;
}

export type HiddenRequestStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'alternative';

export interface ResolvedHiddenPersonalRequest {
    key: HiddenPersonalCoerciveRequestKey;
    label: string;
    status: HiddenRequestStatus;
    statusLabel: string;
    decisionId: string | null;
    decisionTitle: string | null;
}

export interface ResolvedHiddenGuarantorRequest {
    key: import('./hiddenFollowupRequestsUtils.types').HiddenGuarantorRequestKey;
    label: string;
    statusLabel: string;
}

export function shouldAlwaysShowHiddenRequestsToggle(opts?: {
    activeDebtorIsDeceased?: boolean;
}): boolean {
    return !opts?.activeDebtorIsDeceased;
}

export function listHiddenPersonalCoerciveCatalog(
    flags: HiddenFollowupVisibilityInput,
    domainCtx?: ExecutionDomainContext | null,
) {
    const base = HIDDEN_PERSONAL_COERCIVE_CATALOG.filter(
        (item) =>
            item.isHidden(flags) &&
            isPersonalCoerciveDetentionPathAllowedForDebtor(item.key, {
                activeDebtorIsEmployee: flags.activeDebtorIsEmployee,
                isCustodyRemovalClaim: flags.isCustodyRemovalClaim,
            }),
    );
    if (!domainCtx || isHiddenPersonalCoerciveCatalogAllowed(domainCtx)) return base;
    return [];
}

export function listHiddenGuarantorCatalog(
    flags: HiddenFollowupVisibilityInput,
    ctx: HiddenGuarantorContext,
    domainCtx?: ExecutionDomainContext | null,
) {
    const base = HIDDEN_GUARANTOR_CATALOG.filter((item) => item.isHidden(flags, ctx));
    if (!domainCtx) return base;
    return base.filter((item) => isHiddenGuarantorCatalogItemAllowed(domainCtx, item.key));
}

export function isCreditorGuarantorRequestOptionVisible(
    flags: HiddenFollowupVisibilityInput,
    ctx: HiddenGuarantorContext,
): boolean {
    if (shouldShowGuarantorRequestInSeizureTab(flags, ctx)) return true;
    return listHiddenGuarantorCatalog(flags, ctx).some((item) => item.key === 'guarantor_request');
}

export function shouldShowHiddenBreakInventoryRequest(
    flags: HiddenFollowupVisibilityInput,
    domainCtx?: ExecutionDomainContext | null,
): boolean {
    if (!flags.showHiddenBreakInventoryRequest) return false;
    if (!domainCtx) return true;
    return isHiddenBreakInventoryRequestAllowed(domainCtx);
}

export function resolveHiddenBreakInventoryRequest(decisions: Record<string, unknown>[]): {
    row: Record<string, unknown> | null;
    status: HiddenRequestStatus;
    statusLabel: string;
    workflowComplete: boolean;
    resendBlocked: boolean;
} {
    const row = getGoverningEvictionProcedureRowForBranch(decisions, 'Lock Breaking & Inventory');
    const { status, statusLabel } = resolveRowStatus(row, decisions);
    const workflowComplete = Boolean(row && isEvictionProcedureRowWorkflowComplete(row));
    const resendBlocked = isEvictionBranchResendBlocked(decisions, { branch: 'Lock Breaking & Inventory' });
    return { row, status, statusLabel, workflowComplete, resendBlocked };
}

export function hasAnyHiddenFollowupContent(
    flags: HiddenFollowupVisibilityInput,
    ctx: HiddenGuarantorContext,
    domainCtx?: ExecutionDomainContext | null,
): boolean {
    return (
        listHiddenPersonalCoerciveCatalog(flags, domainCtx).length > 0 ||
        listHiddenGuarantorCatalog(flags, ctx, domainCtx).length > 0 ||
        shouldShowHiddenBreakInventoryRequest(flags, domainCtx)
    );
}

function resolveRowStatus(
    row: Record<string, unknown> | null,
    allDecisions: Record<string, unknown>[] = [],
): {
    status: HiddenRequestStatus;
    statusLabel: string;
} {
    if (!row) {
        return { status: 'none', statusLabel: 'لا يوجد طلب مُسجَّل' };
    }
    const rejected = isExecutorRowRejectedAndFinal(row);
    const outcome = String((row as { executorOutcome?: string }).executorOutcome ?? 'pending').trim();
    const pending = outcome === 'pending' || outcome === '';
    const alternative = outcome === 'alternative';
    if (rejected) return { status: 'rejected', statusLabel: 'مرفوض لدى المنفذ' };
    if (pending) return { status: 'pending', statusLabel: 'قيد البت لدى المنفذ' };
    if (alternative) return { status: 'alternative', statusLabel: 'قرار بديل' };
    const sync = resolveExecutorRequestAppealSyncFromRow(row, allDecisions);
    if (sync.cycleSuperseded || sync.gate.kind === 'lifecycle_reset') {
        return { status: 'none', statusLabel: 'دورة منتهية — يمكن إعادة الطلب' };
    }
    if (sync.gate.kind === 'revoked') {
        return { status: 'approved', statusLabel: 'غير نافذ — قبول تظلم نهائي' };
    }
    if (sync.gate.kind === 'paused') {
        return { status: 'approved', statusLabel: 'موقوف — قبول تظلم' };
    }
    if (sync.enforced) {
        return { status: 'approved', statusLabel: 'نافذ' };
    }
    if (sync.governingRow && sync.blocked) {
        return { status: 'approved', statusLabel: 'غير نافذ' };
    }
    return { status: 'none', statusLabel: '—' };
}

export function resolveHiddenPersonalCoerciveRequests(
    flags: HiddenFollowupVisibilityInput,
    decisions: Record<string, unknown>[],
): ResolvedHiddenPersonalRequest[] {
    return listHiddenPersonalCoerciveCatalog(flags).map((item) => {
        if (!item.subtype) {
            return {
                key: item.key,
                label: item.label,
                status: 'none',
                statusLabel: 'يُدار ضمن مسار عرض الإضبارة',
                decisionId: null,
                decisionTitle: null,
            };
        }
        const row = getGoverningPersonalCoerciveSubtypeRowFromDecisions(decisions, item.subtype);
        const { status, statusLabel } = resolveRowStatus(row, decisions);
        return {
            key: item.key,
            label: item.label,
            status,
            statusLabel,
            decisionId: row ? String((row as { id?: string }).id || '').trim() || null : null,
            decisionTitle: row ? String((row as { title?: string }).title || '').trim() || null : null,
        };
    });
}

export function resolveHiddenGuarantorRequests(
    flags: HiddenFollowupVisibilityInput,
    ctx: HiddenGuarantorContext,
): ResolvedHiddenGuarantorRequest[] {
    return listHiddenGuarantorCatalog(flags, ctx).map((item) => ({
        key: item.key,
        label: item.label,
        statusLabel:
            item.key === 'guarantor_request'
                ? hasActiveFinancialGuarantorFollowup(ctx.executionData)
                    ? 'كفيل ضامن نشط'
                    : ctx.activeDebtorIsEmployee
                      ? 'متاح — تقديم طلب الكفيل'
                      : 'يتاح بعد إخلال التسوية أو للمدين الموظف'
                : hasActiveFinancialGuarantorFollowup(ctx.executionData)
                  ? 'مسار الحجز متاح'
                  : 'يتطلب كفيلاً مُفعّلاً',
    }));
}
