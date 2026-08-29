import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
    GLASS_CHIP,
    GLASS_FIELD,
    TX_DRAWER_FOOTER,
    TX_DRAWER_SHELL,
    TX_ICON_BTN,
    TX_OVERLAY,
    TX_PAGE_SCROLL,
    TX_PAGE_SHELL,
    TX_TAB_TRIGGER,
    TX_TOUCH_CHIP,
    TX_TOUCH_ICON,
} from '@/app/components/lawyer/TransactionsThreading/transactionsGlassTheme';

describe('TransactionsThreading mobile readiness', () => {
    it('theme tokens تدعم dvh وsafe-area وscroll آمن', () => {
        render(
            <div data-testid="tx-overlay" className={TX_OVERLAY}>
                <div data-testid="tx-drawer" className={TX_DRAWER_SHELL} />
            </div>,
        );
        expect(TX_PAGE_SHELL).toContain('100dvh');
        expect(TX_PAGE_SHELL).toContain('flex flex-col');
        expect(TX_PAGE_SHELL).toContain('overflow-hidden');
        expect(TX_OVERLAY).toContain('hami-overlay-safe-insets');
        expect(TX_OVERLAY).toContain('overflow-hidden');
        expect(TX_OVERLAY).not.toContain('overflow-y-auto');
        expect(TX_OVERLAY).toContain('overscroll-y-contain');
        expect(TX_OVERLAY).toContain('touch-pan-y');
        expect(TX_PAGE_SCROLL).toContain('scrollbar-hide');
        expect(TX_PAGE_SCROLL).toContain('flex-1');
        expect(TX_DRAWER_SHELL).toContain('flex flex-col');
        expect(TX_DRAWER_FOOTER).toContain('safe-area-inset-bottom');
        expect(screen.getByTestId('tx-overlay')).toBeInTheDocument();
    });

    it('أزرار الرأس والفلاتر والتبويبات تلبي هدف اللمس 44px', () => {
        expect(TX_TOUCH_ICON).toContain('min-h-[44px]');
        expect(TX_TOUCH_ICON).toContain('min-w-[44px]');
        expect(TX_TOUCH_ICON).toContain('touch-manipulation');
        expect(TX_TOUCH_CHIP).toContain('min-h-[44px]');
        expect(TX_ICON_BTN).toContain('min-h-[44px]');
        expect(GLASS_CHIP).toContain('min-h-[44px]');
        expect(TX_TAB_TRIGGER).toContain('min-h-[44px]');
        expect(GLASS_FIELD).toContain('min-h-[44px]');
    });
});
