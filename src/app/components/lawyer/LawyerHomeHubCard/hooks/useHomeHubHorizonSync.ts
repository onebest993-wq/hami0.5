import { useEffect, useRef } from 'react';

import { pickDefaultHorizonFilter, type AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import { syncHorizonFilterIfEmpty } from '@/app/stores/neuralAlertsStore';

type UseHomeHubHorizonSyncParams = {
    carouselTotal: number;
    horizonCounts: Record<AlertTimeHorizon, number>;
    activeFilter: AlertTimeHorizon;
    setActiveFilter: (filter: AlertTimeHorizon) => void;
};

/** مزامنة فلتر أفق التنبيهات عند التحميل الأول وعند إفراغ الفلتر النشط. */
export function useHomeHubHorizonSync({
    carouselTotal,
    horizonCounts,
    activeFilter,
    setActiveFilter,
}: UseHomeHubHorizonSyncParams): void {
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
        if (activeFilter === 'near') {
            setActiveFilter('upcoming');
        }
    }, [activeFilter, setActiveFilter]);

    useEffect(() => {
        const prev = prevHorizonCountsRef.current;
        prevHorizonCountsRef.current = horizonCounts;
        if (!horizonInitRef.current || carouselTotal === 0) return;

        const hadItems =
            activeFilter !== 'urgent' &&
            activeFilter !== 'near' &&
            prev[activeFilter] > 0;
        const nowEmpty =
            activeFilter === 'urgent'
                ? horizonCounts.urgent === 0
                : activeFilter === 'near' || activeFilter === 'upcoming'
                  ? horizonCounts.upcoming === 0
                  : horizonCounts[activeFilter] === 0;
        if (hadItems && nowEmpty) {
            const next = syncHorizonFilterIfEmpty(horizonCounts, activeFilter);
            if (next) setActiveFilter(next);
        }
    }, [horizonCounts, activeFilter, carouselTotal, setActiveFilter]);
}
