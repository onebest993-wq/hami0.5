/** طبقة متابعة خفيفة — بدون اعتماديات سياسة وفاة/نفقة الثقيلة */
export function applyDebtorDeathFollowupOverlay<T extends object>(
    flags: T,
    activeDebtorIsDeceased: boolean,
): T {
    if (!activeDebtorIsDeceased) return flags;
    return {
        ...flags,
        hidePersonalCoerciveFollowupTab: true,
        hideFollowupCoerciveTab: true,
        // لا نُخفي تبويب الحجز عند الوفاة — تُقيَّد أدوات الراتب في واجهة التبويب فقط
        suppressHiddenPersonalCoerciveRequests: true,
        hidePersonalForcedBringActivation: true,
        hidePersonalJudgePresentation: true,
    };
}
