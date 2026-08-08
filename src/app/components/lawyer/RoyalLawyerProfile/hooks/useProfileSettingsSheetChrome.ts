import { useMemo } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { isAndroidNativeShell } from '@/app/runtime/nativePlatform';

export function useProfileSettingsSheetChrome(open: boolean) {
    const preferReduce = useReduceMotion();
    /* Android WebView: حركة y:100% على ورقة كبيرة تكلّف تركيب GPU أثناء اللمس */
    const reduceMotion = preferReduce || isAndroidNativeShell();
    const keyboardInset = useMobileKeyboardInset(open, true);

    const backdropTransition = useMemo(
        () => (reduceMotion ? { duration: 0 } : { duration: 0.08 }),
        [reduceMotion],
    );

    const sheetTransition = useMemo(
        () =>
            reduceMotion
                ? { duration: 0 }
                : { duration: 0.1, ease: [0.22, 1, 0.36, 1] as const },
        [reduceMotion],
    );

    return { reduceMotion, keyboardInset, backdropTransition, sheetTransition };
}
