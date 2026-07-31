import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('phase-5 core polish', () => {
    it('لا يصدّر warmLawsuitArchiveUntilReady الميت', () => {
        const src = readFileSync(
            join(process.cwd(), 'src/app/runtime/lawsuitWorkspaceWarm.ts'),
            'utf8',
        );
        expect(src).not.toContain('warmLawsuitArchiveUntilReady');
    });

    it('CaseArchiveInstantFallback محذوف بعد رفع Host', () => {
        expect(() =>
            readFileSync(
                join(
                    process.cwd(),
                    'src/app/components/lawyer/dashboard/overlay-sections/CaseArchiveInstantFallback.tsx',
                ),
                'utf8',
            ),
        ).toThrow();
    });

    it('lawsuitOpenContract يسخّن بوابة SmartFile', () => {
        const src = readFileSync(
            join(process.cwd(), 'src/app/runtime/lawsuitOpenContract.ts'),
            'utf8',
        );
        expect(src).toContain('prefetchSmartFileModalPortal');
        expect(src).toContain('prefetchSmartFileModalPhased');
    });
});
