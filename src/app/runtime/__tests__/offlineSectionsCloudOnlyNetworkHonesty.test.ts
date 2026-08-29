import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel: string): string {
    return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('أقسام محلية: شبكة للمزامنة/الحفظ السحابي فقط', () => {
    it('البحث الشامل لا يستدعي /api', () => {
        const overlay = read(
            'src/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearch.ts',
        );
        expect(overlay).not.toContain('/api/');
        expect(overlay).not.toContain('fetchSecure');
        expect(overlay).toContain('SecureStoreService');
    });

    it('التقويم يحفظ محلياً ثم KV + شواهد الحذف', () => {
        const calendar = read('src/app/services/cloud/lawyerCalendarCloud.ts');
        expect(calendar).toContain('lawyerCloudKv');
        expect(calendar).toContain('calendar:${event.userId}:${event.id}');
        expect(calendar).toContain('calendarTombstones');
        expect(calendar).toContain('isLawyerWorkCloudLive');
        expect(calendar).not.toContain('/api/forum/');
        expect(calendar).not.toContain('/api/comms-dispatcher');
    });

    it('المعاملات تحفظ عبر kv-proxy لا المنتدى — وplaintext محلي', () => {
        const tx = read('src/app/services/cloud/lawyerTransactionsCloud.ts');
        expect(tx).toContain('lawyerCloudKv');
        expect(tx).toContain('transactionsThreading:');
        expect(tx).toContain('isLawyerWorkCloudLive');
        expect(tx).not.toContain('/api/forum/');
        expect(tx).not.toContain('/api/task-help');
        expect(tx).not.toContain('CryptoService');
        const keys = read('src/app/services/secureStorageKeys.ts');
        expect(keys).toContain('isTransactionsLocalPlaintextKey');
    });

    it('التنفيذ يزامن الإضابير عبر BFF الملفات لا المنتدى', () => {
        const svc = read('src/app/services/SupabaseService.ts');
        expect(svc).toContain('/api/execution-files/upsert');
        expect(svc).toContain('/api/execution-files/list');
        expect(svc).toContain('/api/lawsuit-files/upsert');
        expect(svc).toContain('isLiveCloudSyncBucketEnabled');
        expect(svc).not.toContain('/api/forum/');
    });

    it('الإعدادات ترفع اللقطة عبر cloud-sync', () => {
        const sync = read('src/lib/syncService.js');
        expect(sync).toContain('/api/settings/cloud-sync');
        const hook = read('src/app/context/lawyerSettings/useLawyerSettingsCloudSync.ts');
        expect(hook).toContain('saveToCloud');
        expect(hook).toContain('isLocalOnlyModeEnabled');
    });

    it('المهام الميدانية تُحفظ محلياً؛ طلب العون شبكة منفصلة', () => {
        const persist = read('src/app/services/calendar/bridgePersistence/shared.ts');
        expect(persist).toContain('QUANTUM_TASKS_STORAGE_KEY');
        const help = read('src/app/services/taskHelp/taskHelpApiService.ts');
        expect(help).toContain('/api/task-help/');
        const inbox = read(
            'src/app/components/lawyer/dashboard/tasksManager/TaskHelpInboxPanel.tsx',
        );
        expect(inbox).toContain('TaskHelpApiService');
    });

    it('WIFE للعمل فقط: KV المحلي والزمنية خلف مزامنة العمل، CSRF ليس عند كل إقلاع', () => {
        const kv = read('src/app/services/cloud/lawyerCloudKv.ts');
        expect(kv).toContain('isWorkLocalKvMaterial');
        expect(kv).toContain('isLawyerWorkCloudLive');
        const gate = read('src/app/services/settings/lawyerWorkCloudGate.ts');
        expect(gate).toContain('calendar:');
        expect(gate).toContain('transactions:');
        expect(gate).toContain('vault:docs:');
        expect(gate).toContain('repository:docs:');
        expect(gate).not.toContain('profile:');
        expect(gate).not.toContain('follow:');
        const timeline = read('src/app/services/timelineEventsSupabase.ts');
        expect(timeline).toContain('canReachExecutionTimelineCloud');
        expect(timeline).toContain("isLiveCloudSyncBucketEnabled('execution')");
        expect(timeline).not.toContain('isLawyerWorkCloudLive');
        const liveBucket = read('src/app/services/settings/cloudSyncBucket.ts');
        expect(liveBucket).toContain('isCloudSyncEnabled');
        const lawyerDb = read('src/app/services/lawyerDbRuntime.ts');
        expect(lawyerDb).toContain('isLawyerWorkCloudLive');
        expect(lawyerDb).toContain('isLiveCloudSyncBucketEnabled');
        expect(lawyerDb).toContain('deadlines');
        expect(lawyerDb).not.toContain(': any');
        const repoSync = read('src/app/components/lawyer/CommunityScreen/legalRepositoryCloudSync.ts');
        expect(repoSync).toContain('isLawyerWorkCloudLive');
        const storage = read('src/app/services/storage/lawyerStorageRuntime.ts');
        expect(storage).toContain('WORK_LOCAL_UPLOAD_CATEGORIES');
        expect(storage).toContain("'vault'");
        expect(storage).toContain('work_cloud_upload_disabled');
        expect(storage).toContain('isLawyerWorkCloudLive');
        const urgent = read('src/app/services/urgent-actions-db.ts');
        expect(urgent).toContain('canReachUrgentCloud');
        expect(urgent).toContain('isLawyerWorkCloudLive');
        expect(urgent).toContain('lawyerCloudKv');
        expect(urgent).not.toContain("'/api/kv-proxy'");
        const csrf = read('src/app/security/ensureCsrfSessionReady.ts');
        expect(csrf).toContain('wasCsrfServerSessionEstablished');
        const tomb = read('src/app/services/calendarTombstones.ts');
        expect(tomb).toContain('isLawyerWorkCloudLive');
        const vault = read('src/app/services/vault/smartVaultRuntime.ts');
        expect(vault).toContain('isLawyerWorkCloudLive');
        const repo = read('src/app/services/lawyer-cloud.ts');
        expect(repo).toContain('isLawyerWorkCloudLive');
        expect(repo).toContain('repository:docs:${uid}:');
        expect(repo).toContain('repositoryCloudDocKey');
        expect(repo).not.toContain("getByPrefix('repository:docs:')");
        const init = read('src/app/security/SecurityInitializer.tsx');
        expect(init).not.toContain('void ensureCsrfSessionReady();');
        expect(init).not.toContain('INITIAL_SESSION');
        expect(init).toContain("event === 'SIGNED_IN'");
        expect(init).toContain('wasCsrfServerSessionEstablished');
        const api = read('src/app/services/SecureAPIClient.ts');
        expect(api).toContain('ensureCsrfBeforeMutatingWifeRequest');
        const profile = read('src/app/services/cloud/lawyerProfileCloud.ts');
        expect(profile).toContain('lawyerCloudKv');
        expect(profile).not.toContain('isLawyerWorkCloudLive');
        const engine = read('src/app/services/cloudSyncEngine.ts');
        expect(engine).toContain('isLawyerWorkCloudLive');
        expect(engine).toContain('isLiveCloudSyncBucketEnabled');
        const lawsuitMut = read('src/app/hooks/useLawsuitFileMutations.ts');
        expect(lawsuitMut).toContain("isLiveCloudSyncBucketEnabled('files')");
        const execFiles = read('src/app/hooks/useLawyerExecutionFiles.ts');
        expect(execFiles).toContain("isLiveCloudSyncBucketEnabled('execution')");
        const execLaw = read('src/app/utils/executionLawRemoteCache.ts');
        expect(execLaw).toContain('canReachPublishedLawCatalog');
        const legalCodes = read(
            'src/app/components/lawyer/criminal-system/legalCodes/legalCodesDataCache.ts',
        );
        expect(legalCodes).toContain('canReachPublishedLawCatalog');
        const checkpoint = read('src/app/services/cloud/workCloudCheckpoint.ts');
        expect(checkpoint).toContain('/api/work-checkpoints');
        expect(checkpoint).toContain('isLawyerWorkCloudLive');
        const checkpointRoute = read('src/app/api/work-checkpoints/route.ts');
        expect(checkpointRoute).toContain('requireWifeCloudWrite');
        expect(checkpointRoute).toContain('isPostgresUuidSubject');
        const supabaseWrites = read('src/app/services/SupabaseService.ts');
        expect(supabaseWrites).toContain('scheduleWorkCheckpointAfterCloudWrite');
        const runAll = read('src/app/services/cloudSync/runCloudSyncAllNow.ts');
        expect(runAll).toContain('pushWorkCloudCheckpointNow');
        const wipeCloud = read('src/app/api/settings/wipe/wipeAuthenticatedUserCloud.ts');
        expect(wipeCloud).toContain('lawyer_work_checkpoints');
        const redTeam = read('src/app/security/__tests__/wifeRedTeamHelpers.ts');
        expect(redTeam).toContain("path: '/api/work-checkpoints'");
        const wipeSqlFiles = fs
            .readdirSync(path.join(root, 'supabase/migrations'))
            .filter((f) => f.includes('wipe_user_application_data_work_checkpoints'));
        expect(wipeSqlFiles.length).toBeGreaterThan(0);
        expect(read(`supabase/migrations/${wipeSqlFiles[0]}`)).toContain(
            'DELETE FROM public.lawyer_work_checkpoints',
        );
    });

    it('الإشعارات والمنتدى لهما شبكة صريحة بلا مراسلات', () => {
        const notif = read('src/app/services/notifications/notificationClientPersist.ts');
        expect(notif).toContain('/api/notifications/list');
        expect(notif).not.toContain('/api/comms-dispatcher');
        const forum = read('src/app/services/forumApiService.ts');
        expect(forum).toContain('/api/forum/');
    });

    it('مقر القيادة يسيطر على الحذف والحظر والإرجاع', () => {
        const dash = read('src/app/components/AdminDashboard.tsx');
        expect(dash).toContain('HqReportsInbox');
        expect(dash).toContain('HqForumAdminPanel');
        expect(dash).not.toContain('HqConsultationsPanel');
        expect(dash).toContain('HeadquartersPanel');
        const forum = read('src/app/components/admin/HqForumAdminPanel.tsx');
        expect(forum).toContain('/api/forum/ban');
        expect(forum).toContain("action: 'unban'");
        expect(forum).toContain('HqConsultationsPanel');
        const reports = read('src/app/components/admin/HqReportsInbox.tsx');
        expect(reports).toContain('delete_post');
        const consultations = read('src/app/components/admin/HqConsultationsPanel.tsx');
        expect(consultations).toContain('/api/admin/consultations');
        expect(consultations).toContain("'pin'");
        const dashOps = read('src/app/components/AdminDashboard.tsx');
        expect(dashOps).toContain('HqAuditLogPanel');
        expect(dashOps).toContain('HqTrustedDevicesPanel');
        const users = read('src/app/data/admin/SupabaseAdminRepository.ts');
        expect(users).not.toContain('/api/admin/ban');
        expect(users).toContain('/api/admin/account');
        expect(users).toContain('/api/admin/notify');
        expect(users).not.toContain('toggleUserStatus');
        const banRoute = read('src/app/api/admin/ban/route.ts');
        expect(banRoute).toContain('requireTrustedHeadquartersAdmin');
        const hqUsers = read('src/app/components/admin/HeadquartersPanel.tsx');
        expect(hqUsers).toContain('HeadquartersUserRow');
        expect(hqUsers).toContain('unfreezeAccount');
        expect(hqUsers).not.toContain('toggleStatus');
        const hqUserRow = read('src/app/components/admin/HeadquartersUserRow.tsx');
        expect(hqUserRow).toContain('HQ_FREEZE_DURATION_OPTIONS');
    });

    it('التشفير المحلي لا ينتظر فك الجزائي/المنتدى ولا شبكة على مسار الدعاوى والتقويم', () => {
        const secure = read('src/app/services/SecureStoreService.ts');
        const getItem = secure.slice(
            secure.indexOf('static async getItem('),
            secure.indexOf('static async deleteItem('),
        );
        expect(getItem).toContain('ensureWebInfrastructureReady');
        expect(getItem).not.toContain('ensurePersistedReady');
        expect(getItem).not.toContain('/api/');
        expect(getItem).not.toContain('fetch(');

        const lawsuitReady = secure.slice(
            secure.indexOf('static async ensureLawsuitKeysReady'),
            secure.indexOf('static async ensureExecutionIndexReady'),
        );
        expect(lawsuitReady).toContain('LAWSUIT_SEGMENT_WARM_KEYS');
        expect(lawsuitReady).not.toContain('hami:lawsuit:dossier-tombstones:v1');
        expect(lawsuitReady).not.toContain('PROTECTED_WARM_KEYS');
        expect(lawsuitReady).not.toContain('hami:criminal:store');

        const keys = read('src/app/services/dossierPersistence/dossierStorageKeys.ts');
        expect(keys).toContain('EXECUTION_INDEX_WARM_KEYS');
        expect(keys).not.toMatch(
            /EXECUTION_INDEX_WARM_KEYS = \[[\s\S]*hami:execution:dossier-tombstones:v1/,
        );

        const execReady = secure.slice(
            secure.indexOf('static async ensureExecutionIndexReady'),
            secure.indexOf('static async ensureKeysReady'),
        );
        expect(execReady).toContain('warmPersistedKeys(EXECUTION_INDEX_WARM_KEYS)');
        expect(execReady).not.toContain('warmPersistedKeys(PROTECTED_WARM_KEYS)');
        expect(execReady).not.toContain('hami:criminal:store');

        const dossier = read('src/app/services/dossierPersistence/dossierPersistenceService.ts');
        expect(dossier).toContain('ensureLawsuitKeysReady');
        expect(dossier).toContain('ensureExecutionIndexReady');
        expect(dossier).toContain('isLawyerWorkCloudLive');
        const loadAsync = dossier.slice(
            dossier.indexOf('export async function loadDossierCollectionAsync'),
            dossier.indexOf('export type PersistDossierOptions'),
        );
        expect(loadAsync).not.toContain('ensurePersistedReady');

        const repo = read('src/app/infrastructure/persistence/LocalStorageRepository.ts');
        const loadAsyncRepo = repo.slice(
            repo.indexOf('public async loadAsync'),
            repo.indexOf('public remove('),
        );
        expect(loadAsyncRepo).not.toContain('ensurePersistedReady');
        expect(loadAsyncRepo).toContain('getItem(key)');

        const engine = read('src/app/services/cloudSyncEngine.ts');
        expect(engine).toContain('ensureLawsuitDossierTombstonesReadable');
        expect(engine).toContain('ensureExecutionDossierTombstonesReadable');

        const execWarm = read('src/app/runtime/executionWorkspaceWarm.ts');
        expect(execWarm).toContain('ensureExecutionIndexReady');
        expect(execWarm).not.toContain('ensurePersistedReady');

        const notes = read('src/app/hooks/useLawyerGlobalNotes.ts');
        expect(notes).toContain('ensureKeysReady');
        expect(notes).not.toContain('ensurePersistedReady');

        const calendar = read('src/app/services/cloud/lawyerCalendarCloud.ts');
        expect(calendar).not.toContain('ensurePersistedReady');
        expect(calendar).toContain('isLawyerWorkCloudLive()');
        expect(calendar).toContain('setItemSync(CALENDAR_LOCAL_KEY');

        const recovery = read('src/app/domain/lawsuit/lawsuitWorkspaceRecovery.ts');
        expect(recovery).toContain('readSecureOrDrainLegacySync');
        expect(recovery).toContain('fullPersistReady === true');

        const shareStore = read('src/app/services/caseShare/caseShareLocalStore.ts');
        expect(shareStore).not.toContain('ensurePersistedReady');
        expect(shareStore).toContain('getItem(CASE_SHARE_LOCAL_KEY)');
    });
});
