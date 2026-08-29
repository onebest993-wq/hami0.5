import { useCallback, useRef } from 'react';
import { useSheetSwipeDismiss } from '@/app/hooks/useSheetSwipeDismiss';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { blurActiveGlobalSearchField } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchOverlayDismiss';

type GlobalSearchSheetHandleProps = {
    onClose: () => void;
    enabled?: boolean;
};

const SHEET_SELECTOR = '[data-testid="global-search-overlay"]';

function applySearchSheetSwipeOffset(hit: HTMLElement | null, px: number): void {
    const sheet = hit?.closest(SHEET_SELECTOR);
    if (!(sheet instanceof HTMLElement)) return;
    if (px > 0) {
        sheet.style.setProperty('--gs-swipe-y', `${px}px`);
        sheet.setAttribute('data-gs-swiping', '1');
        return;
    }
    sheet.style.removeProperty('--gs-swipe-y');
    sheet.removeAttribute('data-gs-swiping');
}

/** مقبض الهاتف — هدف 44px + سحب للأسفل يحرّك الورقة ثم يغلقها. */
export function GlobalSearchSheetHandle({ onClose, enabled = true }: GlobalSearchSheetHandleProps) {
    const reduceMotion = useReduceMotion();
    const hitRef = useRef<HTMLDivElement>(null);

    const handleOffsetChange = useCallback((px: number) => {
        if (px > 12) blurActiveGlobalSearchField();
        applySearchSheetSwipeOffset(hitRef.current, px);
    }, []);

    const swipe = useSheetSwipeDismiss(onClose, {
        enabled,
        follow: !reduceMotion,
        onOffsetChange: handleOffsetChange,
    });

    return (
        <div
            ref={hitRef}
            className="hami-gs-handle-hit"
            data-testid="global-search-swipe-handle"
            role="button"
            tabIndex={enabled ? 0 : -1}
            aria-label="اسحب للأسفل لإغلاق البحث"
            onKeyDown={(event) => {
                if (!enabled) return;
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onClose();
            }}
            {...swipe}
        >
            <div className="hami-gs-handle" aria-hidden />
        </div>
    );
}
