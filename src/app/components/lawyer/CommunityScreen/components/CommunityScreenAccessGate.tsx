import { Briefcase } from 'lucide-react';

import {
    FORUM_PLUM_DEEP,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';

export type CommunityScreenAccessGateProps = {
    showLoadingShell: boolean;
    canAccessLawyerForum: boolean;
    onBack?: () => void;
};

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
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: FORUM_PLUM_DEEP }}
                data-testid="forum-access-loading"
            >
                <p className={`${FORUM_TEXT_MUTED} text-sm`}>جاري التحقق من الجلسة…</p>
            </div>
        );
    }
    if (!canAccessLawyerForum) {
        return (
            <div
                dir="rtl"
                className="w-full h-full flex items-center justify-center p-6 text-center"
                style={{ backgroundColor: FORUM_PLUM_DEEP }}
            >
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
