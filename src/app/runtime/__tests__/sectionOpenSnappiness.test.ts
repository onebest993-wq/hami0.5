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

    it('settings: Host دافئ = paint ثم flushSync؛ cold = flushSync ثم paint', () => {
        const src = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardSettings.ts'),
            'utf8',
        );
        expect(src).toContain('paintSettingsInstantChrome()');
        expect(src).toContain('hasSettingsOverlayHost()');
        expect(src).toContain('setSettingsHostMounted(true)');
        expect(src).toContain('setShowSettings(true)');
        expect(src).toContain('removeSettingsInstantBridge()');
        expect(src).toContain('flushSync');
        expect(src).toContain('openInFlightRef.current = false');
        expect(src).not.toMatch(
            /onDashboardInteractive\(\(\) => \{\s*armSettingsHost\(\)/,
        );
        expect(src).toContain('warmSettingsOnHover()');
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

    it('execution warm يقيّم ExecutionArchiveFileGrid فوراً', () => {
        const src = readFileSync(join(root, 'src/app/runtime/executionWorkspaceWarm.ts'), 'utf8');
        expect(src).toContain('ExecutionArchiveFileGrid');
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
