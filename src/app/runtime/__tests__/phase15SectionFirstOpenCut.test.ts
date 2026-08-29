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

    it('LawsuitsWorkspaceHost: أرشيف على active فوراً؛ NewCase بعد FAB؛ SmartFile عند المساحة الظاهرة', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawsuitsWorkspaceHost.tsx'),
            'utf8',
        );
        expect(src).toContain('scheduleSecondaryLawsuitWarm');
        expect(src).toContain('prefetchLawyerNewCaseModule');
        expect(src).toContain('prepareLawsuitDossierChromeOnce');
        expect(src).toContain(', 200)');
        expect(src).not.toContain('1_800');
        expect(src).toContain('lawsuits-jurisdiction-picker');
        expect(src).not.toContain('12_000');
        expect(src).toContain('loadLawsuitArchiveHubModule');
        expect(src).not.toContain('loadArchivePortalModule');
        expect(src).not.toMatch(
            /scheduleSecondaryLawsuitWarm[\s\S]{0,200}requestIdleCallback/,
        );
        expect(src).not.toMatch(
            /primeCivilArchiveCore[\s\S]{0,200}prefetchLawyerNewCaseModule\(\);\s*prefetchSmartFileModalPhased\(\);/,
        );
        /* mount يسخّن الـ hub فقط عند الفتح — NewCase عبر onIntent/tab */
        expect(src).toMatch(
            /useEffect\(\(\) => \{\s*if \(!active\) \{\s*clearSecondaryLawsuitWarm\(\);\s*return;\s*\}\s*primeCivilArchiveCore\(\);\s*\}, \[active, clearSecondaryLawsuitWarm, primeCivilArchiveCore\]\)/,
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
