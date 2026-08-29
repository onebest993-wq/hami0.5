import { Paperclip } from '@/app/components/ui/icons/Paperclip';
import { ImageIcon } from '@/app/components/ui/icons/ImageIcon';
import { User } from '@/app/components/ui/icons/User';
import { EyeOff } from '@/app/components/ui/icons/EyeOff';
import { Zap } from '@/app/components/ui/icons/Zap';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { formatRelativeTime } from '../utils';
import {
    isActiveUrgentConsultation,
    URGENT_CONSULTATION_BADGE,
} from '@/app/services/forum/forumUrgentConsultation';
import { FORUM_FEED_CARD, FORUM_TEXT_APRICOT, FORUM_TEXT_MUTED, FORUM_TEXT_PRIMARY } from '../forumPlumTheme';

export function SearchOverlayPostHit({
    post,
    onOpen,
}: {
    post: CommunityPost;
    onOpen?: (postId: string) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onOpen?.(post.id)}
            className={`w-full text-right ${FORUM_FEED_CARD} p-4`}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#E6C673]/10 flex items-center justify-center text-[#9AA3B2]">
                        {post.isAnonymous ? <EyeOff size={12} /> : <User size={12} />}
                    </div>
                    <span className={`${FORUM_TEXT_MUTED} text-xs font-bold`}>
                        {post.isAnonymous ? 'زميل مجهول' : post.authorName}
                    </span>
                    <span className="text-[#9AA3B2]/50 text-[10px]">
                        • {formatRelativeTime(post.createdAt)}
                    </span>
                </div>
                <div className="flex gap-1">
                    {isActiveUrgentConsultation(post) ? (
                        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#E2B07A]/12 text-[#E2B07A] border border-[#E2B07A]/25 font-bold">
                            <Zap size={10} fill="currentColor" />
                            {URGENT_CONSULTATION_BADGE}
                        </span>
                    ) : null}
                    {post.attachment?.type === 'document' ? (
                        <Paperclip size={12} className={FORUM_TEXT_APRICOT} />
                    ) : null}
                    {post.attachment?.type === 'image' ? (
                        <ImageIcon size={12} className={FORUM_TEXT_APRICOT} />
                    ) : null}
                </div>
            </div>
            <p className={`${FORUM_TEXT_PRIMARY} text-sm line-clamp-2 mb-2 font-medium`}>{post.content}</p>
            <div className="flex gap-2">
                {(post.tags || []).slice(0, 3).map((t, i) => (
                    <span key={`${post.id}-t-${i}`} className="text-[10px] text-[#9AA3B2] bg-white/[0.04] px-1.5 py-0.5 rounded">
                        {t}
                    </span>
                ))}
            </div>
        </button>
    );
}
