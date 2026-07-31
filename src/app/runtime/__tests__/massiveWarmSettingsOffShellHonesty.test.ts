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

    it('LawyerSettingsProvider داخل InnerRuntime بعد mark', () => {
        const runtime = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInnerRuntime.tsx'),
            'utf8',
        );
        const inner = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInner.tsx'),
            'utf8',
        );
        expect(runtime).toContain('LawyerSettingsProvider');
        expect(runtime).toContain('QuantumTasksProvider');
        expect(inner).not.toContain('LawyerSettingsProvider');
        expect(inner).toContain('markDashboardInteractiveOnce');
    });

    it('useReduceMotion يقرأ DOM بلا LawyerSettingsContext', () => {
        const src = fs.readFileSync(path.join(root, 'src/app/hooks/useReduceMotion.ts'), 'utf8');
        expect(src).toContain('hamiReduceMotion');
        expect(src).toContain('hamiLite');
        expect(src).not.toMatch(/from ['"]@\/app\/context\/LawyerSettingsContext['"]/);
        expect(src).not.toContain('useLawyerSettings');
    });
});
