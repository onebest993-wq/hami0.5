import React, { memo } from 'react';
import { motion } from 'motion/react';
import { Bell, Pin } from 'lucide-react';
import {
    formatHomeHubTabBadgeCount,
    shouldShowHomeHubTabBadge,
    resolveHomeHubTabAriaLabel,
    resolveNextHomeHubPanel,
    type HomeHubPanel,
} from '@/app/services/alerts/homeHubCardLogic';

const HUB_TAB_BUTTON_A11Y =
    'outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

export type HubPanelTabsProps = {
    hubPanel: HomeHubPanel;
    onChange: (panel: HomeHubPanel) => void;
    alertsCount: number;
    pinsCount: number;
    reduceMotion: boolean;
};

export const HubPanelTabs = memo(function HubPanelTabs({
    hubPanel,
    onChange,
    alertsCount,
    pinsCount,
    reduceMotion,
}: HubPanelTabsProps) {
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
        <div
            className="relative z-[2] flex rounded-full border border-white/[0.08] bg-white/[0.04] p-0.5 mb-2"
            role="tablist"
            aria-label="التنبيهات والتثبيت"
        >
            {(['alerts', 'pins'] as const).map((panel) => {
                const active = hubPanel === panel;
                const count = panel === 'alerts' ? alertsCount : pinsCount;
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
                        onClick={() => onChange(panel)}
                        onKeyDown={(e) => handleTabKeyDown(e, panel)}
                        className={`relative flex-1 flex items-center justify-center gap-1.5 min-h-[44px] py-1.5 rounded-full text-[10px] font-bold transition-colors touch-manipulation ${HUB_TAB_BUTTON_A11Y} ${
                            active ? 'text-[#F5F0E6]' : 'text-white/45'
                        }`}
                    >
                        {active && !reduceMotion ? (
                            <motion.span
                                layoutId="hub-panel-pill"
                                className="absolute inset-0 rounded-full border border-[#E6C673]/25 bg-[#E6C673]/12"
                                transition={{ type: 'tween', duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
                            />
                        ) : active ? (
                            <span
                                className="absolute inset-0 rounded-full border border-[#E6C673]/25 bg-[#E6C673]/12"
                                aria-hidden
                            />
                        ) : null}
                        {panel === 'alerts' ? (
                            <Bell size={12} className="relative z-[1]" aria-hidden />
                        ) : (
                            <Pin size={12} className="relative z-[1]" aria-hidden />
                        )}
                        <span className="relative z-[1]" aria-hidden>
                            {panel === 'alerts' ? 'التنبيهات' : 'التثبيت'}
                        </span>
                        {shouldShowHomeHubTabBadge(count) ? (
                            <span
                                className="relative z-[1] min-w-[1rem] h-4 px-1 rounded-full bg-black/25 text-[9px] font-bold tabular-nums"
                                aria-hidden
                            >
                                {formatHomeHubTabBadgeCount(count)}
                            </span>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
});
