import type { ReactNode } from 'react';
import { ArrowRight } from '@/app/components/ui/icons/ArrowRight';
import { Briefcase } from '@/app/components/ui/icons/Briefcase';
import { requestAuthGateFromGuest } from '@/app/services/auth/requestAuthGateFromGuest';
import type { NetworkAccessDenial } from '@/app/services/auth/lawyerAccountStatus';

import {
    FORUM_ICON_BTN,
    FORUM_PLUM_DEEP,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';

export type CommunityScreenAccessGateProps = {
    showLoadingShell: boolean;
    canAccessLawyerForum: boolean;
    accountFrozen?: boolean;
    frozenMessage?: string | null;
    forumDenial?: NetworkAccessDenial | null;
    onBack?: () => void;
};

function ForumAccessBackButton({ onBack }: { onBack: () => void }) {
    return (
        <button
            type="button"
            onClick={onBack}
            className={`absolute top-[max(0.75rem,env(safe-area-inset-top))] end-[max(1rem,env(safe-area-inset-right))] z-10 ${FORUM_ICON_BTN}`}
            aria-label="رجوع"
            data-testid="forum-access-back"
        >
            <ArrowRight size={20} />
        </button>
    );
}

function ForumGatePanel({
    testId,
    title,
    body,
    onBack,
    children,
}: {
    testId: string;
    title: string;
    body: string;
    onBack?: () => void;
    children?: ReactNode;
}) {
    return (
        <div
            dir="rtl"
            className="relative w-full h-full flex items-center justify-center p-6 text-center"
            style={{ backgroundColor: FORUM_PLUM_DEEP }}
            data-testid={testId}
        >
            {onBack ? <ForumAccessBackButton onBack={onBack} /> : null}
            <div className="hami-forum-panel rounded-xl p-6 max-w-md w-full space-y-4">
                <div className="w-14 h-14 rounded-xl bg-[#E6C673]/10 border border-[#E6C673]/25 flex items-center justify-center mx-auto mb-1">
                    <Briefcase size={22} className="text-[#E6C673]" />
                </div>
                <h2 className={`${FORUM_TEXT_PRIMARY} font-bold text-lg mb-1`}>{title}</h2>
                <p className={`${FORUM_TEXT_MUTED} text-sm leading-relaxed`}>{body}</p>
                {children}
            </div>
        </div>
    );
}

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
                className="relative w-full h-full flex items-center justify-center"
                style={{ backgroundColor: FORUM_PLUM_DEEP }}
                data-testid="forum-access-loading"
            >
                {onBack ? <ForumAccessBackButton onBack={onBack} /> : null}
                <p className={`${FORUM_TEXT_MUTED} text-sm`}>جاري التحقق من الجلسة…</p>
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
