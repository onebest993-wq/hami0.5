/**
 * حالات حساب المحامي للميزات الشبكية (واجهة فقط — الخادم هو السلطة).
 * fail-closed: بلا سجل محلي نشط → pending (لا نفتح الشبكة بـ metadata=active وحدها).
 * الحسابات المعتمدة تصل عبر سجل محلي مزامن من KV بعد موافقة الإدارة.
 */

import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
import {
    isRealSignedIn,
    isShellAuthBypassed,
    isShellDemoUserId,
} from '@/app/services/auth/shellAuth';
import { isExplicitDevUnlock } from '@/app/services/auth/devUnlockSession';
import {
    readLawyerVerificationRecord,
    isLawyerVerificationUiReady,
    type LawyerVerificationStatus,
} from '@/app/services/auth/lawyerVerificationStore';

export type { LawyerVerificationStatus };

export type NetworkAccessDenial = 'guest' | 'pending' | 'rejected';

function parseLawyerKycStatus(raw: unknown): 'pending' | 'active' | 'rejected' | null {
    const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
    if (value === 'pending' || value === 'active' || value === 'rejected') return value;
    return null;
}

/**
 * ترتيب الثقة للواجهة:
 * 1) سجل محلي مُزامَن من KV
 * 2) app_metadata.verification_status (يكتبه المقر من الخادم بمفتاح الإدارة)
 * 3) user_metadata pending/rejected فقط — لا active (المستخدم يكتب user_metadata)
 */
export function resolveLawyerVerificationStatus(
    userId: string | null | undefined,
    userMetadata?: Record<string, unknown> | null,
    appMetadata?: Record<string, unknown> | null,
): LawyerVerificationStatus {
    const id = userId?.trim();
    if (!id || isShellDemoUserId(id) || id === GUEST_LAWYER_ID) {
        return 'guest';
    }

    const fromStore = parseLawyerKycStatus(readLawyerVerificationRecord(id)?.status);
    const fromApp = parseLawyerKycStatus(
        appMetadata?.verification_status ?? appMetadata?.verificationStatus,
    );
    const fromUser = parseLawyerKycStatus(userMetadata?.verificationStatus);
    const userSafe = fromUser === 'active' ? null : fromUser;

    if (fromStore === 'active' || fromApp === 'active') return 'active';
    /**
     * بعد إعادة الرفع المحلي: السجل معلّق بينما app_metadata قد يبقى rejected
     * إلى أن ينجح POST — لا نبقي الواجهة على «مرفوض» فوق طلب جديد.
     */
    if (fromStore === 'pending' && fromApp === 'rejected') return 'pending';
    if (fromStore === 'rejected' || fromApp === 'rejected' || userSafe === 'rejected') {
        return 'rejected';
    }
    if (fromStore === 'pending' || fromApp === 'pending' || userSafe === 'pending') {
        return 'pending';
    }
    return 'pending';
}

/** منتدى / سحابة / مزامنة — تتطلب حساباً حقيقياً معتمداً */
export function canUseNetworkFeatures(
    userId: string | null | undefined,
    userMetadata?: Record<string, unknown> | null,
    appMetadata?: Record<string, unknown> | null,
): boolean {
    if (!isRealSignedIn(userId)) return false;
    if (isShellAuthBypassed()) return true;
    return resolveLawyerVerificationStatus(userId, userMetadata, appMetadata) === 'active';
}

/**
 * شبكة تتوقع جلسة خادم حقيقية (WIFE + KV + منتدى بعيد).
 * لا ضيف، ولا فتح شِل، ولا دخول مطوّر — يمنع 403 الصاخبة في الكونسول.
 */
export function canUseServerBackedNetworkFeatures(
    userId: string | null | undefined,
    userMetadata?: Record<string, unknown> | null,
    appMetadata?: Record<string, unknown> | null,
): boolean {
    const id = userId?.trim();
    if (!id || isShellDemoUserId(id) || id === GUEST_LAWYER_ID) return false;
    if (!isRealSignedIn(id)) return false;
    if (isShellAuthBypassed() || isExplicitDevUnlock()) return false;
    return resolveLawyerVerificationStatus(id, userMetadata, appMetadata) === 'active';
}

/**
 * بوابة المنتدى أضيق من بقية الشبكة: لا ضيف، ولا فتح الغلاف (Wife/KYC فقط).
 * الخادم يبقى السلطة عبر requireWifeUser + requireForumAuth.
 */
export function canUseForumNetworkFeatures(
    userId: string | null | undefined,
    userMetadata?: Record<string, unknown> | null,
    appMetadata?: Record<string, unknown> | null,
): boolean {
    const id = userId?.trim();
    if (!id || isShellDemoUserId(id) || id === GUEST_LAWYER_ID) return false;
    if (!isRealSignedIn(id)) return false;
    return resolveLawyerVerificationStatus(id, userMetadata, appMetadata) === 'active';
}

/** سبب إغلاق المنتدى في الواجهة — لا يفتح الغلاف ولا metadata=active وحدها */
export function forumAccessDenialReason(
    userId: string | null | undefined,
    userMetadata?: Record<string, unknown> | null,
    appMetadata?: Record<string, unknown> | null,
): NetworkAccessDenial | null {
    if (canUseForumNetworkFeatures(userId, userMetadata, appMetadata)) return null;
    const id = userId?.trim();
    if (!id || isShellDemoUserId(id) || id === GUEST_LAWYER_ID || !isRealSignedIn(id)) {
        return 'guest';
    }
    const status = resolveLawyerVerificationStatus(id, userMetadata, appMetadata);
    if (status === 'rejected') return 'rejected';
    return 'pending';
}

export function networkAccessDenialReason(
    userId: string | null | undefined,
    userMetadata?: Record<string, unknown> | null,
    appMetadata?: Record<string, unknown> | null,
): NetworkAccessDenial | null {
    if (canUseNetworkFeatures(userId, userMetadata, appMetadata)) return null;
    if (!isRealSignedIn(userId) || isShellDemoUserId(userId)) return 'guest';
    const status = resolveLawyerVerificationStatus(userId, userMetadata, appMetadata);
    if (status === 'rejected') return 'rejected';
    if (status === 'pending') return 'pending';
    return 'guest';
}

/**
 * شريط التدقيق في الواجهة — لا يفترض pending عند غياب السجل (يومض بعد F5).
 * الشبكة تبقى fail-closed عبر resolveLawyerVerificationStatus.
 */
export function lawyerVerificationBannerKind(
    userId: string | null | undefined,
    userMetadata?: Record<string, unknown> | null,
    appMetadata?: Record<string, unknown> | null,
): 'pending' | 'rejected' | null {
    if (isShellAuthBypassed()) return null;
    if (!isRealSignedIn(userId)) return null;
    const id = String(userId ?? '').trim();
    if (!id) return null;
    if (resolveLawyerVerificationStatus(id, userMetadata, appMetadata) === 'active') return null;
    const stored = readLawyerVerificationRecord(id)?.status;
    const metaStatus = userMetadata?.verificationStatus;
    const appStatus = parseLawyerKycStatus(
        appMetadata?.verification_status ?? appMetadata?.verificationStatus,
    );
    if (stored === 'rejected' || metaStatus === 'rejected' || appStatus === 'rejected') {
        return 'rejected';
    }
    if (metaStatus === 'pending') return 'pending';
    if (stored === 'pending' && isLawyerVerificationUiReady(id)) return 'pending';
    return null;
}

export function networkAccessDenialMessage(reason: NetworkAccessDenial): string {
    if (reason === 'pending') {
        return 'حسابك قيد التدقيق — الميزات الشبكية مغلقة حتى اعتماد البيانات.';
    }
    if (reason === 'rejected') {
        return 'تم رفض التحقق من الحساب — راجع البيانات أو أعد رفع وثائق هوية النقابة عبر الدعم أو شاشة التسجيل إن وُجدت.';
    }
    return 'يجب تسجيل الدخول بحساب محامٍ معتمد لاستخدام هذه الميزة.';
}
