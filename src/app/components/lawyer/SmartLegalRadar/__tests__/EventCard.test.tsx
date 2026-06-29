import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventCard } from '@/app/components/lawyer/SmartLegalRadar/EventCard';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

vi.mock('@/app/hooks/useReduceMotion', () => ({
    useReduceMotion: () => true,
}));

describe('EventCard mobile touch', () => {
    it('أزرار التعديل/الحذف مرئية على اللمس (hover:none) ولها aria-label', () => {
        const event: UnifiedEvent = {
            id: 'cal_test-1',
            title: 'موعد اختبار',
            date: '2026-06-01',
            type: 'custom',
            source: 'calendar',
        };

        const { container } = render(
            <EventCard event={event} index={0} onEdit={vi.fn()} onDelete={vi.fn()} />,
        );

        const editBtn = screen.getByRole('button', { name: 'تعديل الموعد' });
        const deleteBtn = screen.getByRole('button', { name: 'حذف الموعد' });

        expect(editBtn).toBeTruthy();
        expect(deleteBtn).toBeTruthy();

        const actionRow = container.querySelector('[class*="hover:none"]');
        expect(actionRow?.className).toContain('[@media(hover:none)]:opacity-100');
    });
});
