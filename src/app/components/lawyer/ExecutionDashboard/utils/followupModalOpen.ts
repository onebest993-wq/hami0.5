import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { prefetchExecutionFollowupOverlay } from '../executionDashboardOverlayPrefetch';
import type { FollowupModalTabId } from './followupModalPersistUtils';

export type OpenFollowupModalOptions = {
    tab?: FollowupModalTabId;
};

export type OpenFollowupModalPersistedFn = (opts?: OpenFollowupModalOptions) => void;

export type OpenFollowupModalLegacyFallback = {
    setShowUnifiedExecutionModal?: (show: boolean) => void;
    openSeizureRequestsTabRef?: { current?: (() => void) | null };
    setUnifiedModalTab?: (tab: string) => void;
};

/** يفتح المحضر عبر المسار الموحّد (prefetch + persist + tab resolve) */
export function invokeOpenFollowupModal(
    openFollowupModalPersisted: OpenFollowupModalPersistedFn | undefined | null,
    opts?: OpenFollowupModalOptions,
): boolean {
    if (typeof openFollowupModalPersisted === 'function') {
        openFollowupModalPersisted(opts);
        return true;
    }
    return false;
}

/** fallback عندما لم يصل ربط المحضر بعد — store + prefetch فقط */
export function openFollowupModalStoreFallback(): void {
    prefetchExecutionFollowupOverlay();
    try {
        useExecutionDashboardStore.getState().openModal('showUnifiedExecutionModal');
    } catch {
        /* ignore */
    }
}

export function openFollowupModal(
    openFollowupModalPersisted: OpenFollowupModalPersistedFn | undefined | null,
    opts?: OpenFollowupModalOptions,
    legacy?: OpenFollowupModalLegacyFallback,
): void {
    if (invokeOpenFollowupModal(openFollowupModalPersisted, opts)) return;
    legacy?.setShowUnifiedExecutionModal?.(true);
    if (opts?.tab === 'seizure_requests') {
        legacy?.openSeizureRequestsTabRef?.current?.();
    } else if (opts?.tab && legacy?.setUnifiedModalTab) {
        legacy.setUnifiedModalTab(opts.tab);
    }
    openFollowupModalStoreFallback();
}

/** فتح تبويب الإجراءات الجبرية — مسار موحّد لقبول المنفذ والقوة الإجرائية */
export function openFollowupCoerciveModal(
    openFollowupModalPersisted: OpenFollowupModalPersistedFn | undefined | null,
    legacy?: OpenFollowupModalLegacyFallback,
): void {
    openFollowupModal(openFollowupModalPersisted, { tab: 'coercive' }, legacy);
}

/** فتح تبويب طلبات الحجز — المسار المعتمد لنتائج المنفذ وتركيز inline */
export function openFollowupSeizureRequestsModal(
    openFollowupModalPersisted: OpenFollowupModalPersistedFn | undefined | null,
    legacy?: OpenFollowupModalLegacyFallback,
): void {
    openFollowupModal(openFollowupModalPersisted, { tab: 'seizure_requests' }, legacy);
}
