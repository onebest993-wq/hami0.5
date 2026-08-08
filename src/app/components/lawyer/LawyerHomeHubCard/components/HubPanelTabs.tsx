import React, { memo, useLayoutEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
    formatHomeHubTabBadgeCount,
    shouldShowHomeHubTabBadge,
    resolveHomeHubTabAriaLabel,
    resolveNextHomeHubPanel,
    type HomeHubPanel,
} from '@/app/services/alerts/homeHubCardLogic';
import '../homeHubCardFx.css';

const HUB_TAB_BUTTON_A11Y =
    'outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

const HUB_PANELS: HomeHubPanel[] = ['alerts', 'secretary', 'pins'];

const HUB_PANEL_META: Record<HomeHubPanel, { label: string }> = {
    alerts: { label: 'التنبيهات' },
    secretary: { label: 'السكرتير' },
    pins: { label: 'التثبيت' },
};

export type HubPanelTabsProps = {
    hubPanel: HomeHubPanel;
    onChange: (panel: HomeHubPanel) => void;
    alertsCount: number;
    secretaryCount: number;
    pinsCount: number;
    reduceMotion: boolean;
    layoutEditMode?: boolean;
};

export const HubPanelTabs = memo(function HubPanelTabs({
    hubPanel,
    onChange,
    alertsCount,
    secretaryCount,
    pinsCount,
    reduceMotion,
    layoutEditMode = false,
}: HubPanelTabsProps) {
    const [tabPillMotionReady, setTabPillMotionReady] = useState(reduceMotion);
    useLayoutEffect(() => {
        if (!reduceMotion) setTabPillMotionReady(true);
    }, [reduceMotion]);

    const counts: Record<HomeHubPanel, number> = {
        alerts: alertsCount,
        secretary: secretaryCount,
        pins: pinsCount,
    };

    const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, panel: HomeHubPanel) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            onChange(resolveNextHomeHubPanel(panel));
            return;
        }
        if (e.key === 'Home') {
            e.preventDefault();
            onChange('alerts');
            return;
        }
        if (e.key === 'End') {
            e.preventDefault();
            onChange('pins');
        }
    };

    return (
        <div className="hami-hub-tabs" role="tablist" aria-label="التنبيهات والسكرتير والتثبيت">
            {HUB_PANELS.map((panel) => {
                const active = hubPanel === panel;
                const count = counts[panel];
                const meta = HUB_PANEL_META[panel];
                return (
                    <button
                        key={panel}
                        type="button"
                        role="tab"
                        id={`home-hub-tab-${panel}`}
                        aria-controls={`home-hub-panel-${panel}`}
                        aria-selected={active}
                        aria-label={resolveHomeHubTabAriaLabel(panel, count)}
                        tabIndex={active ? 0 : -1}
                        data-testid={`home-hub-tab-${panel}`}
                        data-active={active ? 'true' : 'false'}
                        onClick={() => onChange(panel)}
                        onKeyDown={(e) => handleTabKeyDown(e, panel)}
                        className={`hami-hub-tab touch-manipulation ${HUB_TAB_BUTTON_A11Y}`}
                    >
                        {active && tabPillMotionReady && !reduceMotion ? (
                            <motion.span
                                layoutId="hub-panel-pill"
                                className="hami-hub-tab__pill"
                                transition={{ type: 'tween', duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
                                aria-hidden
                            />
                        ) : active ? (
                            <span className="hami-hub-tab__pill" aria-hidden />
                        ) : null}
                        <span
                            className="hami-hub-tab__label"
                            aria-hidden
                            data-hami-edit-hide-in-layout={layoutEditMode || undefined}
                        >
                            {meta.label}
                        </span>
                        {shouldShowHomeHubTabBadge(count) ? (
                            <span className="hami-hub-tab__badge" aria-hidden>
                                {formatHomeHubTabBadgeCount(count)}
                            </span>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
});
