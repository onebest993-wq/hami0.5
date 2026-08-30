import { afterEach, describe, expect, it } from 'vitest';
import { isScheduleRadarLivePaintReady } from '@/app/components/lawyer/dashboard/schedule/scheduleRadarLivePaint';

function mountLiveBody(inner: string): HTMLElement {
    const live = document.createElement('div');
    live.setAttribute('data-testid', 'radar-live-body');
    live.innerHTML = inner;
    document.body.appendChild(live);
    return live;
}

describe('isScheduleRadarLivePaintReady', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('يرفض قشرة الكروم ويعتمد قسم اليوم داخل الجسم الحي', () => {
        document.body.innerHTML = '';
        expect(isScheduleRadarLivePaintReady()).toBe(false);

        const cover = document.createElement('div');
        cover.setAttribute('data-testid', 'smart-legal-radar');
        cover.setAttribute('data-schedule-instant', '1');
        cover.innerHTML =
            '<button data-testid="radar-back"></button><div data-testid="radar-week-strip"></div><div data-testid="radar-empty-state"></div>';
        document.body.appendChild(cover);
        expect(isScheduleRadarLivePaintReady()).toBe(false);
        cover.remove();

        const incomplete = mountLiveBody('<p data-testid="radar-month-label">أغسطس</p>');
        expect(isScheduleRadarLivePaintReady()).toBe(false);
        incomplete.remove();

        const pendingSection = mountLiveBody(
            '<div data-testid="radar-selected-day-section"><div data-testid="radar-live-pending-empty"></div></div>',
        );
        expect(isScheduleRadarLivePaintReady()).toBe(false);
        pendingSection.remove();

        const live = mountLiveBody(
            '<div data-testid="radar-selected-day-section"><div data-testid="radar-empty-state"></div></div>',
        );
        expect(isScheduleRadarLivePaintReady()).toBe(true);
        live.remove();
    });

    it('يرفض التسليم طالما لقطة الصدفة معلّقة حتى مع قسم يوم حي', () => {
        document.body.innerHTML = '';
        const chrome = document.createElement('div');
        chrome.setAttribute('data-testid', 'smart-legal-radar');
        chrome.setAttribute('data-schedule-snapshot', 'pending');
        document.body.appendChild(chrome);
        const live = mountLiveBody(
            '<div data-testid="radar-selected-day-section"><div data-testid="radar-live-pending-empty"></div></div>',
        );
        expect(isScheduleRadarLivePaintReady()).toBe(false);
        live.remove();
        chrome.remove();
    });

    it('لا يستبدل قائمة الصدفة قبل ظهور بطاقة حية إن وُجدت مواعيد كاش', () => {
        document.body.innerHTML = '';
        const chromeEvent = document.createElement('article');
        chromeEvent.setAttribute('data-testid', 'radar-open-instant-event-e1');
        document.body.appendChild(chromeEvent);
        const live = mountLiveBody('<div data-testid="radar-selected-day-section"></div>');
        expect(isScheduleRadarLivePaintReady()).toBe(false);
        live.innerHTML =
            '<div data-testid="radar-selected-day-section"><div data-testid="radar-event-card-cal_e1"></div></div>';
        expect(isScheduleRadarLivePaintReady()).toBe(true);
        live.remove();
        chromeEvent.remove();
    });
});
