import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventCard } from '@/app/components/lawyer/SmartLegalRadar/EventCard';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

describe('EventCard', () => {
    it('أزرار التعديل/الحذف ظاهرة دائماً بحجم لمس 44px ولها aria-label', () => {
        const event: UnifiedEvent = {
            id: 'cal_test-1',
            title: 'موعد اختبار',
            date: '2026-06-01',
            type: 'custom',
            source: 'calendar',
        };

        render(<EventCard event={event} onEdit={vi.fn()} onDelete={vi.fn()} />);

        const editBtn = screen.getByTestId('radar-event-edit-cal_test-1');
        const deleteBtn = screen.getByTestId('radar-event-card-delete-cal_test-1');
        expect(editBtn).toHaveAttribute('aria-label', 'تعديل الموعد موعد اختبار');
        expect(deleteBtn).toHaveAttribute('aria-label', 'حذف الموعد موعد اختبار');

        expect(editBtn.className).toMatch(/h-\[44px\]/);
        expect(deleteBtn.className).toMatch(/h-\[44px\]/);
        expect(editBtn.className).not.toMatch(/opacity-0/);
        expect(deleteBtn.className).not.toMatch(/opacity-0/);
    });

    it('بطاقة موحّدة: عنوان كامل + محكمة + أطراف + موقع', () => {
        const event: UnifiedEvent = {
            id: 'br-1',
            title: 'جلسة — مرافعة مدنية',
            date: '2026-08-13',
            time: '09:00',
            endTime: '10:00',
            type: 'hearing',
            source: 'calendar',
            isBridged: true,
            sourceLabel: 'دعوى',
            court: 'محكمة البداءة',
            location: 'قاعة 3',
            partiesSummary: 'أحمد (المدعي) · سارة (المدعى عليه)',
            bridge: {
                sourceModule: 'lawsuit',
                sourceEntityId: 'f1',
                sourceEventId: 'e1',
                calendarRecordId: 'c1',
            },
        };

        render(
            <EventCard
                event={event}
                highlighted
                onEdit={vi.fn()}
                onDelete={vi.fn()}
                onOpenSource={vi.fn()}
            />,
        );

        const card = screen.getByTestId('radar-event-card-br-1');
        expect(card.tagName.toLowerCase()).toBe('article');
        expect(card).toHaveAttribute('data-highlighted', '1');
        expect(screen.getByTestId('radar-event-title-br-1')).toHaveTextContent('مرافعة مدنية');
        expect(screen.getByTestId('radar-event-kind-br-1')).toHaveTextContent('موعد مرافعة');
        expect(screen.getByTestId('radar-event-source-br-1')).toHaveTextContent('دعوى');
        expect(screen.getByTestId('radar-event-court-br-1')).toHaveTextContent('محكمة البداءة');
        expect(screen.getByTestId('radar-event-location-br-1')).toHaveTextContent('قاعة 3');
        expect(screen.getByTestId('radar-event-parties-br-1')).toHaveTextContent('أحمد');
        expect(screen.getByText('09:00–10:00')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'فتح المصدر الأصلي للموعد جلسة — مرافعة مدنية' })).toBeTruthy();
        expect(screen.getByTestId('radar-event-open-source-br-1')).toBeInTheDocument();
    });

    it('الموعد اليدوي يعرض الملاحظات المنظّفة واسم الموكل', () => {
        const event: UnifiedEvent = {
            id: 'man-1',
            title: 'مراجعة أوراق',
            date: '2026-08-13',
            type: 'custom',
            source: 'calendar',
            clientName: 'علي حسين',
            notes: '📂 المصدر: يدوي\nتأكيد الحضور قبل الظهر',
        };

        render(<EventCard event={event} onEdit={vi.fn()} onDelete={vi.fn()} />);

        expect(screen.getByTestId('radar-event-title-man-1')).toHaveTextContent('مراجعة أوراق');
        expect(screen.getByTestId('radar-event-client-man-1')).toHaveTextContent('علي حسين');
        expect(screen.getByTestId('radar-event-notes-man-1')).toHaveTextContent('تأكيد الحضور قبل الظهر');
        expect(screen.queryByTestId('radar-event-source-man-1')).toBeNull();
    });
});
