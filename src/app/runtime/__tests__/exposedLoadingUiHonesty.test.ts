import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readLawyerDashboardMainViewOverlayHosts } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('exposed loading UI honesty — سبب واجهات التحميل المكشوفة', () => {
    it('OverlayHosts: أغطية InstantPaint لا LawyerLazyFallback ولا nested fallback={null} للجزائي/البحث', () => {
        const hosts = readLawyerDashboardMainViewOverlayHosts();
        expect(hosts).not.toContain('LawyerLazyFallback');
        expect(hosts).not.toContain('جاري التحميل');
        expect(hosts).not.toContain('جاري فتح الإضبارة الجزائية');
        expect(hosts).toContain('CriminalDashboardInstantPaintCover');
        expect(hosts).not.toContain('LazyCriminalDashboardBootChrome');
        expect(hosts).toContain('GlobalSearchOverlaySuspenseCover');
        expect(hosts).not.toMatch(
            /showGlobalSearch \? \(\s*<Suspense fallback=\{null\}>/,
        );
        expect(hosts).toContain('ForumInstantPaintCover');
        expect(hosts).toMatch(/import \{ ForumInstantPaintCover \}/);
        expect(hosts).toContain('TransactionsInstantPaintCover');
        expect(hosts).toContain('LawyerNewCaseInstantPaintCover');
        expect(hosts).toContain('ExecutionCreationBootShell');
        expect(hosts).toContain('ArchiveHubInstantShell');
        expect(hosts).toContain('RepositoryInstantPaintCover');
        expect(hosts).toContain('ExecutionArchiveInstantPaintCover');
        expect(hosts).toContain('FieldTasksSheetOpenInstantChrome');
        expect(hosts).toContain('TasksManagerOpenInstantChrome');
        expect(hosts).toContain('LawsuitsOverlaySuspenseCover');
        expect(hosts).toContain('ConsolidationNavInstantCover');
        expect(hosts).not.toMatch(
            /import \{ LawsuitsWorkspaceInstantChrome \} from/,
        );
    });

    it('أجندة المهام داخل الـ Entry: Host ثابت بلا fallback فارغ؛ القشرة في Host ريثما يصل Overlay', () => {
        const entry = read(
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardFieldTasksOverlayEntry.tsx',
        );
        expect(entry).toContain('FieldTasksManagerHost');
        expect(entry).not.toContain('LazyFieldTasksManagerHost');
        expect(entry).not.toContain('fallback={null}');
        const host = read(
            'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksManagerHost.tsx',
        );
        expect(host).toContain('TasksManagerOpenInstantChrome');
        expect(host).not.toContain('fallback={null}');
    });

    it('LawyerLazyFallback ميت بلا نص تحميل', () => {
        const fallback = read(
            'src/app/components/lawyer/LawyerDashboardParts/LawyerLazyFallback.tsx',
        );
        expect(fallback).not.toContain('جاري التحميل');
        expect(fallback).toContain('export const LawyerLazyFallback: React.ReactNode = null');
    });

    it('نموذج دعوى جديدة: هيكل صامت لا سبينر', () => {
        const shell = read(
            'src/app/components/lawyer/dashboard/LawyerNewCaseSelectionInstantShell.tsx',
        );
        expect(shell).toContain('NewCaseInstantPaintSlots');
        expect(shell).not.toContain('جاري تحميل النموذج');
        expect(shell).not.toContain('animate-spin');
        const cover = read(
            'src/app/components/lawyer/dashboard/LawyerNewCaseInstantPaintCover.tsx',
        );
        expect(cover).not.toContain('جاري التحميل');
        const form = read('src/app/components/lawyer/LawyerNewCase.tsx');
        expect(form).not.toContain('جاري تحميل نموذج');
        expect(form).toContain('NewCaseInstantPaintSlots');
    });

    it('أرشيف InstantShell بلا «جاري فتح»', () => {
        const archive = read(
            'src/app/components/lawyer/dashboard/ArchiveHubInstantShell.tsx',
        );
        expect(archive).not.toContain('جاري فتح');
        expect(archive).toContain('aria-label={title}');
    });

    it('تسخين الجزائي يثبّت preload-aware BootChrome', () => {
        const loader = read('src/app/runtime/criminalDashboardLoader.ts');
        expect(loader).toContain('LazyCriminalDashboardBootChrome.preload');
        const searchCover = read(
            'src/app/components/lawyer/dashboard/GlobalSearchOverlaySuspenseCover.tsx',
        );
        expect(searchCover).toContain('LazyGlobalSearchInstantPaintCover.isPreloaded');
        expect(searchCover).toContain('paintGlobalSearchInstantChrome');
    });
});
