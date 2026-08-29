import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeHubCardSkeleton } from '@/app/components/lawyer/dashboard/HomeHubCardSkeleton';

describe('HomeHubCardSkeleton', () => {
    it('يحجز صف تبويبات وجسمًا قبل تحميل البطاقة الحية', () => {
        const { container } = render(<HomeHubCardSkeleton />);
        expect(screen.getByTestId('home-hub-card-skeleton')).toBeInTheDocument();
        expect(container.querySelector('.hami-hub-tabs')).not.toBeNull();
        expect(container.querySelectorAll('.hami-hub-tab')).toHaveLength(2);
        expect(screen.getByText('التنبيهات')).toBeInTheDocument();
        expect(screen.getByText('التثبيت')).toBeInTheDocument();
        expect(container.querySelector('.hami-hub-readable-panels')).not.toBeNull();
        expect(screen.getByTestId('home-hub-skeleton-empty-copy')).toHaveTextContent(
            'لا يوجد تنبيه أو تثبيت',
        );
        expect(screen.getByTestId('home-hub-card-skeleton')).toHaveAttribute('data-hami-block', 'alerts');
        expect(screen.getByTestId('home-hub-card-skeleton')).toHaveAttribute('data-hub-boot-settling', '1');
        expect(screen.getByTestId('home-hub-card-skeleton')).toHaveAttribute('data-hub-has-items', '0');
        expect(screen.getByTestId('home-hub-card-skeleton')).not.toHaveAttribute('role', 'button');
        expect(screen.getByTestId('home-hub-card-skeleton').className).not.toContain(
            'hami-sovereign-glass',
        );
    });

    it('يقبل اللمسة لفتح ورقة التنبيهات', () => {
        const onActivate = vi.fn();
        render(<HomeHubCardSkeleton onActivate={onActivate} />);
        const skeleton = screen.getByTestId('home-hub-card-skeleton');
        expect(skeleton).toHaveAttribute('role', 'button');
        skeleton.click();
        expect(onActivate).toHaveBeenCalledTimes(1);
    });
});
