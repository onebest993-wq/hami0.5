import { ArrowRight, Briefcase } from '@/app/components/ui/lucideIcons';

import {
    FORUM_ICON_BTN,
    FORUM_PLUM_DEEP,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';

export type CommunityScreenAccessGateProps = {
    showLoadingShell: boolean;
    canAccessLawyerForum: boolean;
    onBack?: () => void;
};

function ForumAccessBackButton({ onBack }: { onBack: () => void }) {
    return (
        <button
            type="button"
            onClick={onBack}
            className={`absolute top-[max(0.75rem,env(safe-area-inset-top))] right-4 z-10 ${FORUM_ICON_BTN}`}
            aria-label="رجوع"
            data-testid="forum-access-back"
        >
            <ArrowRight size={20} />
        </button>
    );
}

/** بوابة الوصول قبل عرض محتوى المنتدى */
export function CommunityScreenAccessGate({
    showLoadingShell,
    canAccessLawyerForum,
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
    if (!canAccessLawyerForum) {
        return (
            <div
                dir="rtl"
                className="relative w-full h-full flex items-center justify-center p-6 text-center"
                style={{ backgroundColor: FORUM_PLUM_DEEP }}
                data-testid="forum-access-denied"
            >
                {onBack ? <ForumAccessBackButton onBack={onBack} /> : null}
                <div className="hami-forum-panel rounded-xl p-6 max-w-md w-full">
                    <div className="w-14 h-14 rounded-xl bg-[#C9A86C]/10 border border-[#C9A86C]/25 flex items-center justify-center mx-auto mb-3">
                        <Briefcase size={22} className="text-[#C9A86C]" />
                    </div>
                    <h2 className={`${FORUM_TEXT_PRIMARY} font-bold text-lg mb-1`}>هذا المنتدى مخصص للمحامين فقط</h2>
                    <p className={`${FORUM_TEXT_MUTED} text-sm`}>يرجى تسجيل الدخول بحساب محامٍ للوصول.</p>
                </div>
            </div>
        );
    }
    return null;
}
