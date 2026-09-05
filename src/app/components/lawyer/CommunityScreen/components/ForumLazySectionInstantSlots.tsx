import {
    FORUM_CONTENT_COLUMN,
    FORUM_FEED_CARD,
} from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';
import { FORUM_LAZY_SECTION_MIN_HEIGHT_CLASS } from '@/app/components/lawyer/CommunityScreen/forumLazySectionMount';

const SLOT_BONE = 'rounded-md border border-[#E6C673]/15 bg-[#E6C673]/8';

type ForumLazySectionInstantSlotsProps = {
    testId?: string;
    framed?: boolean;
    count?: number;
};

function InstantSlotCards({ count }: { count: number }) {
    return (
        <>
            {Array.from({ length: count }, (_, index) => (
                <div key={index} className={`${FORUM_FEED_CARD} pointer-events-none`} aria-hidden>
                    <div className={`h-3 w-28 ${SLOT_BONE}`} />
                    <div className="mt-3 h-14 rounded-lg border border-white/[0.08] bg-white/[0.035]" />
                </div>
            ))}
        </>
    );
}

/** هيكل صامت لأقسام المنتدى الداخلية — ثيم البطاقات الموجود، بلا نص تحميل. */
export function ForumLazySectionInstantSlots({
    testId,
    framed = true,
    count = 3,
}: ForumLazySectionInstantSlotsProps) {
    if (!framed) {
        return <InstantSlotCards count={count} />;
    }
    return (
        <div
            data-testid={testId}
            className={`${FORUM_CONTENT_COLUMN} space-y-3 pb-24 ${FORUM_LAZY_SECTION_MIN_HEIGHT_CLASS}`}
            aria-busy="true"
            aria-hidden
        >
            <InstantSlotCards count={count} />
        </div>
    );
}
