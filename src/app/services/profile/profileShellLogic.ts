/** متى تُعتبر شاشة الملف المهني جاهزة للتفاعل */
export function resolveProfileShellReady(input: {
    loading: boolean;
    hasHeader: boolean;
    hadWarmCache: boolean;
}): boolean {
    if (input.hasHeader && !input.loading) return true;
    if (input.hadWarmCache && input.hasHeader) return true;
    return !input.loading && input.hasHeader;
}

/** SecureStore يُستخدم للملف الشخصي للمالك فقط — الزائر يعتمد على الذاكرة/kv */
export function shouldPersistProfileLocally(
    viewerId: string | null | undefined,
    profileUserId: string,
): boolean {
    const viewer = viewerId?.trim();
    const target = profileUserId?.trim();
    return Boolean(viewer && target && viewer === target);
}
