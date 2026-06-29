import { useCallback, useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import {
    HOME_HUB_CAROUSEL_SLIDE_CLASS,
    shouldRenderHomeHubCarouselSlide,
} from '@/app/services/alerts/homeHubCarouselVirtual';
import { AlertCardItem, CarouselDots } from '../../NeuralAlertsCard/AlertCardItem';
import type { SmartAlert } from '../../NeuralAlertsCard/types';

export type HomeHubAlertsCarouselProps = {
    carouselAlerts: SmartAlert[];
    sourceById: Map<string, SecretaryAlert>;
    onDismissAlert?: (alertId: string) => void;
    onOpenEntity: (alert: SecretaryAlert) => void;
    onAcceptedConvertToCase?: (alert: SecretaryAlert) => void;
    onResolved?: (alert: SecretaryAlert) => void;
    activeFilter: AlertTimeHorizon;
    layoutKey?: string;
};

const SLIDE_MIN_HEIGHT = 'calc(112px * var(--hami-content-scale, 1))';

export function HomeHubAlertsCarousel({
    carouselAlerts,
    sourceById,
    onDismissAlert,
    onOpenEntity,
    onAcceptedConvertToCase,
    onResolved,
    activeFilter,
    layoutKey,
}: HomeHubAlertsCarouselProps) {
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
    }, [emblaApi, layoutKey, carouselAlerts.length]);

    useEffect(() => {
        const node = viewportRef.current;
        if (!node || !emblaApi) return undefined;

        let rafId = 0;
        let lastW = 0;
        let lastH = 0;

        const ro = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            if (Math.abs(width - lastW) < 0.5 && Math.abs(height - lastH) < 0.5) return;
            lastW = width;
            lastH = height;
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
                rafId = 0;
                emblaApi.reInit();
            });
        });

        ro.observe(node);
        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            ro.disconnect();
        };
    }, [emblaApi]);

    return (
        <div
            className="w-full overflow-hidden relative pb-6 min-h-0 flex-1"
            style={{ minHeight: SLIDE_MIN_HEIGHT }}
            ref={setRefs}
        >
            <div className="flex">
                {carouselAlerts.map((alert, index) => {
                    if (
                        !shouldRenderHomeHubCarouselSlide(
                            index,
                            activeIndex,
                            carouselAlerts.length,
                        )
                    ) {
                        return (
                            <div
                                key={alert.id}
                                className={HOME_HUB_CAROUSEL_SLIDE_CLASS}
                                style={{ minHeight: SLIDE_MIN_HEIGHT }}
                                aria-hidden
                            />
                        );
                    }

                    const source = sourceById.get(alert.id);
                    if (!source) return null;

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
