import { describe, expect, it } from 'vitest';
import { resolveViewportShellScale } from '@/app/hooks/useViewportShellScale';
import { resolveDockShellMetrics, scaleDockShellMetrics } from '@/app/services/settings/dockShellLayout';

describe('resolveViewportShellScale', () => {
    it('keeps phone scale at 1', () => {
        expect(resolveViewportShellScale(390)).toBe(1);
        expect(resolveViewportShellScale(599)).toBe(1);
    });

    it('ramps scale for tablet widths', () => {
        expect(resolveViewportShellScale(600)).toBe(1.04);
        expect(resolveViewportShellScale(768)).toBe(1.06);
        expect(resolveViewportShellScale(1024)).toBe(1.08);
    });
});

describe('scaleDockShellMetrics', () => {
    it('returns same metrics when scale is 1', () => {
        const base = resolveDockShellMetrics(4);
        expect(scaleDockShellMetrics(base, 1)).toEqual(base);
    });

    it('scales dock icon box proportionally', () => {
        const base = resolveDockShellMetrics(4);
        const scaled = scaleDockShellMetrics(base, 1.06);
        expect(scaled.buttonBoxPx).toBe(Math.round(base.buttonBoxPx * 1.06));
        expect(scaled.rowMinHeightPx).toBeGreaterThan(base.rowMinHeightPx);
    });
});
