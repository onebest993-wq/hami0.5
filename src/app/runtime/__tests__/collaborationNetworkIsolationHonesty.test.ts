/**
 * عقد الأمان ثلاثي الطبقات: تشفير محلي ≠ WIFE ≠ مزامنة إضابير.
 * التعاون الصريح (منتدى / استشارة / طلب عون) يُوقَّع بـ WIFE عند الاستدعاء.
 * المسار اليومي للأقسام المحلية لا يوقّع ولا يفتح /api.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('عزل التعاون عن العمل المحلي وعن WIFE اليومي', () => {
    it('بوابة التعاون مستقلة عن cloudSync', () => {
        const gate = read('src/app/services/settings/collaborationNetworkGate.ts');
        expect(gate).toContain('isLocalOnlyModeEnabled');
        expect(gate).toContain('COLLABORATION_NETWORK_OFF');
        expect(gate).not.toMatch(/from ['"].*lawyerWorkCloudGate['"]/);
        expect(gate).not.toContain('cloudSync');
        const work = read('src/app/services/settings/lawyerWorkCloudGate.ts');
        expect(work).toContain('canReachCollaborationNetwork');
        expect(work).toContain('cloudSync');
    });

    it('استشارة الزميل لا تُوقَّع إلا خلف بوابة التعاون', () => {
        const api = read('src/app/services/caseShare/caseShareApiService.ts');
        expect(api).toContain('canReachCollaborationNetwork');
        expect(api).toContain('assertCollaborationNetworkReachable');
        expect(api).toContain('/api/case-share');
        expect(api).not.toContain('isLawyerWorkCloudLive');
        const flow = read(
            'src/app/components/lawyer/caseShare/ColleagueConsultationFlow.tsx',
        );
        expect(flow).toContain('isCollaborationNetworkCut');
        expect(flow).toContain('COLLABORATION_NETWORK_OFF');
        expect(flow).not.toContain('canReachCollaborationNetwork');
        expect(flow).not.toContain('collaborationNetworkGate');
        expect(flow).toContain('collaborationNetworkLite');
        const guard = read('src/app/services/caseShare/caseShareNetworkGuard.ts');
        expect(guard).toContain('canReachCollaborationNetwork');
    });

    it('شارة الجرس على الرئيسية peek محلي — اللوحة المفتوحة هي مسار الشبكة', () => {
        const dash = read('src/app/hooks/lawyerDashboard/useLawyerDashboardNotifications.ts');
        expect(dash).toContain('localPeekOnly: true');
        const hook = read('src/app/hooks/useIncomingCaseShares.ts');
        expect(hook).toContain('localPeekOnly');
        expect(hook).toContain("import('@/app/services/caseShare/caseShareApiService')");
        const panel = read(
            'src/app/components/lawyer/NotificationPanel/hooks/useNotificationPanel.ts',
        );
        expect(panel).toContain('useIncomingCaseShares(userId, isOpen)');
        expect(panel).not.toContain('localPeekOnly');
    });

    it('المنتدى وطلب العون والاستشارة محمية كمسارات شبكة في الحارس', () => {
        const features = read('src/app/services/secureApiNetworkFeatures.ts');
        expect(features).toContain("pathname.startsWith('/api/forum/')");
        expect(features).toContain("pathname.startsWith('/api/case-share')");
        expect(features).toContain("pathname.startsWith('/api/task-help')");
        const forum = read('src/app/services/forum/forumApi/forumApiClientCore.ts');
        expect(forum).toContain('canReachCollaborationNetwork');
        const badge = read('src/app/services/notifications/notificationBackgroundSync.ts');
        expect(badge).toContain('canReachCollaborationNetwork');
        expect(badge).toMatch(/if\s*\(\s*!canReachCollaborationNetwork\(\)\s*\)\s*return/);
    });

    it('حفظ العمل المحلي لا يستورد بوابة التعاون ولا SecureAPI', () => {
        const calendar = read('src/app/services/cloud/lawyerCalendarCloud.ts');
        expect(calendar).not.toContain('canReachCollaborationNetwork');
        expect(calendar).not.toContain('fetchSecure');
        const tasks = read('src/app/utils/quantumTasksStorage.ts');
        expect(tasks).not.toContain('canReachCollaborationNetwork');
        expect(tasks).not.toContain('fetchSecure');
        const tx = read('src/app/services/cloud/lawyerTransactionsCloud.ts');
        expect(tx).not.toContain('canReachCollaborationNetwork');
        expect(tx).toContain('isLawyerWorkCloudLive');
    });
});
