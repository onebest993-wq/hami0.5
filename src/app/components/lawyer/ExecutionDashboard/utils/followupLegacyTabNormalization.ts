import type { FollowupUnifiedModalTab } from '../followupModalTabTypes';

/** تبويبات legacy — لا تُبنى في buildFollowupModalTabsFromFlags */
export const LEGACY_FOLLOWUP_MODAL_TABS = ['financial', 'special'] as const;

export type LegacyFollowupModalTab = typeof LEGACY_FOLLOWUP_MODAL_TABS[number];

export function isLegacyFollowupModalTab(tab: string): tab is LegacyFollowupModalTab {
    return LEGACY_FOLLOWUP_MODAL_TABS.includes(tab as LegacyFollowupModalTab);
}

/**
 * تحويل تبويب legacy عند فتح المحضر من sessionStorage أو deep link.
 * financial → مسار seizure_requests (المركز المالي الحالي في طلبات الحجز).
 * special → admin (نماذج الطلبات).
 */
export function normalizeLegacyFollowupTabOnOpen(tab: string | undefined | null): {
    tab: FollowupUnifiedModalTab | null;
    routeSeizureRequests: boolean;
} {
    const normalized = String(tab || '').trim();
    if (!normalized) return { tab: null, routeSeizureRequests: false };
    if (normalized === 'financial') return { tab: null, routeSeizureRequests: true };
    if (normalized === 'special') return { tab: 'admin', routeSeizureRequests: false };
    return { tab: normalized as FollowupUnifiedModalTab, routeSeizureRequests: false };
}

/**
 * تحويل تبويب legacy أثناء تشغيل المحضر (guards / keep-alive).
 */
export function resolveLegacyFollowupTabRuntimeRedirect(input: {
    unifiedModalTab: string;
    effectiveFollowupSectionTabOrder: readonly string[];
    hideFollowupCoerciveTab: boolean;
}): FollowupUnifiedModalTab | null {
    const tab = String(input.unifiedModalTab || '').trim();
    if (tab === 'special') return 'admin';
    if (tab === 'financial') {
        if (!input.hideFollowupCoerciveTab) return 'coercive';
        const fallback = input.effectiveFollowupSectionTabOrder[0];
        return (fallback ?? 'correspondences') as FollowupUnifiedModalTab;
    }
    return null;
}

/** يُستخدم في prefetch — financial/special لا تُحمَّل كتبويبات مستقلة */
export function canonicalFollowupTabForPrefetch(tabId: string): string {
    if (tabId === 'financial') return 'seizure_requests';
    if (tabId === 'special') return 'admin';
    return tabId;
}
