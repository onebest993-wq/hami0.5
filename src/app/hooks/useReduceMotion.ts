import { useEffect, useState } from 'react';

function readDomReduceMotion(): boolean {
    if (typeof document === 'undefined') return false;
    const root = document.documentElement;
    return (
        root.dataset.hamiReduceMotion === '1' ||
        root.dataset.hamiAnimations === '0' ||
        root.dataset.hamiLite === '1'
    );
}

function readPrefersReducedMotion(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        return false;
    }
}

/**
 * تقليل الحركة من DOM (يُضبط في index عبر applySettingsToDom) + prefers-reduced-motion.
 * بلا استيراد سياق الإعدادات — لا يسحب SecureStore/native إلى Shell قبل TTFI.
 */
export function useReduceMotion(): boolean {
    const [prefersReduced, setPrefersReduced] = useState(readPrefersReducedMotion);
    const [fromDom, setFromDom] = useState(readDomReduceMotion);

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const onChange = () => setPrefersReduced(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        const syncFromDom = () => setFromDom(readDomReduceMotion());
        window.addEventListener('hami:settings-updated', syncFromDom);
        const root = document.documentElement;
        const obs = new MutationObserver(syncFromDom);
        obs.observe(root, {
            attributes: true,
            attributeFilter: ['data-hami-reduce-motion', 'data-hami-animations', 'data-hami-lite'],
        });
        return () => {
            window.removeEventListener('hami:settings-updated', syncFromDom);
            obs.disconnect();
        };
    }, []);

    return fromDom || prefersReduced;
}
