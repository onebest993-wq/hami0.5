import type { ReactNode } from 'react';
import { ArrowRight } from '@/app/components/ui/icons/ArrowRight';
import { Briefcase } from '@/app/components/ui/icons/Briefcase';
import {
    FORUM_ICON_BTN,
    FORUM_PLUM_DEEP,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';

export function ForumAccessBackButton({ onBack }: { onBack: () => void }) {
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

export function ForumGatePanel({
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
            className="relative w-full h-full flex items-center justify-center p-4 text-center"
            style={{ backgroundColor: FORUM_PLUM_DEEP }}
            data-testid={testId}
        >
            {onBack ? <ForumAccessBackButton onBack={onBack} /> : null}
            <div className="hami-forum-panel rounded-xl p-4 max-w-md w-full space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[#E6C673]/10 border border-[#E6C673]/25 flex items-center justify-center mx-auto">
                    <Briefcase size={22} className="text-[#E6C673]" />
                </div>
                <h2 className={`${FORUM_TEXT_PRIMARY} font-bold text-lg mb-1`}>{title}</h2>
                <p className={`${FORUM_TEXT_MUTED} text-sm leading-relaxed`}>{body}</p>
                {children}
            </div>
        </div>
    );
}
