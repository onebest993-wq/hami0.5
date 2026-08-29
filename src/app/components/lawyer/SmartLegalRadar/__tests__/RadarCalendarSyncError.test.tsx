import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RadarCalendarSyncError } from '@/app/components/lawyer/SmartLegalRadar/RadarCalendarSyncError';

describe('RadarCalendarSyncError', () => {
    it('يعيد المحاولة بالنقر وEnter مع تلميح واضح', () => {
        const onRetry = vi.fn();
        render(<RadarCalendarSyncError message="تعذّر تحديث التقويم" onRetry={onRetry} />);

        const banner = screen.getByTestId('radar-calendar-error');
        expect(banner).toHaveAttribute('role', 'alert');
        expect(banner.className).toContain('bg-rose-500/10');
        expect(banner.className).toContain('text-rose-300');
        expect(banner.className).toContain('min-h-[44px]');
        expect(banner).toHaveTextContent('إعادة المحاولة');

        fireEvent.click(banner);
        fireEvent.keyDown(banner, { key: 'Enter' });
        expect(onRetry).toHaveBeenCalledTimes(2);
    });
});
