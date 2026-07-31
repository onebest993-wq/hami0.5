import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('phase-19 lawsuit grid-only swap inside InstantShell', () => {
    it('Host lawsuits inline يبقي InstantShell عند جاهزية Component (children + gridOnly)', () => {
        const host = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/ArchivePortalHost.tsx'),
            'utf8',
        );
        expect(host).toMatch(
            /resolvedLoadingVariant === 'inline' && type === 'lawsuits'/,
        );
        expect(host).toContain('LawsuitsCivilArchiveInstantShell');
        expect(host).toMatch(
            /LawsuitsCivilArchiveInstantShell[\s\S]{0,1600}gridOnly/,
        );
        expect(host).toMatch(
            /LawsuitsCivilArchiveInstantShell[\s\S]{0,2000}onLawsuitShellChrome=\{setLifecycleChrome\}/,
        );
        expect(host).toMatch(
            /LawsuitsCivilArchiveInstantShell[\s\S]{0,2200}\{Component && lawsuitFileGridReady \?/,
        );
        expect(host).not.toMatch(
            /if \(Component\)[\s\S]{0,200}return[\s\S]{0,200}resolvedLoadingVariant === 'inline'/,
        );
    });

    it('InstantShell يقبل children ويُمرّر lifecycleChrome الحي', () => {
        const shell = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawsuitsCivilArchiveInstantShell.tsx'),
            'utf8',
        );
        expect(shell).toContain('children?: React.ReactNode');
        expect(shell).toContain('lifecycleChrome?: LawsuitShellLifecycleChrome');
        expect(shell).toContain('jurisdictionTab?: LawsuitJurisdictionTab');
        expect(shell).toContain('onJurisdictionTabChange?:');
        expect(shell).toMatch(/hasChildren \? \([\s\S]*children/);
        expect(shell).toContain('lifecycleChrome?.lawsuitViewMode');
        expect(shell).toContain('data-testid="lawsuits-civil-archive-instant-shell"');
        expect(shell).toContain(
            'px-4 sm:px-5 lg:px-6 py-5 pb-[max(2rem,calc(5.25rem+env(safe-area-inset-bottom)))]',
        );
    });

    it('ArchivePortalChrome و LawsuitSurface يذكران gridOnly', () => {
        const chrome = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/ArchivePortalChrome.tsx'),
            'utf8',
        );
        const surface = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/ArchivePortalLawsuitSurface.tsx'),
            'utf8',
        );
        expect(chrome).toContain('gridOnly');
        expect(chrome).toMatch(/if \(gridOnly\)/);
        expect(chrome).toContain('relative flex min-h-0 flex-1 flex-col');
        expect(surface).toContain('ArchivePortalChrome {...props}');
    });

    it('LawsuitSurface يرفع onLawsuitShellChrome عبر useLayoutEffect', () => {
        const surface = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/ArchivePortalLawsuitSurface.tsx'),
            'utf8',
        );
        const types = readFileSync(join(root, 'src/app/types/common.ts'), 'utf8');
        expect(types).toContain('gridOnly?: boolean');
        expect(types).toContain('onLawsuitShellChrome?:');
        expect(surface).toContain('useLayoutEffect');
        expect(surface).toContain('props.onLawsuitShellChrome?.({');
        expect(surface).toContain('lawsuitViewMode: portal.lawsuitViewMode');
        expect(surface).toContain('setLawsuitViewMode: portal.setLawsuitViewMode');
        expect(surface).toContain('unifiedArchivedCount: portal.unifiedArchivedCount');
        expect(surface).toContain('lawsuitTrashedCount: portal.lawsuitTrashedCount');
        expect(surface).toContain('hasLawsuitLifecycle: portal.hasLawsuitLifecycle');
        expect(surface).toContain('props.onLawsuitShellChrome?.(null)');
    });
});
