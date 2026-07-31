/**
 * سياسة وفاة خفيفة للمسار البارد — فحوصات نصية فقط بلا نفقة/نماذج إنشاء.
 * الدقة الكاملة (نفقة مستمرة، قرارات منفذ العدل) تُحسب في dossierDeathStatusHeavy.
 */

export function isPersonalStatusNoHeirClaim(claimType: string | undefined | null): boolean {
    const c = String(claimType || '').trim();
    return (
        c === 'مشاهدة' ||
        c.includes('مشاهدة') ||
        c === 'تسليم ولد' ||
        c.includes('تسليم ولد') ||
        c === 'مطاوعة' ||
        c.includes('مطاوعة')
    );
}

/** تقريب سريع لتسمية القائمة قبل تحميل سياسة النفقة الثقيلة */
export function isLikelyAlimonyClaimLite(claimType: string | undefined | null): boolean {
    return String(claimType || '').includes('نفقة');
}

export function isHeirSubstitutionAllowedClaimLite(
    claimType: string | undefined | null,
): boolean {
    return !isPersonalStatusNoHeirClaim(claimType) && !isLikelyAlimonyClaimLite(claimType);
}
