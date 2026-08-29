import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import {
    REPO_ADD_MENU_BTN,
    REPO_ADD_MENU_ITEM,
    REPO_BODY,
    REPO_COMPOSE_ATTACH_CHIP,
    REPO_COMPOSE_ICON_BTN,
    REPO_FILTER_RAIL,
    REPO_ICON_BTN,
    REPO_OVERLAY,
    REPO_PANEL,
    REPO_ROOM_CHIP,
    REPO_TOUCH_ICON,
} from '@/app/components/lawyer/SmartRepository/smartRepositoryTheme';

const railSrc = readFileSync(
    join(process.cwd(), 'src/app/components/lawyer/SmartRepository/RepositoryFiltersRail.tsx'),
    'utf8',
);

describe('SmartRepository mobile readiness', () => {
    it('theme tokens تدعم dvh وsafe-area وscroll آمن', () => {
        render(
            <div data-testid="repo-shell" className={REPO_PANEL}>
                <div data-testid="repo-body" className={REPO_BODY} />
            </div>,
        );
        expect(REPO_PANEL).toContain('100dvh');
        expect(REPO_PANEL).toContain('hami-overlay-safe-insets');
        expect(REPO_BODY).toContain('touch-pan-y');
        expect(REPO_BODY).toContain('overflow-y-auto');
        expect(REPO_OVERLAY).toContain('overscroll-contain');
        expect(screen.getByTestId('repo-shell')).toBeInTheDocument();
    });

    it('فلاتر وقائمة الإضافة تدعم لمس 44px وتمرير أفقي حي', () => {
        expect(REPO_FILTER_RAIL).toContain('hami-repository-filter-scroll');
        expect(railSrc).toContain('overflow-x-auto');
        expect(railSrc).toContain('touch-pan-x');
        expect(REPO_ADD_MENU_BTN).toContain('min-h-[44px]');
        expect(REPO_ADD_MENU_ITEM).toContain('min-h-[44px]');
        expect(REPO_ADD_MENU_ITEM).toContain('touch-manipulation');
    });

    it('أزرار الرأس والفلاتر تلبي هدف اللمس 44px', () => {
        expect(REPO_ICON_BTN).toContain('min-h-[44px]');
        expect(REPO_ICON_BTN).toContain('min-w-[44px]');
        expect(REPO_ICON_BTN).toContain('touch-manipulation');
        expect(REPO_ROOM_CHIP).toContain('min-h-[44px]');
        expect(REPO_TOUCH_ICON).toContain('min-h-[44px]');
        expect(REPO_FILTER_RAIL).toContain('min-h-[44px]');
        expect(REPO_FILTER_RAIL).not.toContain('min-h-[40px]');
        expect(REPO_COMPOSE_ICON_BTN).toContain('min-h-[44px]');
        expect(REPO_COMPOSE_ICON_BTN).toContain('min-w-[44px]');
        expect(REPO_COMPOSE_ATTACH_CHIP).toContain('min-h-[44px]');
        expect(REPO_COMPOSE_ATTACH_CHIP).not.toContain('min-h-[32px]');
    });
});
