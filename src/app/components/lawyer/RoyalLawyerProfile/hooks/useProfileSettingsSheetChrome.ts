import { useMemo } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';

export function useProfileSettingsSheetChrome() {
    const reduceMotion = useReduceMotion();
    const keyboardInset = useMobileKeyboardInset();

    const backdropTransition = useMemo(
        () => (reduceMotion ? { duration: 0 } : { duration: 0.22 }),
        [reduceMotion],
    );

    const sheetTransition = useMemo(
        () =>
            reduceMotion
                ? { duration: 0 }
                : { duration: 0.26, ease: [0.32, 0.72, 0, 1] as const },
        [reduceMotion],
    );

    return { reduceMotion, keyboardInset, backdropTransition, sheetTransition };
}
