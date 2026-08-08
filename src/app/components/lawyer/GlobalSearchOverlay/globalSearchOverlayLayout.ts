import type { CSSProperties } from 'react';

/** ارتفاع منطقة النتائج — ثابت؛ رفع الكيبورد يُعالَج على مستوى الورقة فقط */
export const GLOBAL_SEARCH_RESULTS_MAX_HEIGHT = 'min(calc(92dvh - 220px), 680px)';

/** يرفع bottom sheet فوق لوحة المفاتيح دون ضغط المحتوى الداخلي مرتين */
export function resolveGlobalSearchSheetStyle(keyboardInset: number): CSSProperties {
    if (keyboardInset <= 0) return {};
    return {
        marginBottom: keyboardInset,
        maxHeight: `min(92dvh, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - ${keyboardInset}px))`,
    };
}
