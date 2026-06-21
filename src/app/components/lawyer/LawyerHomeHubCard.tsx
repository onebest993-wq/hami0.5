// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    buildCalendarAlertIdSet,
    computeHomeHubAlertsTabCount,
    filterRadarEventsExcludingCalendarAlerts,
    formatHomeHubTabBadgeCount,
    shouldShowHomeHubTabBadge,
    HOME_HUB_ALERTS_EMPTY_COPY,
    HOME_HUB_CARD_FEATURE,
    openHomeHubCardInteraction,
    resolveDefaultHomeHubPanel,
    resolveHomeHubAlertsEmptyState,
} from '@/app/services/alerts/homeHubCardLogic';
import { pickDefaultHorizonFilter } from '@/app/services/alertTimeClassification';
import { syncHorizonFilterIfEmpty, useNeuralAlertsStore } from '@/app/stores/neuralAlertsStore';
import useEmblaCarousel from 'embla-carousel-react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, CalendarClock, Pin } from 'lucide-react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import { useNeuralAlertsFromSecretary } from './NeuralAlertsCard/useNeuralAlertsFromSecretary';
import { AlertCardItem, CarouselDots } from './NeuralAlertsCard/AlertCardItem';
import { HorizonFilterTabs } from './NeuralAlertsCard/HorizonFilterTabs';
import type { SmartAlert } from './NeuralAlertsCard/types';
import { useCalendarRadar48h } from '@/app/workspace/useCalendarRadar48h';
import type { ClusterScanSources } from '@/app/workspace/useClusterScanSources';
import { useClusterAggregator } from '@/app/workspace/useClusterAggregator';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import { clusterPinDisplayMeta } from '@/app/workspace/clusterPinDisplay';
import { workspacePinVisual } from '@/app/workspace/workspacePinVisuals';
import type { HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';
import {
    resolveAlertsMinHeight,
    resolveHomeBlockClassNames,
    resolveHomeBlockInlineStyle,
    shouldShowHomeBlockSheen,
} from '@/app/services/settings/resolveHomeBlockStyle';
import { useLawyerSettings } from '@/app/context/LawyerSettingsContext';
import { HomeBlockPatternOverlay } from './dashboard/HomeBlockPatternOverlay';

export type LawyerHomeHubCardProps = {
    lawyerId: string | null;
    shellAuthUserId?: string | null;
    clusterScanSources: ClusterScanSources;
    secretaryAlerts: SecretaryAlert[];
    alertsLoading?: boolean;
    alertsError?: string | null;
    onNavigateRoute: (routePath: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onDismissAlert?: (alertId: string) => void;
    onAcceptedConvertToCase?: (alert: SecretaryAlert) => void;
    onResolved?: (alert: SecretaryAlert) => void;
    blockOverride?: HomeBlockStyleOverride;
    themePrimary?: string;
};

type AlertsCarouselProps = {
    carouselAlerts: SmartAlert[];
    sourceById: Map<string, SecretaryAlert>;
    onDismissAlert?: (alertId: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onAcceptedConvertToCase?: (alert: SecretaryAlert) => void;
    onResolved?: (alert: SecretaryAlert) => void;
    activeFilter: AlertTimeHorizon;
};

function HubPanelTabs({
    hubPanel,
    onChange,
    alertsCount,
    pinsCount,
}: {
    hubPanel: 'alerts' | 'pins';
    onChange: (panel: 'alerts' | 'pins') => void;
    alertsCount: number;
    pinsCount: number;
}) {
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
                        aria-selected={active}
                        onClick={() => onChange(panel)}
                        className={`relative flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-[10px] font-bold transition-colors ${
                            active ? 'text-[#F5F0E6]' : 'text-white/45'
                        }`}
                    >
                        {active ? (
                            <motion.span
                                layoutId="hub-panel-pill"
                                className="absolute inset-0 rounded-full border border-[#E6C673]/25 bg-[#E6C673]/12"
                                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                            />
                        ) : null}
                        {panel === 'alerts' ? (
                            <Bell size={12} className="relative z-[1]" aria-hidden />
                        ) : (
                            <Pin size={12} className="relative z-[1]" aria-hidden />
                        )}
                        <span className="relative z-[1]">{panel === 'alerts' ? 'التنبيهات' : 'التثبيت'}</span>
                        {shouldShowHomeHubTabBadge(count) ? (
                            <span className="relative z-[1] min-w-[1rem] h-4 px-1 rounded-full bg-black/25 text-[9px] font-bold tabular-nums">
                                {formatHomeHubTabBadgeCount(count)}
                            </span>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}

function AlertsCarousel({
    carouselAlerts,
    sourceById,
    onDismissAlert,
    onOpenEntity,
    onAcceptedConvertToCase,
    onResolved,
    activeFilter,
    layoutKey,
}: AlertsCarouselProps & { layoutKey?: string }) {
    const [emblaRef, emblaApi] = useEmblaCarousel({ direction: 'rtl', loop: false });
    const [activeIndex, setActiveIndex] = useState(0);
    const viewportRef = useRef<HTMLDivElement | null>(null);

    const setRefs = useCallback(
        (node: HTMLDivElement | null) => {
            viewportRef.current = node;
            emblaRef(node);
        },
        [emblaRef],
    );

    const onSelect = useCallback((api: { selectedScrollSnap: () => number }) => {
        setActiveIndex(api.selectedScrollSnap());
    }, []);

    useEffect(() => {
        if (!emblaApi) return undefined;
        emblaApi.on('select', onSelect);
        onSelect(emblaApi);
        return () => {
            emblaApi.off('select', onSelect);
        };
    }, [emblaApi, onSelect]);

    useEffect(() => {
        if (carouselAlerts.length === 0) {
            setActiveIndex(0);
            return;
        }
        if (activeIndex >= carouselAlerts.length) {
            const lastIdx = carouselAlerts.length - 1;
            setActiveIndex(lastIdx);
            emblaApi?.scrollTo(lastIdx, true);
        }
    }, [carouselAlerts.length, activeIndex, emblaApi]);

    useEffect(() => {
        if (!emblaApi) return;
        setActiveIndex(0);
        emblaApi.scrollTo(0, true);
    }, [activeFilter, emblaApi]);

    useEffect(() => {
        if (!emblaApi) return undefined;
        emblaApi.reInit();
    }, [emblaApi, layoutKey]);

    useEffect(() => {
        const node = viewportRef.current;
        if (!node || !emblaApi) return undefined;
        const ro = new ResizeObserver(() => {
            emblaApi.reInit();
        });
        ro.observe(node);
        return () => ro.disconnect();
    }, [emblaApi]);

    return (
        <div
            className="w-full overflow-hidden relative pb-6 min-h-0 flex-1"
            style={{ minHeight: `calc(112px * var(--hami-content-scale, 1))` }}
            ref={setRefs}
        >
            <div className="flex">
                {carouselAlerts.map((alert) => {
                    const source = sourceById.get(alert.id)!;
                    return (
                        <AlertCardItem
                            key={alert.id}
                            alert={alert}
                            source={source}
                            onDismiss={(id) => onDismissAlert?.(id)}
                            onNavigate={onOpenEntity}
                            onAcceptedConvertToCase={onAcceptedConvertToCase}
                            onResolved={onResolved}
                        />
                    );
                })}
            </div>
            <CarouselDots count={carouselAlerts.length} active={activeIndex} />
        </div>
    );
}

export const LawyerHomeHubCard: React.FC<LawyerHomeHubCardProps> = ({
    lawyerId,
    shellAuthUserId,
    clusterScanSources,
    secretaryAlerts,
    alertsLoading = false,
    alertsError = null,
    onNavigateRoute,
    onOpenEntity,
    onDismissAlert,
    onAcceptedConvertToCase,
    onResolved,
    blockOverride,
    themePrimary = '#E6C673',
}) => {
    const { settings } = useLawyerSettings();
    const {
        counts: horizonCounts,
        carouselTotal,
        alertsForFilter,
        sourcesForFilter,
    } = useNeuralAlertsFromSecretary(secretaryAlerts);

    const activeFilter = useNeuralAlertsStore((s) => s.activeFilter);
    const setActiveFilter = useNeuralAlertsStore((s) => s.setActiveFilter);
    const horizonInitRef = useRef(false);
    const prevHorizonCountsRef = useRef(horizonCounts);

    const pinnedItems = useWorkspaceStore((s) => s.pinnedItems);
    const unpinItem = useWorkspaceStore((s) => s.unpinItem);
    const signedIn = isRealSignedIn(shellAuthUserId ?? lawyerId);

    const guardInteraction = useCallback(
        (onProceed: () => void) => {
            openHomeHubCardInteraction({
                signedIn,
                onProceed,
                onSignedOut: () =>
                    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${HOME_HUB_CARD_FEATURE}`),
            });
        },
        [signedIn],
    );

    const clusterViews = useClusterAggregator({
        pinnedItems,
        lawsuitFiles: clusterScanSources.lawsuitFiles,
        executionFiles: clusterScanSources.executionFiles,
        criminalCases: clusterScanSources.criminalCases,
        urgentCases: clusterScanSources.urgentCases,
        threadingTransactions: clusterScanSources.threadingTransactions,
        notes: clusterScanSources.notes,
        fieldTasks: clusterScanSources.fieldTasks,
    });

    useEffect(() => {
        if (carouselTotal === 0) {
            horizonInitRef.current = false;
            return;
        }
        if (!horizonInitRef.current) {
            setActiveFilter(pickDefaultHorizonFilter(horizonCounts));
            horizonInitRef.current = true;
        }
    }, [carouselTotal, horizonCounts, setActiveFilter]);

    useEffect(() => {
        const prev = prevHorizonCountsRef.current;
        prevHorizonCountsRef.current = horizonCounts;
        if (!horizonInitRef.current || carouselTotal === 0) return;

        const hadItems = prev[activeFilter] > 0;
        const nowEmpty = horizonCounts[activeFilter] === 0;
        if (hadItems && nowEmpty) {
            const next = syncHorizonFilterIfEmpty(horizonCounts, activeFilter);
            if (next) setActiveFilter(next);
        }
    }, [horizonCounts, activeFilter, carouselTotal, setActiveFilter]);

    const { carouselAlerts, sourceById } = useMemo(() => {
        const alerts = alertsForFilter(activeFilter);
        const sources = sourcesForFilter(activeFilter);
        const map = new Map<string, SecretaryAlert>();
        for (const a of sources) map.set(a.id, a);
        const safeAlerts = alerts.filter((a) => map.has(a.id));
        return { carouselAlerts: safeAlerts, sourceById: map };
    }, [alertsForFilter, sourcesForFilter, activeFilter]);

    const { events: radarEvents } = useCalendarRadar48h(lawyerId);

    const alertCalendarIds = useMemo(
        () => buildCalendarAlertIdSet(secretaryAlerts),
        [secretaryAlerts],
    );

    const radarFiltered = useMemo(
        () => filterRadarEventsExcludingCalendarAlerts(radarEvents, alertCalendarIds),
        [radarEvents, alertCalendarIds],
    );

    const hasCarouselAlerts = carouselTotal > 0;
    const hasAlerts = carouselAlerts.length > 0;
    const showInitialLoad = alertsLoading && !hasCarouselAlerts && !alertsError;
    const hasRadar = radarFiltered.length > 0;
    const hasPins = clusterViews.length > 0;
    const alertsTabCount = computeHomeHubAlertsTabCount(
        carouselTotal,
        hasCarouselAlerts,
        radarFiltered.length,
    );
    const alertsEmptyState = resolveHomeHubAlertsEmptyState({
        alertsError,
        showInitialLoad,
        hasAlerts,
        hasCarouselAlerts,
        hasRadar,
    });

    const [hubPanel, setHubPanel] = useState<'alerts' | 'pins'>('alerts');
    const panelInitRef = useRef(false);

    useEffect(() => {
        if (panelInitRef.current) return;
        if (alertsTabCount === 0 && clusterViews.length === 0) return;
        panelInitRef.current = true;
        setHubPanel(resolveDefaultHomeHubPanel(alertsTabCount, clusterViews.length));
    }, [alertsTabCount, clusterViews.length]);

    const blockClasses = resolveHomeBlockClassNames(blockOverride);
    const blockStyle: React.CSSProperties = {
        ...resolveHomeBlockInlineStyle(
            blockOverride ? { ...blockOverride, heightPx: undefined } : undefined,
            themePrimary,
            {
                baseMinHeightPx: 240,
                skipHeightPx: true,
                skipContentScale: true,
                defaultGlassOpacity: settings.appearance.glassOpacity,
            },
        ),
        padding: `calc(1rem * var(--hami-content-scale, 1))`,
    };
    const alertsMinH = resolveAlertsMinHeight(blockOverride?.size ?? 'normal');
    const alertsLayoutKey = `${blockOverride?.size ?? 'normal'}-${blockOverride?.shape ?? 'rounded'}-${blockOverride?.span ?? 2}`;

    return (
        <section
            data-hami-block="alerts"
            className={`relative flex flex-col border ${blockClasses} ${alertsMinH} min-h-0 gap-3`}
            style={blockStyle}
            dir="rtl"
            aria-label="التنبيهات والتثبيت"
        >
            <HomeBlockPatternOverlay override={blockOverride} themePrimary={themePrimary} />
            {shouldShowHomeBlockSheen(blockOverride?.pattern) ? (
                <div className="hami-sovereign-shine absolute inset-0 rounded-[inherit] pointer-events-none z-[1]" aria-hidden />
            ) : null}

            <HubPanelTabs
                hubPanel={hubPanel}
                onChange={setHubPanel}
                alertsCount={alertsTabCount}
                pinsCount={clusterViews.length}
            />

            <AnimatePresence mode="wait" initial={false}>
                {hubPanel === 'alerts' ? (
                    <motion.div
                        key="alerts-panel"
                        className="relative z-[2] flex flex-col min-h-0 flex-1"
                        initial={{ opacity: 0, x: 14 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div
                            className="flex items-center justify-between gap-3"
                            style={{ marginBottom: `calc(0.75rem * var(--hami-content-scale, 1))` }}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                    className="relative rounded-lg hami-home-accent-chip flex items-center justify-center shrink-0"
                                    style={{
                                        width: `calc(2rem * var(--hami-content-scale, 1))`,
                                        height: `calc(2rem * var(--hami-content-scale, 1))`,
                                    }}
                                >
                                    {hasCarouselAlerts ? (
                                        <span
                                            className="absolute inset-0 rounded-lg hami-sovereign-breathe hami-home-accent-chip pointer-events-none"
                                            aria-hidden
                                        />
                                    ) : null}
                                    <Bell
                                        className="hami-home-accent-text opacity-90"
                                        aria-hidden
                                        style={{
                                            width: `calc(14px * var(--hami-content-scale, 1))`,
                                            height: `calc(14px * var(--hami-content-scale, 1))`,
                                        }}
                                    />
                                </div>
                                <h2
                                    className="text-[#F5F0E6] font-bold leading-none"
                                    style={{ fontSize: `calc(13px * var(--hami-content-scale, 1))` }}
                                >
                                    التنبيهات والمواعيد
                                </h2>
                            </div>
                            {hasCarouselAlerts ? (
                                <HorizonFilterTabs
                                    counts={horizonCounts}
                                    activeFilter={activeFilter}
                                    onChange={setActiveFilter}
                                />
                            ) : null}
                        </div>

                        <div className="flex-1 flex flex-col min-h-0">
                            {alertsEmptyState === 'error' ? (
                                <p className="text-[10px] text-red-300/90 leading-relaxed flex-1 flex items-center py-6">
                                    {alertsError}
                                </p>
                            ) : alertsEmptyState === 'loading' ? (
                                <p className="text-[10px] text-white/35 flex-1 flex items-center py-6">
                                    {HOME_HUB_ALERTS_EMPTY_COPY.loading}
                                </p>
                            ) : alertsEmptyState === 'content' && hasAlerts ? (
                                <AlertsCarousel
                                    carouselAlerts={carouselAlerts}
                                    sourceById={sourceById}
                                    onDismissAlert={
                                        onDismissAlert
                                            ? (id) => guardInteraction(() => onDismissAlert(id))
                                            : undefined
                                    }
                                    onOpenEntity={(alert) => guardInteraction(() => onOpenEntity(alert))}
                                    onAcceptedConvertToCase={
                                        onAcceptedConvertToCase
                                            ? (alert) =>
                                                  guardInteraction(() => onAcceptedConvertToCase(alert))
                                            : undefined
                                    }
                                    onResolved={
                                        onResolved
                                            ? (alert) => guardInteraction(() => onResolved(alert))
                                            : undefined
                                    }
                                    activeFilter={activeFilter}
                                    layoutKey={alertsLayoutKey}
                                />
                            ) : alertsEmptyState === 'empty-filter' ? (
                                <p className="text-[10px] text-white/35 leading-relaxed flex-1 flex items-center py-6">
                                    {HOME_HUB_ALERTS_EMPTY_COPY['empty-filter']}
                                </p>
                            ) : alertsEmptyState === 'empty' ? (
                                <p className="text-[10px] text-white/35 leading-relaxed flex-1 flex items-center py-6">
                                    {HOME_HUB_ALERTS_EMPTY_COPY.empty}
                                </p>
                            ) : null}

                            {hasRadar ? (
                                <div className={`${hasAlerts || hasCarouselAlerts ? 'pt-3 mt-2 border-t border-white/[0.06]' : ''}`}>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <CalendarClock size={12} className="text-[#E6C673]/60" aria-hidden />
                                        <span className="text-[10px] font-bold text-white/45 tracking-wide">رادار 48 ساعة</span>
                                    </div>
                                    <ul className="space-y-0.5">
                                        {radarFiltered.slice(0, 4).map((ev) => (
                                            <li key={ev.id}>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        guardInteraction(() => onNavigateRoute(ev.routePath))
                                                    }
                                                    className="w-full text-right flex justify-between gap-2 text-[10px] py-1 hover:text-[#E6C673]/80 transition-colors"
                                                >
                                                    <span className="truncate text-white/65">{ev.title}</span>
                                                    <span className="shrink-0 text-[#E6C673]/65">{ev.whenLabel}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="pins-panel"
                        className="relative z-[2] flex flex-col min-h-0 flex-1"
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div
                                className="rounded-lg hami-home-accent-chip flex items-center justify-center shrink-0"
                                style={{
                                    width: `calc(2rem * var(--hami-content-scale, 1))`,
                                    height: `calc(2rem * var(--hami-content-scale, 1))`,
                                }}
                            >
                                <Pin
                                    className="hami-home-accent-text opacity-90"
                                    aria-hidden
                                    style={{
                                        width: `calc(14px * var(--hami-content-scale, 1))`,
                                        height: `calc(14px * var(--hami-content-scale, 1))`,
                                    }}
                                />
                            </div>
                            <h2
                                className="text-[#F5F0E6] font-bold leading-none"
                                style={{ fontSize: `calc(13px * var(--hami-content-scale, 1))` }}
                            >
                                التثبيت السريع
                            </h2>
                            <span
                                className="font-bold text-[#E6C673]/70 tabular-nums mr-auto"
                                style={{ fontSize: `calc(9px * var(--hami-content-scale, 1))` }}
                            >
                                {clusterViews.length}
                            </span>
                        </div>

                        {hasPins ? (
                            <ul className="space-y-1">
                                {clusterViews.slice(0, 6).map(({ pin, related }) => {
                                    const meta = clusterPinDisplayMeta(pin);
                                    const visual = workspacePinVisual(pin.type);
                                    return (
                                        <li key={`${pin.type}:${pin.id}`}>
                                            <div className={`flex items-center gap-1.5 border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 ${visual.shell}`}>
                                                <span className={`shrink-0 inline-flex items-center justify-center min-w-[1.35rem] h-5 px-1 text-[9px] font-extrabold border ${visual.chip}`}>
                                                    {visual.shortLabel}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        guardInteraction(() => onNavigateRoute(pin.routePath))
                                                    }
                                                    className="flex-1 min-w-0 text-right"
                                                >
                                                    <p className="text-[11px] font-bold text-white/85 truncate">{meta.headline}</p>
                                                    <p className="text-[9px] text-white/40 truncate">
                                                        {meta.sectionLabel}
                                                        {meta.clientLine ? ` · ${meta.clientLine.replace('الموكل: ', '')}` : ''}
                                                        {related.length > 0 ? ` · ${related.length} ارتباط` : ''}
                                                    </p>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        guardInteraction(() => unpinItem(pin.id, pin.type));
                                                    }}
                                                    className={`w-7 h-7 flex items-center justify-center border shrink-0 ${visual.button} ${visual.accent}`}
                                                    title="إلغاء التثبيت"
                                                    aria-label="إلغاء التثبيت"
                                                >
                                                    <Pin size={11} className="fill-current" />
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="text-[10px] text-white/35 leading-relaxed py-6">
                                لا عناصر مثبّتة — استخدم زر التثبيت على الإضبارات.
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};
