import { describe, expect, it, beforeEach } from 'vitest';

import { renderHook, act } from '@testing-library/react';

import { useHomeHubPanelState } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubPanelState';

import {

    HOME_HUB_PANEL_SESSION_KEY,

    resetHomeHubPanelSessionForTests,

} from '@/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubPanelSession';



describe('useHomeHubPanelState', () => {

    beforeEach(() => {

        resetHomeHubPanelSessionForTests();

    });



    it('يبقى على alerts حتى تستقر الشارات ثم يحل التبويب مرة واحدة', () => {

        const { result, rerender } = renderHook(

            ({ settled, pins }) => useHomeHubPanelState(0, pins, { badgeCountsSettled: settled }),

            { initialProps: { settled: false, pins: 0 } },

        );



        expect(result.current.hubPanel).toBe('alerts');



        rerender({ settled: false, pins: 2 });

        expect(result.current.hubPanel).toBe('alerts');



        rerender({ settled: true, pins: 2 });

        expect(result.current.hubPanel).toBe('pins');

    });



    it('لا يعيد حل التبويب بعد اختيار المستخدم', () => {

        const { result, rerender } = renderHook(

            ({ settled, pins }) => useHomeHubPanelState(0, pins, { badgeCountsSettled: settled }),

            { initialProps: { settled: true, pins: 2 } },

        );



        expect(result.current.hubPanel).toBe('pins');



        act(() => {

            result.current.selectHubPanel('alerts');

        });

        expect(result.current.hubPanel).toBe('alerts');



        rerender({ settled: true, pins: 5 });

        expect(result.current.hubPanel).toBe('alerts');

    });



    it('يستعيد التبويب المحفوظ في الجلسة ولا يقفز عند تحديث الشارات', () => {

        sessionStorage.setItem(HOME_HUB_PANEL_SESSION_KEY, 'pins');



        const { result, rerender } = renderHook(

            ({ settled, pins }) => useHomeHubPanelState(0, pins, { badgeCountsSettled: settled }),

            { initialProps: { settled: false, pins: 3 } },

        );



        expect(result.current.hubPanel).toBe('pins');



        rerender({ settled: true, pins: 2 });

        expect(result.current.hubPanel).toBe('pins');

    });



    it('يُحوّل secretary المحفوظ إلى alerts', () => {

        sessionStorage.setItem(HOME_HUB_PANEL_SESSION_KEY, 'secretary');



        const { result } = renderHook(() => useHomeHubPanelState(0, 0, { badgeCountsSettled: true }));



        expect(result.current.hubPanel).toBe('alerts');

    });

    it('يصحّح التثبيت المتأخر بعد حل 0/0 على alerts', () => {
        const { result, rerender } = renderHook(
            ({ settled, pins, alerts }) =>
                useHomeHubPanelState(alerts, pins, { badgeCountsSettled: settled }),
            { initialProps: { settled: true, pins: 0, alerts: 0 } },
        );

        expect(result.current.hubPanel).toBe('alerts');

        rerender({ settled: true, pins: 1, alerts: 0 });
        expect(result.current.hubPanel).toBe('pins');
    });

    it('لا يسرق اختيار المستخدم عند وصول تثبيت متأخر', () => {
        const { result, rerender } = renderHook(
            ({ settled, pins, alerts }) =>
                useHomeHubPanelState(alerts, pins, { badgeCountsSettled: settled }),
            { initialProps: { settled: true, pins: 0, alerts: 0 } },
        );

        act(() => {
            result.current.selectHubPanel('alerts');
        });

        rerender({ settled: true, pins: 2, alerts: 0 });
        expect(result.current.hubPanel).toBe('alerts');
    });

});

