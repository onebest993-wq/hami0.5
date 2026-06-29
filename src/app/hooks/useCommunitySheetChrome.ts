import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

/** لوحة مفاتيح + safe-area لأسفل الشاشة — للمنتدى والأوراق السفلية */
export function useCommunitySheetChrome() {
    const keyboardInset = useMobileKeyboardInset();
    const isNative = isCapacitorNativePlatform();

    const sheetStyle = useMemo(() => {
        const style: CSSProperties = {};
        if (keyboardInset > 0) {
            style.marginBottom = keyboardInset;
        }
        return style;
    }, [keyboardInset]);

    const composerStyle = useMemo(() => {
        if (keyboardInset <= 0) return undefined;
        return { paddingBottom: Math.max(12, keyboardInset * 0.15) } satisfies CSSProperties;
    }, [keyboardInset]);

    return {
        keyboardInset,
        isNative,
        sheetStyle,
        composerStyle,
    };
}
