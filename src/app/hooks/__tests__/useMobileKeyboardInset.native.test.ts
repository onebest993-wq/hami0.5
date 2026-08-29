import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';

describe('useMobileKeyboardInset native dual-path', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-hami-native');
        vi.resetModules();
    });

    it('على الويب يعتمد visualViewport فقط', () => {
        const { result } = renderHook(() => useMobileKeyboardInset(true, true));
        expect(result.current).toBe(0);
    });

    it('على الأصلي يستمع لـ Keyboard plugin ويمنع خلط ارتفاع صفري مضاعف', async () => {
        document.documentElement.setAttribute('data-hami-native', '1');

        const showHandlers: Array<(info: { keyboardHeight: number }) => void> = [];
        const hideHandlers: Array<() => void> = [];

        vi.doMock('@capacitor/keyboard', () => ({
            Keyboard: {
                addListener: vi.fn(async (event: string, cb: (info?: { keyboardHeight: number }) => void) => {
                    if (event === 'keyboardWillShow') {
                        showHandlers.push(cb as (info: { keyboardHeight: number }) => void);
                    }
                    if (event === 'keyboardWillHide') {
                        hideHandlers.push(cb as () => void);
                    }
                    return { remove: vi.fn() };
                }),
            },
        }));

        const { useMobileKeyboardInset: useInset } = await import('@/app/hooks/useMobileKeyboardInset');
        const { result } = renderHook(() => useInset(true, true));

        await act(async () => {
            await Promise.resolve();
            await Promise.resolve();
        });

        expect(showHandlers.length).toBeGreaterThan(0);

        await act(async () => {
            showHandlers[0]?.({ keyboardHeight: 280 });
        });
        expect(result.current).toBe(280);

        await act(async () => {
            hideHandlers[0]?.();
        });
        expect(result.current).toBe(0);
    });
});
