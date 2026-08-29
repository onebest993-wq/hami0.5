import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('execution archive surface prefetch (non-blocking)', () => {
    it('hubArchiveLoader يسخّن Surface/FileGrid بالخلفية', () => {
        const src = readFileSync(join(root, 'src/app/runtime/hubArchiveLoader.ts'), 'utf8');
        expect(src).toContain('function ensureExecutionSurfacePromise');
        expect(src).toContain('function ensureExecutionFileGridPromise');
        expect(src).toContain('prefetchExecutionArchiveContent');
        expect(src).not.toContain('withSoftSettle');
        expect(src).toContain('executionFileGridPromise = null');
        expect(src).toContain('executionSurfacePromise = null');
    });

    it('ArchivePortalHost يعتمد Component فور الكاش', () => {
        const host = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/ArchivePortalHost.tsx'),
            'utf8',
        );
        expect(host).toContain('getCachedExecutionSurface');
        expect(host).toContain('prefetchExecutionArchiveContent');
        expect(host).toContain('loadExecutionArchiveHubModule');
        expect(host).not.toContain('getExecutionSurfaceReady');
        expect(host).toContain('تعذّر تحميل مخزن التنفيذ');
    });

    it('OverlayEntry يركّب Surface مباشرة داخل InstantChrome — بلا InstantShell', () => {
        const entry = readFileSync(
            join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(entry).toContain('getCachedExecutionSurface');
        expect(entry).toContain('ensureExecutionArchiveOpenReady');
        expect(entry).toContain('boundaryKey');
        expect(entry).toContain('ArchivePortalExecutionSurface');
        expect(entry).toContain('lazy(() =>');
        expect(entry).not.toMatch(/import \{ ArchivePortalExecutionSurface \}/);
        expect(entry).toContain('ExecutionArchiveInstantBody');
        expect(entry).not.toContain('ArchivePortalHost');
        expect(entry).not.toContain('ArchiveHubInstantShell');
        expect(entry).not.toContain('جاري فتح');
        expect(entry).not.toContain('ExecutionArchiveShell');
    });

    it('ArchivePortalHost المضمّن لا يغطي InstantChrome بهيكل جاري الفتح', () => {
        const host = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/ArchivePortalHost.tsx'),
            'utf8',
        );
        expect(host).toContain("const inlineFrame = resolvedLoadingVariant === 'inline'");
        expect(host).toContain('if (inlineFrame)');
        expect(host).toContain('return null;');
    });

    it('MainView InstantChrome + Entry بلا بوابة armed', () => {
        const main = readLawyerDashboardMainViewSurface();
        expect(main).toContain('ExecutionArchiveInstantChrome');
        expect(main).not.toContain('executionEntryArmed');
    });

    it('ArchivePortal يفصل تنفيذ المخزن في مقطع كسول', () => {
        const portal = readFileSync(join(root, 'src/app/components/lawyer/ArchivePortal.tsx'), 'utf8');
        expect(portal).toContain('LazyArchivePortalExecutionSurface');
        expect(portal).toContain('ArchivePortalLawsuitSurface');
    });

    it('فتح التنفيذ يلتزم بالواجهة ثم يسلّح Host وprefetch', () => {
        const bundle = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/buildLawyerDashboardTabBundle.ts'),
            'utf8',
        );
        const execOpen = bundle.slice(bundle.indexOf("if (id === 'execution')"));
        expect(execOpen.indexOf("setArchiveType('execution')")).toBeGreaterThanOrEqual(0);
        expect(execOpen.indexOf('armExecutionArchiveHost')).toBeGreaterThan(
            execOpen.indexOf("setArchiveType('execution')"),
        );
        expect(execOpen.indexOf("hydrateArchiveHubForInstantOpen('execution')")).toBeGreaterThan(
            execOpen.indexOf("setArchiveType('execution')"),
        );
        expect(execOpen.indexOf('prefetchExecutionArchiveOpen')).toBeGreaterThan(
            execOpen.indexOf("setArchiveType('execution')"),
        );
    });
});
