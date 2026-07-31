import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('phase-11 cold-entry melt cut', () => {
    it('forumNotificationsWarmCache لا يستورد ForumApiService/NotificationRepository بشكل sync', () => {
        const src = readFileSync(
            join(root, 'src/app/services/forum/forumNotificationsWarmCache.ts'),
            'utf8',
        );
        expect(src).toContain("from '@/app/infrastructure/notificationPeekLite'");
        expect(src).toContain("from '@/app/infrastructure/notificationModel'");
        expect(src).toContain("import('@/app/services/forumApiService')");
        expect(src).not.toContain("from '@/app/services/forumApiService'");
        expect(src).not.toContain("from '@/app/infrastructure/NotificationRepository'");
    });

    it('forumIntentWarm يحمّل notifications warm بشكل dynamic', () => {
        const src = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/forumIntentWarm.ts'),
            'utf8',
        );
        expect(src).toContain("import('@/app/services/forum/forumNotificationsWarmCache')");
        expect(src).not.toContain(
            "from '@/app/services/forum/forumNotificationsWarmCache'",
        );
    });

    it('bridgePersistence/shared لا يستورد executionFilesStorage أو lawyerTransactionsCloud بشكل sync', () => {
        const src = readFileSync(
            join(root, 'src/app/services/calendar/bridgePersistence/shared.ts'),
            'utf8',
        );
        expect(src).not.toContain("from '@/app/utils/executionFilesStorage'");
        expect(src).not.toContain("from '@/app/services/cloud/lawyerTransactionsCloud'");
        expect(src).toContain("import('@/app/services/cloud/lawyerTransactionsCloud')");
    });

    it('lawyerCalendarCloud يحمّل calendarLocalSnapshot بشكل dynamic', () => {
        const src = readFileSync(
            join(root, 'src/app/services/cloud/lawyerCalendarCloud.ts'),
            'utf8',
        );
        expect(src).toContain("import('@/app/services/calendar/calendarLocalSnapshot')");
        expect(src).not.toContain("from '@/app/services/calendar/calendarLocalSnapshot'");
    });

    it('vite يعزل forum warm/api و notification network عن entry melt', () => {
        const src = readFileSync(join(root, 'vite.config.mts'), 'utf8');
        expect(src).toContain("return 'app-forum-api-service'");
        expect(src).toContain("return 'app-notification-network-deferred'");
        expect(src).toContain('/forum/forumNotificationsWarmCache');
    });

    it('alertFutureGate و fieldTaskAlerts لا يستوردان برميل calendarBridge', () => {
        const gate = readFileSync(join(root, 'src/app/services/alertFutureGate.ts'), 'utf8');
        const alerts = readFileSync(join(root, 'src/app/services/fieldTaskAlerts.ts'), 'utf8');
        expect(gate).toContain("from '@/app/services/calendar/bridge/core'");
        expect(gate).not.toContain("from '@/app/services/calendarBridge'");
        expect(alerts).toContain("from '@/app/services/calendar/bridge/core'");
        expect(alerts).toContain("from '@/app/services/tasks/taskAgendaStatusLite'");
        expect(alerts).not.toContain("from '@/app/services/calendarBridge'");
        expect(alerts).not.toContain('tasksManager/utils');
    });

    it('vite يعزل secureStoreRecovery و LocalStorageRepository عن community/boot-ui', () => {
        const src = readFileSync(join(root, 'vite.config.mts'), 'utf8');
        expect(src).toContain('/src/app/services/secureStoreRecovery');
        expect(src).toContain("return 'app-local-storage-repository'");
        expect(src).not.toContain("return 'app-secure-store-recovery'");
        expect(src).toContain("return 'app-field-task-alerts'");
        expect(src).toContain("return 'app-calendar-authenticity'");
        // لا يبقى secureStoreRecovery داخل قائمة community-boot-deferred
        const communityPred = src.slice(
            src.indexOf('/src/app/runtime/communityBootHydrator'),
            src.indexOf("return 'app-community-boot-deferred'"),
        );
        expect(communityPred).not.toContain('secureStoreRecovery');
    });

    it('vite يعزل ملوّثات entry (search/kv/consolidation) عن index', () => {
        const src = readFileSync(join(root, 'vite.config.mts'), 'utf8');
        expect(src).toContain("return 'app-search-lifecycle-lite'");
        expect(src).toContain("return 'app-kv-store-admin'");
        expect(src).toContain("return 'app-consolidation-nav-overlay'");
        expect(src).toContain("return 'app-global-search-index'");
        expect(src).toContain("return 'app-criminal-dossier-open-lite'");
    });

    it('humanizeAppError يستورد SecureFetchError من الملف الخفيف لا SecureAPIClient', () => {
        const src = readFileSync(join(root, 'src/app/utils/humanizeAppError.ts'), 'utf8');
        expect(src).toContain("from '@/app/services/SecureFetchError'");
        expect(src).not.toContain("from '@/app/services/SecureAPIClient'");
    });
});
