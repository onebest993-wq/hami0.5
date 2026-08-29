import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { Pin } from '@/app/components/ui/icons/Pin';
import type { WorkspacePinnedItem } from '@/app/workspace/types';
import { clusterPinDisplayMeta } from '@/app/workspace/clusterPinDisplay';
import { workspacePinVisual } from '@/app/workspace/workspacePinVisuals';
import { resolveHomeHubPinUnpinAriaLabel } from '@/app/services/alerts/homeHubCardLogic';

import { HOME_DOCK_QUICK_SHEET_BUTTON_A11Y } from './HomeDockQuickSheet.a11y';

type PanelMotion = {
    initial: false | { opacity: number; x?: number };
    animate: { opacity: number; x?: number };
    exit: { opacity: number; x?: number };
};

export function HomeDockQuickSheetPinsPanel({
    dossierPins,
    hasPins,
    showTabs,
    panelMotion,
    onNavigateRoute,
    onUnpin,
    onClose,
}: {
    dossierPins: WorkspacePinnedItem[];
    hasPins: boolean;
    showTabs: boolean;
    panelMotion: PanelMotion;
    onNavigateRoute: (routePath: string) => void;
    onUnpin: (id: string, type: WorkspacePinnedItem['type']) => void;
    onClose: () => void;
}) {
    return (
        <motion.div
            key="dock-pins"
            id="dock-sheet-panel-pins"
            role="tabpanel"
            aria-labelledby={showTabs ? 'dock-sheet-tab-pins' : undefined}
            {...panelMotion}
        >
            {hasPins ? (
                <ul className="space-y-1">
                    {dossierPins.slice(0, 10).map((pin) => {
                        const meta = clusterPinDisplayMeta(pin);
                        const visual = workspacePinVisual(pin.type);
                        return (
                            <li key={`${pin.type}:${pin.id}`}>
                                <div className={`flex items-center gap-1.5 border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 ${visual.shell}`}>
                                    <span className={`shrink-0 inline-flex items-center justify-center min-w-[1.35rem] h-5 px-1 text-[9px] font-extrabold border ${visual.chip}`}>
                                        {visual.shortLabel}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onNavigateRoute(pin.routePath);
                                            onClose();
                                        }}
                                        className={`flex-1 min-w-0 text-right min-h-[44px] touch-manipulation ${HOME_DOCK_QUICK_SHEET_BUTTON_A11Y}`}
                                    >
                                        <p className="text-[11px] font-bold text-white/90 truncate">{meta.headline}</p>
                                        <p className="text-[9px] text-white/40 truncate">{meta.sectionLabel}</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onUnpin(pin.id, pin.type)}
                                        aria-label={resolveHomeHubPinUnpinAriaLabel(meta.headline)}
                                        className={`min-w-[44px] min-h-[44px] flex items-center justify-center border shrink-0 touch-manipulation ${visual.button} ${visual.accent} ${HOME_DOCK_QUICK_SHEET_BUTTON_A11Y}`}
                                    >
                                        <Pin size={11} className="fill-current" aria-hidden />
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="text-center text-white/35 text-xs py-8">
                    لا عناصر مثبّتة — استخدم زر التثبيت على البطاقات
                </p>
            )}
        </motion.div>
    );
}
