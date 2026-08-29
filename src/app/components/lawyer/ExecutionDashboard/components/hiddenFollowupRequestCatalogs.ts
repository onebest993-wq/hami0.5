import { resolveAmountGuarantorRequestVisible } from '@/app/slices/financial/specialtyPublic';
import { hasActiveFinancialGuarantorFollowup } from './guarantorExternalUtils';
import type {
    HiddenFollowupVisibilityInput,
    HiddenGuarantorCatalogItem,
    HiddenGuarantorContext,
    HiddenPersonalCoerciveCatalogItem,
} from './hiddenFollowupRequestsUtils.types';

function personalTabSuppressesBuriedHidden(f: HiddenFollowupVisibilityInput): boolean {
    if (!f.showPersonalCoerciveFollowupTab) return false;
    if (f.personalTabLockedForEmployee) return false;
    return true;
}

function buriedPersonalCoerciveEligible(f: HiddenFollowupVisibilityInput): boolean {
    if (f.suppressHiddenPersonalCoerciveRequests) return false;
    if (personalTabSuppressesBuriedHidden(f)) return false;
    return true;
}

function buriedForcedBringInEligible(f: HiddenFollowupVisibilityInput): boolean {
    if (personalTabSuppressesBuriedHidden(f)) return false;
    return true;
}

export const HIDDEN_PERSONAL_COERCIVE_CATALOG: HiddenPersonalCoerciveCatalogItem[] = [
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

export function shouldListGuarantorRequestInHiddenRequests(
    flags: HiddenFollowupVisibilityInput,
    ctx: HiddenGuarantorContext,
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

function shouldBuriedGuarantorSeizure(
    flags: HiddenFollowupVisibilityInput,
    ctx: HiddenGuarantorContext,
): boolean {
    if (ctx.activeDebtorIsDeceased) return false;
    if (!hasActiveFinancialGuarantorFollowup(ctx.executionData)) return false;
    if (flags.showGuarantorInSeizureTab) return false;
    return true;
}

export const HIDDEN_GUARANTOR_CATALOG: HiddenGuarantorCatalogItem[] = [
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
