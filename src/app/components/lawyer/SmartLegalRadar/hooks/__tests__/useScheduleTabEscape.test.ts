import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useScheduleTabEscape } from '../useScheduleTabEscape';

const nativeHandlers: Array<() => boolean> = [];

vi.mock('@/app/runtime/capacitorAppLifecycle', () => ({
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

    it('Escape لا يُغلق التبويب أثناء فتح النموذج', () => {
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
        expect(onCloseForm).not.toHaveBeenCalled();
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
});
