import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AppLockOverlay } from '@/app/components/lawyer/AppLockOverlay';

describe('AppLockOverlay', () => {
    it('يعرض واجهة الفتح بدون الاعتماد على Tailwind', () => {
        render(
            <AppLockOverlay
                requiresBiometric={false}
                unlocking={false}
                onUnlockBiometric={vi.fn(async () => true)}
                onUnlockContinue={vi.fn()}
            />,
        );

        const overlay = screen.getByTestId('app-lock-overlay');
        expect(overlay).toHaveClass('hami-app-lock-overlay');
        expect(screen.getByRole('dialog', { name: 'شاشة القفل' })).toBeInTheDocument();
        expect(screen.getByText('الجلسة مقفلة')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'متابعة العمل' })).toBeInTheDocument();
    });
});
