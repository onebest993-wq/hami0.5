import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
    useScheduleRadarLivePaint,
    LIVE_PAINT_RAF_CAP,
} from '@/app/components/lawyer/dashboard/schedule/useScheduleRadarLivePaint';

vi.mock('@/app/components/lawyer/dashboard/schedule/scheduleRadarLivePaint', async (importOriginal) => {
    const actual = await importOriginal<
        typeof import('@/app/components/lawyer/dashboard/schedule/scheduleRadarLivePaint')
    >();
    return {
        ...actual,
        isScheduleRadarLivePaintReady: () => false,
    };
});

describe('useScheduleRadarLivePaint', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.innerHTML = '';
    });

    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('يرفع الغطاء بعد سقف الإطارات حتى لو الكروم الحي لم يستقر', () => {
        const callbacks: FrameRequestCallback[] = [];
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            callbacks.push(cb);
            return callbacks.length;
        });
        vi.stubGlobal('cancelAnimationFrame', () => undefined);

        const { result } = renderHook(() => useScheduleRadarLivePaint(true));
        expect(result.current).toBe(false);

        act(() => {
            for (let i = 0; i < LIVE_PAINT_RAF_CAP + 8; i += 1) {
                const cb = callbacks.shift();
                if (!cb) break;
                cb(i);
            }
        });

        expect(result.current).toBe(true);
    });

    it('لا يسلّم قائمة الصدفة عند سقف الإطارات إن بقيت بطاقات كاش', () => {
        const chromeEvent = document.createElement('article');
        chromeEvent.setAttribute('data-testid', 'radar-open-instant-event-e1');
        document.body.appendChild(chromeEvent);

        const callbacks: FrameRequestCallback[] = [];
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            callbacks.push(cb);
            return callbacks.length;
        });
        vi.stubGlobal('cancelAnimationFrame', () => undefined);

        const { result } = renderHook(() => useScheduleRadarLivePaint(true));

        act(() => {
            for (let i = 0; i < LIVE_PAINT_RAF_CAP + 8; i += 1) {
                const cb = callbacks.shift();
                if (!cb) break;
                cb(i);
            }
        });

        expect(result.current).toBe(false);
        expect(callbacks.length).toBeGreaterThan(0);
        chromeEvent.remove();
    });

    it('لا يسلّم عند سقف الإطارات إن بقيت لقطة الكاش معلّقة', () => {
        const chrome = document.createElement('div');
        chrome.setAttribute('data-testid', 'smart-legal-radar');
        chrome.setAttribute('data-schedule-snapshot', 'pending');
        document.body.appendChild(chrome);

        const callbacks: FrameRequestCallback[] = [];
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            callbacks.push(cb);
            return callbacks.length;
        });
        vi.stubGlobal('cancelAnimationFrame', () => undefined);

        const { result } = renderHook(() => useScheduleRadarLivePaint(true));

        act(() => {
            for (let i = 0; i < LIVE_PAINT_RAF_CAP + 8; i += 1) {
                const cb = callbacks.shift();
                if (!cb) break;
                cb(i);
            }
        });

        expect(result.current).toBe(false);
        expect(callbacks.length).toBeGreaterThan(0);
        chrome.remove();
    });
});
