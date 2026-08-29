import { useCallback, useRef } from 'react';
import { useSheetSwipeDismiss } from '@/app/hooks/useSheetSwipeDismiss';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { CURTAIN_HANDLE } from '@/app/components/lawyer/dashboard/tasksManager/tasksBoucleTheme';

type FieldTasksSheetDragHandleProps = {
    enabled: boolean;
    onClose: () => void;
    onOffsetChange?: (px: number) => void;
};

const CLICK_SUPPRESS_AFTER_DRAG_PX = 12;

/** مقبض ستارة الميدان — هدف لمس 44px ومتابعة إصبع للأسفل دون سرقة تمرير القائمة */
export function FieldTasksSheetDragHandle({
    enabled,
    onClose,
    onOffsetChange,
}: FieldTasksSheetDragHandleProps) {
    const reduceMotion = useReduceMotion();
    const skipClickRef = useRef(false);

    const handleOffsetChange = useCallback(
        (px: number) => {
            if (px > CLICK_SUPPRESS_AFTER_DRAG_PX) skipClickRef.current = true;
            onOffsetChange?.(px);
        },
        [onOffsetChange],
    );

    const swipe = useSheetSwipeDismiss(onClose, {
        enabled,
        follow: !reduceMotion,
        onOffsetChange: handleOffsetChange,
    });

    return (
        <div
            className="hami-field-tasks-swipe-handle shrink-0 flex flex-col items-center justify-center min-h-[44px] pt-2.5 pb-1 relative z-[1] touch-manipulation"
            data-testid="field-tasks-swipe-handle"
            role="button"
            tabIndex={enabled ? 0 : -1}
            aria-label="اسحب للأسفل لإغلاق الستارة"
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
            <div className={CURTAIN_HANDLE} aria-hidden />
        </div>
    );
}
