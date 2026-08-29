import type { MouseEvent } from 'react';
import { EyeOff } from '@/app/components/ui/icons/EyeOff';
import { User } from '@/app/components/ui/icons/User';
import { UserPlus } from '@/app/components/ui/icons/UserPlus';
import { UserCheck } from '@/app/components/ui/icons/UserCheck';
import { AccreditedLawyerMark } from '@/app/components/shared/AccreditedLawyerMark';
import { useAccreditedLawyerMark } from '@/app/hooks/useAccreditedLawyerMark';
import {
    FORUM_ACCENT_CHIP,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';

type QuestionCardHeaderIdentityProps = {
    displayName: string;
    isAnonymous: boolean;
    canFollow: boolean;
    isFollowing: boolean;
    onOpenAuthor: (event: MouseEvent) => void;
    onFollow: (event: MouseEvent) => void;
};

export function QuestionCardHeaderIdentity({
    displayName,
    isAnonymous,
    canFollow,
    isFollowing,
    onOpenAuthor,
    onFollow,
}: QuestionCardHeaderIdentityProps) {
    return (
        <div className="flex items-center gap-2 min-w-0">
            <button
                type="button"
                data-testid={isAnonymous ? undefined : 'forum-open-author-profile'}
                onClick={onOpenAuthor}
                className={`text-sm font-bold truncate max-w-full text-right ${isAnonymous ? `${FORUM_TEXT_MUTED} cursor-default` : `${FORUM_TEXT_PRIMARY} hover:text-[#E6C673] transition-colors`}`}
            >
                {displayName}
            </button>
            {canFollow ? (
                <button
                    type="button"
                    onClick={onFollow}
                    className={`shrink-0 min-h-[44px] text-xs flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors touch-manipulation ${
                        isFollowing
                            ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-500/20 hover:bg-emerald-950/50'
                            : `${FORUM_ACCENT_CHIP} text-xs flex items-center gap-1 px-2 py-0.5 rounded-full transition-colors`
                    }`}
                    title={isFollowing ? 'إلغاء المتابعة' : 'متابعة'}
                >
                    {isFollowing ? <UserCheck size={12} /> : <UserPlus size={12} />}
                    <span className="hidden sm:inline">{isFollowing ? 'متابَع' : 'متابعة'}</span>
                </button>
            ) : null}
        </div>
    );
}

export function QuestionCardHeaderAvatar({
    isAnonymous,
    authorId,
}: {
    isAnonymous: boolean;
    authorId?: string;
}) {
    const accredited = useAccreditedLawyerMark(isAnonymous ? null : authorId);
    return (
        <div
            className={`relative mt-0.5 p-1.5 rounded-full shrink-0 ${isAnonymous ? `${FORUM_ACCENT_CHIP}` : 'bg-[#1A2333] text-[#9AA3B2]'}`}
        >
            {isAnonymous ? <EyeOff size={16} /> : <User size={16} />}
            {accredited ? <AccreditedLawyerMark /> : null}
        </div>
    );
}
