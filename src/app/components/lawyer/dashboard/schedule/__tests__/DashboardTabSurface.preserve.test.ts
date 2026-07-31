import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('DashboardTabSurface preserveLayout hit-testing', () => {
    it('forces idle keepAlive surfaces to block descendant pointer events', () => {
        const css = readFileSync(
            resolve(__dirname, '../../../RoyalLawyerProfile/profilePageEnterFx.css'),
            'utf8',
        );
        expect(css).toContain('.hami-dashboard-tab-preserve:not(.hami-dashboard-tab-preserve--active)');
        expect(css).toContain('pointer-events: none !important');
        expect(css).toContain(
            '.hami-dashboard-tab-preserve:not(.hami-dashboard-tab-preserve--active) *',
        );
    });
});
