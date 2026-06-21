import { useEffect, useState } from 'react';
import { useLawyerSettingsOptional } from '@/app/context/LawyerSettingsContext';

/** يحترم إعدادات حامي + prefers-reduced-motion — بدون تحذير motion.dev في الكونسول */
export function useReduceMotion(): boolean {
    const settingsCtx = useLawyerSettingsOptional();
    const fromSettings = Boolean(
        settingsCtx?.settings.appearance.reduceMotion ||
            settingsCtx?.settings.performance.enableAnimations === false,
    );

    const [prefersReduced, setPrefersReduced] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onChange = () => setPrefersReduced(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    return fromSettings || prefersReduced;
}
