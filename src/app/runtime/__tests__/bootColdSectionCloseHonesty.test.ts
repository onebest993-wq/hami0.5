import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('boot cold section close honesty', () => {
    it('index يسخّن Shell + Gate + ttfi-mark + LD بعد App/React وقبل createRoot', () => {
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        const mount = index.match(/async function mountApplication[\s\S]*?^}/m)?.[0];
        expect(mount).toBeTruthy();
        const promiseAllIdx = mount!.indexOf('Promise.all');
        const createRootIdx = mount!.indexOf('createRoot(rootElement)');
        expect(promiseAllIdx).toBeGreaterThan(-1);
        expect(createRootIdx).toBeGreaterThan(promiseAllIdx);
        for (const needle of [
            "import('@/app/AppRuntimeShell')",
            "import('@/app/bootstrap/LawyerDashboardGate')",
            "import('@/app/bootstrap/dashboardInteractiveMark')",
            'preloadLawyerDashboardChunk',
        ]) {
            const idx = mount!.indexOf(needle);
            expect(idx, needle).toBeGreaterThan(promiseAllIdx);
            expect(idx, needle).toBeLessThan(createRootIdx);
        }
    });

    it('مهام الخلفية الثقيلة بعد mountApplication لا قبل interactive', () => {
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        expect(index).toContain('runBackgroundBootTasks');
        expect(index).toMatch(
            /void mountApplication\(\)\.finally\(\(\)\s*=>\s*\{\s*runBackgroundBootTasks\(\);/,
        );
        expect(index).toContain('SecureStoreService.kickoffBootShellSync');
        const bg = index.slice(index.indexOf('function runBackgroundBootTasks'));
        const mountCall = index.indexOf('void mountApplication()');
        expect(index.indexOf('function runBackgroundBootTasks')).toBeLessThan(mountCall);
        expect(bg).toContain("import('@/app/bootstrap/deferredBoot')");
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

    it('vite: ttfi-mark معزول عن boot-reveal وpreload داخل vendor-react', () => {
        const viteCfg = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(viteCfg).toContain('dashboardInteractiveMark');
        expect(viteCfg).toContain('app-ttfi-mark');
        expect(viteCfg.indexOf('app-ttfi-mark')).toBeLessThan(
            viteCfg.indexOf("return 'app-boot-reveal'"),
        );
        expect(viteCfg).toMatch(/vite\/preload-helper[\s\S]*?return 'vendor-react'/);
    });
});
