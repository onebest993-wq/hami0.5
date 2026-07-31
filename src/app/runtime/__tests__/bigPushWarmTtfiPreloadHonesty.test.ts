import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('warm TTFI LD preload scheduling honesty', () => {
    it('index.tsx يبدأ preloadLawyerDashboardChunk بعد App/React وقبل createRoot', () => {
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        expect(index).toContain("import('@/app/bootstrap/lawyerDashboardChunk')");
        expect(index).toContain('preloadLawyerDashboardChunk');
        expect(index).toContain("import('@/app/AppRuntimeShell')");
        expect(index).toContain("import('@/app/bootstrap/LawyerDashboardGate')");
        const mount = index.match(/async function mountApplication[\s\S]*?^}/m)?.[0];
        expect(mount).toBeTruthy();
        const promiseAllIdx = mount!.indexOf('Promise.all');
        const preloadIdx = mount!.indexOf('preloadLawyerDashboardChunk');
        const createRootCallIdx = mount!.indexOf('createRoot(rootElement)');
        expect(promiseAllIdx).toBeGreaterThan(-1);
        expect(preloadIdx).toBeGreaterThan(promiseAllIdx);
        expect(createRootCallIdx).toBeGreaterThan(preloadIdx);
        expect(mount!.indexOf("import('@/app/AppRuntimeShell')")).toBeGreaterThan(promiseAllIdx);
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

    it('LawyerDashboardInner قشرة TTFI رقيقة ثم Runtime lazy (بلا Bridge/Core/Quantum sync)', () => {
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
        expect(inner).toContain('LazyLawyerDashboardInnerRuntime');
        expect(inner).toContain("import('./LawyerDashboardInnerRuntime')");
        expect(inner).toMatch(/from 'react'/);
        expect(inner).toMatch(/\blazy\s*\(/);
        expect(inner).not.toMatch(/import\s*\{[^}]*lazyWithRetry/);
        expect(inner).not.toMatch(/lazyWithRetry\s*\(/);
        expect(inner).not.toContain('CriminalDashboardBridgeProvider');
        expect(inner).not.toContain('useLawyerDashboardCore');
        expect(inner).not.toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(inner).not.toMatch(/<QuantumTasksProvider/);
        expect(inner).not.toMatch(
            /import \{ LawyerDashboardMainView \} from '\.\/LawyerDashboardMainView'/,
        );
        expect(shell).not.toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(shell).not.toMatch(/<QuantumTasksProvider/);
        expect(runtime).toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(runtime).toMatch(/<QuantumTasksProvider/);
        expect(runtime).toContain('LawyerSettingsProvider');
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        expect(index).toContain("import('@/app/bootstrap/dashboardInteractiveMark')");
        const viteCfg = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(viteCfg).toContain('vite/preload-helper');
        expect(viteCfg).toMatch(
            /vite\/preload-helper[\s\S]*?return 'vendor-react'/,
        );
        expect(viteCfg).toContain('dashboardInteractiveMark');
        expect(viteCfg).toContain('app-ttfi-mark');
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
