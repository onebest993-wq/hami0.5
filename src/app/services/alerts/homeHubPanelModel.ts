/** تبويبا البطاقة، الشارات، وعدّ التثبيت — بلا رادار أو تنقّل. */
import type { WorkspacePinnedItem } from '@/app/workspace/types';

export type HomeHubPanel = 'alerts' | 'pins';

export const HOME_HUB_PANEL_LABELS: Record<HomeHubPanel, string> = {
    alerts: 'التنبيهات',
    pins: 'التثبيت',
};

const HOME_HUB_PANEL_ORDER: HomeHubPanel[] = ['alerts', 'pins'];

/** عدد عناصر المعاينة في تبويبي عاجل/قادم قبل زر «البقية» — ثابت لئلا تتمدد البطاقة */
export const HOME_HUB_ALERTS_TAB_PREVIEW_LIMIT = 2;

export function resolveNextHomeHubPanel(panel: HomeHubPanel): HomeHubPanel {
    const idx = HOME_HUB_PANEL_ORDER.indexOf(panel);
    if (idx < 0) return 'alerts';
    return HOME_HUB_PANEL_ORDER[(idx + 1) % HOME_HUB_PANEL_ORDER.length];
}

export function resolveDefaultHomeHubPanel(
    alertsTabCount: number,
    pinsCount: number,
): HomeHubPanel {
    if (alertsTabCount > 0) return 'alerts';
    if (pinsCount > 0) return 'pins';
    return 'alerts';
}

/** عدد دبابيس الإضبارات للشارة — بلا تجميع عنقودي */
export function countHomeHubDossierPins(pinnedItems: WorkspacePinnedItem[]): number {
    let count = 0;
    for (const item of pinnedItems) {
        if (item.type !== 'hub') count += 1;
    }
    return count;
}

export function formatHomeHubTabBadgeCount(count: number): string {
    if (count <= 0) return '';
    if (count > 9) return '9+';
    return String(count);
}

export function shouldShowHomeHubTabBadge(count: number): boolean {
    return count > 0;
}

export function resolveHomeHubTabAriaLabel(panel: HomeHubPanel, count: number): string {
    const base = HOME_HUB_PANEL_LABELS[panel];
    if (!shouldShowHomeHubTabBadge(count)) return base;
    return `${base}، ${formatHomeHubTabBadgeCount(count)}`;
}

export type HomeHubPanelReconcileInput = {
    userChose: boolean;
    badgeCountsSettled: boolean;
    panelInit: boolean;
    hubPanel: HomeHubPanel;
    alertsTabCount: number;
    pinsCount: number;
};

export type HomeHubPanelReconcileResult = {
    nextPanel: HomeHubPanel;
    markInit: boolean;
};

/** يحل التبويب الافتراضي بعد استقرار العدّ — بلا setState. */
export function reconcileHomeHubPanelAfterCounts(
    input: HomeHubPanelReconcileInput,
): HomeHubPanelReconcileResult | null {
    if (input.userChose || !input.badgeCountsSettled) return null;
    const resolved = resolveDefaultHomeHubPanel(input.alertsTabCount, input.pinsCount);
    if (!input.panelInit) {
        return { nextPanel: resolved, markInit: true };
    }
    if (
        input.hubPanel === 'alerts' &&
        resolved === 'pins' &&
        input.pinsCount > 0 &&
        input.alertsTabCount === 0
    ) {
        return { nextPanel: 'pins', markInit: false };
    }
    return null;
}
