import { describe, expect, it } from 'vitest';
import {
    computeDockPlacementIndex,
    computeMainVisualIndex,
    visualIndexToPlacementIndex,
    type WidgetRectEntry,
} from './homeLayoutDragUtils';
import type { HomeWidgetId } from '@/app/services/settings/homeLayout';

function rect(
    id: HomeWidgetId,
    left: number,
    top: number,
    width: number,
    height: number,
): WidgetRectEntry {
    return { id, rect: { left, top, right: left + width, bottom: top + height, width, height } as DOMRect };
}

describe('computeMainVisualIndex', () => {
    it('returns 0 for empty list', () => {
        expect(computeMainVisualIndex(100, 100, [])).toBe(0);
    });

    it('inserts before first row when pointer is above', () => {
        const items = [rect('alerts', 20, 100, 360, 80)];
        expect(computeMainVisualIndex(200, 60, items)).toBe(0);
    });

    it('appends when pointer is below last row', () => {
        const items = [
            rect('alerts', 20, 100, 360, 80),
            rect('forum', 20, 200, 360, 60),
        ];
        expect(computeMainVisualIndex(200, 400, items)).toBe(2);
    });

    it('inserts in gap between rows', () => {
        const items = [
            rect('alerts', 20, 100, 360, 80),
            rect('forum', 20, 240, 360, 60),
        ];
        expect(computeMainVisualIndex(200, 200, items)).toBe(1);
    });

    it('respects RTL ordering within a row', () => {
        const items = [
            rect('hubLawsuit', 20, 100, 170, 120),
            rect('hubTransaction', 210, 100, 170, 120),
        ];
        expect(computeMainVisualIndex(300, 150, items)).toBe(0);
        expect(computeMainVisualIndex(100, 150, items)).toBe(2);
    });
});

describe('visualIndexToPlacementIndex', () => {
    it('maps visual order to stored placement order', () => {
        const items = [
            rect('hubLawsuit', 210, 100, 170, 120),
            rect('hubTransaction', 20, 100, 170, 120),
        ];
        const order: HomeWidgetId[] = ['hubTransaction', 'hubLawsuit'];
        expect(visualIndexToPlacementIndex('main', 0, items, order)).toBe(1);
        expect(visualIndexToPlacementIndex('main', 1, items, order)).toBe(0);
        expect(visualIndexToPlacementIndex('main', 2, items, order)).toBe(2);
    });
});

describe('computeDockPlacementIndex', () => {
    it('appends at end when x is far left in RTL dock shell', () => {
        const items = [
            rect('dockNotepad', 280, 800, 70, 70),
            rect('dockCalendar', 200, 800, 70, 70),
        ];
        expect(computeDockPlacementIndex(50, 830, items, ['dockNotepad', 'dockCalendar'])).toBe(2);
    });

    it('inserts after last shell icon before quick note in placement order', () => {
        const items = [
            rect('dockNotepad', 280, 800, 70, 70),
            rect('dockQuickNote', 20, 760, 360, 40),
        ];
        expect(computeDockPlacementIndex(50, 830, items, ['dockNotepad', 'dockQuickNote'])).toBe(1);
    });
});
