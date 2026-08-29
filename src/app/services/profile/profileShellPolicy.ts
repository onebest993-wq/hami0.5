/**
 * سياسة قشرة الملف المهني — وحدة واحدة بدل ملفات دقيقة متفرقة.
 * فتح/إغلاق/جاهزية/ملكية محلية/صلاحية الاستوديو.
 */

/** فتح الملف المهني من هيدر لوحة المحامي */
export const PROFILE_SHELL_FEATURE = 'الملف المهني';

type OpenProfileShellInput = {
    signedIn: boolean;
    onOpen: () => void;
    onSignedOut?: () => void;
};

export function openProfileFromShell(input: OpenProfileShellInput): boolean {
    if (!input.signedIn) {
        input.onSignedOut?.();
        return false;
    }
    input.onOpen();
    return true;
}

/** إغلاق overlays المتنافسة قبل فتح تبويب الملف المهني */
type CloseOverlaysBeforeProfileOpenInput = {
    closeGlobalSearch: () => void;
    closeNotifications: () => void;
    closeSettings: () => void;
    closeVault: () => void;
    closeNotepad: () => void;
    closeTransactionsHub: () => void;
    closeCommunity: () => void;
};

export function closeOverlaysBeforeProfileOpen(input: CloseOverlaysBeforeProfileOpenInput): void {
    input.closeGlobalSearch();
    input.closeNotifications();
    input.closeSettings();
    input.closeVault();
    input.closeNotepad();
    input.closeTransactionsHub();
    input.closeCommunity();
}

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

/** هل يُسمح بفتح استوديو إعدادات الصفحة */
export function canOpenProfileStudio(isOwnProfile: boolean): boolean {
    return isOwnProfile;
}
