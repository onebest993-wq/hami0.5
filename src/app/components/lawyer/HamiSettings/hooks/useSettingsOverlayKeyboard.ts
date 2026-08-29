import { useEffect, type RefObject } from 'react';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { isHamiNativeShell } from '@/app/runtime/hamiNativeShell';

const KEYBOARD_FOCUSABLE = 'input, textarea, select';

/**
 * رفع محتوى طبقة الإعدادات فوق لوحة المفاتيح الأصلية (iOS/Android)
 * وتمرير الحقل المركّز إلى وسط منطقة التمرير.
 */
export function useSettingsOverlayKeyboard(
    enabled: boolean,
    rootRef: RefObject<HTMLElement | null>,
    reduceMotion: boolean,
): number {
    const inset = useMobileKeyboardInset(enabled, true);

    useEffect(() => {
        if (!enabled) return;
        const root = rootRef.current;
        if (!root) return;

        const onFocusIn = (event: FocusEvent) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            if (!target.matches(KEYBOARD_FOCUSABLE)) return;
            requestAnimationFrame(() => {
                target.scrollIntoView({
                    block: 'center',
                    behavior: reduceMotion || isHamiNativeShell() ? 'auto' : 'smooth',
                });
            });
        };

        root.addEventListener('focusin', onFocusIn);
        return () => root.removeEventListener('focusin', onFocusIn);
    }, [enabled, reduceMotion, rootRef]);

    return inset;
}
