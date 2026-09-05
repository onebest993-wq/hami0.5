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

    it('موجات الجسم جاهزة فوراً — بلا تأخير 900/1800', () => {
        const src = readFileSync(
            join(
                root,
                'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardPhoneBodyMountStages.ts',
            ),
            'utf8',
        );
        expect(src).toMatch(/secondaryStageReady:\s*true/);
        expect(src).toMatch(/tertiaryStageReady:\s*true/);
        expect(src).toMatch(/quaternaryStageReady:\s*true/);
        expect(src).not.toContain(', 900)');
        expect(src).not.toContain(', 1_800)');
        expect(src).not.toContain('scheduleIdleWork');
    });

    it('Portal يحتفظ بمفتاح الملف لتبديل الإضبارة؛ keep-alive يمنع إعادة التركيب عند نفس الملف', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/ExecutionDashboardPortal.tsx'),
            'utf8',
        );
        expect(src).toContain('key={`exec-${file.id}`}');
        expect(src).toContain('open?: boolean');
        expect(src).toContain('if (!open) return null');
        expect(src).toContain('execution-dashboard-portal-open');
        expect(src).not.toContain('execution-dashboard-portal-keepalive');
    });

    it('ChunkHost يسخّن جسور المعالجات فور جاهزية الجسم', () => {
        const src = readFileSync(
            join(
                root,
                'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardChunkHost.tsx',
            ),
            'utf8',
        );
        expect(src).toContain("prefetchExecutionCoreHandlers('seizure-requests')");
        expect(src).not.toContain('scheduleIdleWork');
        expect(src).not.toContain(', 350)');
    });

    it('prefetch داخل الإضبارة فوري وليس بعد 350ms', () => {
        const src = readFileSync(
            join(
                root,
                'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreHandlerPrefetchEffects.ts',
            ),
            'utf8',
        );
        const paint = readFileSync(
            join(
                root,
                'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/prefetchExecutionHandlersForDossierPaint.ts',
            ),
            'utf8',
        );
        expect(src).toContain('prefetchExecutionHandlersForOpenDossier');
        expect(paint).toContain("prefetchExecutionCoreHandlers('seizure-requests')");
        expect(src).not.toContain(', 350)');
        expect(paint).not.toContain(', 350)');
    });

    it('التسخين الخامل بعد المنزل يتخطى lite؛ الفتح العاجل يحمّل الجسور', () => {
        const loader = readFileSync(
            join(root, 'src/app/runtime/executionDashboardLoader.ts'),
            'utf8',
        );
        expect(loader).toContain('prefetchExecutionDeepWarmChunks({ background: true })');
        expect(loader).toMatch(/case 'urgent':[\s\S]{0,900}prefetchExecutionDeepWarmChunks\(\)/);
        expect(loader).toMatch(/case 'intent':[\s\S]{0,700}prefetchExecutionDeepWarmChunks\(\)/);
    });
});
