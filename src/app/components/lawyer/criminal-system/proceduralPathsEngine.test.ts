import { describe, expect, it } from 'vitest';
import { normalizeProceduralPaths, sortPathStepsChronologically } from './proceduralPathsEngine';

describe('proceduralPathsEngine', () => {
    it('normalizes paths and sorts steps by date', () => {
        const paths = normalizeProceduralPaths([
            {
                id: 'p1',
                name: 'مسار طب عدلي',
                color: '#38bdf8',
                items: [
                    { id: 's2', title: 'ب', date: '2026-05-20', status: 'in_progress' },
                    { id: 's1', title: 'أ', date: '2026-05-10', status: 'done' },
                ],
            },
        ]);
        expect(paths).toHaveLength(1);
        expect(paths[0]!.items.map((s) => s.id)).toEqual(['s1', 's2']);
    });

    it('sortPathStepsChronologically orders ascending', () => {
        const sorted = sortPathStepsChronologically([
            { id: 'b', title: 'b', date: '2026-06-01', status: 'in_progress' },
            { id: 'a', title: 'a', date: '2026-01-01', status: 'done' },
        ]);
        expect(sorted[0]!.id).toBe('a');
    });
});
