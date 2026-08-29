import { useCallback, useRef } from 'react';
import { useSheetSwipeDismiss } from '@/app/hooks/useSheetSwipeDismiss';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';

const CLICK_SUPPRESS_AFTER_DRAG_PX = 12;

type ForumSheetSwipeHandleProps = {
    onClose: () => void;
    enabled?: boolean;
    barClassName?: string;
    testId?: string;
};

/** مقبض أوراق المنتدى — هدف لمس 44px + سحب للأسفل للإغلاق دون تغيير شكل الشريط */
export function ForumSheetSwipeHandle({
    onClose,
    enabled = true,
    barClassName = 'w-12 h-1.5 rounded-full bg-white/20',
    testId = 'forum-sheet-swipe-handle',
}: ForumSheetSwipeHandleProps) {
    const reduceMotion = useReduceMotion();
    const skipClickRef = useRef(false);

    const handleOffsetChange = useCallback((px: number) => {
        if (px > CLICK_SUPPRESS_AFTER_DRAG_PX) skipClickRef.current = true;
    }, []);

    const swipe = useSheetSwipeDismiss(onClose, {
        enabled,
        follow: !reduceMotion,
        onOffsetChange: handleOffsetChange,
    });

    return (
        <div
            className="shrink-0 flex flex-col items-center justify-center min-h-[44px] min-w-[44px] w-full touch-manipulation"
            data-testid={testId}
            data-forum-no-swipe
            role="button"
            tabIndex={enabled ? 0 : -1}
            aria-label="اسحب للأسفل لإغلاق الورقة"
            onKeyDown={(event) => {
                if (!enabled) return;
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onClose();
            }}
            onClick={() => {
                if (!enabled) return;
                if (skipClickRef.current) {
                    skipClickRef.current = false;
                    return;
                }
                onClose();
            }}
            {...swipe}
        >
            <div className={barClassName} aria-hidden />
        </div>
    );
}
