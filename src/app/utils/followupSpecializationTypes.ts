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

export function createDefaultFollowupSpecializationFlags(): FollowupSpecializationVisibility {
    return {
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
    };
}
