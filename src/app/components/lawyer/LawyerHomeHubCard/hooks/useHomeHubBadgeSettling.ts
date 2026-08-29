import { useEffect, useMemo, useRef } from 'react';
import { peekHomeHubRadarCache } from '@/app/services/alerts/homeHubRadarWarmCache';
import { peekHomeHubSecretaryAlertsCache } from '@/app/services/alerts/homeHubSecretaryAlertsWarmCache';
import { markBootPhase } from '@/app/bootstrap/bootMetrics';
import { publishNativeBootTelemetry } from '@/app/runtime/nativeBootTelemetry';
import { peekHomeHubRadarUrgentForBadges } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/homeHubRadarBadgePeek';
import { useHomeHubBootReveal } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubBootReveal';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { CalendarRadarEvent } from '@/app/workspace/types';

export function useHomeHubBadgeSettling({
    lawyerId,
    secretaryAlerts,
}: {
    lawyerId: string | null;
    secretaryAlerts: SecretaryAlert[];
}): {
    badgeRadarUrgent: CalendarRadarEvent[];
    hubBadgeCountsSettled: boolean;
    hubBootSettling: boolean;
    bootRevealDone: boolean;
    hadSecretaryCache: boolean;
    hadRadarCachePeek: boolean;
} {
    const badgeRadarUrgent = useMemo(
        () => peekHomeHubRadarUrgentForBadges(lawyerId, secretaryAlerts),
        [lawyerId, secretaryAlerts],
    );

    const bootRevealDone = useHomeHubBootReveal();

    const hadSecretaryCache = Boolean(
        secretaryAlerts.length > 0 ||
            (lawyerId && (peekHomeHubSecretaryAlertsCache(lawyerId)?.length ?? 0) > 0),
    );
    const hadRadarCachePeek = Boolean(lawyerId && (peekHomeHubRadarCache(lawyerId)?.length ?? 0) > 0);

    /* peek متزامن: العدّ معروف عند التركيب. لا ready مؤجّل — وإلا يبقى aria-busy على الفراغ. */
    const hubBadgeCountsSettled = true;
    const hubBootSettling = false;

    const hubBootStableReportedRef = useRef(false);
    useEffect(() => {
        if (hubBootSettling || hubBootStableReportedRef.current) return undefined;
        hubBootStableReportedRef.current = true;
        markBootPhase('hub-boot-stable');
        publishNativeBootTelemetry();
        return undefined;
    }, [hubBootSettling]);

    return {
        badgeRadarUrgent,
        hubBadgeCountsSettled,
        hubBootSettling,
        bootRevealDone,
        hadSecretaryCache,
        hadRadarCachePeek,
    };
}
