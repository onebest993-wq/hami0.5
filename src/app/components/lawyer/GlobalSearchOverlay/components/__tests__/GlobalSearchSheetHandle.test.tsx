import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GlobalSearchSheetHandle } from '@/app/components/lawyer/GlobalSearchOverlay/components/GlobalSearchSheetHandle';

describe('GlobalSearchSheetHandle', () => {
    it('يغلق بالسحب للأسفل فوق العتبة', () => {
        const onClose = vi.fn();
        render(
            <div data-testid="global-search-overlay">
                <GlobalSearchSheetHandle onClose={onClose} />
            </div>,
        );
        const hit = screen.getByTestId('global-search-swipe-handle');

        fireEvent.pointerDown(hit, { clientY: 40, pointerId: 1, pointerType: 'touch', button: 0 });
        fireEvent.pointerUp(hit, { clientY: 160, pointerId: 1, pointerType: 'touch' });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('يغلق بسحب الفأرة فوق العتبة', () => {
        const onClose = vi.fn();
        render(
            <div data-testid="global-search-overlay">
                <GlobalSearchSheetHandle onClose={onClose} />
            </div>,
        );
        const hit = screen.getByTestId('global-search-swipe-handle');

        fireEvent.pointerDown(hit, { clientY: 20, pointerId: 1, pointerType: 'mouse', button: 0 });
        fireEvent.pointerMove(hit, { clientY: 140, pointerId: 1, pointerType: 'mouse' });
        fireEvent.pointerUp(hit, { clientY: 140, pointerId: 1, pointerType: 'mouse' });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('يتابع الإصبع على الورقة قبل عتبة الإغلاق', () => {
        const onClose = vi.fn();
        render(
            <div data-testid="global-search-overlay">
                <GlobalSearchSheetHandle onClose={onClose} />
            </div>,
        );
        const hit = screen.getByTestId('global-search-swipe-handle');
        const sheet = screen.getByTestId('global-search-overlay');

        fireEvent.pointerDown(hit, { clientY: 20, pointerId: 1, pointerType: 'touch', button: 0 });
        fireEvent.pointerMove(hit, { clientY: 80, pointerId: 1, pointerType: 'touch' });

        expect(sheet.getAttribute('data-gs-swiping')).toBe('1');
        expect(sheet.style.getPropertyValue('--gs-swipe-y')).toBe('60px');
        expect(onClose).not.toHaveBeenCalled();
    });

    it('Enter يغلق من لوحة المفاتيح', () => {
        const onClose = vi.fn();
        render(<GlobalSearchSheetHandle onClose={onClose} />);
        const hit = screen.getByTestId('global-search-swipe-handle');
        fireEvent.keyDown(hit, { key: 'Enter' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
