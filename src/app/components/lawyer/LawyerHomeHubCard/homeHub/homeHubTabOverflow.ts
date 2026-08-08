import { HOME_HUB_ALERTS_TAB_PREVIEW_LIMIT } from '@/app/services/alerts/homeHubCardLogic';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import type { SmartAlert } from '../../NeuralAlertsCard/types';

export type HomeHubUrgentOverflowSplit = {
    previewRadar: CalendarRadarEvent[];
    previewAlerts: SmartAlert[];
    overflowRadar: CalendarRadarEvent[];
    overflowAlerts: SmartAlert[];
    overflowCount: number;
};

export type HomeHubUpcomingOverflowSplit = {
    previewAlerts: SmartAlert[];
    overflowAlerts: SmartAlert[];
    overflowCount: number;
};

export function splitHomeHubUrgentOverflow(
    radarEvents: CalendarRadarEvent[],
    carouselAlerts: SmartAlert[],
    limit = HOME_HUB_ALERTS_TAB_PREVIEW_LIMIT,
): HomeHubUrgentOverflowSplit {
    const radarPreview = radarEvents.slice(0, limit);
    const alertSlots = Math.max(0, limit - radarPreview.length);
    const alertPreview = carouselAlerts.slice(0, alertSlots);
    const overflowRadar = radarEvents.slice(radarPreview.length);
    const overflowAlerts = carouselAlerts.slice(alertPreview.length);

    return {
        previewRadar: radarPreview,
        previewAlerts: alertPreview,
        overflowRadar,
        overflowAlerts,
        overflowCount: overflowRadar.length + overflowAlerts.length,
    };
}

export function splitHomeHubUpcomingOverflow(
    carouselAlerts: SmartAlert[],
    limit = HOME_HUB_ALERTS_TAB_PREVIEW_LIMIT,
): HomeHubUpcomingOverflowSplit {
    const previewAlerts = carouselAlerts.slice(0, limit);
    const overflowAlerts = carouselAlerts.slice(limit);

    return {
        previewAlerts,
        overflowAlerts,
        overflowCount: overflowAlerts.length,
    };
}
