import {
    isCustodyRemovalClaim,
    isEncroachmentRemovalClaim,
    isEvictionClaim,
    isSpecificDeliveryClaim,
} from '@/app/utils/executionModuleStrategies';
import { resolveSpecificDeliveryUiPhase } from '@/app/utils/resolveSpecificDeliveryUiPhase';
import { getEffectiveClaimTypes } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import {
    isLegalEntityDebtorKind,
    type DebtorEntityKind,
} from '@/app/utils/debtorEntityKindUtils';
import { mergeFollowupSpecializationFlags } from '@/app/utils/executionClaimIsolation';

/** قرارات المحاكم — مسار أحوال شخصية / شرعي (لا إجراءات جبرية) */
export function isPersonalStatusCourtDecisionsDossier(
    docType?: string | null,
    classification?: string | null,
    category?: string | null,
    debtorEntityKind?: DebtorEntityKind | string | null,
): boolean {
    if (isLegalEntityDebtorKind(debtorEntityKind)) return false;
    const dt = String(docType || '').trim();
    if (dt !== 'قرارات وأحكام المحاكم') return false;
    const cl = String(classification || '').trim();
    if (cl === 'شرعي' || cl === 'أحوال شخصية') return true;
    return String(category || '').trim() === 'sharia';
}

function applyPersonalStatusCourtCoerciveBan(
    flags: FollowupSpecializationVisibility,
    isEmployee: boolean,
): FollowupSpecializationVisibility {
    const base: FollowupSpecializationVisibility = {
        ...flags,
        hideFollowupCoerciveTab: true,
        hideCoerciveGraceNoticeBanner: true,
        hideCoerciveFinancialBanners: true,
        hideCoerciveSeizureSalaryAndProperty: true,
    };
    if (isEmployee) {
        return {
            ...base,
            hidePersonalCoerciveFollowupTab: true,
            hidePersonalJudgePresentation: true,
            hidePersonalForcedBringActivation: true,
            suppressHiddenPersonalCoerciveRequests: true,
        };
    }
    return base;
}

function applyLegalEntityDebtorFollowupBan(
    flags: FollowupSpecializationVisibility
): FollowupSpecializationVisibility {
    return {
        ...flags,
        hidePersonalCoerciveFollowupTab: true,
        hideFollowupCoerciveTab: true,
        hideFollowupSeizureRequestsTab: true,
        hideAllGuarantorPresence: true,
        hideGuarantorSeizureSubTab: true,
        hidePersonalJudgePresentation: true,
        hidePersonalForcedBringActivation: true,
        hideCoerciveGraceNoticeBanner: true,
        hideCoerciveFinancialBanners: true,
        hideCoerciveSeizureSalaryAndProperty: true,
        suppressHiddenPersonalCoerciveRequests: true,
        forceSettlementBuriedOnly: false,
        showFinancialGuarantorRequestOnly: false,
        showCorrespondencesSoftProcedures: true,
    };
}

/** استحصال/استخلاص دين مالي — يحدد ظهور محضر المتابعة والإجراءات الجبرية */
export function isFinancialDebtCollectionClaim(claimType: string): boolean {
    const c = String(claimType || '').trim();
    return c === 'استحصال دين مالي' || c === 'استخلاص دين مالي';
}

/** مشاهدة / استصحاب / مبيت — تنفيذ أحوال شخصية غير مالي */
export function isVisitationClaim(claimType: string): boolean {
    const c = String(claimType || '').trim();
    return c === 'مشاهدة' || c.includes('مشاهدة');
}

/** المطاوعة / ترك النشوز — تنفيذ بالتنبيه فقط دون إجراءات مالية أو جبريّة شخصية */
export function isMatwaaClaim(claimType: string): boolean {
    const c = String(claimType || '').trim();
    return c === 'مطاوعة' || c.includes('مطاوعة');
}

/** أثاث زوجية — تسليم منقولات من وحدة الأثاث؛ حجز مالي عند التعذّر دون إجراءات جبريّة في المحضر */
export function isMaritalFurnitureClaim(claimType: string): boolean {
    const c = String(claimType || '').trim();
    return c === 'أثاث زوجية' || c.includes('أثاث زوجية');
}

export { isCustodyRemovalClaim } from '@/app/utils/executionModuleStrategies';

export interface FollowupSpecializationVisibility {
    /** استحصال/استخلاص دين مالي — يفعّل بوابة التسوية لكفيل ضامن للمبلغ */
    isFinancialDebtCollection: boolean;
    /** إخفاء تبويب «التنفيذ الجبري الشخصي» بالكامل (استحصال مالي + مدين موظف) */
    hidePersonalCoerciveFollowupTab: boolean;
    /** إخفاء تبويب «الإجراءات الجبرية» بالكامل */
    hideFollowupCoerciveTab: boolean;
    /** إخفاء عرض الإضبارة على قاضي البداءة وقرار الحبس في التنفيذ الجبري الشخصي */
    hidePersonalJudgePresentation: boolean;
    /** إخفاء «تفعيل بقرار المنفذ» في مسار الإحضار الجبري */
    hidePersonalForcedBringActivation: boolean;
    /** إخفاء تبويب حجز الكفيل الضامن */
    hideGuarantorSeizureSubTab: boolean;
    /** إخفاء كل مسارات الكفيل (مالي + حجز + بطاقات) — مدين موظف */
    hideAllGuarantorPresence: boolean;
    /** التسوية تبقى في ⋮ المخفي فقط — استحصال مالي + موظف */
    forceSettlementBuriedOnly: boolean;
    /** طلب كفيل ضامن للمبلغ فقط (بدون تبويب حجز الكفيل) — للكاسب في استحصال مالي */
    showFinancialGuarantorRequestOnly: boolean;
    /** إخفاء بانر «تنبيه مهلة الإخبار» في تبويب الإجراءات الجبرية */
    hideCoerciveGraceNoticeBanner: boolean;
    /** إخفاء بانرات التوجيه المالي (موظف / استحصال) في تبويب الإجراءات الجبرية */
    hideCoerciveFinancialBanners: boolean;
    /** إخفاء أزرار حجز الراتب والعقار في شبكة الأدوات الجبرية */
    hideCoerciveSeizureSalaryAndProperty: boolean;
    /** إخفاء مهلة / كسر الأقفال / الإخلاء الجبري في إجراءات الميدان */
    hideEncroachmentEvictionProcedureItems: boolean;
    /** بطاقات طلبات إزالة / رفع تجاوز (خبير مساح + آليات) */
    showEncroachmentRemovalRequestCards: boolean;
    /** بطاقة انتداب خبير مساح — تسليم شيء غير منقول */
    showSpecificDeliverySurveyorCard: boolean;
    /** بطاقة تحويل المطالبة لتعذر التسليم / هلاك الشيء */
    showSpecificDeliveryConversionCard: boolean;
    /** إخفاء تنصيب حارس قضائي في إجراءات الميدان */
    hideEvictionCustodianProcedure: boolean;
    /** @deprecated — لم يعد يُعرض في الإجراءات الجبرية */
    showSpecificDeliveryBreakInventoryCard: boolean;
    /** طلب كسر الأقفال في الطلبات المخفية (تبويب الطلبات) */
    showHiddenBreakInventoryRequest: boolean;
    /** كتلة الإجراءات الميدانية لتسليم شيء معين */
    showSpecificDeliveryFieldProcedures: boolean;
    /** إخفاء طلبات التنفيذ الجبري الشخصي من «الطلبات المخفية» (أحوال شخصية + موظف) */
    suppressHiddenPersonalCoerciveRequests: boolean;
    /** إخفاء المركز المالي وسجل الحجز من أدوات الإضبارة */
    hideDossierFinancialTools: boolean;
    /** إخفاء تبويب طلبات الحجز المالية في محضر المتابعة */
    hideFollowupSeizureRequestsTab: boolean;
    /** مدين معنوي — إجراءات ميدانية لطيفة داخل المخاطبات */
    showCorrespondencesSoftProcedures: boolean;
}

/** مدين موظف — لا كفيل ضامن للمبلغ في أي مسار تنفيذ (مدني / أحوال / مالي) */
function applyEmployeeDebtorAmountGuarantorBan(
    flags: FollowupSpecializationVisibility
): FollowupSpecializationVisibility {
    return {
        ...flags,
        hideGuarantorSeizureSubTab: true,
        hideAllGuarantorPresence: true,
        showFinancialGuarantorRequestOnly: false,
    };
}

const defaultFollowupSpecialization = (): FollowupSpecializationVisibility => ({
    isFinancialDebtCollection: false,
    hidePersonalCoerciveFollowupTab: false,
    hideFollowupCoerciveTab: false,
    hidePersonalJudgePresentation: false,
    hidePersonalForcedBringActivation: false,
    hideGuarantorSeizureSubTab: false,
    hideAllGuarantorPresence: false,
    forceSettlementBuriedOnly: false,
    showFinancialGuarantorRequestOnly: false,
    hideCoerciveGraceNoticeBanner: false,
    hideCoerciveFinancialBanners: false,
    hideCoerciveSeizureSalaryAndProperty: false,
    hideEncroachmentEvictionProcedureItems: false,
    showEncroachmentRemovalRequestCards: false,
    showSpecificDeliverySurveyorCard: false,
    showSpecificDeliveryConversionCard: false,
    hideEvictionCustodianProcedure: false,
    showSpecificDeliveryBreakInventoryCard: false,
    showHiddenBreakInventoryRequest: false,
    showSpecificDeliveryFieldProcedures: false,
    suppressHiddenPersonalCoerciveRequests: false,
    hideDossierFinancialTools: false,
    hideFollowupSeizureRequestsTab: false,
    showCorrespondencesSoftProcedures: false,
});

function mapSpecificDeliveryPhaseToFollowupFlags(
    phase: ReturnType<typeof resolveSpecificDeliveryUiPhase>,
    isEmployee: boolean
): FollowupSpecializationVisibility {
    const base = defaultFollowupSpecialization();
    const flags: FollowupSpecializationVisibility = {
        ...base,
        hidePersonalCoerciveFollowupTab: !phase.showPersonalCoerciveTab,
        hideFollowupCoerciveTab: phase.hideCoerciveFollowupTab,
        hidePersonalJudgePresentation: phase.hidePersonalDetentionCard,
        hidePersonalForcedBringActivation: phase.hidePersonalForcedBringCard,
        hideGuarantorSeizureSubTab: phase.hideGuarantorSeizureSubTab,
        showFinancialGuarantorRequestOnly: phase.showFinancialGuarantorRequestOnly,
        hideCoerciveGraceNoticeBanner: phase.hideCoerciveGraceNotice,
        hideCoerciveFinancialBanners: phase.hideCoerciveFinancialBanners,
        hideCoerciveSeizureSalaryAndProperty: phase.hideCoerciveSeizureTools,
        hideEncroachmentEvictionProcedureItems: phase.hideEncroachmentEvictionExtras,
        hideFollowupSeizureRequestsTab: phase.hideFollowupSeizureRequestsTab,
        showSpecificDeliverySurveyorCard: phase.showSurveyorCard,
        showSpecificDeliveryConversionCard: phase.showConversionCard,
        hideEvictionCustodianProcedure: phase.hideEvictionCustodianProcedure,
        showSpecificDeliveryBreakInventoryCard: false,
        showHiddenBreakInventoryRequest: phase.showHiddenBreakInventoryRequest,
        showSpecificDeliveryFieldProcedures: phase.showFieldProcedures,
        isFinancialDebtCollection: phase.activateFinancialSeizurePath,
    };
    return isEmployee ? applyEmployeeDebtorAmountGuarantorBan(flags) : flags;
}

export function resolveFollowupSpecializationVisibility(
    claimType: string,
    isEmployee: boolean,
    opts?: {
        specificDeliveryItemNature?: string | null;
        specificDeliveryFinancialized?: boolean;
        specificDeliveryItems?: import('@/app/utils/specificDeliveryItemsUtils').SpecificDeliveryItem[] | null;
        docType?: string | null;
        classification?: string | null;
        category?: string | null;
        debtorEntityKind?: DebtorEntityKind | string | null;
    }
): FollowupSpecializationVisibility {
    const c = String(claimType || '').trim();
    const debtorEntityKind = opts?.debtorEntityKind ?? 'natural_person';
    const personalStatusCourt = isPersonalStatusCourtDecisionsDossier(
        opts?.docType,
        opts?.classification,
        opts?.category,
        debtorEntityKind,
    );

    const finalize = (
        flags: FollowupSpecializationVisibility,
        opts?: { skipPersonalStatusCourtBan?: boolean }
    ): FollowupSpecializationVisibility => {
        let next = flags;
        if (personalStatusCourt && !opts?.skipPersonalStatusCourtBan && !isCustodyRemovalClaim(c)) {
            next = applyPersonalStatusCourtCoerciveBan(flags, isEmployee);
        }
        if (isLegalEntityDebtorKind(debtorEntityKind)) {
            const preLegalEntityBan = next;
            next = applyLegalEntityDebtorFollowupBan(next);
            if (
                isSpecificDeliveryClaim(c) ||
                isEvictionClaim(c) ||
                isEncroachmentRemovalClaim(c)
            ) {
                next = {
                    ...next,
                    hideFollowupCoerciveTab: preLegalEntityBan.hideFollowupCoerciveTab,
                    showSpecificDeliveryFieldProcedures:
                        preLegalEntityBan.showSpecificDeliveryFieldProcedures,
                    showSpecificDeliverySurveyorCard:
                        preLegalEntityBan.showSpecificDeliverySurveyorCard,
                    showSpecificDeliveryConversionCard:
                        preLegalEntityBan.showSpecificDeliveryConversionCard,
                    showEncroachmentRemovalRequestCards:
                        preLegalEntityBan.showEncroachmentRemovalRequestCards,
                    hideEncroachmentEvictionProcedureItems:
                        preLegalEntityBan.hideEncroachmentEvictionProcedureItems,
                    hideEvictionCustodianProcedure:
                        preLegalEntityBan.hideEvictionCustodianProcedure,
                };
            }
        }
        return next;
    };

    /** تسليم شيء معين — مرحلة واحدة عبر resolveSpecificDeliveryUiPhase */
    if (isSpecificDeliveryClaim(c)) {
        const phase = resolveSpecificDeliveryUiPhase({
            specificDeliveryItemNature: opts?.specificDeliveryItemNature,
            specificDeliveryFinancialized: opts?.specificDeliveryFinancialized,
            specificDeliveryItems: opts?.specificDeliveryItems,
            isEmployee,
        });
        return finalize(mapSpecificDeliveryPhaseToFollowupFlags(phase, isEmployee));
    }

    /** تخلية / تسليم عقار — الإجراءات الميدانية في «الإجراءات الجبرية»؛ التنفيذ الجبري الشخصي في تبويبه */
    if (isEvictionClaim(c)) {
        const flags = {
            ...defaultFollowupSpecialization(),
            hidePersonalCoerciveFollowupTab: false,
        };
        return finalize(isEmployee ? applyEmployeeDebtorAmountGuarantorBan(flags) : flags);
    }

    /** إزالة / رفع تجاوز — إجراءات ميدانية (بطاقات إزالة التجاوز) دون مسار شخصي أو حجز مالي */
    if (isEncroachmentRemovalClaim(c)) {
        const flags = {
            ...defaultFollowupSpecialization(),
            hidePersonalCoerciveFollowupTab: true,
            hideFollowupSeizureRequestsTab: true,
            hideDossierFinancialTools: true,
            hideCoerciveGraceNoticeBanner: true,
            hideCoerciveFinancialBanners: true,
            hideCoerciveSeizureSalaryAndProperty: true,
            hideEncroachmentEvictionProcedureItems: true,
            showEncroachmentRemovalRequestCards: true,
        };
        return finalize(isEmployee ? applyEmployeeDebtorAmountGuarantorBan(flags) : flags);
    }

    /** مشاهدة / استصحاب / مبيت — لا مركز مالي ولا حجز؛ تبويب الجبري الشخصي للمسارات غير المالية */
    if (isVisitationClaim(c)) {
        const flags = {
            ...defaultFollowupSpecialization(),
            hidePersonalCoerciveFollowupTab: false,
            hidePersonalJudgePresentation: false,
            hidePersonalForcedBringActivation: true,
            hideAllGuarantorPresence: true,
            hideGuarantorSeizureSubTab: true,
            hideFollowupCoerciveTab: true,
            hideCoerciveGraceNoticeBanner: true,
            hideCoerciveFinancialBanners: true,
            hideCoerciveSeizureSalaryAndProperty: true,
            hideDossierFinancialTools: true,
            hideFollowupSeizureRequestsTab: true,
            suppressHiddenPersonalCoerciveRequests: true,
        };
        return finalize(isEmployee ? applyEmployeeDebtorAmountGuarantorBan(flags) : flags);
    }

    /** المطاوعة / ترك النشوز — لا مركز مالي ولا تبويب التنفيذ الجبري الشخصي */
    if (isMatwaaClaim(c)) {
        const flags = {
            ...defaultFollowupSpecialization(),
            hidePersonalCoerciveFollowupTab: true,
            hideFollowupCoerciveTab: true,
            hideFollowupSeizureRequestsTab: true,
            hideDossierFinancialTools: true,
            suppressHiddenPersonalCoerciveRequests: true,
        };
        return finalize(isEmployee ? applyEmployeeDebtorAmountGuarantorBan(flags) : flags);
    }

    /**
     * نزع حضانة (تسليم ولد) — إجراءات جبريّة شخصية للموظف والكاسب على حدٍ سواء.
     * تبويب «الإجراءات الجبرية» (حجز/ميداني) فارغ هنا؛ المسارات في «التنفيذ الجبري الشخصي».
     */
    if (isCustodyRemovalClaim(c)) {
        const flags: FollowupSpecializationVisibility = {
            ...defaultFollowupSpecialization(),
            hideFollowupCoerciveTab: true,
            hidePersonalCoerciveFollowupTab: false,
            hidePersonalJudgePresentation: false,
            hidePersonalForcedBringActivation: false,
            hideCoerciveGraceNoticeBanner: true,
            hideCoerciveFinancialBanners: true,
            hideCoerciveSeizureSalaryAndProperty: true,
            hideDossierFinancialTools: true,
            hideFollowupSeizureRequestsTab: true,
            hideAllGuarantorPresence: true,
            hideGuarantorSeizureSubTab: true,
            suppressHiddenPersonalCoerciveRequests: false,
        };
        return isEmployee ? finalize(applyEmployeeDebtorAmountGuarantorBan(flags), { skipPersonalStatusCourtBan: true }) : finalize(flags, { skipPersonalStatusCourtBan: true });
    }

    /** أثاث زوجية — تسليم من وحدة الأثاث؛ لا تبويب إجراءات جبريّة؛ يبقى حجز مالي عند التعذّر */
    if (isMaritalFurnitureClaim(c)) {
        const flags = {
            ...defaultFollowupSpecialization(),
            hideFollowupCoerciveTab: true,
            hidePersonalCoerciveFollowupTab: true,
            hidePersonalJudgePresentation: true,
            hidePersonalForcedBringActivation: true,
            showSpecificDeliveryFieldProcedures: false,
            showHiddenBreakInventoryRequest: false,
            showSpecificDeliveryBreakInventoryCard: false,
            hideCoerciveGraceNoticeBanner: true,
            hideCoerciveFinancialBanners: true,
            hideCoerciveSeizureSalaryAndProperty: true,
            hideEncroachmentEvictionProcedureItems: true,
            hideEvictionCustodianProcedure: true,
            suppressHiddenPersonalCoerciveRequests: true,
            hideFollowupSeizureRequestsTab: false,
        };
        return finalize(isEmployee ? applyEmployeeDebtorAmountGuarantorBan(flags) : flags);
    }

    const financial = isFinancialDebtCollectionClaim(c);
    if (!financial) {
        const flags = defaultFollowupSpecialization();
        return finalize(isEmployee ? applyEmployeeDebtorAmountGuarantorBan(flags) : flags);
    }

    if (isEmployee) {
        return finalize(
            applyEmployeeDebtorAmountGuarantorBan({
                ...defaultFollowupSpecialization(),
                isFinancialDebtCollection: true,
                hidePersonalCoerciveFollowupTab: true,
                hideFollowupCoerciveTab: true,
                hidePersonalJudgePresentation: true,
                hidePersonalForcedBringActivation: true,
                forceSettlementBuriedOnly: true,
            }),
        );
    }

    return finalize({
        ...defaultFollowupSpecialization(),
        isFinancialDebtCollection: true,
        hidePersonalCoerciveFollowupTab: false,
        hideFollowupCoerciveTab: true,
        hidePersonalJudgePresentation: false,
        hidePersonalForcedBringActivation: false,
        hideGuarantorSeizureSubTab: true,
        hideAllGuarantorPresence: false,
        forceSettlementBuriedOnly: false,
        showFinancialGuarantorRequestOnly: true,
    });
}

export interface FollowupSpecializationExecutionInput {
    claimType?: string | null;
    claimTypes?: string[] | null;
    specificDeliveryItemNature?: string | null;
    specificDeliveryFinancialized?: boolean;
    specificDeliveryItems?: import('@/app/utils/specificDeliveryItemsUtils').SpecificDeliveryItem[] | null;
    docType?: string | null;
    classification?: string | null;
    category?: string | null;
    debtorEntityKind?: DebtorEntityKind | string | null;
}

/**
 * حل أعلام محضر المتابعة من الإضبارة كاملة — يدعم claimTypes[] ويدمج العزل
 * عند تعدد المطالبات (أشد قيود الإخفاء تفوز).
 *
 * @deprecated للواجهة والبوابات استخدم `resolveFollowupFlagsFromExecution` من `executionDomainIsolation`.
 */
export function resolveFollowupSpecializationFromExecution(
    executionData: FollowupSpecializationExecutionInput | null | undefined,
    isEmployee: boolean,
    fallbackClaimType?: string,
    debtorEntityKind?: DebtorEntityKind | string | null,
): FollowupSpecializationVisibility {
    const types = getEffectiveClaimTypes(
        executionData as Record<string, unknown> | null | undefined
    );
    const opts = {
        specificDeliveryItemNature: executionData?.specificDeliveryItemNature,
        specificDeliveryFinancialized: executionData?.specificDeliveryFinancialized,
        specificDeliveryItems: executionData?.specificDeliveryItems,
        docType: executionData?.docType,
        classification: executionData?.classification,
        category: executionData?.category,
        debtorEntityKind:
            debtorEntityKind ??
            executionData?.debtorEntityKind ??
            (executionData as { debtor_entity_kind?: string } | null | undefined)?.debtor_entity_kind,
    };

    if (types.length === 0) {
        const ct = String(fallbackClaimType || executionData?.claimType || '').trim();
        return resolveFollowupSpecializationVisibility(ct, isEmployee, opts);
    }
    if (types.length === 1) {
        return resolveFollowupSpecializationVisibility(types[0]!, isEmployee, opts);
    }

    const perType = types.map((ct) =>
        resolveFollowupSpecializationVisibility(ct, isEmployee, opts)
    );
    return mergeFollowupSpecializationFlags(perType);
}
