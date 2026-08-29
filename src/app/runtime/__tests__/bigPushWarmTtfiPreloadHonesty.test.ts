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
        /**
         * اللوحة لم تعد تُحمَّل مسبقاً داخل mountApplication إطلاقاً: كل طلب يسبق
         * await النواة يزاحم React وجذر التطبيق على نطاق الهاتف. القياس على Slow 4G
         * أعطى بدء إقلاع 3935 مللي بالمزاحمة و880 بدونها. المرحلة الثقيلة صارت
         * ملكاً لـ kickoffBootHeavyPreload بعد وصول المسار الحرج.
         */
        const beforeCoreAwait = mountFn.slice(0, mountFn.indexOf('const [appMod'));
        expect(beforeCoreAwait).not.toContain('LawyerDashboardInnerRuntime');
        expect(beforeCoreAwait).not.toContain('LawyerDashboardHomeTab');
        const preload = fs.readFileSync(path.join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        expect(preload).toContain('kickoffFirstTabPreload');
        expect(preload).not.toContain('prefetchLawyerDashboardMinimalBoot');
        expect(preload).not.toContain('LawyerDashboardMainView');
        expect(preload).toContain('prefetchLawyerDashboardInner');
        expect(preload).not.toMatch(/kickoffFirstTabPreload[\s\S]*LawyerDashboardQuantumShell/);
        expect(preload).not.toContain('deferInnerRuntimePreloadAfterBoot');
        expect(preload).not.toContain('innerRuntimeLoader');
        expect(preload).toContain('onBootContentReady');
    });

    it('index.tsx يبدأ stem اللوحة عبر shouldPreloadLawyerDashboardBoard ثم preload عبر bootCriticalPreload', () => {
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        expect(index).toContain('kickoffBootCriticalPreload');
        expect(index).toContain("import('@/app/runtime/lawyerDashboardLoader')");
        expect(index).toContain('loadLawyerDashboardModule');
        expect(index).toContain('shouldPreloadLawyerDashboardBoard');
        const stemIdx = index.indexOf("import('@/app/runtime/lawyerDashboardLoader')");
        const kickIdx = index.indexOf('kickoffBootCriticalPreload()');
        expect(kickIdx).toBeGreaterThan(stemIdx);
        const preload = fs.readFileSync(path.join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        expect(preload).toContain("from '@/app/bootstrap/lawyerDashboardChunk'");
        expect(preload).toContain('preloadLawyerDashboardChunk');
        expect(preload).toContain('shouldPreloadLawyerDashboardBoard');
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

    it('LawyerDashboardGate يسخّن اللوحة فقط عند shouldPreloadLawyerDashboardBoard', () => {
        const gate = fs.readFileSync(
            path.join(root, 'src/app/bootstrap/LawyerDashboardGate.tsx'),
            'utf8',
        );
        expect(gate).toContain('preloadLawyerDashboardChunk');
        expect(gate).toContain('shouldPreloadLawyerDashboardBoard');
        expect(gate).toContain('prefetchLawyerAuthLane');
        expect(gate).toContain('LawyerAuthLaneHost');
        expect(gate).not.toContain('useLawyerDashboardAuth');
        expect(gate).toMatch(/shouldPreloadLawyerDashboardBoard\(\)[\s\S]*preloadLawyerDashboardChunk/);
    });

    it('AppResolvedRuntime و AppRuntimeShell يبدآن تحميل Shell/Gate عبر loaders', () => {
        const resolved = fs.readFileSync(
            path.join(root, 'src/app/AppResolvedRuntime.tsx'),
            'utf8',
        );
        expect(resolved).toContain('LazyGlobalErrorBoundary');
        expect(resolved).not.toMatch(/import \{ GlobalErrorBoundary \}/);
        const shell = fs.readFileSync(path.join(root, 'src/app/AppRuntimeShell.tsx'), 'utf8');
        expect(resolved).toContain('loadAppRuntimeShellModule');
        expect(resolved).toContain('getAppRuntimeShellModuleSync');
        expect(shell).toContain('loadLawyerDashboardGateModule');
        expect(shell).toContain('getLawyerDashboardGateModuleSync');
    });

    it('LawyerDashboardInner يُعلِن مسار Minimal→Full بلا hop InnerRuntime؛ FullBoot يحمل orchestration', () => {
        const inner = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInner.tsx'),
            'utf8',
        );
        const shell = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardQuantumShell.tsx'),
            'utf8',
        );
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInnerRuntime.tsx'),
            ),
        ).toBe(false);
        expect(
            fs.existsSync(path.join(root, 'src/app/runtime/innerRuntimeLoader.ts')),
        ).toBe(false);
        const fullHost = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardFullOrchestrationHost.tsx',
            ),
            'utf8',
        );
        const fullBoot = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardFullBootPath.tsx'),
            'utf8',
        );
        const stem = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerDashboard.tsx'),
            'utf8',
        );
        expect(stem).not.toContain('markDashboardInteractiveOnce');
        expect(inner).not.toContain("from '@/app/bootstrap/dashboardInteractiveMark'");
        expect(inner).not.toContain("from '@/app/bootstrap/bootMetrics'");
        expect(inner).not.toContain('markDashboardInteractiveOnce');
        expect(inner).toContain('LawyerDashboardFullBootPath');
        expect(inner).not.toContain('LawyerDashboardStemInstantBridge');
        expect(inner).not.toContain('loadLawyerDashboardMinimalBoot');
        expect(inner).not.toContain('getLawyerDashboardMinimalBootSync');
        expect(inner).not.toContain('loadLawyerDashboardInnerRuntime');
        expect(inner).not.toContain('useLayoutEffect');
        expect(inner).not.toContain('PROFILE_PROMOTE_SHELL_EVENT');
        expect(inner).not.toContain('warmLawyerDashboardFirstTabChunks');
        expect(inner).not.toContain('LazyLawyerDashboardFullBootPath');
        expect(inner).not.toMatch(
            /import\s*\{[^}]*LawyerDashboardInnerRuntime[^}]*\}\s*from\s*'\.\/LawyerDashboardInnerRuntime'/,
        );
        expect(
            fs.existsSync(path.join(root, 'src/app/runtime/minimalBootLoader.ts')),
        ).toBe(false);
        expect(
            fs.existsSync(path.join(root, 'src/app/runtime/minimalHomeSurfaceLoader.ts')),
        ).toBe(false);
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMinimalBootPath.tsx'),
            ),
        ).toBe(false);
        expect(inner).not.toContain('CriminalDashboardBridgeProvider');
        expect(inner).not.toContain('useLawyerDashboardCore');
        expect(inner).not.toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(inner).not.toMatch(/<QuantumTasksProvider/);
        expect(shell).not.toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(shell).not.toMatch(/<QuantumTasksProvider/);
        expect(fullBoot).not.toMatch(/import\s*\{[^}]*QuantumTasksProvider/);
        expect(fullBoot).not.toMatch(/<QuantumTasksProvider/);
        expect(fullBoot).toContain('primeQuantumTasksBootMetrics');
        expect(inner).toContain('LawyerSettingsBootProvider');
        expect(inner).not.toContain('LawyerSettingsProvider');
        expect(fullBoot).not.toContain('LawyerSettingsProvider');
        expect(fullBoot).not.toContain('LawyerDashboardHomeFirstPaint');
        expect(fullHost).toContain('LawyerDashboardMainView');
        expect(fullHost).toContain('useLawyerDashboardCoreOrchestration');
        const preload = fs.readFileSync(path.join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        expect(preload).not.toContain('LawyerDashboardMainView');
        expect(preload).toContain('prefetchLawyerDashboardInner');
        expect(preload).not.toContain('prefetchLawyerDashboardMinimalBoot');
        const firstTabWarm = fs.readFileSync(
            path.join(root, 'src/app/runtime/lawyerDashboardFirstTabWarm.ts'),
            'utf8',
        );
        expect(firstTabWarm).toContain('LawyerDashboardMainView');
        expect(firstTabWarm).toContain('warmLawyerDashboardFullBootChunks');
        expect(preload).not.toContain('deferInnerRuntimePreloadAfterBoot');
        expect(preload).not.toContain('innerRuntimeLoader');
        expect(preload).not.toMatch(/import\('@\/app\/components\/lawyer\/LawyerHomeHubCard'\)/);
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
