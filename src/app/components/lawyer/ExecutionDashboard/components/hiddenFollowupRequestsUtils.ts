import type { FollowupSpecializationVisibility } from '@/app/utils/followupSpecializationVisibility';
import type { ExecutionDomainContext } from '@/app/utils/executionDomainIsolation';
import {
    isHiddenBreakInventoryRequestAllowed,
    isHiddenGuarantorCatalogItemAllowed,
    isHiddenPersonalCoerciveCatalogAllowed,
} from '@/app/utils/executionDomainIsolation';
import {
    getGoverningEvictionProcedureRowForBranch,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    isEvictionBranchResendBlocked,
    isEvictionProcedureRowWorkflowComplete,
    isExecutorRowRejectedAndFinal,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import { resolveExecutorRequestAppealSyncFromRow } from '@/app/utils/executorRequestAppealSync';
import { resolveAmountGuarantorRequestVisible } from '@/app/slices/financial/specialtyPublic';
import { hasActiveFinancialGuarantorFollowup } from './guarantorExternalUtils';
import type { ExecutionFile } from '@/app/types/execution';

/** عنوان الطلب عند الإرسال من الطلبات المخفية */
export const HIDDEN_BREAK_INVENTORY_REQUEST_TITLE = 'طلب كسر الأقفال';

export const HIDDEN_BREAK_INVENTORY_REQUEST_BODY =
    'طلب عرض على منفذ العدل بشأن كسر الأقفال للوصول إلى العين موضوع التنفيذ.';

export interface HiddenFollowupVisibilityInput extends FollowupSpecializationVisibility {
    /** هل تبويب التنفيذ الجبري الشخصي ظاهر في محضر المتابعة */
    showPersonalCoerciveFollowupTab: boolean;
    /** هل تُعرض بطاقات حجز الكفيل النشطة في تبويب حجز المدين (وليس طلب الكفيل) */
    showGuarantorInSeizureTab: boolean;
    /** قرارات المحاكم — أحوال شخصية / شرعي */
    isPersonalStatusExecutionClaim?: boolean;
    /** مطالبة نفقة (دون نفقة عدة / مهر) */
    isAlimonyClaim?: boolean;
    /** عرض الإضبارة في الطلبات المخفية — كاسب + مبلغ مالي قائم */
    showHiddenExecutiveDossierPresentation?: boolean;
    /** المدين الموظف — لا مفاتحة تحقيق ولا عرض إضبارة ولا حبس */
    activeDebtorIsEmployee?: boolean;
    /** نزع حضانة — تُفعَّل الإجراءات الجبرية للموظف والكاسب */
    isCustodyRemovalClaim?: boolean;
}

export type HiddenPersonalCoerciveRequestKey =
    | 'forced_bring_in'
    | 'travel_ban'
    | 'arrest_warrant_investigation'
    | 'executive_dossier_presentation'
    | 'executive_detention_judge';

export type HiddenGuarantorRequestKey =
    | 'guarantor_request'
    | 'guarantor_seizure_salary'
    | 'guarantor_seizure_property'
    | 'guarantor_seizure_movable';

export interface HiddenPersonalCoerciveCatalogItem {
    key: HiddenPersonalCoerciveRequestKey;
    subtype: PersonalCoerciveSubtype | null;
    label: string;
    shortLabel: string;
    submitTitle?: string;
    submitBody?: string;
    isHidden: (flags: HiddenFollowupVisibilityInput) => boolean;
}

export interface HiddenGuarantorCatalogItem {
    key: HiddenGuarantorRequestKey;
    label: string;
    shortLabel: string;
    isHidden: (flags: HiddenFollowupVisibilityInput, ctx: HiddenGuarantorContext) => boolean;
}

export interface HiddenGuarantorContext {
    executionData: ExecutionFile | null | undefined;
    settlementBreachTriggeredAt?: string | null;
    ledgerPendingSettlement?: unknown;
    financialCenterTotalIqd: number;
    activeDebtorIsDeceased: boolean;
    /** المدين الموظف — طلب الكفيل الأولي في الطلبات المخفية لا في الحجز */
    activeDebtorIsEmployee?: boolean;
}

/** المدين الموظف — لا مسارات الحبس/مفاتحة التحقيق/عرض الإضبارة */
export function isPersonalCoerciveDetentionPathAllowedForDebtor(
    key: HiddenPersonalCoerciveRequestKey,
    opts?: { activeDebtorIsEmployee?: boolean; isCustodyRemovalClaim?: boolean }
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
    flags: Pick<HiddenFollowupVisibilityInput, 'activeDebtorIsEmployee' | 'isCustodyRemovalClaim'>
): boolean {
    return Boolean(flags.activeDebtorIsEmployee) && !flags.isCustodyRemovalClaim;
}

/** يظهر في «الطلبات المخفية» فقط عندما التبويب الرئيسي مخفي */
function buriedPersonalCoerciveEligible(f: HiddenFollowupVisibilityInput): boolean {
    if (f.suppressHiddenPersonalCoerciveRequests) return false;
    if (f.showPersonalCoerciveFollowupTab) return false;
    return true;
}

/** إحضار جبري — يبقى في الطلبات المخفية حتى للموظف عند إخفاء التبويب الرئيسي */
function buriedForcedBringInEligible(f: HiddenFollowupVisibilityInput): boolean {
    if (f.showPersonalCoerciveFollowupTab) return false;
    return true;
}

const HIDDEN_PERSONAL_COERCIVE_CATALOG: HiddenPersonalCoerciveCatalogItem[] = [
    {
        key: 'forced_bring_in',
        subtype: 'forced_bring_in',
        label: 'إحضار جبري',
        shortLabel: 'إحضار جبري',
        submitTitle: 'طلب إحضار جبري للمدين',
        submitBody:
            'طلب إحضار بالقوة لمثول المدين أمام دائرة التنفيذ بعد انتهاء المهلة دون حضور طوعي.',
        isHidden: (f) => buriedForcedBringInEligible(f),
    },
    {
        key: 'travel_ban',
        subtype: 'travel_ban',
        label: 'منع سفر',
        shortLabel: 'منع سفر',
        submitTitle: 'طلب وضع إشارة منع سفر على المدين',
        submitBody:
            'طلب توجيه كتاب إلى مديرية الجوازات والإقامة لمنع سفر المدين لحين البتّ في التنفيذ.',
        isHidden: (f) => buriedPersonalCoerciveEligible(f),
    },
    {
        key: 'arrest_warrant_investigation',
        subtype: 'arrest_warrant_investigation',
        label: 'مفاتحة محكمة التحقيق',
        shortLabel: 'مفاتحة التحقيق',
        submitTitle: 'طلب مفاتحة محكمة التحقيق لإصدار أمر قبض',
        submitBody:
            'بعد تعذّر الإحضار الجبري وتخلّف المدين عن المثول، طُلب توجيه كتاب مفاتحة لمحكمة التحقيق المختصة لإصدار أمر قبض أصولي.',
        isHidden: (f) => buriedPersonalCoerciveEligible(f),
    },
    {
        key: 'executive_dossier_presentation',
        subtype: 'executive_dossier_presentation',
        label: 'طلب عرض الإضبارة على قاضي البداءة',
        shortLabel: 'عرض الإضبارة',
        submitTitle: 'طلب عرض الإضبارة على قاضي البداءة',
        submitBody:
            'طلب عرض الإضبارة على قاضي البداءة لغرض حبس المدين لامتناعه عن التسديد دون تسوية مقبولة.',
        isHidden: (f) =>
            buriedPersonalCoerciveEligible(f) && Boolean(f.showHiddenExecutiveDossierPresentation),
    },
    {
        key: 'executive_detention_judge',
        subtype: null,
        label: 'قرار قاضي البداءة (الحبس التنفيذي)',
        shortLabel: 'قرار القاضي',
        isHidden: (f) =>
            buriedPersonalCoerciveEligible(f) && Boolean(f.showHiddenExecutiveDossierPresentation),
    },
];

function isPersonalGuarantorClaim(flags: HiddenFollowupVisibilityInput): boolean {
    return Boolean(flags.isPersonalStatusExecutionClaim || flags.isAlimonyClaim);
}

/** بطاقة «طلب الكفيل» في أعلى قسم الأطراف — أُلغيت؛ الطلب من «الطلبات المخفية» فقط */
export function shouldShowGuarantorRequestEntryCard(
    _flags: HiddenFollowupVisibilityInput,
    _ctx: HiddenGuarantorContext
): boolean {
    return false;
}

/**
 * طلب الكفيل — مسار واحد؛ يظهر في الطلبات المخفية عندما يُخفى من الواجهة الرئيسية
 * (موظف، أو كفيل مالي بعد إخلال التسوية، إلخ).
 */
export function shouldListGuarantorRequestInHiddenRequests(
    flags: HiddenFollowupVisibilityInput,
    ctx: HiddenGuarantorContext
): boolean {
    if (ctx.activeDebtorIsDeceased) return false;
    if (hasActiveFinancialGuarantorFollowup(ctx.executionData)) return false;

    if (ctx.activeDebtorIsEmployee) return true;

    if (isPersonalGuarantorClaim(flags)) return false;
    if (flags.showGuarantorInSeizureTab) return false;
    if (flags.hideAllGuarantorPresence) return true;

    return resolveAmountGuarantorRequestVisible({
        isFinancialDebtCollectionClaim: flags.isFinancialDebtCollection,
        financialCenterTotalIqd: ctx.financialCenterTotalIqd,
        settlementBreachTriggeredAt: ctx.settlementBreachTriggeredAt,
        pendingSettlement: ctx.ledgerPendingSettlement as never,
        hideAllGuarantorPresence: false,
    });
}

/** طلب الكفيل ضامن — أول بطاقة في تبويب طلبات الحجز عند استيفاء الشروط */
export function shouldShowGuarantorRequestInSeizureTab(
    flags: HiddenFollowupVisibilityInput,
    ctx: HiddenGuarantorContext
): boolean {
    if (ctx.activeDebtorIsDeceased) return false;
    if (flags.hideAllGuarantorPresence) return false;
    if (ctx.activeDebtorIsEmployee) return false;
    if (hasActiveFinancialGuarantorFollowup(ctx.executionData)) return false;

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

function shouldBuriedGuarantorSeizure(
    flags: HiddenFollowupVisibilityInput,
    ctx: HiddenGuarantorContext
): boolean {
    if (ctx.activeDebtorIsDeceased) return false;
    if (!hasActiveFinancialGuarantorFollowup(ctx.executionData)) return false;
    if (flags.showGuarantorInSeizureTab) return false;
    return true;
}

const HIDDEN_GUARANTOR_CATALOG: HiddenGuarantorCatalogItem[] = [
    {
        key: 'guarantor_request',
        label: 'طلب الكفيل',
        shortLabel: 'طلب الكفيل',
        isHidden: (f, ctx) => shouldListGuarantorRequestInHiddenRequests(f, ctx),
    },
    {
        key: 'guarantor_seizure_salary',
        label: 'حجز راتب الكفيل الضامن',
        shortLabel: 'حجز راتب الكفيل',
        isHidden: (f, ctx) => shouldBuriedGuarantorSeizure(f, ctx),
    },
    {
        key: 'guarantor_seizure_property',
        label: 'حجز عقار الكفيل الضامن',
        shortLabel: 'حجز عقار الكفيل',
        isHidden: (f, ctx) => shouldBuriedGuarantorSeizure(f, ctx),
    },
    {
        key: 'guarantor_seizure_movable',
        label: 'حجز منقولات الكفيل الضامن',
        shortLabel: 'حجز منقول الكفيل',
        isHidden: (f, ctx) => shouldBuriedGuarantorSeizure(f, ctx),
    },
];

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
    key: HiddenGuarantorRequestKey;
    label: string;
    statusLabel: string;
}

/** الزر يظهر دائماً — إلا عند وفاة المدين */
export function shouldAlwaysShowHiddenRequestsToggle(opts?: {
    activeDebtorIsDeceased?: boolean;
}): boolean {
    return !opts?.activeDebtorIsDeceased;
}

export function listHiddenPersonalCoerciveCatalog(
    flags: HiddenFollowupVisibilityInput,
    domainCtx?: ExecutionDomainContext | null
): HiddenPersonalCoerciveCatalogItem[] {
    const base = HIDDEN_PERSONAL_COERCIVE_CATALOG.filter(
        (item) =>
            item.isHidden(flags) &&
            isPersonalCoerciveDetentionPathAllowedForDebtor(item.key, {
                activeDebtorIsEmployee: flags.activeDebtorIsEmployee,
                isCustodyRemovalClaim: flags.isCustodyRemovalClaim,
            })
    );
    if (!domainCtx || isHiddenPersonalCoerciveCatalogAllowed(domainCtx)) return base;
    return [];
}

export function listHiddenGuarantorCatalog(
    flags: HiddenFollowupVisibilityInput,
    ctx: HiddenGuarantorContext,
    domainCtx?: ExecutionDomainContext | null
): HiddenGuarantorCatalogItem[] {
    const base = HIDDEN_GUARANTOR_CATALOG.filter((item) => item.isHidden(flags, ctx));
    if (!domainCtx) return base;
    return base.filter((item) => isHiddenGuarantorCatalogItemAllowed(domainCtx, item.key));
}

/** طلب الكفيل — يظهر لدى الدائن في الحجز أو الطلبات المخفية */
export function isCreditorGuarantorRequestOptionVisible(
    flags: HiddenFollowupVisibilityInput,
    ctx: HiddenGuarantorContext
): boolean {
    if (shouldShowGuarantorRequestInSeizureTab(flags, ctx)) return true;
    return listHiddenGuarantorCatalog(flags, ctx).some((item) => item.key === 'guarantor_request');
}

export function shouldShowHiddenBreakInventoryRequest(
    flags: HiddenFollowupVisibilityInput,
    domainCtx?: ExecutionDomainContext | null
): boolean {
    if (!flags.showHiddenBreakInventoryRequest) return false;
    if (!domainCtx) return true;
    return isHiddenBreakInventoryRequestAllowed(domainCtx);
}

export function resolveHiddenBreakInventoryRequest(
    decisions: Record<string, unknown>[]
): {
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
    domainCtx?: ExecutionDomainContext | null
): boolean {
    return (
        listHiddenPersonalCoerciveCatalog(flags, domainCtx).length > 0 ||
        listHiddenGuarantorCatalog(flags, ctx, domainCtx).length > 0 ||
        shouldShowHiddenBreakInventoryRequest(flags, domainCtx)
    );
}

function resolveRowStatus(
    row: Record<string, unknown> | null,
    allDecisions: Record<string, unknown>[] = []
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
    decisions: Record<string, unknown>[]
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
    ctx: HiddenGuarantorContext
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
