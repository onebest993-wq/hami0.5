import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('execution dossier radical instant — kill staged skeleton', () => {
    it('base scope يستخدم الكاش فوراً بلا double-rAF', () => {
        const src = readFileSync(
            join(
                root,
                'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreScopeAndChunk.ts',
            ),
            'utf8',
        );
        expect(src).toContain('getCachedExecutionDashboardBaseScopeBuilder');
        expect(src).toContain('loadAndCacheExecutionDashboardBaseScopeBuilder');
        expect(src).not.toContain('requestAnimationFrame(() => {\n            raf2 = requestAnimationFrame');
    });

    it('phoneBodyReady يتبع chunkDataReady مباشرة', () => {
        const src = readFileSync(
            join(
                root,
                'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardLazyChunkGates.ts',
            ),
            'utf8',
        );
        expect(src).toContain('const phoneBodyReady = overlayUrgent || chunkDataReady');
        expect(src).not.toContain('phoneBodyReadyDeferred');
    });

    it('secondary stage يبدأ جاهزاً (محتوى أول viewport فوري)', () => {
        const src = readFileSync(
            join(
                root,
                'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardPhoneBodyMountStages.ts',
            ),
            'utf8',
        );
        expect(src).toContain('useState(true)');
        expect(src).toMatch(/secondaryStageReady[\s\S]{0,40}useState\(true\)/);
    });

    it('Portal يحتفظ بمفتاح الملف لتبديل الإضبارة؛ keep-alive يمنع إعادة التركيب عند نفس الملف', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/ExecutionDashboardPortal.tsx'),
            'utf8',
        );
        expect(src).toContain('key={`exec-${file.id}`}');
        expect(src).toContain('open?: boolean');
        expect(src).toContain('execution-dashboard-portal-keepalive');
    });
});
