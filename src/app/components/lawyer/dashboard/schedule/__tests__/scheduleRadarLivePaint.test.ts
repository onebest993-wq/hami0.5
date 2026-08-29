import { describe, expect, it } from 'vitest';
import { isScheduleRadarLivePaintReady } from '@/app/components/lawyer/dashboard/schedule/scheduleRadarLivePaint';

function mountLiveRadar(opts?: { svg?: boolean; month?: string }): HTMLElement {
    const live = document.createElement('div');
    live.setAttribute('data-testid', 'smart-legal-radar');
    const svg = opts?.svg === false ? '' : '<svg></svg>';
    const month = opts?.month === undefined ? 'أغسطس 2026' : opts.month;
    live.innerHTML = `
        <button data-testid="radar-back">${svg}</button>
        <p data-testid="radar-month-label">${month}</p>
        <div data-testid="radar-week-strip"></div>
    `;
    document.body.appendChild(live);
    return live;
}

describe('isScheduleRadarLivePaintReady', () => {
    it('يرفض قشرة الطلاء ويعتمد الرادار الحي بعد اكتمال الرأس', () => {
        document.body.innerHTML = '';
        expect(isScheduleRadarLivePaintReady()).toBe(false);

        const cover = document.createElement('div');
        cover.setAttribute('data-testid', 'schedule-tab-loading');
        cover.innerHTML =
            '<div data-testid="smart-legal-radar"><button data-testid="radar-back"><svg></svg></button><p data-testid="radar-month-label">أغسطس</p><div data-testid="radar-week-strip"></div></div>';
        document.body.appendChild(cover);
        expect(isScheduleRadarLivePaintReady()).toBe(false);
        cover.remove();

        const incomplete = mountLiveRadar({ svg: false });
        expect(isScheduleRadarLivePaintReady()).toBe(false);
        incomplete.remove();

        const live = mountLiveRadar();
        expect(isScheduleRadarLivePaintReady()).toBe(true);
        live.remove();
    });
});
