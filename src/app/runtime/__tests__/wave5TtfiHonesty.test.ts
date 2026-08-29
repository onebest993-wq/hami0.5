import { describe, expect, it } from 'vitest';
import { expectJsonOrRetired, expectTextOrRetired } from './retiredCursorArtifact';

describe('wave5 TTFI honesty contract', () => {
    it('بروتوكول Wave 5 موجود ويمنع MET كاذب بدون قياس — أو المتتبّع متقاعد', () => {
        expectTextOrRetired('.cursor/wave5-ttfi-protocol.md', (t) => {
            expect(t).toContain('≤220');
            expect(t).toContain('≤150');
            expect(t).toMatch(/OPEN/i);
            expect(t).toContain('InstantShell');
        });
    });

    it('إغلاق Wave 5 يعلن overallTtfiGate بصدق من الأرقام — أو المتتبّع متقاعد', () => {
        expectJsonOrRetired<{
            ttfi: {
                coldMedianMs: number;
                coldStatus: string;
                warmMedianMs: number;
                warmStatus: string;
                overallTtfiGate: string;
            };
            namedChunks: { status: string; LawyerDashboardRawKb: number };
            foundationWorldClassSealed: boolean;
        }>('.cursor/wave5-perf-close.json', (close) => {
            expect(close.foundationWorldClassSealed).toBe(false);
            expect(close.ttfi.coldMedianMs).toBeLessThanOrEqual(220);
            expect(close.ttfi.coldStatus).toBe('MET');
            expect(close.ttfi.warmMedianMs).toBeGreaterThan(150);
            expect(close.ttfi.warmStatus).toBe('OPEN');
            expect(close.ttfi.overallTtfiGate).toBe('OPEN');
            expect(close.namedChunks.LawyerDashboardRawKb).toBeGreaterThan(200);
            expect(close.namedChunks.status).toBe('OPEN');
        });
    });

    it('عيّنات cold و warm محفوظة تحت perf-reports/wave5-* — أو متقاعدة', () => {
        for (const f of ['wave5-cold-1.json', 'wave5-cold-2.json', 'wave5-cold-3.json', 'wave5-warm.json']) {
            expectJsonOrRetired(`perf-reports/${f}`, () => undefined);
        }
    });
});
