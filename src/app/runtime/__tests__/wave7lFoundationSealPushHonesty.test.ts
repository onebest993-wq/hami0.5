import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('wave7l foundation seal push honesty', () => {
    it('CalendarClusterLite لا يُجبَر داخل cluster-deferred', () => {
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain('CalendarClusterLite');
        expect(vite).toContain("!normalized.includes('CalendarClusterLite')");
        expect(vite).toContain('app-workspace-scan-lite');
    });

    it('notification background sync ديناميكي من stem hook', () => {
        const t = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useNotificationBackgroundSync.ts'),
            'utf8',
        );
        expect(t).toContain("import('@/app/services/notifications/notificationBackgroundSync')");
        expect(t).not.toMatch(
            /from ['"]@\/app\/services\/notifications\/notificationBackgroundSync['"]/,
        );
        expect(t).toContain("from '@/app/services/forum/forumNotificationEvents'");
    });

    it('tab bundle يحمّل lazyComponentsIntent ديناميكياً', () => {
        const t = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/buildLawyerDashboardTabBundle.ts'),
            'utf8',
        );
        expect(t).toContain("import('@/app/utils/lazyComponentsIntent')");
        expect(t).not.toMatch(/from ['"]@\/app\/utils\/lazyComponentsIntent['"]/);
        expect(t).toContain("from '@/app/workspace/clusterScanSources.types'");
    });

    it('MainView يعيد LazyLawyerDashboardHomeTab', () => {
        const t = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(t).toContain('LazyLawyerDashboardHomeTab');
        expect(t).not.toMatch(/import \{ LawyerDashboardHomeTab \} from/);
    });

    it('navigation يقطع lazyComponentsIntent عن stem', () => {
        const t = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerDashboardNavigation.ts'),
            'utf8',
        );
        expect(t).toContain("import('@/app/utils/lazyComponentsIntent')");
        expect(t).not.toContain("from '@/app/utils/lazyComponentsIntent'");
    });

    it('AppLockOverlay يُحمَّل lazy من Shell', () => {
        const t = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardShell.tsx'),
            'utf8',
        );
        expect(t).toContain('LazyAppLockOverlay');
        expect(t).not.toMatch(/import \{ AppLockOverlay \} from/);
    });
});
