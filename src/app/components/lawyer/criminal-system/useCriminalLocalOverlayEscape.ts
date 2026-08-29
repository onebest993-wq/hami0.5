import { useEffect } from 'react';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';
import { pushCriminalLocalOverlayBack } from './criminalLocalOverlayBackStack';

type UseCriminalLocalOverlayEscapeParams = {
    open: boolean;
    onClose: () => void;
};

/**
 * Escape (capture) + native back + مكدس الهيدر لطبقة محلية واحدة
 * (مثل موعد المحاكمة).
 */
export function useCriminalLocalOverlayEscape({
    open,
    onClose,
}: UseCriminalLocalOverlayEscapeParams): void {
    useEffect(() => {
        if (!open) return;

        const consume = (): boolean => {
            onClose();
            return true;
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            consume();
        };

        window.addEventListener('keydown', onKeyDown, true);
        const unregisterNativeBack = registerNativeBackHandler(() => consume());
        const unregisterHeaderBack = pushCriminalLocalOverlayBack(consume);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            unregisterNativeBack();
            unregisterHeaderBack();
        };
    }, [onClose, open]);
}
