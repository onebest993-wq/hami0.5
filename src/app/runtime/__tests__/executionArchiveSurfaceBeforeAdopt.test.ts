import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('execution archive surface prefetch (non-blocking)', () => {
    it('hubArchiveLoader يسخّن Surface/FileGrid بالخلفية', () => {
        const src = readFileSync(join(root, 'src/app/runtime/hubArchiveLoader.ts'), 'utf8');
        expect(src).toContain('function ensureExecutionSurfacePromise');
        expect(src).toContain('function ensureExecutionFileGridPromise');
        expect(src).toContain('prefetchExecutionArchiveContent');
        expect(src).toContain('withSoftSettle');
    });

    it('ArchivePortalHost يعتمد Component فور الكاش', () => {
        const host = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/ArchivePortalHost.tsx'),
            'utf8',
        );
        expect(host).toContain('ArchivePortalExecutionSurface');
        expect(host).toContain('prefetchExecutionArchiveContent');
        expect(host).not.toContain('getExecutionSurfaceReady');
        expect(host).toContain('تعذّر تحميل مخزن التنفيذ');
    });

    it('OverlayEntry يستخدم جلسة الفتح للـ prefetch/retry فقط', () => {
        const entry = readFileSync(
            join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(entry).toContain('ensureExecutionArchiveOpenReady');
        expect(entry).toContain('boundaryKey');
        expect(entry).not.toContain('ExecutionArchiveShell');
    });

    it('MainView InstantChrome + Entry بلا بوابة armed', () => {
        const main = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(main).toContain('ExecutionArchiveInstantChrome');
        expect(main).not.toContain('executionEntryArmed');
    });

    it('ArchivePortal يركّب ExecutionSurface sync بلا Suspense', () => {
        const portal = readFileSync(join(root, 'src/app/components/lawyer/ArchivePortal.tsx'), 'utf8');
        expect(portal).toContain('ArchivePortalExecutionSurface');
        expect(portal).not.toMatch(/\blazy\b/);
        expect(portal).not.toMatch(/from ['"]react['"].*Suspense|Suspense,\s*lazy|<Suspense/);
    });

    it('فتح التنفيذ يسلّح Host ثم prefetch قبل setArchiveType', () => {
        const bundle = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/buildLawyerDashboardTabBundle.ts'),
            'utf8',
        );
        const execOpen = bundle.slice(bundle.indexOf("if (id === 'execution')"));
        expect(execOpen.indexOf('armExecutionArchiveHost')).toBeGreaterThanOrEqual(0);
        expect(execOpen.indexOf('prefetchExecutionArchiveOpen')).toBeGreaterThanOrEqual(0);
        expect(execOpen.indexOf("setArchiveType('execution')")).toBeGreaterThan(
            execOpen.indexOf('armExecutionArchiveHost'),
        );
    });
});
