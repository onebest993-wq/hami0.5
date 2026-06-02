import { useCallback, useMemo, useRef } from 'react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { SecretaryOrchestrator } from '@/app/services/SecretaryOrchestrator';
import { secretaryAlertToSmartAlert } from '@/app/services/alertMappers';
import type { AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import { alertsForHorizon, horizonCounts } from '@/app/services/alertTimeClassification';
import { PRIORITY_ORDER } from './constants';
import type { SmartAlert } from './types';

function mapAndSort(alerts: SecretaryAlert[]): SmartAlert[] {
    const mapped = alerts.map(secretaryAlertToSmartAlert);
    mapped.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99));
    return mapped;
}

/**
 * يفترض أن القائمة الواردة مُصفّاة مسبقاً (visibleAppAlerts).
 *
 * تحسين أداء: التخريط (map + sort) يجري بكسل (lazy) لكل أفق على حدة
 * وبتخزين مؤقت داخلي — فلا نُخرّط 3 دلاء كل مرّة بل الأفق النشط فقط،
 * مع إعادة الاستخدام عند الاستعلام نفسه.
 */
export function useNeuralAlertsFromSecretary(secretaryAlerts: SecretaryAlert[]) {
    const classified = useMemo(
        () => SecretaryOrchestrator.classifyAlertsByHorizon(secretaryAlerts),
        [secretaryAlerts],
    );

    const counts = useMemo(() => horizonCounts(classified), [classified]);

    // ذاكرة مؤقتة (per-`classified`-reference): تُعاد تهيئتها فقط عند تغير المرجع
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
