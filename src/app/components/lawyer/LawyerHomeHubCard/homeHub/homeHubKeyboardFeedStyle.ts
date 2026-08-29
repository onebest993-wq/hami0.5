import type { CSSProperties } from 'react';

/** حشوة أسفل طبقة المزيد عند فتح لوحة المفاتيح — المستمعون يعملون والطبقة مفتوحة فقط. */
export function homeHubKeyboardFeedStyle(keyboardInset: number): CSSProperties | undefined {
    if (keyboardInset <= 0) return undefined;
    return {
        paddingBottom: `max(${keyboardInset}px, env(safe-area-inset-bottom, 0px))`,
    };
}
