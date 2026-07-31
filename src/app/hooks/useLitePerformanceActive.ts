import { useSyncExternalStore } from 'react';
import {
    isLitePerformanceActive,
    isLitePerformanceActiveFromDom,
} from '@/app/runtime/devicePerformanceTier';

function subscribeLiteDataset(onStoreChange: () => void): () => void {
    if (typeof document === 'undefined') return () => {};
    const el = document.documentElement;
    const obs = new MutationObserver(onStoreChange);
    obs.observe(el, { attributes: true, attributeFilter: ['data-hami-lite'] });
    return () => obs.disconnect();
}

function getLiteSnapshot(): boolean {
    const fromDom = isLitePerformanceActiveFromDom();
    if (fromDom !== null) return fromDom;
    return isLitePerformanceActive();
}

/**
 * يتزامن مع data-hami-lite (يُضبط من الإعدادات/boot) — بلا LawyerSettingsContext
 * حتى لا تذوب الإعدادات داخل app-lite-performance وتخلق TDZ مع boot-ui.
 */
export function useLitePerformanceActive(): boolean {
    return useSyncExternalStore(subscribeLiteDataset, getLiteSnapshot, () => false);
}
