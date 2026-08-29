import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('boot cold section close honesty', () => {
    it('mountApplication لا يحجب createRoot على Shell/Gate — يُحمَّلان من bootCriticalPreload', () => {
        const mount = fs.readFileSync(path.join(root, 'src/boot/mountApplication.ts'), 'utf8');
        const mountFn = mount.slice(mount.indexOf('async function mountApplication'));
        const promiseAllIdx = mountFn.indexOf('Promise.all');
        const createRootIdx = mountFn.indexOf('createRoot(rootElement)');
        expect(promiseAllIdx).toBeGreaterThan(-1);
        expect(createRootIdx).toBeGreaterThan(promiseAllIdx);
        const promiseAll =
            mountFn.match(/Promise\.all\(\[([\s\S]*?)\]\)/)?.[1] ?? '';
        expect(promiseAll).not.toContain("import('@/app/runtime/appRuntimeShellLoader')");
        expect(promiseAll).not.toContain("import('@/app/runtime/lawyerDashboardGateLoader')");
        expect(promiseAll).not.toContain('preloadLawyerDashboardChunk');
        expect(mountFn).not.toContain('preloadHomeDockBootChunk');
        const preload = fs.readFileSync(path.join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        expect(preload).toContain('loadAppRuntimeShellModule');
        expect(preload).toContain('loadLawyerDashboardGateModule');
    });

    it('مهام الخلفية الثقيلة بعد mountApplication لا قبل interactive', () => {
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        expect(index).not.toContain("import('@/boot/mountApplication')");
        const preload = fs.readFileSync(path.join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        expect(preload).toContain('startApplicationBoot');
        const mount = fs.readFileSync(path.join(root, 'src/boot/mountApplication.ts'), 'utf8');
        expect(mount).toContain('runBackgroundBootTasks');
        expect(mount).toMatch(/startApplicationBoot[\s\S]*runBackgroundBootTasks/);
        expect(mount).toContain('discardPendingLawyerDashboardHeaderIntent');
        expect(mount).toContain("import('@/app/bootstrap/deferredBoot')");
    });

    it('QuantumShell رقيق — FullBoot بلا QuantumTasksProvider ساكن', () => {
        const shell = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardQuantumShell.tsx'),
            'utf8',
        );
        const inner = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInner.tsx'),
            'utf8',
        );
        const stem = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerDashboard.tsx'),
            'utf8',
        );
        expect(shell).not.toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(shell).not.toMatch(/<QuantumTasksProvider/);
        expect(stem).not.toContain('markDashboardInteractiveOnce');
        expect(stem).not.toContain("from '@/app/bootstrap/dashboardInteractiveMark'");
        expect(inner).not.toContain('markDashboardInteractiveOnce');
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMinimalBootPath.tsx'),
            ),
        ).toBe(false);
        const gridGate = fs.readFileSync(
            path.join(root, 'src/app/bootstrap/homeMainGridPaintGate.ts'),
            'utf8',
        );
        expect(gridGate).toContain('markDashboardInteractiveOnce');
        expect(inner).not.toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        const fullBoot = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardFullBootPath.tsx'),
            'utf8',
        );
        expect(fullBoot).not.toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(fullBoot).not.toMatch(/<QuantumTasksProvider/);
        expect(fullBoot).toContain('primeQuantumTasksBootMetrics');
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInnerRuntime.tsx'),
            ),
        ).toBe(false);
    });

    it('vite: modulePreload يحمّل vendor-react و boot-runtime فقط (vendor-misc عند الطلب)', () => {
        const viteCfg = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(viteCfg).toMatch(/resolveDependencies[\s\S]*?vendor-react\|boot-runtime/);
        expect(viteCfg).toContain("return 'vendor-react'");
    });
});
