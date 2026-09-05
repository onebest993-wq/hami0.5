import { useEffect, useState } from 'react';
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
    const keyboardInset = useMobileKeyboardInset(isOpen, true, {
        ignoreTasksDatePickerGrace: true,
    });
    const isDesktop = useDesktopPanelLayout();

    return { reduceMotion, keyboardInset, isDesktop };
}
