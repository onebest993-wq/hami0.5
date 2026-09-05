import { requestAuthGateFromGuest } from '@/app/services/auth/requestAuthGateFromGuest';
import type { NetworkAccessDenial } from '@/app/services/auth/lawyerAccountStatus';
import { FORUM_PLUM_DEEP } from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';
import { ForumAccessBackButton, ForumGatePanel } from './CommunityScreenAccessGatePanel';
import { ForumLazySectionInstantSlots } from './ForumLazySectionInstantSlots';

export type CommunityScreenAccessGateProps = {
    showLoadingShell: boolean;
    canAccessLawyerForum: boolean;
    accountFrozen?: boolean;
    frozenMessage?: string | null;
    forumDenial?: NetworkAccessDenial | null;
    onBack?: () => void;
};

/** بوابة الوصول قبل عرض محتوى المنتدى — للضيف: دخول أو تسجيل */
export function CommunityScreenAccessGate({
    showLoadingShell,
    canAccessLawyerForum,
    accountFrozen = false,
    frozenMessage = null,
    forumDenial = null,
    onBack,
}: CommunityScreenAccessGateProps) {
    if (showLoadingShell) {
        return (
            <div
                dir="rtl"
                className="relative w-full h-full"
                style={{ backgroundColor: FORUM_PLUM_DEEP }}
                data-testid="forum-access-loading"
                aria-busy="true"
                aria-label="المنتدى"
            >
                {onBack ? <ForumAccessBackButton onBack={onBack} /> : null}
                <div className="h-full overflow-hidden pt-[max(3.25rem,calc(env(safe-area-inset-top)+2.5rem))]">
                    <ForumLazySectionInstantSlots framed />
                </div>
            </div>
        );
    }
    if (accountFrozen) {
        const loginLocked =
            Boolean(frozenMessage) && /قفل الدخول|أُقفل الحساب/.test(frozenMessage ?? '');
        return (
            <ForumGatePanel
                testId="forum-access-frozen"
                title={loginLocked ? 'قُفل الدخول إلى حسابك' : 'تم تجميد حسابك'}
                body={
                    frozenMessage?.trim() ||
                    'المنتدى والخدمات الشبكية موقوفة. يمكنك متابعة أعمالك المحلية في الدعاوى والمعاملات — لم تُحذف ولم تُمس.'
                }
                onBack={onBack}
            />
        );
    }
    if (forumDenial === 'pending') {
        return (
            <ForumGatePanel
                testId="forum-access-pending"
                title="حسابك قيد التدقيق"
                body="المنتدى يُفتح بعد اعتماد بياناتك من مقر القيادة. يمكنك متابعة أعمالك المحلية حتى ذلك الحين."
                onBack={onBack}
            />
        );
    }
    if (forumDenial === 'rejected') {
        return (
            <ForumGatePanel
                testId="forum-access-rejected"
                title="لم يُعتمد الحساب"
                body="تم رفض التوثيق — راجع البيانات أو أعد رفع وثائق هوية النقابة عبر الدعم. المنتدى يبقى مغلقاً حتى الاعتماد."
                onBack={onBack}
            />
        );
    }
    if (!canAccessLawyerForum) {
        return (
            <ForumGatePanel
                testId="forum-access-denied"
                title="المنتدى مغلق"
                body="لفتح المنتدى يلزم تسجيل الدخول بحساب محامٍ معتمد. بقية أقسام التطبيق تعمل محلياً بدون تسجيل."
                onBack={onBack}
            >
                <button
                    type="button"
                    className="w-full min-h-[44px] rounded-lg bg-[#E6C673] px-4 py-2.5 font-bold text-[#1a1020]"
                    data-testid="forum-access-go-login"
                    onClick={() => {
                        onBack?.();
                        requestAuthGateFromGuest('login');
                    }}
                >
                    تسجيل الدخول
                </button>
                <button
                    type="button"
                    className="w-full min-h-[44px] rounded-lg border border-[#E6C673]/40 bg-transparent px-4 py-2.5 font-semibold text-[#E6C673]"
                    data-testid="forum-access-go-register"
                    onClick={() => {
                        onBack?.();
                        requestAuthGateFromGuest('register');
                    }}
                >
                    إنشاء حساب محامٍ
                </button>
            </ForumGatePanel>
        );
    }
    return null;
}
