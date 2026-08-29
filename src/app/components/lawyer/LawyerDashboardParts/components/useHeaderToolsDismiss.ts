import { useEffect, type RefObject } from 'react';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';
import { isHamiFullOverlayOpen } from '@/app/runtime/overlayEdgeBackGesture';

type HeaderToolsDismissArgs = {
    open: boolean;
    close: () => void;
    navRef: RefObject<HTMLElement | null>;
};

/**
 * إغلاق شريط الأدوات المطوي: Escape، رجوع أصلي، لمسة خارج الشريط.
 * ليس طبقة ملء شاشة — لا يُغلق بـ dismiss-transient (يُستخدم لتصفير الستائر).
 */
export function useHeaderToolsDismiss({ open, close, navRef }: HeaderToolsDismissArgs): void {
    useEffect(() => {
        if (!open) return;

        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (isHamiFullOverlayOpen()) return;
            event.preventDefault();
            event.stopPropagation();
            close();
        };

        const onPointerDown = (event: Event) => {
            if (isHamiFullOverlayOpen()) return;
            const nav = navRef.current;
            const target = event.target;
            if (!nav || !(target instanceof Node) || nav.contains(target)) return;
            close();
        };

        document.addEventListener('keydown', onKey, true);
        document.addEventListener('pointerdown', onPointerDown, true);
        const unregisterNativeBack = registerNativeBackHandler(() => {
            if (isHamiFullOverlayOpen()) return false;
            close();
            return true;
        });

        return () => {
            document.removeEventListener('keydown', onKey, true);
            document.removeEventListener('pointerdown', onPointerDown, true);
            unregisterNativeBack();
        };
    }, [open, close, navRef]);
}
