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
        hideFollowupSeizureRequestsTab: true,
        suppressHiddenPersonalCoerciveRequests: true,
        hidePersonalForcedBringActivation: true,
        hidePersonalJudgePresentation: true,
    };
}
