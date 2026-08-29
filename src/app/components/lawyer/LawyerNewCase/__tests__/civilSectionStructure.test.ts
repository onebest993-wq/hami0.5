import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

const lawyerNewCaseRoot = path.join(process.cwd(), 'src/app/components/lawyer/LawyerNewCase');
const smartModalRoot = path.join(process.cwd(), 'src/app/components/lawyer/smart-modal');
const dashboardRoot = path.join(process.cwd(), 'src/app/components/lawyer/dashboard');

function readAt(root: string, rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

function listProductionFiles(root: string): string[] {
    const out: string[] = [];
    const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
                walk(full);
            } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
                out.push(full);
            }
        }
    };
    walk(root);
    return out;
}

describe('civil lawsuit section structural closure', () => {
    it('LawyerNewCase entry has no @ts-nocheck', () => {
        const main = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/lawyer/LawyerNewCase.tsx'),
            'utf8',
        );
        expect(main).not.toContain('@ts-nocheck');
    });

    it('LawyerNewCase folder production files have no @ts-nocheck', () => {
        const offenders = listProductionFiles(lawyerNewCaseRoot).filter((file) => {
            const head = fs.readFileSync(file, 'utf8').slice(0, 80);
            return head.includes('@ts-nocheck');
        });
        expect(offenders).toEqual([]);
    });

    it('civil jurisdiction uses CivilNewCaseForm (not inline CaseBasicsForm)', () => {
        const main = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/lawyer/LawyerNewCase.tsx'),
            'utf8',
        );
        expect(main).toContain('CivilNewCaseForm');
        expect(main).not.toContain('CaseBasicsForm');
        const civilForm = readAt(lawyerNewCaseRoot, 'components/CivilNewCaseForm.tsx');
        expect(civilForm).not.toContain('@ts-nocheck');
        expect(civilForm).toContain('CaseBasicsForm');
        expect(main).toContain('LazyPersonalStatusNewCaseForm');
        expect(main).not.toMatch(/import \{ PersonalStatusNewCaseForm \}/);
    });

    it('SmartFileModalContent applies archived read-only for all lawsuit dossiers', () => {
        const content = readAt(smartModalRoot, 'SmartFileModalContent.tsx');
        expect(content).toContain('rejectLawsuitFileMutation');
        expect(content).toContain('الإضبارة مؤرشفة — للقراءة فقط');
        expect(content).toContain('SmartFileChrome');
        expect(content).toContain('data-dossier-variant');
    });

    it('SmartFileChrome hides edit/trash when viewing archived', () => {
        const chrome = readAt(smartModalRoot, 'layout/SmartFileChrome.tsx');
        expect(chrome).toContain('isViewingArchived');
        expect(chrome).not.toContain('@ts-nocheck');
    });

    it('SmartFileMainPanel locks civil interactions when dossier is archived or link-only', () => {
        const panel = readAt(smartModalRoot, 'layout/SmartFileMainPanel.tsx');
        const timeline = readAt(smartModalRoot, 'layout/mainPanel/SmartFileTimelineSection.tsx');
        const hubs = readAt(smartModalRoot, 'layout/mainPanel/SmartFileWorkflowHubsSection.tsx');
        expect(hubs).toContain('CivilLawReferenceHub');
        expect(panel).toContain('const interactionLocked = isViewingArchived || isCaseLinkViewOnly');
        expect(timeline).toContain('onDelete={!interactionLocked ? handleDeleteEvent : undefined}');
        expect(panel).not.toContain('@ts-nocheck');
    });

    it('FAB prefetches civil law cache on jurisdiction intent', () => {
        const fab = readAt(dashboardRoot, 'LawsuitsAddCaseFabWithPicker.tsx');
        expect(fab).toContain("id === 'civil'");
        expect(fab).toContain('prefetchCivilLawArticles');
        expect(fab).toContain('onPointerDown');
        expect(fab).toContain('prefetchLawyerNewCaseModule');
        expect(fab).toContain('hami-jurisdiction-picker-item');
        expect(fab).toContain('hami-jurisdiction-picker-item-in');
        expect(fab).not.toContain('animate-[lawsuitsBloom');
    });

    it('QuickActions tiles are ornament-free and compact', () => {
        const qa = readAt(smartModalRoot, 'parts/QuickActions.tsx');
        expect(qa).not.toContain('MOROCCAN_ZELLIGE');
        expect(qa).not.toContain('h-[4.75rem]');
        expect(qa).toContain('min-h-[3.5rem]');
    });

    it('civil law reference hub paints the panel without a second lazy wait', () => {
        const hub = readAt(smartModalRoot, 'parts/CivilLawReferenceHub.tsx');
        expect(hub).toContain('CivilLawReferencePanel');
        expect(hub).not.toContain('LazyCivilLawReferencePanel');
        expect(hub).not.toContain('جاري تحميل المرجع القانوني');
        expect(hub).not.toContain('from-sky-400/10');
    });

    it('persist path rejects archived lawsuit mutations', () => {
        const persist = readAt(smartModalRoot, 'hooks/useSmartFilePersist.ts');
        expect(persist).toContain('rejectLawsuitFileMutation');
    });

    it('civil lawsuit factory stamps civil jurisdiction', () => {
        const factory = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/lawsuit/lawsuitFileFactory.ts'),
            'utf8',
        );
        expect(factory).toContain('lawsuitJurisdiction');
        expect(factory).toContain("'civil'");
    });

    it('archive cards route civil files through unified lawsuit card', () => {
        const card = fs.readFileSync(
            path.join(
                process.cwd(),
                'src/app/components/lawyer/ArchivePortal/components/LawsuitArchiveCard.tsx',
            ),
            'utf8',
        );
        expect(card).toContain('ArchiveDossierIdentityBlock');
        expect(card).toContain("'civil'");
    });

    it('civil E2E fixtures target jurisdiction picker FAB flow', () => {
        const fixtures = fs.readFileSync(
            path.join(process.cwd(), 'e2e/helpers/civilLawsuitFixtures.ts'),
            'utf8',
        );
        expect(fixtures).toContain('lawsuits-jurisdiction-picker');
        expect(fixtures).toContain('new-case-jurisdiction-${jurisdiction}');
        expect(fixtures).toContain('lawyer-new-case-save');
        expect(fixtures).toContain('clickLawyerNewCaseSave');
        expect(fixtures).toContain('markFirstPartyAsClient');
        expect(fixtures).toContain('lawyer-new-case-mark-client');
        expect(fixtures).toContain('getByLabel(\'اسم المحكمة المختصة\')');
        expect(fixtures).toContain('fillPartyFullNames');
        expect(fixtures).toContain('nativeSetInputValue');
        expect(fixtures).toContain("isVisible({ timeout: 8_000 })");
        expect(fixtures).toContain('await openLawsuitsWorkspace(page)');
        expect(fixtures).toContain('await ensureLawsuitsAddFab(page)');
    });

    it('civil third-party controls meet 44px floor', () => {
        const section = readAt(lawyerNewCaseRoot, 'components/ThirdPartiesSection.tsx');
        expect(section).toContain('min-h-[44px]');
        expect(section).toContain('min-h-[44px] min-w-[44px] h-11 w-11');
        expect(section).not.toContain('w-6 h-6 flex items-center justify-center rounded bg-red-500/10');
        expect(section).toContain('lawyer-new-case-add-third-party');
        const modal = readAt(lawyerNewCaseRoot, 'components/ThirdPartyModal.tsx');
        expect(modal).toContain('min-h-[44px] min-w-[44px] h-11 w-11');
    });

    it('نوع الرسم المقطوع يقفل قيمة المطالبة في النموذج', () => {
        const sync = readAt(lawyerNewCaseRoot, 'useLawyerNewCaseFormSync.ts');
        expect(sync).toContain('isFixedFeeType(caseDetails.type)');
        expect(sync).toContain('setIsFixedFee(true)');
        const basics = readAt(lawyerNewCaseRoot, 'components/CaseBasicsForm.tsx');
        expect(basics).toContain('isFixedFeeType(caseDetails.type)');
    });

    it('content entry modals are split into contentEntry package with thin barrel', () => {
        const barrel = readAt(smartModalRoot, 'modals/contentEntryModals.tsx');
        expect(barrel).toContain('./contentEntry/AddTaskModal');
        expect(barrel).toContain('./contentEntry/AddDocumentModal');
        expect(barrel).not.toContain('export const AddTaskModal');
        const lines = barrel.split('\n').length;
        expect(lines).toBeLessThan(15);
        expect(
            fs.existsSync(path.join(smartModalRoot, 'modals/contentEntry/AddDocumentModal.tsx')),
        ).toBe(true);
        expect(
            fs.existsSync(path.join(smartModalRoot, 'modals/contentEntry/shared.tsx')),
        ).toBe(true);
        const documentModal = readAt(smartModalRoot, 'modals/contentEntry/AddDocumentModal.tsx');
        expect(documentModal).toContain('ModalInlineTimeline');
        expect(documentModal).not.toContain('@ts-nocheck');
    });
});

describe('civil smart-file @ts-nocheck budget (core orchestration)', () => {
    const corePaths = [
        'SmartFileModalContent.tsx',
        'hooks/useSmartFileModalOrchestrator.ts',
        'hooks/useSmartFilePersist.ts',
        'layout/SmartFileMainPanel.tsx',
        'smartFile/assembleSmartFileModalLayout.ts',
    ];

    const civilSmartFileCore = [
        'smartFile/cloudSavePayload.ts',
        'smartFile/resolveDisplayParties.ts',
        'smartFile/interpleaderJudgmentEngine.ts',
        'smartFile/caseConsolidationLinking.ts',
        'smartFile/appealPartyEngine.ts',
        'smartFile/appealStageTransition.ts',
    ];

    it('core civil dossier shell files have no @ts-nocheck', () => {
        const offenders = corePaths.filter((rel) => {
            const head = readAt(smartModalRoot, rel).slice(0, 80);
            return head.includes('@ts-nocheck');
        });
        expect(offenders).toEqual([]);
    });

    it('entire smart-modal production tree has zero @ts-nocheck', () => {
        const smartModalRoot = path.join(process.cwd(), 'src/app/components/lawyer/smart-modal');
        const offenders = listProductionFiles(smartModalRoot).filter((file) => {
            const head = fs.readFileSync(file, 'utf8').slice(0, 80);
            return head.includes('@ts-nocheck');
        });
        expect(offenders).toEqual([]);
    });
});
