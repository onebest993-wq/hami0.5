import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('phase-15 section-first-open cuts', () => {
    it('tabBundle يفتح الدعاوى بلا secondary عاجل', () => {
        const src = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/buildLawyerDashboardTabBundle.ts'),
            'utf8',
        );
        expect(src).toContain("import('@/app/utils/lazyComponentsIntent')");
        expect(src).not.toContain("from '@/app/utils/lazyComponentsIntent'");
        expect(src).toContain('includeSecondary: false');
        expect(src).toMatch(/warmLawsuitWorkspaceIntent\(\{[^}]*includeSecondary:\s*false/);
        expect(src).toMatch(/warmExecutionWorkspaceIntent\(\{[^}]*includeSecondary:\s*false/);
    });

    it('LawsuitsWorkspaceHost يؤجل SmartFile/NewCase بمهلة صلبة (لا idle مبكر)', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawsuitsWorkspaceHost.tsx'),
            'utf8',
        );
        expect(src).toContain('scheduleSecondaryLawsuitWarm');
        expect(src).toContain('prefetchSmartFileModalPhased');
        expect(src).toContain('5_000');
        expect(src).not.toMatch(
            /scheduleSecondaryLawsuitWarm[\s\S]{0,200}requestIdleCallback/,
        );
        expect(src).not.toMatch(
            /primeCivilArchiveCore[\s\S]{0,200}prefetchLawyerNewCaseModule\(\);\s*prefetchSmartFileModalPhased\(\);/,
        );
    });

    it('lazyComponents.warmLawsuitWorkspace يفوض إلى runtime warm', () => {
        const src = readFileSync(join(root, 'src/app/utils/lazyComponents.tsx'), 'utf8');
        expect(src).toContain("import('@/app/runtime/lawsuitWorkspaceWarm')");
        expect(src).not.toMatch(
            /export function warmLawsuitWorkspace[\s\S]{0,400}import\('@\/app\/components\/lawyer\/SmartFileModal'\)/,
        );
    });

    it('CriminalDashboard entry رفيع (re-export)', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/criminal-system/CriminalDashboard.tsx'),
            'utf8',
        );
        expect(src).toContain('CriminalDashboardResolvedRuntime as CriminalDashboard');
        expect(src.split('\n').length).toBeLessThan(40);
    });
});
