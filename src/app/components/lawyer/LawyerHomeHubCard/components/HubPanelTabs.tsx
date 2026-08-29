import React, { memo, useCallback, useEffect, useRef } from 'react';
import {
    formatHomeHubTabBadgeCount,
    shouldShowHomeHubTabBadge,
    resolveHomeHubTabAriaLabel,
    resolveNextHomeHubPanel,
    HOME_HUB_PANEL_LABELS,
    type HomeHubPanel,
} from '@/app/services/alerts/homeHubCardLogic';
import { HUB_CONTENT_BUTTON_A11Y } from '../homeHub/homeHubA11y';
import { prefetchHomeHubPinsPanel } from '../homeHub/homeHubPanelPrefetch';

const HUB_PANELS: HomeHubPanel[] = ['alerts', 'pins'];

function prefetchPinsTab(panel: HomeHubPanel): void {
    if (panel === 'pins') prefetchHomeHubPinsPanel();
}

type HubPanelTabsProps = {
    hubPanel: HomeHubPanel;
    onChange: (panel: HomeHubPanel) => void;
    alertsCount: number;
    pinsCount: number;
    /** يخفى الشارات أثناء الاستقرار — يمنع قفز عرض التبويبات */
    bootSettling?: boolean;
};

export const HubPanelTabs = memo(function HubPanelTabs({
    hubPanel,
    onChange,
    alertsCount,
    pinsCount,
    bootSettling = false,
}: HubPanelTabsProps) {
    const tabRefs = useRef<Partial<Record<HomeHubPanel, HTMLButtonElement | null>>>({});
    const focusRafRef = useRef(0);

    useEffect(
        () => () => {
            if (focusRafRef.current) cancelAnimationFrame(focusRafRef.current);
        },
        [],
    );

    const handlePanelChange = useCallback(
        (panel: HomeHubPanel) => {
            if (panel === hubPanel) return;
            onChange(panel);
        },
        [hubPanel, onChange],
    );

    const selectAndFocusPanel = useCallback(
        (panel: HomeHubPanel) => {
            handlePanelChange(panel);
            if (focusRafRef.current) cancelAnimationFrame(focusRafRef.current);
            focusRafRef.current = requestAnimationFrame(() => {
                focusRafRef.current = 0;
                tabRefs.current[panel]?.focus();
            });
        },
        [handlePanelChange],
    );

    /* الشارة دائماً في التخطيط — الإخفاء البصري عبر --reserved لا يحرّك التسميات بعد الإقلاع */
    const counts: Record<HomeHubPanel, number> = {
        alerts: bootSettling ? 0 : alertsCount,
        pins: bootSettling ? 0 : pinsCount,
    };

    const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, panel: HomeHubPanel) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            selectAndFocusPanel(resolveNextHomeHubPanel(panel));
            return;
        }
        if (e.key === 'Home') {
            e.preventDefault();
            selectAndFocusPanel('alerts');
            return;
        }
        if (e.key === 'End') {
            e.preventDefault();
            selectAndFocusPanel('pins');
        }
    };

    return (
        <div className="hami-hub-tabs" role="tablist" aria-label="تبويبات البطاقة">
            {HUB_PANELS.map((panel) => {
                const active = hubPanel === panel;
                const count = counts[panel];
                const metaLabel = HOME_HUB_PANEL_LABELS[panel];
                const showBadge = shouldShowHomeHubTabBadge(count);
                return (
                    <button
                        key={panel}
                        type="button"
                        role="tab"
                        id={`home-hub-tab-${panel}`}
                        ref={(node) => {
                            tabRefs.current[panel] = node;
                        }}
                        aria-controls={`home-hub-panel-${panel}`}
                        aria-selected={active}
                        aria-label={resolveHomeHubTabAriaLabel(panel, count)}
                        tabIndex={active ? 0 : -1}
                        data-testid={`home-hub-tab-${panel}`}
                        data-active={active ? 'true' : 'false'}
                        onPointerEnter={() => prefetchPinsTab(panel)}
                        onPointerDown={() => prefetchPinsTab(panel)}
                        onClick={() => handlePanelChange(panel)}
                        onKeyDown={(e) => handleTabKeyDown(e, panel)}
                        className={`hami-hub-tab touch-manipulation ${HUB_CONTENT_BUTTON_A11Y}`}
                    >
                        {active ? <span className="hami-hub-tab__pill" aria-hidden /> : null}
                        <span
                            className="hami-hub-tab__label"
                            aria-hidden
                        >
                            {metaLabel}
                        </span>
                        <span
                            className={`hami-hub-tab__badge${showBadge ? '' : ' hami-hub-tab__badge--reserved'}`}
                            aria-hidden={!showBadge}
                        >
                            {showBadge ? formatHomeHubTabBadgeCount(count) : '\u00a0'}
                        </span>
                    </button>
                );
            })}
        </div>
    );
});
