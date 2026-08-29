import { describe, expect, it } from 'vitest';

import {
    applyCanonicalMainWidgetOrder,
    buildDefaultPlacements,
    consolidateLegacyRepositoryDock,
    defaultMainSpan,
    filterDisplayHomeWidgets,
    getWidgetsInZone,
    transferWidget,
} from '@/app/services/settings/homeWidgetPlacements';

describe('homeWidgetPlacements repository legacy', () => {
    it('default main order: forum first, then lawsuits, execution, transactions, tasks, calendar, repository', () => {
        const main = filterDisplayHomeWidgets(getWidgetsInZone(buildDefaultPlacements(), 'main'), false);
        expect(main).toEqual([
            'alerts',
            'forum',
            'hubLawsuit',
            'hubExecution',
            'hubTransaction',
            'dockTasks',
            'dockCalendar',
            'dockRepository',
        ]);
        expect(main[0]).toBe('alerts');
    });

    it('applyCanonicalMainWidgetOrder restores canonical main sequence', () => {
        const scrambled = applyCanonicalMainWidgetOrder({
            ...buildDefaultPlacements(),
            hubLawsuit: { zone: 'main', order: 6 },
            forum: { zone: 'main', order: 4 },
        });
        const main = getWidgetsInZone(scrambled, 'main');
        expect(main.indexOf('alerts')).toBe(0);
        expect(main.indexOf('forum')).toBe(1);
        expect(main.indexOf('forum')).toBeLessThan(main.indexOf('hubLawsuit'));
        expect(main.indexOf('hubLawsuit')).toBeLessThan(main.indexOf('hubExecution'));
        expect(main.indexOf('dockTasks')).toBeLessThan(main.indexOf('dockCalendar'));
        expect(main.indexOf('dockCalendar')).toBeLessThan(main.indexOf('dockRepository'));
        expect(main).toContain('alerts');
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

    it('defaultMainSpan is full-row for forum and alerts', () => {
        expect(defaultMainSpan('forum')).toBe(2);
        expect(defaultMainSpan('alerts')).toBe(2);
        expect(defaultMainSpan('hubLawsuit')).toBe(1);
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
