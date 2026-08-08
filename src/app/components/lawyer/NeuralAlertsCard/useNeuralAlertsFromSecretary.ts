import { useCallback, useMemo, useRef } from 'react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { secretaryAlertToSmartAlert } from '@/app/services/alertMappers';
import type { AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import {
    alertsForHorizon,
    classifySecretaryAlertsByHorizon,
    horizonCounts,
} from '@/app/services/alertTimeClassification';
import { PRIORITY_ORDER } from './constants';
import type { SmartAlert } from './types';

function mapAndSort(alerts: SecretaryAlert[]): SmartAlert[] {
    const mapped = alerts.map(secretaryAlertToSmartAlert);
    mapped.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99));
    return mapped;
}

/**
 * ┘è┘╪ز╪▒╪╢ ╪ث┘ ╪د┘┘é╪د╪خ┘à╪ر ╪د┘┘ê╪د╪▒╪»╪ر ┘à┘╪╡┘┘ّ╪د╪ر ┘à╪│╪ذ┘é╪د┘ï (visibleAppAlerts).
 *
 * ╪ز╪ص╪│┘è┘ ╪ث╪»╪د╪ة: ╪د┘╪ز╪«╪▒┘è╪╖ (map + sort) ┘è╪ش╪▒┘è ╪ذ┘â╪│┘ (lazy) ┘┘â┘ ╪ث┘┘é ╪╣┘┘ë ╪ص╪»╪ر
 * ┘ê╪ذ╪ز╪«╪▓┘è┘ ┘à╪ج┘é╪ز ╪»╪د╪«┘┘è ظ¤ ┘┘╪د ┘┘╪«╪▒┘ّ╪╖ 3 ╪»┘╪د╪ة ┘â┘ ┘à╪▒┘ّ╪ر ╪ذ┘ ╪د┘╪ث┘┘é ╪د┘┘╪┤╪╖ ┘┘é╪╖╪î
 * ┘à╪╣ ╪ح╪╣╪د╪»╪ر ╪د┘╪د╪│╪ز╪«╪»╪د┘à ╪╣┘╪» ╪د┘╪د╪│╪ز╪╣┘╪د┘à ┘┘╪│┘ç.
 */
export function useNeuralAlertsFromSecretary(secretaryAlerts: SecretaryAlert[]) {
    const classified = useMemo(
        () => classifySecretaryAlertsByHorizon(secretaryAlerts),
        [secretaryAlerts],
    );

    const counts = useMemo(() => horizonCounts(classified), [classified]);

    // ╪░╪د┘â╪▒╪ر ┘à╪ج┘é╪ز╪ر (per-`classified`-reference): ╪ز┘╪╣╪د╪» ╪ز┘ç┘è╪خ╪ز┘ç╪د ┘┘é╪╖ ╪╣┘╪» ╪ز╪║┘è╪▒ ╪د┘┘à╪▒╪ش╪╣
    const mapCacheRef = useRef<{
        key: typeof classified;
        urgent?: SmartAlert[];
        near?: SmartAlert[];
        upcoming?: SmartAlert[];
    }>({ key: classified });

    if (mapCacheRef.current.key !== classified) {
        mapCacheRef.current = { key: classified };
    }

    const alertsForFilter = useCallback((filter: AlertTimeHorizon): SmartAlert[] => {
        const cache = mapCacheRef.current;
        if (!cache[filter]) {
            cache[filter] = mapAndSort(alertsForHorizon(classified, filter));
        }
        return cache[filter]!;
    }, [classified]);

    const sourcesForFilter = useCallback(
        (filter: AlertTimeHorizon): SecretaryAlert[] => alertsForHorizon(classified, filter),
        [classified],
    );

    const carouselTotal =
        classified.urgentAlerts.length +
        classified.nearAlerts.length +
        classified.upcomingAlerts.length;

    return {
        counts,
        carouselTotal,
        alertsForFilter,
        sourcesForFilter,
    };
}

export type { SmartAlert };
