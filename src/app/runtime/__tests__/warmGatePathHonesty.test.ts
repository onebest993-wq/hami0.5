import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('warm path stem cuts honesty', () => {
    it('lawyerDashboardChunk بلا bootMetrics→debug على مسار Gate', () => {
        const chunk = fs.readFileSync(
            path.join(root, 'src/app/bootstrap/lawyerDashboardChunk.ts'),
            'utf8',
        );
        expect(chunk).not.toContain("from '@/app/bootstrap/bootMetrics'");
        expect(chunk).not.toContain("from '@/app/utils/debug'");
        expect(chunk).toContain('hami:boot:dashboard-chunk-loaded');
        expect(chunk).toContain('onBootContentReady');
    });

    it('AppResolvedRuntime يحمّل HamiBootOverlay بشكل lazy فقط', () => {
        const src = fs.readFileSync(path.join(root, 'src/app/AppResolvedRuntime.tsx'), 'utf8');
        expect(src).not.toMatch(/import \{ HamiBootOverlay \}/);
        expect(src).toContain("import('@/app/bootstrap/HamiBootOverlay')");
        expect(src).toContain('LazyHamiBootOverlay');
    });
});
