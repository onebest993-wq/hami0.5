import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProfileCanvasInteraction } from '@/app/services/profile/profilePageTypes';
import { PETAL_CLEAR_PROGRESS } from './constants';

type UseProfileTextCanvasRevealArgs = {
    interaction: ProfileCanvasInteraction;
    canInteract: boolean;
    wrapRef: React.RefObject<HTMLDivElement | null>;
    leafRefs: React.MutableRefObject<(HTMLSpanElement | null)[]>;
};

export function useProfileTextCanvasReveal({
    interaction,
    canInteract,
    wrapRef,
    leafRefs,
}: UseProfileTextCanvasRevealArgs) {
    const needsReveal = interaction !== 'none';
    const [revealed, setRevealed] = useState(() => !needsReveal);
    const [revealing, setRevealing] = useState(false);
    const [hintVisible, setHintVisible] = useState(true);
    const scatterProgressRef = useRef(0);
    const revealTimerRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
        };
    }, []);

    useEffect(() => {
        setRevealed(!needsReveal);
        setRevealing(false);
        setHintVisible(true);
        scatterProgressRef.current = 0;
        leafRefs.current.forEach((el) => {
            if (el) {
                el.style.transform = '';
                el.style.opacity = '';
            }
        });
    }, [interaction, needsReveal, leafRefs]);

    const dismissHint = useCallback(() => {
        setHintVisible(false);
    }, []);

    const finishReveal = useCallback(() => {
        setRevealing(true);
        setRevealed(true);
        setHintVisible(false);
        if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
        revealTimerRef.current = window.setTimeout(() => {
            setRevealing(false);
            revealTimerRef.current = null;
        }, 820);
    }, []);

    const onTapReveal = useCallback(() => {
        if (!canInteract || revealed) return;
        dismissHint();
        finishReveal();
    }, [canInteract, dismissHint, finishReveal, revealed]);

    const scatterPetals = useCallback(
        (clientX: number, clientY: number) => {
            const wrap = wrapRef.current;
            if (!wrap || revealed || !canInteract) return;
            dismissHint();
            const rect = wrap.getBoundingClientRect();
            const px = clientX - rect.left;
            const py = clientY - rect.top;
            let hit = false;
            leafRefs.current.forEach((el) => {
                if (!el) return;
                const lx = (parseFloat(el.dataset.left ?? '50') / 100) * rect.width;
                const ly = (parseFloat(el.dataset.top ?? '50') / 100) * rect.height;
                const dx = lx - px;
                const dy = ly - py;
                const dist = Math.hypot(dx, dy);
                if (dist < 88) {
                    hit = true;
                    const force = (88 - dist) / 88;
                    const angle = Math.atan2(dy, dx);
                    const push = 18 + force * 34;
                    el.style.transform = `translate(${Math.cos(angle) * push}px, ${Math.sin(angle) * push}px) rotate(${12 + force * 36}deg) scale(${0.65 + force * 0.2})`;
                    el.style.opacity = String(Math.max(0.08, 0.78 - force * 0.55));
                }
            });
            scatterProgressRef.current = Math.min(
                100,
                scatterProgressRef.current + (hit ? 14 : 6),
            );
            if (scatterProgressRef.current >= PETAL_CLEAR_PROGRESS) finishReveal();
        },
        [canInteract, dismissHint, finishReveal, leafRefs, revealed, wrapRef],
    );

    const onPetalPointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!canInteract || revealed || interaction !== 'stardust') return;
            e.preventDefault();
            e.stopPropagation();
            try {
                e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
                /* بعض WebViews ترفض capture */
            }
            scatterPetals(e.clientX, e.clientY);
        },
        [canInteract, interaction, revealed, scatterPetals],
    );

    const onPetalPointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
            scatterPetals(e.clientX, e.clientY);
        },
        [scatterPetals],
    );

    const onPetalPointerEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        try {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
        } catch {
            /* ignore */
        }
    }, []);

    const maskActive = needsReveal && !revealed && canInteract;
    const showHint = maskActive && hintVisible;

    return {
        needsReveal,
        revealed,
        revealing,
        maskActive,
        showHint,
        dismissHint,
        finishReveal,
        onTapReveal,
        onPetalPointerDown,
        onPetalPointerMove,
        onPetalPointerEnd,
    };
}
