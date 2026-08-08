import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GlobalSearchInstantShell } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchInstantShell';

describe('GlobalSearchInstantShell close arm', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('blocks backdrop click from the same open gesture', () => {
        const onClose = vi.fn();
        const { container } = render(<GlobalSearchInstantShell open onClose={onClose} />);

        const backdrop = container.querySelector(
            'button.hami-gs-backdrop',
        ) as HTMLButtonElement;
        expect(backdrop).toBeTruthy();

        fireEvent.click(backdrop);
        expect(onClose).not.toHaveBeenCalled();

        act(() => {
            window.dispatchEvent(new Event('pointerup'));
            vi.advanceTimersByTime(80);
        });

        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('global-search-overlay')).toBeTruthy();
    });
});
