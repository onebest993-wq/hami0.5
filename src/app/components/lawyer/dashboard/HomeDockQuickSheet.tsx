import React, { useLayoutEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, Pin, X } from '@/app/components/ui/lucideIcons';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { WorkspacePinnedItem } from '@/app/workspace/types';
import { clusterPinDisplayMeta } from '@/app/workspace/clusterPinDisplay';
import { workspacePinVisual } from '@/app/workspace/workspacePinVisuals';
import { alertsForHorizon, classifySecretaryAlertsByHorizon } from '@/app/services/alertTimeClassification';
import {
    resolveHomeHubPinUnpinAriaLabel,
    resolveHomeHubTabAriaLabel,
} from '@/app/services/alerts/homeHubCardLogic';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { HAMI_SHELL_CONTAINER } from './lawyerShellLayout';
import type { HomeDockQuickSheetMode } from './HomeDockQuickSheet.types';

export type { HomeDockQuickSheetMode } from './HomeDockQuickSheet.types';

const DOCK_BUTTON_A11Y =
    'outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0F1C]';

type HomeDockQuickSheetProps = {
    mode: HomeDockQuickSheetMode;
    onClose: () => void;
    secretaryAlerts: SecretaryAlert[];
    pinnedItems: WorkspacePinnedItem[];
    onNavigateRoute: (routePath: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onUnpin: (id: string, type: WorkspacePinnedItem['type']) => void;
};

export function HomeDockQuickSheet({
    mode,
    onClose,
    secretaryAlerts,
    pinnedItems,
    onNavigateRoute,
    onOpenEntity,
    onUnpin,
}: HomeDockQuickSheetProps) {
    const reduceMotion = useReduceMotion();
    const classified = classifySecretaryAlertsByHorizon(secretaryAlerts);
    const urgent = alertsForHorizon(classified, 'urgent').slice(0, 8);
    const near = alertsForHorizon(classified, 'near').slice(0, 6);
    const hasAlerts = urgent.length > 0 || near.length > 0;
    const dossierPins = useMemo(
        () => pinnedItems.filter((p) => p.type !== 'hub'),
        [pinnedItems],
    );
    const hasPins = dossierPins.length > 0;
    const showTabs = hasAlerts && hasPins;

    const [panel, setPanel] = useState<'alerts' | 'pins'>(() =>
        mode === 'pins' ? 'pins' : 'alerts',
    );

    useLayoutEffect(() => {
        if (!mode) return;
        if (mode === 'pins') setPanel('pins');
        else setPanel(hasAlerts ? 'alerts' : 'pins');
    }, [mode, hasAlerts]);

    const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, key: 'alerts' | 'pins') => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            setPanel(key === 'alerts' ? 'pins' : 'alerts');
            return;
        }
        if (e.key === 'Home') {
            e.preventDefault();
            setPanel('alerts');
            return;
        }
        if (e.key === 'End') {
            e.preventDefault();
            setPanel('pins');
        }
    };

    const sheetMotion = reduceMotion
        ? { initial: false as const, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 } }
        : {
              initial: { opacity: 0, y: 24 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: 20 },
              transition: { type: 'spring' as const, stiffness: 380, damping: 32 },
          };

    const panelMotion = (dir: 1 | -1) =>
        reduceMotion
            ? { initial: false as const, animate: { opacity: 1, x: 0 }, exit: { opacity: 0 } }
            : {
                  initial: { opacity: 0, x: 10 * dir },
                  animate: { opacity: 1, x: 0 },
                  exit: { opacity: 0, x: -8 * dir },
              };

    return (
        <AnimatePresence>
            {mode ? (
                <>
                    <motion.button
                        type="button"
                        aria-label="إغلاق"
                        className="fixed inset-0 z-[55] bg-black/55 backdrop-blur-[2px]"
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={showTabs ? 'المركز السريع' : panel === 'alerts' ? 'التنبيهات والمواعيد' : 'التثبيت السريع'}
                        className="fixed inset-x-0 bottom-[6.25rem] z-[56] hami-shell-gutter-x pb-[max(0.5rem,env(safe-area-inset-bottom))] pointer-events-none"
                        {...sheetMotion}
                    >
                        <div className={`${HAMI_SHELL_CONTAINER} pointer-events-auto rounded-[1.625rem] border border-white/10 bg-[#0A0D14]/95 backdrop-blur-xl shadow-2xl overflow-hidden`}>
                            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.06]">
                                <h3 className="text-[#F5F0E6] font-bold text-sm truncate">
                                    {showTabs ? 'المركز السريع' : panel === 'alerts' ? 'التنبيهات والمواعيد' : 'التثبيت السريع'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="إغلاق المركز السريع"
                                    className={`min-h-[44px] min-w-[44px] rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-white touch-manipulation ${DOCK_BUTTON_A11Y}`}
                                >
                                    <X size={16} aria-hidden />
                                </button>
                            </div>

                            {showTabs ? (
                                <div
                                    className="flex mx-3 mt-3 rounded-full border border-white/[0.08] bg-white/[0.04] p-0.5"
                                    role="tablist"
                                    aria-label="البطاقة الذكية"
                                >
                                    {(['alerts', 'pins'] as const).map((key) => {
                                        const active = panel === key;
                                        const count = key === 'alerts' ? urgent.length + near.length : dossierPins.length;
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                role="tab"
                                                id={`dock-sheet-tab-${key}`}
                                                aria-controls={`dock-sheet-panel-${key}`}
                                                aria-selected={active}
                                                aria-label={resolveHomeHubTabAriaLabel(key, count)}
                                                tabIndex={active ? 0 : -1}
                                                onClick={() => setPanel(key)}
                                                onKeyDown={(e) => handleTabKeyDown(e, key)}
                                                className={`relative flex-1 flex items-center justify-center gap-1.5 min-h-[44px] py-1.5 rounded-full text-[10px] font-bold touch-manipulation ${DOCK_BUTTON_A11Y} ${
                                                    active ? 'text-[#F5F0E6]' : 'text-white/45'
                                                }`}
                                            >
                                                {active && !reduceMotion ? (
                                                    <motion.span
                                                        layoutId="dock-sheet-pill"
                                                        className="absolute inset-0 rounded-full border border-[#E6C673]/25 bg-[#E6C673]/12"
                                                    />
                                                ) : active ? (
                                                    <span
                                                        className="absolute inset-0 rounded-full border border-[#E6C673]/25 bg-[#E6C673]/12"
                                                        aria-hidden
                                                    />
                                                ) : null}
                                                <span className="relative z-[1] inline-flex items-center gap-1 justify-center">
                                                    {key === 'alerts' ? <Bell size={11} aria-hidden /> : <Pin size={11} aria-hidden />}
                                                    {key === 'alerts' ? 'تنبيهات' : 'تثبيت'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : null}

                            <div className="max-h-[min(52vh,420px)] overflow-y-auto px-3 py-3 space-y-3 overscroll-contain">
                                <AnimatePresence mode="wait" initial={false}>
                                    {panel === 'alerts' ? (
                                        <motion.div
                                            key="dock-alerts"
                                            id="dock-sheet-panel-alerts"
                                            role="tabpanel"
                                            aria-labelledby={showTabs ? 'dock-sheet-tab-alerts' : undefined}
                                            {...panelMotion(1)}
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
                                                                    className={`w-full text-right rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 min-h-[44px] touch-manipulation ${DOCK_BUTTON_A11Y}`}
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
                                                                    className={`w-full text-right rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 min-h-[44px] touch-manipulation ${DOCK_BUTTON_A11Y}`}
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
                                    ) : (
                                        <motion.div
                                            key="dock-pins"
                                            id="dock-sheet-panel-pins"
                                            role="tabpanel"
                                            aria-labelledby={showTabs ? 'dock-sheet-tab-pins' : undefined}
                                            {...panelMotion(-1)}
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
                                                                        className={`flex-1 min-w-0 text-right min-h-[44px] touch-manipulation ${DOCK_BUTTON_A11Y}`}
                                                                    >
                                                                        <p className="text-[11px] font-bold text-white/90 truncate">{meta.headline}</p>
                                                                        <p className="text-[9px] text-white/40 truncate">{meta.sectionLabel}</p>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => onUnpin(pin.id, pin.type)}
                                                                        aria-label={resolveHomeHubPinUnpinAriaLabel(meta.headline)}
                                                                        className={`min-w-[44px] min-h-[44px] flex items-center justify-center border shrink-0 touch-manipulation ${visual.button} ${visual.accent} ${DOCK_BUTTON_A11Y}`}
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
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </>
            ) : null}
        </AnimatePresence>
    );
}
