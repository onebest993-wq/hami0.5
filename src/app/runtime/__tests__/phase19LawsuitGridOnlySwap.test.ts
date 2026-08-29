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
            /LawsuitsCivilArchiveInstantShell[\s\S]{0,2800}gridOnly/,
        );
        expect(host).toMatch(
            /LawsuitsCivilArchiveInstantShell[\s\S]{0,3200}onLawsuitShellChrome=\{setLifecycleChrome\}/,
        );
        expect(host).toMatch(
            /LawsuitsCivilArchiveInstantShell[\s\S]{0,3600}\{Component \?/,
        );
        expect(host).not.toContain('lawsuitFileGridReady');
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
        expect(shell).toContain('lifecycleChrome.lawsuitViewMode');
        expect(shell).toContain('data-testid="lawsuits-civil-archive-instant-shell"');
        expect(shell).toContain('LAWSUIT_ARCHIVE_SCROLL_REGION_CLASS');
        expect(shell).toContain(
            "from '@/app/components/lawyer/ArchivePortal/lawsuitArchiveInstantLayout'",
        );
        expect(shell).toContain('جاري تجهيز الإضابير');
        expect(shell).not.toContain('LawsuitVaultSnapshotGrid');
    });

    it('LawsuitArchiveChrome و LawsuitSurface يذكران gridOnly', () => {
        const chrome = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/LawsuitArchiveChrome.tsx'),
            'utf8',
        );
        const surface = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/ArchivePortalLawsuitSurface.tsx'),
            'utf8',
        );
        expect(chrome).toContain('gridOnly');
        expect(chrome).toMatch(/if \(gridOnly\)/);
        expect(chrome).toContain('relative flex min-h-0 flex-1 flex-col');
        expect(surface).toContain('LawsuitArchiveChrome {...props}');
    });

    it('LawsuitSurface يرفع onLawsuitShellChrome عبر useLayoutEffect', () => {
        const surface = readFileSync(
            join(root, 'src/app/components/lawyer/ArchivePortal/ArchivePortalLawsuitSurface.tsx'),
            'utf8',
        );
        const types = readFileSync(join(root, 'src/app/types/common/archive.ts'), 'utf8');
        expect(types).toContain('gridOnly?: boolean');
        expect(types).toContain('onLawsuitShellChrome?:');
        expect(surface).toContain('useLayoutEffect');
        expect(surface).toContain('props.onLawsuitShellChrome?.({');
        expect(surface).toContain('lawsuitViewMode: portal.lawsuitViewMode');
        expect(surface).toContain('setLawsuitViewMode: portal.setLawsuitViewMode');
        expect(surface).toContain('unifiedArchivedCount: portal.unifiedArchivedCount');
        expect(surface).toContain('lawsuitTrashedCount: portal.lawsuitTrashedCount');
        expect(surface).toContain('unifiedArchivedCount: portal.unifiedArchivedCount');
        expect(surface).toContain('lawsuitTrashedCount: portal.lawsuitTrashedCount');
        expect(surface).not.toContain('hasLawsuitLifecycle: portal.hasLawsuitLifecycle');
        expect(surface).toContain('props.onLawsuitShellChrome?.(null)');
        expect(surface).not.toContain('requestIdleCallback(report');
    });
});
