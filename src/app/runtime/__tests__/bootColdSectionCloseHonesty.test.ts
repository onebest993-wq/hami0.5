import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('boot cold section close honesty', () => {
    it('index يسخّن Shell + Gate + ttfi-mark + LD بعد App/React وقبل createRoot', () => {
        const mount = fs.readFileSync(path.join(root, 'src/boot/mountApplication.ts'), 'utf8');
        const promiseAllIdx = mount.indexOf('Promise.all');
        const createRootIdx = mount.indexOf('createRoot(rootElement)');
        expect(promiseAllIdx).toBeGreaterThan(-1);
        expect(createRootIdx).toBeGreaterThan(promiseAllIdx);
        for (const needle of [
            "import('@/app/AppRuntimeShell')",
            "import('@/app/bootstrap/LawyerDashboardGate')",
            "import('@/app/bootstrap/dashboardInteractiveMark')",
            'preloadLawyerDashboardChunk',
        ]) {
            const idx = mount.indexOf(needle);
            expect(idx, needle).toBeGreaterThan(promiseAllIdx);
            expect(idx, needle).toBeLessThan(createRootIdx);
        }
    });

    it('مهام الخلفية الثقيلة بعد mountApplication لا قبل interactive', () => {
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        expect(index).toContain("import('@/boot/mountApplication')");
        expect(index).toContain('startApplicationBoot');
        const mount = fs.readFileSync(path.join(root, 'src/boot/mountApplication.ts'), 'utf8');
        expect(mount).toContain('runBackgroundBootTasks');
        expect(mount).toMatch(/startApplicationBoot[\s\S]*runBackgroundBootTasks/);
        expect(mount).toContain("import('@/app/bootstrap/deferredBoot')");
    });

    it('QuantumShell رقيق — Provider بعد mark داخل InnerRuntime', () => {
        const shell = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardQuantumShell.tsx'),
            'utf8',
        );
        const inner = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInner.tsx'),
            'utf8',
        );
        const runtime = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInnerRuntime.tsx'),
            'utf8',
        );
        expect(shell).not.toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(shell).not.toMatch(/<QuantumTasksProvider/);
        expect(inner).toContain('markDashboardInteractiveOnce');
        expect(inner).toContain("from '@/app/bootstrap/dashboardInteractiveMark'");
        expect(inner).not.toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(runtime).toMatch(/<QuantumTasksProvider/);
    });

    it('vite: modulePreload يحمّل vendor-react و boot-runtime فقط (vendor-misc عند الطلب)', () => {
        const viteCfg = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(viteCfg).toMatch(/resolveDependencies[\s\S]*?vendor-react\|boot-runtime/);
        expect(viteCfg).toContain("return 'vendor-react'");
    });
});
