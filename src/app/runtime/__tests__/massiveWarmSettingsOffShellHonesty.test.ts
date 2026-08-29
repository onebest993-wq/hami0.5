import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('massive warm settings-off-shell honesty', () => {
    it('AppRuntimeShell بلا sync LawyerSettingsProvider / HamiBootOverlay', () => {
        const shell = fs.readFileSync(path.join(root, 'src/app/AppRuntimeShell.tsx'), 'utf8');
        expect(shell).not.toMatch(/import \{ LawyerSettingsProvider \}/);
        expect(shell).not.toMatch(/import \{ HamiBootOverlay \}/);
        expect(shell).toContain('LazyEnsureLawyerSettingsProvider');
        expect(shell).toContain('WithDeferredSettings');
        expect(shell).toContain('LazyLawyerDashboardGate');
    });

    it('LawyerSettingsBootProvider داخل Inner؛ FullBoot بلا Provider كامل؛ Ensure عند فتح الإعدادات', () => {
        const boot = fs.readFileSync(
            path.join(root, 'src/app/context/lawyerSettings/LawyerSettingsBootProvider.tsx'),
            'utf8',
        );
        const stem = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerDashboard.tsx'),
            'utf8',
        );
        const fullBoot = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardFullBootPath.tsx'),
            'utf8',
        );
        const inner = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInner.tsx'),
            'utf8',
        );
        expect(boot).toContain('LawyerSettingsContext.Provider');
        expect(boot).toContain('LawyerSettingsActionsContext.Provider');
        expect(boot).toContain("from '@/app/services/settings/pushPolicy'");
        expect(boot).not.toContain("from '@/app/services/settings/apply'");
        expect(boot).toContain('isBootOnly: true');
        expect(boot).toContain('subscribeLawyerSettingsLive');
        expect(inner).toContain('LawyerSettingsBootProvider');
        expect(inner).not.toContain('LawyerSettingsProvider');
        expect(fullBoot).not.toContain('LawyerSettingsProvider');
        expect(fullBoot).toContain('LawyerDashboardSettingsOverlayPortal');
        expect(fullBoot).not.toContain('QuantumTasksProvider');
        expect(fullBoot).toContain('primeQuantumTasksBootMetrics');
        const ensure = fs.readFileSync(
            path.join(root, 'src/app/context/lawyerSettings/LawyerSettingsProvider.tsx'),
            'utf8',
        );
        expect(ensure).toContain('!ctx.isBootOnly');
        const hami = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/HamiSettings/HamiSettingsApp.tsx'),
            'utf8',
        );
        expect(hami).toContain('EnsureLawyerSettingsProvider');
        expect(stem).not.toContain('markDashboardInteractiveOnce');
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
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInnerRuntime.tsx'),
            ),
        ).toBe(false);
    });

    it('useReduceMotion يقرأ DOM بلا LawyerSettingsContext', () => {
        const src = fs.readFileSync(path.join(root, 'src/app/hooks/useReduceMotion.ts'), 'utf8');
        expect(src).toContain('hamiReduceMotion');
        expect(src).toContain('hamiLite');
        expect(src).not.toMatch(/from ['"]@\/app\/context\/LawyerSettingsContext['"]/);
        expect(src).not.toContain('useLawyerSettings');
    });
});
