import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';

import { HOME_DOCK_QUICK_SHEET_BUTTON_A11Y } from './HomeDockQuickSheet.a11y';

type PanelMotion = {
    initial: false | { opacity: number; x?: number };
    animate: { opacity: number; x?: number };
    exit: { opacity: number; x?: number };
};

export function HomeDockQuickSheetAlertsPanel({
    urgent,
    near,
    hasAlerts,
    showTabs,
    panelMotion,
    onOpenEntity,
    onClose,
}: {
    urgent: SecretaryAlert[];
    near: SecretaryAlert[];
    hasAlerts: boolean;
    showTabs: boolean;
    panelMotion: PanelMotion;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onClose: () => void;
}) {
    return (
        <motion.div
            key="dock-alerts"
            id="dock-sheet-panel-alerts"
            role="tabpanel"
            aria-labelledby={showTabs ? 'dock-sheet-tab-alerts' : undefined}
            {...panelMotion}
        >
            {urgent.length > 0 ? (
                <section className="mb-3">
                    <p className="text-[10px] font-bold text-red-300/90 mb-2 px-1">
                        حرجة — خلال 24 ساعة
                    </p>
                    <ul className="space-y-1">
                        {urgent.map((alert) => (
                            <li key={alert.id}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onOpenEntity(alert);
                                        onClose();
                                    }}
                                    className={`w-full text-right rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 min-h-[44px] touch-manipulation ${HOME_DOCK_QUICK_SHEET_BUTTON_A11Y}`}
                                >
                                    <p className="text-[11px] font-bold text-white/90 truncate">{alert.title}</p>
                                    <p className="text-[9px] text-red-200/70 truncate">{alert.summary ?? alert.dueAt ?? ''}</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
            {near.length > 0 ? (
                <section>
                    <p className="text-[10px] font-bold text-amber-200/85 mb-2 px-1">
                        متوسطة — خلال 3–4 أيام
                    </p>
                    <ul className="space-y-1">
                        {near.map((alert) => (
                            <li key={alert.id}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onOpenEntity(alert);
                                        onClose();
                                    }}
                                    className={`w-full text-right rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 min-h-[44px] touch-manipulation ${HOME_DOCK_QUICK_SHEET_BUTTON_A11Y}`}
                                >
                                    <p className="text-[11px] font-bold text-white/90 truncate">{alert.title}</p>
                                    <p className="text-[9px] text-amber-100/65 truncate">{alert.summary ?? alert.dueAt ?? ''}</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
            {!hasAlerts ? (
                <p className="text-center text-white/35 text-xs py-8">لا تنبيهات حرجة أو متوسطة</p>
            ) : null}
        </motion.div>
    );
}
