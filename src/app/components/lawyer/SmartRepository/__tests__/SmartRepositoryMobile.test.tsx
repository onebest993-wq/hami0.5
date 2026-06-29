import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
    REPO_ACTION_BTN,
    REPO_BODY,
    REPO_FILTER_CHIP,
    REPO_FILTER_ROW,
    REPO_ICON_BTN,
    REPO_OVERLAY,
    REPO_PANEL,
    REPO_TOUCH_ICON,
} from '@/app/components/lawyer/SmartRepository/smartRepositoryTheme';

describe('SmartRepository mobile readiness', () => {
    it('theme tokens تدعم dvh وsafe-area وscroll آمن', () => {
        render(
            <div data-testid="repo-shell" className={REPO_PANEL}>
                <div data-testid="repo-body" className={REPO_BODY} />
            </div>,
        );
        expect(REPO_PANEL).toContain('100dvh');
        expect(REPO_PANEL).toContain('safe-area-inset-top');
        expect(REPO_PANEL).toContain('safe-area-inset-bottom');
        expect(REPO_BODY).toContain('touch-pan-y');
        expect(REPO_BODY).toContain('overflow-y-auto');
        expect(REPO_OVERLAY).toContain('overscroll-contain');
        expect(screen.getByTestId('repo-shell')).toBeInTheDocument();
    });

    it('فلاتر وأزرار الإجراءات تدعم scroll/l touch أفقي/عمودي', () => {
        expect(REPO_FILTER_ROW).toContain('touch-pan-x');
        expect(REPO_FILTER_ROW).toContain('overflow-x-auto');
        expect(REPO_ACTION_BTN).toContain('active:scale-[0.97]');
        expect(REPO_ACTION_BTN).toContain('h-[3.5rem]');
    });

    it('أزرار الرأس والفلاتر تلبي هدف اللمس 44px', () => {
        expect(REPO_ICON_BTN).toContain('min-h-[44px]');
        expect(REPO_ICON_BTN).toContain('min-w-[44px]');
        expect(REPO_ICON_BTN).toContain('touch-manipulation');
        expect(REPO_FILTER_CHIP).toContain('min-h-[44px]');
        expect(REPO_TOUCH_ICON).toContain('min-h-[44px]');
    });
});
