import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    consumeNativeBackForTests,
    resetNativeBackHandlersForTests,
} from '@/app/runtime/nativeBackStack';
import { useProfileCanvasBackgroundEditor } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileCanvasBackgroundEditor';

describe('useProfileCanvasBackgroundEditor dismiss', () => {
    beforeEach(() => {
        resetNativeBackHandlersForTests();
    });

    afterEach(() => {
        resetNativeBackHandlersForTests();
    });

    it('Escape يلغي المحرر دون إغلاق الاستوديو من هذا الخطاف', () => {
        const onCancel = vi.fn();
        renderHook(() =>
            useProfileCanvasBackgroundEditor({
                open: true,
                file: null,
                onCancel,
                onConfirm: vi.fn(),
            }),
        );

        act(() => {
            window.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
            );
        });

        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('الرجوع الأصلي يلغي المحرر (LIFO)', () => {
        const onCancel = vi.fn();
        renderHook(() =>
            useProfileCanvasBackgroundEditor({
                open: true,
                file: null,
                onCancel,
                onConfirm: vi.fn(),
            }),
        );

        expect(consumeNativeBackForTests()).toBe(true);
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('لا يسجّل رجوعاً وهو مغلق', () => {
        const onCancel = vi.fn();
        renderHook(() =>
            useProfileCanvasBackgroundEditor({
                open: false,
                file: null,
                onCancel,
                onConfirm: vi.fn(),
            }),
        );

        expect(consumeNativeBackForTests()).toBe(false);
        expect(onCancel).not.toHaveBeenCalled();
    });
});
