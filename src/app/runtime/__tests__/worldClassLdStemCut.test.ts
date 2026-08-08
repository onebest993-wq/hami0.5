import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const mainPath = join(
    process.cwd(),
    'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx',
);

/**
 * Execution archive: sync Entry + InstantChrome keep-alive.
 * Execution dossier: sync Entry + preload-aware Portal (فتح لحظي بعد تسخين المخزن).
 */
describe('LD MainView overlay mount policy — live truth', () => {
    it('مخزن التنفيذ: InstantChrome + Entry sync keep-alive؛ باقي overlays وفق السياسة', () => {
        const src = readFileSync(mainPath, 'utf8');
        expect(src).toContain('LawyerDashboardExecutionOverlayEntry');
        expect(src).not.toContain('LazyExecutionOverlayEntry');
        expect(src).toContain('ExecutionArchiveInstantChrome');
        expect(src).toContain('executionArchiveHostMounted');
        expect(src).toContain('open={executionArchiveOpen}');
        expect(src).not.toContain('ExecutionArchiveTabLoading');
        expect(src).not.toContain('ARCHIVE_PORTAL_FALLBACK');
        expect(src).not.toMatch(/import \{ ExecutionArchiveShell \} from/);
        expect(src).toMatch(
            /import \{ LawyerDashboardExecutionOverlayEntry \} from/,
        );
        expect(src).toMatch(
            /import \{ LawyerDashboardExecutionDossierOverlayEntry \} from/,
        );
        expect(src).not.toContain('LazyExecutionDossierOverlayEntry');
        expect(src).toContain('LawyerDashboardLawsuitsOverlayEntry');
        expect(src).not.toContain('LazyLawsuitsOverlayEntry');
        expect(src).not.toMatch(/import \{ LawsuitsWorkspaceInstantChrome \} from/);
        expect(src).toContain('LazyGlobalSearchOverlayEntry');
        /* Community: sync عمداً — فتح عالمي بلا Suspense (مثل Settings) */
        expect(src).toContain('LawyerDashboardCommunityOverlayEntry');
        expect(src).not.toContain('LazyCommunityOverlayEntry');
        /* Repository: sync عمداً — فتح الدوك بلا Suspense (استثناء stem-cut مثل Settings) */
        expect(src).toContain('LawyerDashboardRepositoryOverlayEntry');
        expect(src).not.toContain('LazyRepositoryOverlayEntry');
        expect(src).toContain('LawyerDashboardSmartFileOverlayEntry');
        expect(src).not.toContain('LazySmartFileOverlayEntry');
        expect(src).toContain('LazyNewCaseOverlayEntry');
        expect(src).toContain('LazyNonExecArchiveOverlayEntry');
        expect(src).toContain('LazyCriminalOverlayEntry');
        /* Settings: sync عمداً — فتح عالمي بلا Suspense/شبكة (استثناء stem-cut) */
        expect(src).toContain('LawyerDashboardSettingsOverlayEntry');
        expect(src).not.toContain('LazySettingsOverlayEntry');
        expect(src).toContain('LazyFieldTasksOverlayEntry');
        /* Transactions: sync عمداً مثل الإعدادات */
        expect(src).toContain('LawyerDashboardTransactionsOverlayEntry');
        expect(src).not.toContain('LazyTransactionsOverlayEntry');
        expect(src).toContain('LazyConsolidationNavOverlayEntry');
        expect(src).not.toContain('LazyLawyerDashboardOverlaysHost');
        expect(src).not.toMatch(
            /import \{ LawyerDashboardConsolidationNavOverlayEntry \} from/,
        );
        expect(src).not.toMatch(/import \{ LawyerDashboardGlobalSearchOverlayEntry \} from/);
    });

    it('قشرة أرشيف التنفيذ ما زالت موجودة للـ entry الحي', () => {
        const shell = readFileSync(
            join(process.cwd(), 'src/app/components/lawyer/dashboard/ExecutionArchiveShell.tsx'),
            'utf8',
        );
        expect(shell).toContain('execution-archive-shell');
    });
});
