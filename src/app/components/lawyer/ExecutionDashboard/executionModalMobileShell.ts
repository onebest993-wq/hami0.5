/** فئات shell موحّدة للنوافذ الحرجة — Capacitor / safe-area / touch 44px */
import type { CSSProperties } from 'react';

export const EXEC_MODAL_CLOSE_BTN_CLASS =
    'touch-manipulation inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-transparent p-2 text-slate-300 transition-colors hover:border-white/15 hover:bg-white/10 hover:text-white';

export const EXEC_MODAL_HEADER_SAFE_TOP = 'pt-[max(0.75rem,env(safe-area-inset-top))]';

export const EXEC_MODAL_SHELL_HEIGHT_CLASS =
    'h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)),920px)]';

export const EXEC_MODAL_BACKDROP_SAFE_PAD =
    'px-[max(0px,env(safe-area-inset-left))] py-[max(0px,env(safe-area-inset-top))] pb-[max(0px,env(safe-area-inset-bottom))]';

export const EXEC_MODAL_TRASH_SHELL_MAX =
    'max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))]';

export const EXEC_MODAL_NOTES_SHELL_MAX =
    'max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))]';

export const EXEC_MODAL_COERCIVE_SHELL_MAX =
    'max-h-[min(80dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))]';

/** نوافذ تعديل الطرف / بيانات الإضبارة */
export const EXEC_MODAL_EDIT_SHELL_MAX =
    'max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)))]';

export const EXEC_MODAL_EDIT_PANEL_CLASS =
    `w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-slate-600/40 bg-[#0A0F1C] p-4 shadow-md ${EXEC_MODAL_EDIT_SHELL_MAX}`;

export const EXEC_MODAL_EDIT_PRIMARY_BTN_CLASS =
    'touch-manipulation min-h-[44px] w-full rounded-lg py-2.5 text-sm font-bold';

/** يُلحق بأزرار الصف الداخلية (حفظ/إلغاء/إصدار) — هدف لمس 44px دون تغيير الألوان */
export const EXEC_MODAL_TOUCH_TARGET = 'touch-manipulation min-h-[44px] min-w-[44px]';

/** حشوة سفلية عند ظهور لوحة المفاتيح (visualViewport) فوق safe-area */
export function execModalKeyboardPadStyle(keyboardInsetPx: number): CSSProperties | undefined {
    if (!(keyboardInsetPx > 0)) return undefined;
    return {
        paddingBottom: `max(${Math.ceil(keyboardInsetPx)}px, env(safe-area-inset-bottom, 0px))`,
    };
}
