import { describe, expect, it } from 'vitest';

import {
    buildDefaultPlacements,
    consolidateLegacyRepositoryDock,
    filterDisplayHomeWidgets,
    getWidgetsInZone,
    transferWidget,
} from '@/app/services/settings/homeWidgetPlacements';

describe('homeWidgetPlacements repository legacy', () => {
    it('default layout hides dockNotepad and dockVault from display', () => {
        const placements = buildDefaultPlacements();
        const main = filterDisplayHomeWidgets(getWidgetsInZone(placements, 'main'), false);
        const dock = filterDisplayHomeWidgets(getWidgetsInZone(placements, 'dock'), false);

        expect(main).not.toContain('dockNotepad');
        expect(main).not.toContain('dockVault');
        expect(dock).not.toContain('dockNotepad');
        expect(dock).not.toContain('dockVault');
        expect(dock).toContain('dockRepository');
    });

    it('consolidateLegacyRepositoryDock stashes legacy widgets when dockRepository exists', () => {
        const placements = transferWidget(buildDefaultPlacements(), 'dockNotepad', 'main', 5);
        const next = consolidateLegacyRepositoryDock(placements);

        expect(getWidgetsInZone(next, 'main')).not.toContain('dockNotepad');
        expect(getWidgetsInZone(next, 'dock')).toContain('dockNotepad');
        expect(getWidgetsInZone(next, 'dock')).toContain('dockRepository');
    });

    it('layout edit mode keeps legacy widgets available in placements', () => {
        const placements = buildDefaultPlacements();
        const dock = filterDisplayHomeWidgets(getWidgetsInZone(placements, 'dock'), true);

        expect(dock).toContain('dockNotepad');
        expect(dock).toContain('dockVault');
    });
});
