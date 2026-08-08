import { describe, expect, it } from 'vitest';

import {
    applyCanonicalMainWidgetOrder,
    buildDefaultPlacements,
    consolidateLegacyRepositoryDock,
    filterDisplayHomeWidgets,
    getWidgetsInZone,
    transferWidget,
} from '@/app/services/settings/homeWidgetPlacements';

describe('homeWidgetPlacements repository legacy', () => {
    it('default main order: pins hub, lawsuits, execution, transactions, tasks, forum, calendar, repository', () => {
        const main = filterDisplayHomeWidgets(getWidgetsInZone(buildDefaultPlacements(), 'main'), false);
        expect(main).toEqual([
            'alerts',
            'hubLawsuit',
            'hubExecution',
            'hubTransaction',
            'dockTasks',
            'forum',
            'dockCalendar',
            'dockRepository',
        ]);
    });

    it('applyCanonicalMainWidgetOrder restores canonical main sequence', () => {
        const scrambled = applyCanonicalMainWidgetOrder({
            ...buildDefaultPlacements(),
            hubLawsuit: { zone: 'main', order: 6 },
            forum: { zone: 'main', order: 0 },
        });
        const main = getWidgetsInZone(scrambled, 'main');
        expect(main.indexOf('alerts')).toBeLessThan(main.indexOf('hubLawsuit'));
        expect(main.indexOf('hubLawsuit')).toBeLessThan(main.indexOf('hubExecution'));
        expect(main.indexOf('dockTasks')).toBeLessThan(main.indexOf('forum'));
        expect(main.indexOf('forum')).toBeLessThan(main.indexOf('dockCalendar'));
        expect(main.indexOf('dockCalendar')).toBeLessThan(main.indexOf('dockRepository'));
    });
    it('default layout hides dockNotepad and dockVault from display', () => {
        const placements = buildDefaultPlacements();
        const main = filterDisplayHomeWidgets(getWidgetsInZone(placements, 'main'), false);
        const dock = filterDisplayHomeWidgets(getWidgetsInZone(placements, 'dock'), false);

        expect(main).not.toContain('dockNotepad');
        expect(main).not.toContain('dockVault');
        expect(dock).not.toContain('dockNotepad');
        expect(dock).not.toContain('dockVault');
        expect(main).toContain('dockRepository');
        expect(main).toContain('dockCalendar');
        expect(main).toContain('dockTasks');
    });

    it('consolidateLegacyRepositoryDock stashes legacy widgets while repository stays in main', () => {
        const placements = transferWidget(buildDefaultPlacements(), 'dockNotepad', 'main', 5);
        const next = consolidateLegacyRepositoryDock(placements);

        expect(getWidgetsInZone(next, 'main')).not.toContain('dockNotepad');
        expect(getWidgetsInZone(next, 'main')).toContain('dockRepository');
        expect(getWidgetsInZone(next, 'dock')).toContain('dockNotepad');
        expect(getWidgetsInZone(next, 'dock')).not.toContain('dockRepository');
    });

    it('layout edit mode still hides legacy widgets from display', () => {
        const placements = buildDefaultPlacements();
        const main = filterDisplayHomeWidgets(getWidgetsInZone(placements, 'main'), true);

        expect(main).not.toContain('dockNotepad');
        expect(main).not.toContain('dockVault');
        expect(main).toContain('dockRepository');
    });
});
