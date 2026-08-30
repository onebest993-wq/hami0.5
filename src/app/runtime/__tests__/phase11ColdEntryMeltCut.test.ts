import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractViteFunction, readViteConfigSource } from './viteConfigSource';

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

    it('vite يعزل forum moderator/admin عن boot-runtime', () => {
        const src = readViteConfigSource();
        expect(src).toContain("return 'forum-moderator-ids'");
        expect(src).toContain("return 'forum-supabase-admin'");
        const boot = extractViteFunction(src, 'resolveBootRuntimeChunk');
        expect(boot).not.toContain('forumApiService');
        expect(boot).not.toContain('forumNotificationsWarmCache');
        expect(boot).not.toContain('/forum/supabaseAdmin');
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

    it('vite لا يمتص secureStoreRecovery داخل boot-runtime', () => {
        const src = readViteConfigSource();
        const boot = extractViteFunction(src, 'resolveBootRuntimeChunk');
        expect(boot).not.toContain('secureStoreRecovery');
        expect(boot).toContain('/src/app/services/SecureStoreService');
    });

    it('vite لا يمتص search/kv/consolidation داخل boot-runtime', () => {
        const src = readViteConfigSource();
        const boot = extractViteFunction(src, 'resolveBootRuntimeChunk');
        expect(boot).not.toContain('searchLifecycle');
        expect(boot).not.toContain('kv-store');
        expect(boot).not.toContain('consolidation');
        expect(boot).not.toContain('globalSearchIndex');
    });

    it('humanizeAppError يستورد SecureFetchError من الملف الخفيف لا SecureAPIClient', () => {
        const src = readFileSync(join(root, 'src/app/utils/humanizeAppError.ts'), 'utf8');
        expect(src).toContain("from '@/app/services/SecureFetchError'");
        expect(src).not.toContain("from '@/app/services/SecureAPIClient'");
    });
});
