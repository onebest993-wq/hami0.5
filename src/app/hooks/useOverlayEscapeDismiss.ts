import { useEffect, useRef } from 'react';
import { dispatchNativeBack, registerNativeBackHandler } from '@/app/runtime/nativeBackStack';

/** Escape + رجوع النظام — طبقة واحدة فوق الإضبارة أو النافذة المتداخلة. */
export function useOverlayEscapeDismiss(active: boolean, onClose: () => void): void {
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!active) return;
        const handler = () => {
            onCloseRef.current();
            return true;
        };
        const unregisterNativeBack = registerNativeBackHandler(handler);
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (e.defaultPrevented) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            dispatchNativeBack();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            unregisterNativeBack();
        };
    }, [active]);
}
