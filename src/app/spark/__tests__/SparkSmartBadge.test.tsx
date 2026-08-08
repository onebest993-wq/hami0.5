import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SparkSmartBadge } from '@/app/spark/ui/SparkSmartBadge';
import type { SparkNudge } from '@/app/spark/types';

const sampleNudge: SparkNudge = {
    id: 'test-1',
    kind: 'lawsuit.absent_notification_missing',
    surface: 'lawsuit',
    priority: 10,
    message: 'يبدو أن تاريخ التبليغ غير مسجّل — هل يهمك الأمر؟',
    presence: {
        present: ['حكم غيابي'],
        missing: ['تاريخ التبليغ'],
    },
    source: 'test',
    action: { label: 'تسجيل التبليغ', actionId: 'absent_notification' },
};

describe('SparkSmartBadge', () => {
    it('يعرض الرسالة وخيارات المتابعة والتجاهل', () => {
        const onFollow = vi.fn();
        const onDismiss = vi.fn();

        render(
            <SparkSmartBadge nudge={sampleNudge} onFollow={onFollow} onLater={vi.fn()} onDismiss={onDismiss} />,
        );

        expect(screen.getByTestId('spark-smart-badge')).toBeInTheDocument();
        expect(screen.getByText(/تاريخ التبليغ غير مسجّل/)).toBeInTheDocument();
        expect(screen.getByText(/موجود:/)).toBeInTheDocument();
        expect(screen.queryByText(/غير مسجّل:/)).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'تسجيل التبليغ' }));
        fireEvent.click(screen.getByRole('button', { name: 'تجاهل' }));

        expect(onFollow).toHaveBeenCalledTimes(1);
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('popover layout hides duplicate mark and uses flat chrome', () => {
        render(
            <SparkSmartBadge
                nudge={sampleNudge}
                onFollow={vi.fn()}
                onLater={vi.fn()}
                onDismiss={vi.fn()}
                layout="popover"
            />,
        );

        const badge = screen.getByTestId('spark-smart-badge');
        expect(badge.className).not.toMatch(/border-white/);
        expect(badge.querySelector('svg')).toBeNull();
    });
});
