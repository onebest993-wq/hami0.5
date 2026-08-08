import { describe, expect, it } from 'vitest';
import {
    splitHomeHubUrgentOverflow,
    splitHomeHubUpcomingOverflow,
} from '@/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubTabOverflow';
import { HOME_HUB_ALERTS_TAB_PREVIEW_LIMIT } from '@/app/services/alerts/homeHubCardLogic';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import type { SmartAlert } from '@/app/components/lawyer/NeuralAlertsCard/types';

const radar = (id: string): CalendarRadarEvent => ({
    id,
    title: id,
    whenLabel: 'اليوم',
    dateLabel: 'اليوم',
    timeLabel: '3:00 م',
    sourceModuleLabel: 'دعوى',
    routePath: `workspace:lawsuit:${id}`,
});

const alert = (id: string): SmartAlert => ({
    id,
    title: id,
    description: '',
    priority: 'amber',
    actionType: 'open',
    actionLabel: 'فتح',
    payload: {},
    timestamp: Date.now(),
    colorTheme: 'amber',
    icon: '📌',
});

describe('homeHubTabOverflow', () => {
    it('يقسّم الرادار والتنبيهات العاجلة حتى حد المعاينة', () => {
        const split = splitHomeHubUrgentOverflow(
            [radar('r1'), radar('r2'), radar('r3')],
            [alert('a1')],
            2,
        );

        expect(split.previewRadar.map((e) => e.id)).toEqual(['r1', 'r2']);
        expect(split.previewAlerts).toEqual([]);
        expect(split.overflowRadar.map((e) => e.id)).toEqual(['r3']);
        expect(split.overflowAlerts.map((a) => a.id)).toEqual(['a1']);
        expect(split.overflowCount).toBe(2);
    });

    it('يقسّم القادم حسب HOME_HUB_ALERTS_TAB_PREVIEW_LIMIT', () => {
        const items = Array.from({ length: 4 }, (_, i) => alert(`u${i}`));
        const split = splitHomeHubUpcomingOverflow(items);

        expect(split.previewAlerts.length).toBe(HOME_HUB_ALERTS_TAB_PREVIEW_LIMIT);
        expect(split.overflowCount).toBe(4 - HOME_HUB_ALERTS_TAB_PREVIEW_LIMIT);
    });
});
