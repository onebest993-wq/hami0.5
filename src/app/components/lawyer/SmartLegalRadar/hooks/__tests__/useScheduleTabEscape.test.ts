import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useScheduleTabEscape } from '../useScheduleTabEscape';

const nativeHandlers: Array<() => boolean> = [];

vi.mock('@/app/runtime/nativeBackStack', () => ({
    registerNativeBackHandler: (handler: () => boolean) => {
        nativeHandlers.push(handler);
        return () => {
            const i = nativeHandlers.indexOf(handler);
            if (i >= 0) nativeHandlers.splice(i, 1);
        };
    },
}));

describe('useScheduleTabEscape', () => {
    beforeEach(() => {
        nativeHandlers.length = 0;
    });

    it('Escape يرجع للرئيسية عندما لا يوجد نموذج', () => {
        const onBack = vi.fn();
        renderHook(() =>
            useScheduleTabEscape({
                enabled: true,
                showForm: false,
                formSaving: false,
                onCloseForm: vi.fn(),
                onBack,
            }),
        );
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('Escape يغلق النموذج ولا يُغلق التبويب', () => {
        const onBack = vi.fn();
        const onCloseForm = vi.fn();
        renderHook(() =>
            useScheduleTabEscape({
                enabled: true,
                showForm: true,
                formSaving: false,
                onCloseForm,
                onBack,
            }),
        );
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onBack).not.toHaveBeenCalled();
        expect(onCloseForm).toHaveBeenCalledTimes(1);
    });

    it('Cap back يغلق النموذج أولاً ثم الرجوع', () => {
        const onBack = vi.fn();
        const onCloseForm = vi.fn();
        const { rerender } = renderHook(
            (props: { showForm: boolean }) =>
                useScheduleTabEscape({
                    enabled: true,
                    showForm: props.showForm,
                    formSaving: false,
                    onCloseForm,
                    onBack,
                }),
            { initialProps: { showForm: true } },
        );

        expect(nativeHandlers[0]?.()).toBe(true);
        expect(onCloseForm).toHaveBeenCalledTimes(1);
        expect(onBack).not.toHaveBeenCalled();

        rerender({ showForm: false });
        expect(nativeHandlers[0]?.()).toBe(true);
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('لا يسرق Escape من منبّه التذكير', () => {
        const onBack = vi.fn();
        const onCloseForm = vi.fn();
        const overlay = document.createElement('div');
        overlay.setAttribute('data-testid', 'calendar-reminder-modal-overlay');
        document.body.appendChild(overlay);

        renderHook(() =>
            useScheduleTabEscape({
                enabled: true,
                showForm: true,
                formSaving: false,
                onCloseForm,
                onBack,
            }),
        );
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onCloseForm).not.toHaveBeenCalled();
        expect(onBack).not.toHaveBeenCalled();
        overlay.remove();
    });

    it('لا يسرق Escape عندما غطاء الفتح ما زال تفاعلياً', () => {
        const onBack = vi.fn();
        const cover = document.createElement('div');
        cover.setAttribute('data-testid', 'schedule-radar-paint-cover');
        document.body.appendChild(cover);
        renderHook(() =>
            useScheduleTabEscape({
                enabled: true,
                showForm: false,
                formSaving: false,
                onCloseForm: vi.fn(),
                onBack,
            }),
        );
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onBack).not.toHaveBeenCalled();
        cover.remove();
    });
});
