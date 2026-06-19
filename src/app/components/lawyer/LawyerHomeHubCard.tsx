import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pickDefaultHorizonFilter } from '@/app/services/alertTimeClassification';
import { syncHorizonFilterIfEmpty, useNeuralAlertsStore } from '@/app/stores/neuralAlertsStore';
import useEmblaCarousel from 'embla-carousel-react';
import { Bell, CalendarClock, ChevronDown, Pin } from 'lucide-react';
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

export type LawyerHomeHubCardProps = {
    lawyerId: string | null;
    clusterScanSources: ClusterScanSources;
    secretaryAlerts: SecretaryAlert[];
    alertsLoading?: boolean;
    alertsError?: string | null;
    onNavigateRoute: (routePath: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onDismissAlert?: (alertId: string) => void;
    onAcceptedConvertToCase?: (alert: SecretaryAlert) => void;
    onResolved?: (alert: SecretaryAlert) => void;
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

function CollapsedSectionRow({
    icon: Icon,
    title,
    hint,
}: {
    icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
    title: string;
    hint: string;
}) {
    return (
        <div className="flex items-center justify-between gap-2 py-1.5 min-h-[36px]">
            <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg hami-home-accent-chip flex items-center justify-center shrink-0 opacity-70">
                    <Icon size={13} className="hami-home-accent-text opacity-80" aria-hidden />
                </div>
                <span className="text-[#F5F0E6]/75 font-bold text-[12px] leading-none">{title}</span>
                <span className="text-[9px] text-white/30 truncate">{hint}</span>
            </div>
            <ChevronDown size={14} className="text-white/25 shrink-0 -rotate-90" aria-hidden />
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
}: AlertsCarouselProps) {
    const [emblaRef, emblaApi] = useEmblaCarousel({ direction: 'rtl', loop: false });
    const [activeIndex, setActiveIndex] = useState(0);

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

    return (
        <div className="w-full overflow-hidden relative pb-6 min-h-[128px]" ref={emblaRef}>
            <div className="flex touch-pan-y">
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
    clusterScanSources,
    secretaryAlerts,
    alertsLoading = false,
    alertsError = null,
    onNavigateRoute,
    onOpenEntity,
    onDismissAlert,
    onAcceptedConvertToCase,
    onResolved,
}) => {
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
        () =>
            new Set(
                secretaryAlerts
                    .filter((a) => a.id.startsWith('calendar:'))
                    .map((a) => a.id.replace('calendar:', '')),
            ),
        [secretaryAlerts],
    );

    const radarFiltered = useMemo(
        () => radarEvents.filter((ev) => !alertCalendarIds.has(ev.id)),
        [radarEvents, alertCalendarIds],
    );

    const hasCarouselAlerts = carouselTotal > 0;
    const hasAlerts = carouselAlerts.length > 0;
    const showInitialLoad = alertsLoading && !hasCarouselAlerts && !alertsError;
    const hasRadar = radarFiltered.length > 0;
    const hasPins = clusterViews.length > 0;

    const alertsSectionExpanded =
        Boolean(alertsError) || showInitialLoad || hasCarouselAlerts || hasRadar;
    const pinsSectionExpanded = hasPins;
    const isFullyCompact = !alertsSectionExpanded && !pinsSectionExpanded;

    return (
        <section
            className={`relative overflow-hidden flex flex-col rounded-[1.625rem] hami-sovereign-glass hami-sovereign-rim hami-home-themed-border ${
                isFullyCompact ? 'p-3 gap-1' : 'p-4 gap-3 min-h-[240px]'
            }`}
            dir="rtl"
            aria-label="التنبيهات والتثبيت"
        >
            <div className="hami-sovereign-shine absolute inset-0 rounded-[inherit] pointer-events-none" aria-hidden />

            {alertsSectionExpanded ? (
                <div className="relative z-[1] flex flex-col">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative w-8 h-8 rounded-lg hami-home-accent-chip flex items-center justify-center shrink-0">
                                {hasCarouselAlerts ? (
                                    <span
                                        className="absolute inset-0 rounded-lg hami-sovereign-breathe hami-home-accent-chip pointer-events-none"
                                        aria-hidden
                                    />
                                ) : (
                                    <span
                                        className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400/70"
                                        aria-hidden
                                    />
                                )}
                                <Bell size={14} className="hami-home-accent-text opacity-90" aria-hidden />
                            </div>
                            <h2 className="text-[#F5F0E6] font-bold text-[13px] leading-none">التنبيهات</h2>
                        </div>
                        {hasCarouselAlerts ? (
                            <HorizonFilterTabs
                                counts={horizonCounts}
                                activeFilter={activeFilter}
                                onChange={setActiveFilter}
                            />
                        ) : null}
                    </div>

                    <div className="flex-1 flex flex-col min-h-[160px]">
                        {alertsError ? (
                            <p className="text-[10px] text-red-300/90 leading-relaxed flex-1 flex items-center">
                                {alertsError}
                            </p>
                        ) : showInitialLoad ? (
                            <p className="text-[10px] text-white/35 flex-1 flex items-center">جاري التحميل...</p>
                        ) : hasAlerts ? (
                            <AlertsCarousel
                                carouselAlerts={carouselAlerts}
                                sourceById={sourceById}
                                onDismissAlert={onDismissAlert}
                                onOpenEntity={onOpenEntity}
                                onAcceptedConvertToCase={onAcceptedConvertToCase}
                                onResolved={onResolved}
                                activeFilter={activeFilter}
                            />
                        ) : hasCarouselAlerts ? (
                            <p className="text-[10px] text-white/35 leading-relaxed flex-1 flex items-center">
                                لا مواعيد في هذا التصنيف — جرّب تبويباً آخر.
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
                                                onClick={() => onNavigateRoute(ev.routePath)}
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
                </div>
            ) : (
                <CollapsedSectionRow icon={Bell} title="التنبيهات" hint="— لا تنبيهات حالياً" />
            )}

            {pinsSectionExpanded ? (
                <div
                    className={`relative z-[1] flex flex-col ${
                        alertsSectionExpanded ? 'pt-3 border-t border-white/[0.06]' : ''
                    }`}
                >
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg hami-home-accent-chip flex items-center justify-center shrink-0">
                            <Pin size={14} className="hami-home-accent-text opacity-90" aria-hidden />
                        </div>
                        <h2 className="text-[#F5F0E6] font-bold text-[13px] leading-none">التثبيت</h2>
                        <span className="text-[9px] font-bold text-[#E6C673]/70 tabular-nums">{clusterViews.length}</span>
                    </div>
                    <ul className="space-y-1">
                        {clusterViews.slice(0, 6).map(({ pin, related }) => {
                            const meta = clusterPinDisplayMeta(pin);
                            return (
                                <li key={`${pin.type}:${pin.id}`}>
                                    <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-1.5">
                                        <button
                                            type="button"
                                            onClick={() => onNavigateRoute(pin.routePath)}
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
                                                unpinItem(pin.id, pin.type);
                                            }}
                                            className="w-7 h-7 rounded-lg flex items-center justify-center border border-amber-400/40 bg-amber-500/15 text-amber-300 shrink-0"
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
                </div>
            ) : (
                <CollapsedSectionRow icon={Pin} title="التثبيت" hint="— لا عناصر مثبّتة" />
            )}
        </section>
    );
};
