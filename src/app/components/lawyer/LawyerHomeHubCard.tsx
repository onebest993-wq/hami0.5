import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pickDefaultHorizonFilter } from '@/app/services/alertTimeClassification';
import { syncHorizonFilterIfEmpty, useNeuralAlertsStore } from '@/app/stores/neuralAlertsStore';
import useEmblaCarousel from 'embla-carousel-react';
import { CalendarClock, LayoutDashboard } from 'lucide-react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { useNeuralAlertsFromSecretary } from './NeuralAlertsCard/useNeuralAlertsFromSecretary';
import { AlertCardItem, CarouselDots } from './NeuralAlertsCard/AlertCardItem';
import { HorizonFilterTabs } from './NeuralAlertsCard/HorizonFilterTabs';
import { HomeHubMainTabs } from './NeuralAlertsCard/HomeHubMainTabs';
import { HomeHubLinkingPanel } from './NeuralAlertsCard/HomeHubLinkingPanel';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import { useCalendarRadar48h } from '@/app/workspace/useCalendarRadar48h';
import { useClusterAggregator, type ClusterAggregatorInput } from '@/app/workspace/useClusterAggregator';
import { isClusterPinEligibleType } from '@/app/workspace/types';

/** ميزة داخل البطاقة العامة — ليست بطاقة مستقلة */
function FeatureRow({
    label,
    icon,
    children,
    showDivider = true,
}: {
    label: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    showDivider?: boolean;
}) {
    return (
        <div className={showDivider ? 'pt-4 mt-4 border-t border-white/[0.06]' : ''}>
            <div className="flex items-center gap-1.5 mb-2.5 px-0.5">
                {icon}
                <span className="text-[10px] font-bold text-white/45">{label}</span>
            </div>
            {children}
        </div>
    );
}

export type LawyerHomeHubCardProps = {
    lawyerId: string | null;
    secretaryAlerts: SecretaryAlert[];
    alertsLoading?: boolean;
    alertsError?: string | null;
    clusterInput: ClusterAggregatorInput;
    onNavigateRoute: (routePath: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onDismissAlert?: (alertId: string) => void;
    onAcceptedConvertToCase?: (alert: SecretaryAlert) => void;
    onResolved?: (alert: SecretaryAlert) => void;
};

export const LawyerHomeHubCard: React.FC<LawyerHomeHubCardProps> = ({
    lawyerId,
    secretaryAlerts,
    alertsLoading = false,
    alertsError = null,
    clusterInput,
    onNavigateRoute,
    onOpenEntity,
    onDismissAlert,
    onAcceptedConvertToCase,
    onResolved,
}) => {
    const homeHubPanel = useNeuralAlertsStore((s) => s.homeHubPanel);
    const setHomeHubPanel = useNeuralAlertsStore((s) => s.setHomeHubPanel);
    const pinnedItems = useWorkspaceStore((s) => s.pinnedItems);

    const eligiblePins = useMemo(
        () => pinnedItems.filter((p) => isClusterPinEligibleType(p.type)),
        [pinnedItems],
    );

    const clusterInputWithPins = useMemo(
        () => ({ ...clusterInput, pinnedItems: eligiblePins }),
        [clusterInput, eligiblePins],
    );

    // مصدر وحيد للحقيقة: ينفّذ buildClusterScanIndex مرّة واحدة لكل تغيّر بيانات
    // ويُستخدم لكلٍ من شارة العدّ والبانل، فلا تكرار للحساب
    const clusters = useClusterAggregator(clusterInputWithPins);

    const linkingGroupCount = useMemo(
        () => clusters.reduce((acc, c) => acc + (c.related.length > 0 ? 1 : 0), 0),
        [clusters],
    );

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

    // مزدوج (alerts + sources) مُتسق بحيث لا يُمكن أن يحدث mismatch بين بطاقة وعنصرها المصدر
    const { carouselAlerts, sourceById } = useMemo(() => {
        const alerts = alertsForFilter(activeFilter);
        const sources = sourcesForFilter(activeFilter);
        const map = new Map<string, SecretaryAlert>();
        for (const a of sources) map.set(a.id, a);
        // نُسقط أي تنبيه بدون مصدر مُقابل (حماية دفاعية ضد سباق dismiss/refresh)
        const safeAlerts = alerts.filter((a) => map.has(a.id));
        return { carouselAlerts: safeAlerts, sourceById: map };
    }, [alertsForFilter, sourcesForFilter, activeFilter]);

    const [emblaRef, emblaApi] = useEmblaCarousel({ direction: 'rtl', loop: false });
    const [activeIndex, setActiveIndex] = useState(0);

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

    const onSelect = useCallback((api: { selectedScrollSnap: () => number }) => {
        setActiveIndex(api.selectedScrollSnap());
    }, []);

    useEffect(() => {
        if (!emblaApi) return undefined;
        emblaApi.on('select', onSelect);
        onSelect(emblaApi);
        // تنظيف ضروري لتفادي تسرّب الذاكرة وازدواج إطلاق select
        return () => {
            emblaApi.off('select', onSelect);
        };
    }, [emblaApi, onSelect]);

    // تثبيت activeIndex داخل النطاق الصحيح عند تقلّص القائمة (بعد dismiss/refresh)
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

    const handleDismiss = useCallback(
        (alertId: string) => {
            onDismissAlert?.(alertId);
        },
        [onDismissAlert],
    );

    const handleNavigate = useCallback(
        (source: SecretaryAlert) => {
            onOpenEntity(source);
        },
        [onOpenEntity],
    );

    const hasCarouselAlerts = carouselTotal > 0;
    const hasAlerts = carouselAlerts.length > 0;
    const showAlertsPanel = homeHubPanel === 'alerts';
    const showLinkingPanel = homeHubPanel === 'linking';
    const showAlertsInitialLoad = alertsLoading && !hasCarouselAlerts && !alertsError;
    const hasRadar = showAlertsPanel && radarFiltered.length > 0;

    // إعادة الكاروسيل للبداية عند تبديل الـ filter فقط — لا عند تغيير length
    // (تغيير الـ length يُعالج في الـ effect السابق بإبقاء activeIndex ضمن النطاق).
    useEffect(() => {
        if (!emblaApi) return;
        setActiveIndex(0);
        emblaApi.scrollTo(0, true);
    }, [activeFilter, emblaApi]);

    const shellClass =
        'w-full rounded-2xl border border-[#D4AF37]/20 bg-slate-900/80 backdrop-blur-md shadow-xl relative overflow-hidden';

    return (
        <div className={`${shellClass} p-4 flex flex-col`} dir="rtl">
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[60px] opacity-20 bg-amber-500 pointer-events-none" />

            <div className="relative z-10 flex items-start justify-between gap-3 mb-1">
                <div>
                    <div className="flex items-center gap-2">
                        <LayoutDashboard size={18} className="text-[#D4AF37]" />
                        <h2 className="text-white font-bold text-sm">البطاقة العامة</h2>
                    </div>
                </div>
                <HomeHubMainTabs
                    activePanel={homeHubPanel}
                    linkingCount={linkingGroupCount}
                    onChange={setHomeHubPanel}
                />
            </div>

            {showLinkingPanel ? (
                <div className="relative z-10 pt-1.5 min-h-[52px]">
                    <HomeHubLinkingPanel
                        clusters={clusters}
                        hasEligiblePins={eligiblePins.length > 0}
                        onNavigateRoute={onNavigateRoute}
                    />
                </div>
            ) : null}

            {showAlertsPanel ? (
                <div className="relative z-10 pt-1.5 min-h-[52px]">
                    {hasCarouselAlerts ? (
                        <div className="flex justify-end mb-2">
                            <HorizonFilterTabs
                                counts={horizonCounts}
                                activeFilter={activeFilter}
                                onChange={setActiveFilter}
                            />
                        </div>
                    ) : null}
                    {alertsError ? (
                        <p className="text-[10px] text-red-300/90 leading-relaxed">{alertsError}</p>
                    ) : showAlertsInitialLoad ? (
                        <p className="text-[10px] text-white/35">جاري التحميل...</p>
                    ) : hasAlerts ? (
                        <div className="w-full overflow-hidden relative pb-6 min-h-[128px]" ref={emblaRef}>
                            <div className="flex touch-pan-y">
                                {carouselAlerts.map((alert) => {
                                    const source = sourceById.get(alert.id)!;
                                    return (
                                        <AlertCardItem
                                            key={alert.id}
                                            alert={alert}
                                            source={source}
                                            onDismiss={handleDismiss}
                                            onNavigate={handleNavigate}
                                            onAcceptedConvertToCase={onAcceptedConvertToCase}
                                            onResolved={onResolved}
                                        />
                                    );
                                })}
                            </div>
                            <CarouselDots count={carouselAlerts.length} active={activeIndex} />
                        </div>
                    ) : hasCarouselAlerts ? (
                        <p className="text-[10px] text-white/35 leading-relaxed">
                            لا مواعيد في هذا التصنيف — جرّب تبويباً آخر.
                        </p>
                    ) : (
                        <p className="text-[10px] text-white/35 leading-relaxed">
                            لا تنبيهات حالياً.
                        </p>
                    )}
                </div>
            ) : null}

            {hasRadar ? (
                <FeatureRow
                    label="رادار 48 ساعة"
                    icon={<CalendarClock size={12} className="text-sky-400/70" />}
                    showDivider={showAlertsPanel}
                >
                    <ul className="space-y-0.5">
                            {radarFiltered.slice(0, 4).map((ev) => (
                                <li key={ev.id}>
                                    <button
                                        type="button"
                                        onClick={() => onNavigateRoute(ev.routePath)}
                                        className="w-full text-right flex justify-between gap-2 text-[10px] py-1 hover:text-sky-300/90 transition-colors"
                                    >
                                        <span className="truncate text-white/70">{ev.title}</span>
                                        <span className="shrink-0 text-sky-400/80">{ev.whenLabel}</span>
                                    </button>
                                </li>
                            ))}
                    </ul>
                </FeatureRow>
            ) : null}
        </div>
    );
};
