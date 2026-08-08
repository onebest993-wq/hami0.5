import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { createRef } from 'react';

import { useGlobalSearchInputFocus } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchInputFocus';
import { GLOBAL_SEARCH_SHELL_HYDRATED_EVENT } from '@/app/runtime/globalSearchBootHydrator';

vi.mock('@/app/runtime/globalSearchLoader', () => ({
    isGlobalSearchOverlayModuleResolved: vi.fn(() => true),
}));

function FocusProbe({ open, focusArmed = true }: { open: boolean; focusArmed?: boolean }) {
    const inputRef = createRef<HTMLInputElement>();
    useGlobalSearchInputFocus(open, inputRef, focusArmed);
    return <input ref={inputRef} data-testid="probe-input" />;
}

describe('useGlobalSearchInputFocus', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('يركّز مرة واحدة بعد استقرار الفتح', async () => {
        const focusSpy = vi.spyOn(HTMLInputElement.prototype, 'focus');
        const { rerender } = render(<FocusProbe open={false} focusArmed />);

        rerender(<FocusProbe open={true} focusArmed />);
        await vi.runAllTimersAsync();

        expect(focusSpy).toHaveBeenCalledTimes(1);
        focusSpy.mockRestore();
    });

    it('ينتظر hydrated قبل التركيز عندما الـ chunk غير جاهز', async () => {
        const { isGlobalSearchOverlayModuleResolved } = await import('@/app/runtime/globalSearchLoader');
        vi.mocked(isGlobalSearchOverlayModuleResolved).mockReturnValue(false);

        const focusSpy = vi.spyOn(HTMLInputElement.prototype, 'focus');
        render(<FocusProbe open={true} focusArmed />);
        await vi.runAllTimersAsync();
        expect(focusSpy).not.toHaveBeenCalled();

        vi.mocked(isGlobalSearchOverlayModuleResolved).mockReturnValue(true);
        window.dispatchEvent(new Event(GLOBAL_SEARCH_SHELL_HYDRATED_EVENT));
        await vi.runAllTimersAsync();
        expect(focusSpy).toHaveBeenCalledTimes(1);
        focusSpy.mockRestore();
    });
});
