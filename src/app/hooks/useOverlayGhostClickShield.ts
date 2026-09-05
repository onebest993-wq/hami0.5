import { useLayoutEffect, type RefObject } from 'react';

/**
 * يبتلع click/pointerup المتبقّي من لمسة فتح الطبقة — حتى لا تُغلق الإضبارة من إعادة توجيه النقرة.
 * نافذة قصيرة: اللمسة التالية بعد رفع الإصبع لا تُبتلع.
 */
export function useOverlayGhostClickShield(
    rootRef: RefObject<HTMLElement | null>,
    durationMs = 180,
): void {
    useLayoutEffect(() => {
        const node = rootRef.current;
        if (!node || durationMs <= 0) return undefined;
        const until = performance.now() + durationMs;
        const swallow = (event: Event) => {
            if (performance.now() >= until) return;
            event.preventDefault();
            event.stopPropagation();
        };
        node.addEventListener('click', swallow, true);
        node.addEventListener('pointerup', swallow, true);
        return () => {
            node.removeEventListener('click', swallow, true);
            node.removeEventListener('pointerup', swallow, true);
        };
    }, [rootRef, durationMs]);
}
