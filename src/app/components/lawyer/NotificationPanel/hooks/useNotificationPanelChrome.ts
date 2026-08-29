import { useEffect, useMemo, useState } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';

function useDesktopPanelLayout() {
    const [isDesktop, setIsDesktop] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(min-width: 640px)').matches;
    });

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 640px)');
        const onChange = () => setIsDesktop(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    return isDesktop;
}

export function useNotificationPanelChrome(isOpen: boolean) {
    const reduceMotion = useReduceMotion();
    /** مستمعو Visual Viewport فقط واللوحة مفتوحة — توفير بطارية على الهاتف */
    const keyboardInset = useMobileKeyboardInset(isOpen, true);
    const isDesktop = useDesktopPanelLayout();

    const overlayTransition = useMemo(() => ({ duration: 0 }), []);

    const sheetEnterTransition = useMemo(() => ({ duration: 0 }), []);

    const sheetInitial = useMemo(() => false as const, []);

    const sheetExit = useMemo(() => undefined, []);

    return {
        reduceMotion,
        keyboardInset,
        isDesktop,
        overlayTransition,
        sheetEnterTransition,
        sheetExit,
        sheetInitial,
    };
}
