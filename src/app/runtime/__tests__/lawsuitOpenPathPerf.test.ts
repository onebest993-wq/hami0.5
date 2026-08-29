import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('lawsuit open-path performance contracts', () => {
    it('مخزن الدعاوى لا ينتظر FileGridReady ولا يعيد Prime عند فتح إضبارة', () => {
        const host = read('src/app/components/lawyer/dashboard/ArchivePortalHost.tsx');
        expect(host).not.toContain('lawsuitFileGridReady');
        expect(host).toMatch(/\{Component \? \(/);

        const open = read('src/app/runtime/lawsuitOpenContract.ts');
        expect(open).toContain('prepareLawsuitDossierChrome()');
        expect(open).toMatch(
            /export function openLawsuitDossierWithContract[\s\S]{0,400}prepareLawsuitDossierChrome\(\)/,
        );
        expect(open).not.toMatch(
            /export function openLawsuitDossierWithContract[\s\S]{0,400}prepareLawsuitDossierOpen\(\)/,
        );
    });

    it('بطاقات المخزن بلا Framer وبلا تسخين مساحة كامل عند hover', () => {
        const card = read(
            'src/app/components/lawyer/ArchivePortal/components/UnifiedDossierCard.tsx',
        );
        const grid = read(
            'src/app/components/lawyer/ArchivePortal/components/LawsuitArchiveFileGrid.tsx',
        );
        expect(card).not.toContain('overlayMotionRuntime');
        expect(card).not.toContain('warmLawsuitWorkspace');
        expect(grid).not.toContain('warmLawsuitWorkspace');
        expect(card).toContain('prepareLawsuitDossierChromeOnce');
        expect(grid).toContain('prepareLawsuitDossierChromeOnce');
    });

    it('لا blur على قشرة المخزن/الشريط — دخول المساحة فوري', () => {
        const shell = read(
            'src/app/components/lawyer/dashboard/LawsuitsCivilArchiveInstantShell.tsx',
        );
        const toolbar = read('src/app/components/lawyer/ArchivePortal/archiveToolbarStyles.ts');
        const chrome = read('src/app/components/lawyer/ArchivePortal/LawsuitArchiveChrome.tsx');
        const motion = read(
            'src/app/components/lawyer/dashboard/lawyerHomeFx-overlayMotion.css',
        );
        expect(shell).not.toContain('backdrop-blur');
        expect(toolbar).not.toContain('backdrop-blur');
        expect(chrome).not.toContain('backdrop-blur');
        expect(motion).toContain(
            "html[data-hami-lawsuits-enter='1'] [data-testid='lawsuits-workspace']",
        );
        expect(motion).toContain('opacity: 1 !important');
        expect(motion).not.toMatch(
            /html\[data-hami-lawsuits-enter='1'\][\s\S]{0,80}opacity: 0\.78/,
        );
    });

    it('انتظار فكّ المفاتيح في الواجهة ≤ 2.5s دون تثبيت فراغ', () => {
        const hydrate = read('src/app/runtime/lawsuitFilesEagerHydrate.ts');
        const state = read('src/app/hooks/useLawsuitFilesState.ts');
        const cycle = read('src/app/hooks/lawsuitFilesHydrateCycle.ts');
        expect(hydrate).toContain('const EAGER_HYDRATE_TIMEOUT_MS = 2_500');
        expect(hydrate).not.toContain('6_000');
        expect(cycle).toContain('awaitLawsuitFilesEagerHydrate(2_500)');
        expect(state).toContain('runLawsuitFilesHydrateCycle');
    });

    it('إغلاق المخزن الثابت لا يسحب SecureStore ولا إقلاع Capacitor ولا برميل LawyerShared', () => {
        const chrome = read('src/app/components/lawyer/ArchivePortal/LawsuitArchiveChrome.tsx');
        const grid = read(
            'src/app/components/lawyer/ArchivePortal/components/LawsuitArchiveFileGrid.tsx',
        );
        const card = read(
            'src/app/components/lawyer/ArchivePortal/components/LawsuitArchiveCard.tsx',
        );
        const refs = read('src/app/workspace/extractCaseRefs.ts');
        const confirm = read(
            'src/app/components/lawyer/ArchivePortal/components/ArchivePortalConfirmDialog.tsx',
        );
        const bulk = read(
            'src/app/components/lawyer/ArchivePortal/components/ArchivePortalTrashBulkBar.tsx',
        );
        expect(chrome).not.toMatch(/import \{[^}]*LawsuitArchiveTrashDialogs/);
        expect(chrome).toContain('LazyLawsuitArchiveTrashDialogs');
        expect(card).toContain("from '@/app/workspace/WorkspacePinButton'");
        expect(card).toContain('variant="ghost"');
        expect(card).not.toContain('LazyWorkspacePinButton');
        expect(card).not.toContain('lazy(');
        expect(card).not.toContain('workspacePinBuilders');
        expect(card).toContain('lawsuitWorkspacePin');
        const hearing = read(
            'src/app/components/lawyer/ArchivePortal/utils/lawsuitArchiveHearing.ts',
        );
        expect(hearing).not.toContain('lawsuitFileFactory');
        expect(hearing).toContain('firstHearingTimelineId');
        expect(refs).not.toContain('LawyerShared');
        expect(refs).toContain('normalizeArabicSearch');
        expect(confirm).not.toContain('capacitorAppLifecycle');
        expect(confirm).not.toContain('urgentDossierUi');
        expect(confirm).toContain("from '@/app/runtime/nativeBackStack'");
        const shell = read('src/app/components/lawyer/dashboard/LawsuitsWorkspaceShell.tsx');
        expect(shell).not.toContain('capacitorAppLifecycle');
        expect(shell).toContain("from '@/app/runtime/nativeBackStack'");
        const archiveShell = read('src/app/components/lawyer/dashboard/ArchiveHubInstantShell.tsx');
        expect(archiveShell).not.toContain('capacitorAppLifecycle');
        expect(archiveShell).toContain("from '@/app/runtime/nativeBackStack'");
        expect(bulk).not.toContain('overlayMotionRuntime');
        expect(grid).not.toContain('civilLawsuitTestIds');
        expect(grid).toContain('lawsuitVaultTestIds');
        expect(chrome).not.toContain('civilLawsuitTestIds');
    });
});
