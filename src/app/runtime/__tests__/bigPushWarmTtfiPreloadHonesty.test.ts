import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('warm TTFI LD preload scheduling honesty', () => {
    it('mountApplication لا يحجب createRoot على InnerRuntime', () => {
        const mount = fs.readFileSync(path.join(root, 'src/boot/mountApplication.ts'), 'utf8');
        const mountFn = mount.slice(mount.indexOf('async function mountApplication'));
        const promiseAll =
            mountFn.match(/const \[appMod, ReactMod, ReactDOMMod\] = await[\s\S]*?Promise\.all\(\[([\s\S]*?)\]\)/)?.[1] ??
            '';
        expect(promiseAll).not.toContain('LawyerDashboardInnerRuntime');
        expect(mountFn).toMatch(/coldBoot[\s\S]*LawyerDashboardInnerRuntime/);
        const preload = fs.readFileSync(path.join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        expect(preload).toContain("import('@/app/components/lawyer/dashboard/LawyerDashboardInnerRuntime')");
    });

    it('index.tsx يبدأ preloadLawyerDashboardChunk عبر bootCriticalPreload', () => {
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        expect(index).toContain('kickoffBootCriticalPreload');
        const preload = fs.readFileSync(path.join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        expect(preload).toContain("import('@/app/bootstrap/lawyerDashboardChunk')");
        expect(preload).toContain('preloadLawyerDashboardChunk');
    });

    it('mountApplication لا يحجب createRoot على preload اللوحة', () => {
        const mount = fs.readFileSync(path.join(root, 'src/boot/mountApplication.ts'), 'utf8');
        const mountFn = mount.slice(mount.indexOf('async function mountApplication'));
        const promiseAll =
            mountFn.match(/const \[appMod, ReactMod, ReactDOMMod\] = await[\s\S]*?Promise\.all\(\[([\s\S]*?)\]\)/)?.[1] ??
            '';
        expect(promiseAll).toBeTruthy();
        expect(promiseAll).not.toContain('preloadLawyerDashboardChunk');
        expect(promiseAll).not.toContain('dashboardPreload');
        expect(mountFn.indexOf('createRoot(rootElement)')).toBeGreaterThan(
            mountFn.indexOf('Promise.all(['),
        );
    });

    it('LawyerDashboardGate يبدأ preloadLawyerDashboardChunk عند تقييم الوحدة', () => {
        const gate = fs.readFileSync(
            path.join(root, 'src/app/bootstrap/LawyerDashboardGate.tsx'),
            'utf8',
        );
        expect(gate).toContain('preloadLawyerDashboardChunk');
        expect(gate).toMatch(/typeof window[\s\S]*preloadLawyerDashboardChunk\(\)/);
    });

    it('AppResolvedRuntime و AppRuntimeShell يبدآن تحميل Shell/Gate عند تقييم الوحدة', () => {
        const resolved = fs.readFileSync(
            path.join(root, 'src/app/AppResolvedRuntime.tsx'),
            'utf8',
        );
        const shell = fs.readFileSync(path.join(root, 'src/app/AppRuntimeShell.tsx'), 'utf8');
        expect(resolved).toContain('appRuntimeShellPromise');
        expect(shell).toContain('lawyerDashboardGatePromise');
    });

    it('LawyerDashboardInner يمرّر مباشرة إلى Runtime/MainView بلا Suspense waterfall', () => {
        const inner = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInner.tsx'),
            'utf8',
        );
        const shell = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardQuantumShell.tsx'),
            'utf8',
        );
        const runtime = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInnerRuntime.tsx'),
            'utf8',
        );
        expect(inner).toContain("from '@/app/bootstrap/dashboardInteractiveMark'");
        expect(inner).not.toContain("from '@/app/bootstrap/bootMetrics'");
        expect(inner).toContain('markDashboardInteractiveOnce');
        expect(inner).toContain('LawyerDashboardInnerRuntime');
        expect(inner).not.toMatch(/\blazy\s*\(/);
        expect(inner).not.toMatch(/<Suspense/);
        expect(inner).toMatch(
            /import\s*\{[^}]*LawyerDashboardInnerRuntime[^}]*\}\s*from\s*'\.\/LawyerDashboardInnerRuntime'/,
        );
        expect(inner).not.toContain('CriminalDashboardBridgeProvider');
        expect(inner).not.toContain('useLawyerDashboardCore');
        expect(inner).not.toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(inner).not.toMatch(/<QuantumTasksProvider/);
        expect(shell).not.toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(shell).not.toMatch(/<QuantumTasksProvider/);
        expect(runtime).toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(runtime).toMatch(/<QuantumTasksProvider/);
        expect(runtime).toContain('LawyerSettingsProvider');
        expect(runtime).toMatch(
            /import \{ LawyerDashboardMainView \} from '\.\/LawyerDashboardMainView'/,
        );
        expect(runtime).not.toMatch(/lazyWithRetry\s*\(/);
        const preload = fs.readFileSync(path.join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        expect(preload).toContain('LawyerDashboardMainView');
        expect(preload).toContain('LawyerHomeHubCard');
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        expect(index).toContain('kickoffBootCriticalPreload');
        const viteCfg = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(viteCfg).toContain('boot-runtime');
        expect(viteCfg).toMatch(
            /resolveDependencies[\s\S]*?vendor-react\|boot-runtime/,
        );
    });

    it('تسخين الهيدر مؤجّل حتى boot-content-ready وبلا sync import لـ headerShellIntentWarm', () => {
        const chunk = fs.readFileSync(
            path.join(root, 'src/app/bootstrap/lawyerDashboardChunk.ts'),
            'utf8',
        );
        expect(chunk).toContain('armHeaderShellWarmAfterContentReady');
        expect(chunk).toContain('onBootContentReady');
        expect(chunk).toContain("from '@/app/bootstrap/bootReveal'");
        expect(chunk).not.toContain('armHeaderShellWarmAfterInteractive');
        expect(chunk).not.toContain("from '@/app/bootstrap/dashboardInteractiveMark'");
        expect(chunk).not.toContain("from '@/app/bootstrap/bootMetrics'");
        expect(chunk).toContain(
            "import('@/app/hooks/lawyerDashboard/headerShellIntentWarm')",
        );
        expect(chunk).not.toMatch(
            /import \{ preloadLawyerDashboardHeaderShellChunks \} from/,
        );
        expect(chunk).not.toMatch(
            /markChunkLoadedOnce\(\);\s*preloadLawyerDashboardHeaderShellChunks\(\);/,
        );
    });
});
