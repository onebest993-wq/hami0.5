import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';



/**
 * Execution archive: sync Entry + InstantChrome keep-alive.
 * Execution dossier: sync Entry + preload-aware Portal (فتح لحظي بعد تسخين المخزن).
 */
describe('LD MainView overlay mount policy — live truth', () => {
    it('مخزن التنفيذ: InstantChrome + Entry sync keep-alive؛ باقي overlays وفق السياسة', () => {
        const src = readLawyerDashboardMainViewSurface();
        expect(src).toContain('LawyerDashboardExecutionOverlayEntry');
        expect(src).toContain('LazyExecutionOverlayEntry');
        expect(src).toContain('ExecutionArchiveInstantChrome');
        expect(src).toContain('executionArchiveHostMounted');
        expect(src).toContain('open={executionArchiveOpen}');
        expect(src).not.toContain('ExecutionArchiveTabLoading');
        expect(src).not.toContain('ARCHIVE_PORTAL_FALLBACK');
        expect(src).not.toMatch(/import \{ ExecutionArchiveShell \} from/);
        expect(src).not.toMatch(
            /import \{ LawyerDashboardExecutionOverlayEntry \} from/,
        );
        expect(src).not.toMatch(
            /import \{ LawyerDashboardExecutionDossierOverlayEntry \} from/,
        );
        expect(src).toContain('LazyExecutionDossierOverlayEntry');
        expect(src).not.toMatch(/import \{ LawsuitsWorkspaceInstantChrome \} from/);
        expect(src).toContain('LazyGlobalSearchOverlayEntry');
        /*
         * الطبقات الثقيلة كسولة. استثناء «sync عمداً» كان يكلّف مقطع اللوحة ٥٤٥٨ ك.ب
         * وجاهزيةً بعد ١٢٫٤ ثانية على هاتف متوسّط؛ التسخين بعد content-ready يحفظ
         * الفتح الفوري عبر الكاش بدل حشر الأسطح في مسار الإقلاع.
         */
        /* المنتدى + الجدول كسولان؛ الجدول يفتح فوراً وقشرة InstantChrome تغطي Suspense */
        expect(src).toContain('LazyCommunityOverlayEntry');
        expect(src).toContain('LazyScheduleTabHost');
        expect(src).not.toMatch(/import \{ LawyerDashboardCommunityOverlayEntry \} from/);
        expect(src).not.toMatch(/import \{ ScheduleTabHost \} from/);
        expect(src).toContain('LazyRepositoryOverlayEntry');
        /* الإعدادات كسولة من FullBootPath Portal — ليست في MainView */
        expect(src).not.toContain('LazySettingsOverlayEntry');
        expect(src).not.toContain('SettingsInstantShell');
        expect(src).not.toMatch(
            /import \{ LawyerDashboardSettingsOverlayEntry \} from/,
        );
        expect(src).toContain('LazyTransactionsOverlayEntry');
        expect(src).toContain('LazyFieldTasksOverlayEntry');
        expect(src).toContain('LazyProfileTabHost');
        expect(src).toContain('profile/ProfileTabHost');
        expect(src).not.toContain('ProfileTabHostGate');
        expect(src).toContain('warmOverlayEntryChunks');
        /* SmartFile + Lawsuits كسولان؛ التسخين بعد content-ready يحفظ الفتح الفوري */
        expect(src).toContain('LazySmartFileOverlayEntry');
        expect(src).toContain('loadSmartFileOverlayEntry');
        expect(src).not.toMatch(
            /import \{ LawyerDashboardSmartFileOverlayEntry \} from/,
        );
        expect(src).toContain('LazyLawsuitsOverlayEntry');
        expect(src).toContain('loadLawsuitsOverlayEntry');
        expect(src).not.toMatch(
            /import \{ LawyerDashboardLawsuitsOverlayEntry \} from/,
        );
        expect(src).toContain('LazyNewCaseOverlayEntry');
        expect(src).toContain('LazyNonExecArchiveOverlayEntry');
        expect(src).toContain('LazyCriminalOverlayEntry');
        expect(src).toContain('LazyConsolidationNavOverlayEntry');
        expect(src).not.toContain('LazyLawyerDashboardOverlaysHost');
        expect(src).not.toMatch(
            /import \{ LawyerDashboardConsolidationNavOverlayEntry \} from/,
        );
        expect(src).not.toMatch(/import \{ LawyerDashboardGlobalSearchOverlayEntry \} from/);

        const fullBoot = readFileSync(
            join(process.cwd(), 'src/app/components/lawyer/dashboard/LawyerDashboardFullBootPath.tsx'),
            'utf8',
        );
        expect(fullBoot).toContain('LawyerDashboardSettingsOverlayPortal');
        expect(fullBoot).not.toContain('LazySettingsOverlayEntry');
        expect(fullBoot).not.toContain('SettingsInstantShell');
        expect(fullBoot).not.toContain('settingsWarmHost');
        expect(fullBoot).not.toMatch(
            /import \{ LawyerDashboardSettingsOverlayEntry \} from/,
        );
    });

    it('قشرة أرشيف التنفيذ الحيّة هي InstantChrome', () => {
        const shell = readFileSync(
            join(process.cwd(), 'src/app/components/lawyer/dashboard/ExecutionArchiveInstantChrome.tsx'),
            'utf8',
        );
        expect(shell).toContain('execution-archive-shell');
    });
});
