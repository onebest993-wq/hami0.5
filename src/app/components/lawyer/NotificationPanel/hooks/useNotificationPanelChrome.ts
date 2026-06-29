import { useEffect, useMemo, useState } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';

const FAST_EASE = [0.32, 0, 0.67, 0] as const;

function useDesktopPanelLayout() {
    const [isDesktop, setIsDesktop] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(min-width: 640px)').matches;
    });

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 640px)');
        const onChange = () => setIsDesktop(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    return isDesktop;
}

export function useNotificationPanelChrome() {
    const reduceMotion = useReduceMotion();
    const keyboardInset = useMobileKeyboardInset();
    const isDesktop = useDesktopPanelLayout();

    const overlayTransition = useMemo(
        () => (reduceMotion ? { duration: 0 } : { duration: 0.12, ease: FAST_EASE }),
        [reduceMotion],
    );

    const sheetEnterTransition = useMemo(
        () =>
            reduceMotion
                ? { duration: 0 }
                : { type: 'spring' as const, stiffness: 520, damping: 40, mass: 0.72 },
        [reduceMotion],
    );

    const sheetExitTransition = useMemo(
        () => (reduceMotion ? { duration: 0 } : { duration: 0.14, ease: FAST_EASE }),
        [reduceMotion],
    );

    const sheetInitial = useMemo(() => {
        if (reduceMotion) return false;
        return isDesktop ? { x: 48, opacity: 0, y: 0 } : { y: '100%', opacity: 0.55, x: 0 };
    }, [isDesktop, reduceMotion]);

    const sheetExit = useMemo(() => {
        if (reduceMotion) return undefined;
        return isDesktop
            ? {
                  x: 40,
                  opacity: 0,
                  pointerEvents: 'none' as const,
                  transition: sheetExitTransition,
              }
            : {
                  y: '100%',
                  opacity: 0,
                  pointerEvents: 'none' as const,
                  transition: sheetExitTransition,
              };
    }, [isDesktop, reduceMotion, sheetExitTransition]);

    return {
        reduceMotion,
        keyboardInset,
        isDesktop,
        overlayTransition,
        sheetEnterTransition,
        sheetExit,
        sheetInitial,
    };
}
