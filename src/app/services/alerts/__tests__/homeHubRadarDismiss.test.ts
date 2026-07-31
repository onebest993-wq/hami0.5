import { beforeEach, describe, expect, it } from 'vitest';
import {
    dismissHomeHubRadarId,
    filterVisibleHomeHubRadarEvents,
    getDismissedHomeHubRadarIds,
    HOME_HUB_RADAR_DISMISSED_KEY_PREFIX,
} from '../homeHubRadarDismiss';

describe('homeHubRadarDismiss', () => {
    beforeEach(() => localStorage.clear());

    it('يخفي الموعد من البطاقة فقط حسب المحامي', () => {
        dismissHomeHubRadarId('lawyer-1', 'evt-a');
        expect(getDismissedHomeHubRadarIds('lawyer-1')).toEqual(['evt-a']);
        expect(getDismissedHomeHubRadarIds('lawyer-2')).toEqual([]);

        const visible = filterVisibleHomeHubRadarEvents(
            [{ id: 'evt-a' }, { id: 'evt-b' }],
            getDismissedHomeHubRadarIds('lawyer-1'),
        );
        expect(visible.map((e) => e.id)).toEqual(['evt-b']);
    });

    it('يتجاهل معرّفات فارغة ولا يكتب بدون محامٍ', () => {
        dismissHomeHubRadarId(null, 'evt-a');
        dismissHomeHubRadarId('lawyer-1', '  ');
        expect(getDismissedHomeHubRadarIds('lawyer-1')).toEqual([]);
        expect(localStorage.getItem(`${HOME_HUB_RADAR_DISMISSED_KEY_PREFIX}:lawyer-1`)).toBeNull();
    });

    it('لا يكرّر نفس المعرّف عند إعادة الإخفاء', () => {
        dismissHomeHubRadarId('lawyer-1', 'evt-a');
        dismissHomeHubRadarId('lawyer-1', 'evt-a');
        expect(getDismissedHomeHubRadarIds('lawyer-1')).toEqual(['evt-a']);
    });
});
