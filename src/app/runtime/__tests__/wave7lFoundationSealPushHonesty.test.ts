import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('wave7l foundation seal push honesty', () => {
    it('CalendarClusterLite في مقطع scan-lite لا داخل execution-handler', () => {
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain('useLawyerDashboardCalendarClusterLite');
        expect(vite).toContain('clusterScanSourcesLite');
        expect(vite).toContain("return 'app-workspace-scan-lite'");
        expect(vite).toContain('resolveWorkspaceScanLiteChunk');
        const handlerStart = vite.indexOf('function resolveExecutionHandlerClusterChunk');
        const handlerEnd = vite.indexOf('\nfunction ', handlerStart + 10);
        expect(handlerStart).toBeGreaterThan(-1);
        expect(handlerEnd).toBeGreaterThan(handlerStart);
        expect(vite.slice(handlerStart, handlerEnd)).not.toContain('CalendarClusterLite');
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

    it('MainView يبقي غلاف HomeTab متزامناً؛ المحتوى خارج الغلاف', () => {
        const t = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        const wrap = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx'),
            'utf8',
        );
        expect(t).toMatch(/import \{ LawyerDashboardHomeTab \} from/);
        expect(t).not.toContain('LazyLawyerDashboardHomeTab');
        expect(wrap).toContain('loadHomeTabContent');
        expect(wrap).not.toMatch(/from ['"]\.\/HomeTabContent['"]/);
    });

    it('navigation يقطع lazyComponentsIntent عن stem', () => {
        const t = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerDashboardNavigation.ts'),
            'utf8',
        );
        expect(t).toContain("import('@/app/utils/lazyComponentsIntent')");
        expect(t).not.toContain("from '@/app/utils/lazyComponentsIntent'");
    });

    it('AppLockOverlay يُركَّب متزامناً على body-portal فوق الطبقات', () => {
        const shell = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardShell.tsx'),
            'utf8',
        );
        const overlay = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/AppLockOverlay.tsx'),
            'utf8',
        );
        const lockHook = fs.readFileSync(path.join(root, 'src/app/hooks/useAppLock.ts'), 'utf8');
        expect(shell).toContain('AppLockOverlay');
        expect(shell).not.toContain('LazyAppLockOverlay');
        expect(overlay).toContain('createPortal');
        expect(overlay).toContain('hami-app-lock-overlay');
        expect(lockHook).toContain('snapAppLockOpen');
    });
});
