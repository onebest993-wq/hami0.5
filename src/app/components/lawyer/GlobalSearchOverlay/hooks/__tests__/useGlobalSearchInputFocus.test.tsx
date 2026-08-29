import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { createRef } from 'react';

import { useGlobalSearchInputFocus } from '@/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchInputFocus';
import { GLOBAL_SEARCH_SHELL_HYDRATED_EVENT } from '@/app/runtime/globalSearchBootHydrator';
import { GLOBAL_SEARCH_OVERLAY_INTERACTIVE_EVENT } from '@/app/runtime/globalSearchOverlayInteractive';

vi.mock('@/app/runtime/globalSearchLoader', () => ({
    isGlobalSearchOverlayModuleResolved: vi.fn(() => true),
}));

vi.mock('@/app/runtime/nativePlatform', () => ({
    isCapacitorNativePlatform: () => false,
}));

function FocusProbe({ open, focusArmed = true }: { open: boolean; focusArmed?: boolean }) {
    const inputRef = createRef<HTMLInputElement>();
    useGlobalSearchInputFocus(open, inputRef, focusArmed);
    return <input ref={inputRef} data-testid="probe-input" data-testid-overlay="global-search-overlay" />;
}

describe('useGlobalSearchInputFocus', () => {
    beforeEach(() => {
        document.body.innerHTML =
            '<div data-hami-global-search-shell><div data-search-open="true" data-testid="global-search-overlay"><input data-testid="global-search-input" /></div></div>';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('يركّز بعد حدث interactive (بلا setTimeout)', async () => {
        const focusSpy = vi.spyOn(HTMLInputElement.prototype, 'focus');
        const input = document.querySelector<HTMLInputElement>('[data-testid="global-search-input"]')!;
        const ref = { current: input };

        function Probe() {
            useGlobalSearchInputFocus(true, ref, true);
            return null;
        }

        render(<Probe />);
        expect(focusSpy).not.toHaveBeenCalled();

        window.dispatchEvent(new Event(GLOBAL_SEARCH_OVERLAY_INTERACTIVE_EVENT));
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        expect(focusSpy).toHaveBeenCalledTimes(1);
        focusSpy.mockRestore();
    });

    it('لا يُركّز عندما focusArmed=false', async () => {
        const focusSpy = vi.spyOn(HTMLInputElement.prototype, 'focus');
        render(<FocusProbe open={true} focusArmed={false} />);
        window.dispatchEvent(new Event(GLOBAL_SEARCH_OVERLAY_INTERACTIVE_EVENT));
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        expect(focusSpy).not.toHaveBeenCalled();
        focusSpy.mockRestore();
    });

    it('ينتظر hydrated قبل التركيز عندما الـ chunk غير جاهز', async () => {
        const { isGlobalSearchOverlayModuleResolved } = await import('@/app/runtime/globalSearchLoader');
        vi.mocked(isGlobalSearchOverlayModuleResolved).mockReturnValue(false);

        const focusSpy = vi.spyOn(HTMLInputElement.prototype, 'focus');
        const input = document.querySelector<HTMLInputElement>('[data-testid="global-search-input"]')!;
        const ref = { current: input };

        function Probe() {
            useGlobalSearchInputFocus(true, ref, true);
            return null;
        }

        render(<Probe />);
        window.dispatchEvent(new Event(GLOBAL_SEARCH_OVERLAY_INTERACTIVE_EVENT));
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        expect(focusSpy).not.toHaveBeenCalled();

        vi.mocked(isGlobalSearchOverlayModuleResolved).mockReturnValue(true);
        window.dispatchEvent(new Event(GLOBAL_SEARCH_SHELL_HYDRATED_EVENT));
        window.dispatchEvent(new Event(GLOBAL_SEARCH_OVERLAY_INTERACTIVE_EVENT));
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        expect(focusSpy).toHaveBeenCalledTimes(1);
        focusSpy.mockRestore();
    });
});
