import { describe, expect, it } from 'vitest';

import { buildDefaultPlacements, getWidgetZone, getWidgetsInZone, transferWidget } from '@/app/services/settings/homeWidgetPlacements';

import {
    ensureQuickNoteDockPlacement,
    evacuateDockShellIconsToMain,
    repopulateDockShellFromHidden,
} from '@/app/services/settings/homeLayoutDockControls';

describe('homeLayoutDockControls', () => {
    it('evacuateDockShellIconsToMain moves shell icons but keeps dockQuickNote and legacy repository widgets in dock', () => {
        const placements = buildDefaultPlacements();
        const { placements: next, dockHiddenWidgetIds } = evacuateDockShellIconsToMain(placements);

        expect(dockHiddenWidgetIds).not.toContain('dockQuickNote');
        expect(dockHiddenWidgetIds).not.toContain('dockVault');
        expect(dockHiddenWidgetIds).not.toContain('dockNotepad');
        expect(getWidgetsInZone(next, 'dock')).toContain('dockQuickNote');
        expect(getWidgetsInZone(next, 'dock')).toContain('dockVault');
        expect(getWidgetsInZone(next, 'dock')).toContain('dockNotepad');
        expect(getWidgetsInZone(next, 'main')).toContain('dockRepository');
    });

    it('repopulateDockShellFromHidden restores shell icons only', () => {
        const placements = buildDefaultPlacements();
        const evacuated = evacuateDockShellIconsToMain(placements);
        const restored = repopulateDockShellFromHidden(
            evacuated.placements,
            evacuated.dockHiddenWidgetIds,
        );

        expect(getWidgetsInZone(restored, 'dock')).toContain('dockVault');
        expect(getWidgetsInZone(restored, 'dock')).toContain('dockQuickNote');
    });

    it('ensureQuickNoteDockPlacement keeps quick note in main when user separated it', () => {
        const placements = buildDefaultPlacements();
        const inMain = transferWidget(placements, 'dockQuickNote', 'main', 5);
        const next = ensureQuickNoteDockPlacement(inMain);
        expect(getWidgetZone(next, 'dockQuickNote')).toBe('main');
        expect(getWidgetsInZone(next, 'dock')).not.toContain('dockQuickNote');
    });

    it('ensureQuickNoteDockPlacement adds quick note to dock when missing from placements', () => {
        const placements = { ...buildDefaultPlacements() };
        const { dockQuickNote: _removed, ...withoutQuickNote } = placements;
        const next = ensureQuickNoteDockPlacement(withoutQuickNote as typeof placements);
        expect(getWidgetsInZone(next, 'dock')).toContain('dockQuickNote');
    });
});
