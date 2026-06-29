import { Briefcase } from 'lucide-react';

import {
    FORUM_PLUM_DEEP,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';

export type CommunityScreenAccessGateProps = {
    showLoadingShell: boolean;
    canAccessLawyerForum: boolean;
};

/** بوابة الوصول قبل عرض محتوى المنتدى */
export function CommunityScreenAccessGate({
    showLoadingShell,
    canAccessLawyerForum,
}: CommunityScreenAccessGateProps) {
    if (showLoadingShell) {
        return <div dir="rtl" className="w-full h-full" style={{ backgroundColor: FORUM_PLUM_DEEP }} />;
    }
    if (!canAccessLawyerForum) {
        return (
            <div
                dir="rtl"
                className="w-full h-full flex items-center justify-center p-6 text-center"
                style={{ backgroundColor: FORUM_PLUM_DEEP }}
            >
                <div className="bg-[#38303E] border border-[#4A3D52]/55 rounded-xl p-6 max-w-md w-full shadow-[inset_0_0_32px_rgba(240,184,150,0.05)]">
                    <div className="w-14 h-14 rounded-xl bg-[#F0B896]/10 border border-[#F0B896]/25 flex items-center justify-center mx-auto mb-3">
                        <Briefcase size={22} className="text-[#F0B896]" />
                    </div>
                    <h2 className={`${FORUM_TEXT_PRIMARY} font-bold text-lg mb-1`}>هذا المنتدى مخصص للمحامين فقط</h2>
                    <p className={`${FORUM_TEXT_MUTED} text-sm`}>يرجى تسجيل الدخول بحساب محامٍ للوصول.</p>
                </div>
            </div>
        );
    }
    return null;
}
