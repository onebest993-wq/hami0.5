import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dash = join(process.cwd(), 'src/app/components/lawyer/dashboard');

describe('LawyerDashboardMainView file split honesty', () => {
    it('الجذع رفيع؛ Lazy و OverlayHosts و Chrome منفصلان', () => {
        const main = readFileSync(join(dash, 'LawyerDashboardMainView.tsx'), 'utf8');
        const lazy = readFileSync(join(dash, 'LawyerDashboardMainView.lazyEntries.ts'), 'utf8');
        const hosts = readFileSync(join(dash, 'LawyerDashboardMainViewOverlayHosts.tsx'), 'utf8');
        const chrome = readFileSync(join(dash, 'useLawyerDashboardMainViewChrome.ts'), 'utf8');

        expect(existsSync(join(dash, 'LawyerDashboardMainView.lazyEntries.ts'))).toBe(true);
        expect(existsSync(join(dash, 'LawyerDashboardMainViewOverlayHosts.tsx'))).toBe(true);
        expect(existsSync(join(dash, 'useLawyerDashboardMainViewChrome.ts'))).toBe(true);

        expect(main).toContain('LawyerDashboardMainViewOverlayHosts');
        expect(main).toContain('useLawyerDashboardMainViewChrome');
        expect(main).toContain('LawyerDashboardMainView.lazyEntries');
        expect(main).toContain('announceBootReveal');
        expect(main).toContain('preDockSurfacesMount');
        expect(main).toMatch(
            /preDockSurfacesMount\s*\?\s*\([\s\S]*?LazyLawyerDashboardNavigationIsland/,
        );
        expect(main).not.toContain('lazyWithRetry');
        expect(main).not.toContain('ExecutionArchiveInstantChrome');
        expect(main).not.toContain('useLawyerExecutionOverlayEscape');

        expect(lazy).toContain('LazyCommunityOverlayEntry');
        expect(lazy).toContain('loadCommunityOverlayEntry');
        expect(lazy).toContain('LazyScheduleTabHost');
        expect(lazy).toContain('loadScheduleTabHostModule');

        expect(hosts).toContain('communityLive ?');
        expect(hosts).toContain('executionLive ?');
        expect(hosts).toContain('LazyExecutionArchiveInstantChrome');
        expect(hosts).toContain('LazyCriminalDashboardBootChrome');
        expect(hosts).not.toMatch(
            /import \{\s*ExecutionArchiveInstantChrome/,
        );
        expect(hosts).not.toMatch(
            /import \{ CriminalDashboardBootChrome \}/,
        );
        expect(hosts).toContain('GlobalSearchInstantPaintCover');
        expect(hosts).toContain('ExecutionArchiveInstantPaintCover');
        expect(hosts).toContain('ExecutionDossierInstantPaintCover');

        expect(chrome).toContain('useLawyerExecutionOverlayEscape');
        expect(chrome).toContain('bindFramePacingGuard');
        expect(chrome).toContain('globalSearchOpen');
    });

    it('ForumTile و HomeDockQuickSheet مقسومان بدون كسر التصدير', () => {
        const forum = readFileSync(join(dash, 'commandHub/ForumTile.tsx'), 'utf8');
        const slot = readFileSync(join(dash, 'forumProfile/ForumTileProfileQuarterSlot.tsx'), 'utf8');
        const sheet = readFileSync(join(dash, 'HomeDockQuickSheet.tsx'), 'utf8');
        expect(forum).toContain('ForumTileProfileQuarterSlot');
        expect(slot).toContain('LazyForumTileProfileQuarter');
        expect(sheet).toContain('HomeDockQuickSheetAlertsPanel');
        expect(sheet).toContain('HomeDockQuickSheetPinsPanel');
        expect(sheet).toContain('export function HomeDockQuickSheet');
    });
});
