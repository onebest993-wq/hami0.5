import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('section open snappiness — settings/home/execution', () => {
    it('stubs لا تركّب fieldTasks Host قبل التسليح؛ الإعدادات خارج الجزيرة', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/createDeferredFeatureStubs.ts'),
            'utf8',
        );
        expect(src).not.toContain('settingsHostMounted');
        expect(src).toMatch(/fieldTasksHostMounted:\s*false/);
    });

    it('settingsHostMounted يبدأ من الجلسة فقط؛ lifecycle عند interactive', () => {
        const src = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardSettings.ts'),
            'utf8',
        );
        expect(src).toContain('useSettingsHostLifecycle');
        expect(src).toContain('commitSettingsShellOpen');
        expect(src).not.toContain('flushSync(() => {\n            setShowSettings(false)');
    });

    it('settings: paint فوري ثم rAF أو flushSync عبر commitSettingsShellOpen', () => {
        const flow = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/settings/settingsShellOpenFlow.ts'),
            'utf8',
        );
        expect(flow).toContain('paintSettingsInstantChrome');
        expect(flow).toContain('requestAnimationFrame');
        expect(flow).toContain('flushSync');
    });

    it('PostInteractive يؤخّر التسليح بعد interactive', () => {
        const src = readFileSync(
            join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardPostInteractiveRuntime.tsx',
            ),
            'utf8',
        );
        expect(src).toContain('requestIdleCallback');
        expect(src).toContain('setTimeout');
        expect(src).not.toMatch(
            /useEffect\(\(\) => onDashboardInteractive\(\(\) => setArmed\(true\)\), \[\]\)/,
        );
    });

    it('execution warm يقيّم أول paint للإضبارة فوراً', () => {
        const src = readFileSync(join(root, 'src/app/runtime/executionWorkspaceWarm.ts'), 'utf8');
        expect(src).toContain('ensureExecutionDossierFirstPaintReady');
        expect(src).toContain('primeExecutionDossierSurface');
    });

    it('MainView underlay inert عبر DOM وليس inertProps على كل فتح', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(src).toContain('underlayRef');
        expect(src).toContain("setAttribute('inert'");
        expect(src).not.toContain('inertProps(settingsOpen)');
    });
});
