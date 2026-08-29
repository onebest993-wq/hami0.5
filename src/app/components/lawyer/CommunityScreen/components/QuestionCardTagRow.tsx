import { FORUM_ACCENT_CHIP } from '../forumPlumTheme';

type QuestionCardTagRowProps = {
    postId: string;
    tags: string[];
};

export function QuestionCardTagRow({ postId, tags }: QuestionCardTagRowProps) {
    if (tags.length === 0) return null;
    return (
        <div
            className="mb-2.5 -mt-1 flex items-center gap-1.5 overflow-x-auto overscroll-x-contain scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="وسوم المنشور"
            data-forum-no-swipe
        >
            {tags.map((tag, i) => (
                <span
                    key={`${postId}-tag-${i}`}
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold leading-none ${FORUM_ACCENT_CHIP}`}
                >
                    {tag}
                </span>
            ))}
        </div>
    );
}
