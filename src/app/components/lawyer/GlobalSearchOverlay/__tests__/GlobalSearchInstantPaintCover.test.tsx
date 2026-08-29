import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlobalSearchInstantPaintCover } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchInstantPaintCover';

describe('GlobalSearchInstantPaintCover', () => {
    it('backdrop يغلق فوراً ويعرض حقل البحث', () => {
        const onClose = vi.fn();
        render(<GlobalSearchInstantPaintCover onClose={onClose} />);

        const cover = screen.getByTestId('global-search-instant-cover');
        const backdrop = cover.querySelector('.hami-gs-backdrop');
        expect(backdrop).toBeTruthy();
        fireEvent.click(backdrop as Element);
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('global-search-overlay')).toBeTruthy();
        expect(screen.getByTestId('global-search-input')).toBeTruthy();
        expect(screen.getByText('البحث الشامل')).toBeTruthy();
    });
});
