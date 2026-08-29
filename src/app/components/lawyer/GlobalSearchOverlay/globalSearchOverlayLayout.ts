import type { CSSProperties } from 'react';

/**
 * يرفع ورقة البحث فوق الكيبورد؛ الطبقة تبقى full-viewport (لا bottom على الطبقة).
 */
export function resolveGlobalSearchSheetKeyboardStyle(keyboardInset: number): CSSProperties {
    const kb = Math.max(0, Math.round(keyboardInset));
    if (kb <= 0) return {};
    return { marginBottom: kb };
}
