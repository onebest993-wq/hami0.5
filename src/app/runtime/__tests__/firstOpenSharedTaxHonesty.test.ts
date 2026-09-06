import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('first-open shared-tax honesty', () => {
    it('أوراق JSON/الحياة/الحركة تُسمّى قبل boot-runtime وقبل persist-pipeline', () => {
        const vite = read('vite.config.mts');
        expect(vite).toContain('function resolveSharedRuntimeLeafChunk');
        const sharedPos = vite.indexOf('const sharedLeafChunk = resolveSharedRuntimeLeafChunk(id)');
        const bootPos = vite.indexOf('const bootChunk = resolveBootRuntimeChunk(id)');
        const persistPos = vite.indexOf('const executionDashboardSupportChunk = resolveExecutionDashboardSupportChunk(id)');
        expect(sharedPos).toBeGreaterThan(0);
        expect(bootPos).toBeGreaterThan(sharedPos);
        expect(persistPos).toBeGreaterThan(bootPos);
        expect(vite).toContain("return 'bff-json-leaf'");
        expect(vite).toContain("return 'local-ymd'");
        expect(vite).toContain("return 'calendar-cloud-runtime'");
        expect(vite).toContain("return 'calendarCloudLoader'");
        expect(vite).toContain("return 'calendar-events-cache'");
        expect(vite).toContain("return 'calendar-storage-keys'");
        expect(vite).toContain("return 'calendar-radar-48h'");
        expect(vite).toContain("return 'home-hub-radar-peek'");
        expect(vite).toContain("return 'notification-model'");
        expect(vite).toContain("return 'notification-peek-lite'");
        expect(vite).toContain("return 'kv-proxy-key-ownership'");
        expect(vite).toContain("return 'cloud-sync-env'");
        expect(vite).toContain("return 'lawyer-work-cloud-gate'");
        expect(vite).toContain("return 'hami-uuidv4'");
        expect(vite).toContain("return 'criminal-cases-storage'");
        expect(vite).toContain("return 'execution-appeal-engine'");
        expect(vite).toContain("return 'executor-seizure-decision-queue'");
        const peekLiteFn = vite.slice(
            vite.indexOf('function resolveLawyerBootPeekLiteChunk'),
            vite.indexOf('function resolveHamiOverlaySnapLiteChunk'),
        );
        expect(peekLiteFn).toContain('homeHubRadarWarmCache');
        expect(peekLiteFn).not.toContain('homeHubRadarPeek');
        expect(vite).toContain("return 'schedule-chrome-lite'");
        expect(vite).toContain('function resolveScheduleChromeSharedChunk');
        const scheduleChromePos = vite.indexOf(
            'const scheduleChromeChunk = resolveScheduleChromeSharedChunk(id)',
        );
        expect(scheduleChromePos).toBeGreaterThan(sharedPos);
        expect(bootPos).toBeGreaterThan(scheduleChromePos);
        expect(vite).toContain("return 'app-state-events'");
        expect(vite).toContain("return 'overlay-motion-runtime'");
        expect(vite).toContain("return 'overlay-portal'");
        expect(vite).toContain("return 'device-performance-tier'");
        expect(vite).toContain("return 'schedule-idle-work'");
        expect(vite).toContain("return 'hami-debug'");
        expect(vite).toContain("return 'preloadable-lazy'");
        expect(vite).toContain("return 'execution-storage-cache'");
        expect(vite).toContain("return 'secure-api-client'");
        expect(vite).toContain("return 'wife-hmac-signing'");
        expect(vite).toContain("return 'sentry-build-policy'");
        expect(vite).toContain("return 'perf-sentry-reporting'");
        expect(vite).toContain("return 'tx-input-security'");
        expect(vite).toContain("return 'secure-json-legacy'");
        expect(vite).toContain("return 'lawyer-repository-cloud'");
        expect(vite).toContain("return 'hami-dialog-lite'");
        expect(vite).toContain("return 'storage-encryption-error'");
        expect(vite).toContain("return 'tx-secure-persist'");
        expect(vite).toContain("return 'transactions-threading-store'");
        expect(vite).toContain("return 'workspace-pin-button'");
        expect(vite).toContain("return 'workspace-pin-builders'");
        const pinButtonPos = vite.indexOf('function resolveWorkspacePinButtonChunk');
        const pinBuildersPos = vite.indexOf('function resolveWorkspacePinBuildersChunk');
        const homeHubPos = vite.indexOf('function resolveLawyerHomeHubChunk');
        expect(pinButtonPos).toBeGreaterThan(0);
        expect(pinBuildersPos).toBeGreaterThan(pinButtonPos);
        expect(homeHubPos).toBeGreaterThan(pinBuildersPos);
        expect(vite).not.toContain("return 'lawyer-lucide-icons'");
        expect(vite).not.toContain('return `ui-icon-${iconMatch[1]}`');
    });

    it('calendarStorageKeys ورقة بلا اعتماديات؛ اللقطة تستوردها لا خط persist', () => {
        const leaf = read('src/app/services/calendar/calendarStorageKeys.ts');
        expect(leaf).toContain('CALENDAR_EVENTS_STORAGE_KEY');
        expect(leaf).toContain('CALENDAR_TOMBSTONES_STORAGE_KEY');
        expect(leaf).not.toMatch(/^import /m);
        expect(read('src/app/services/calendar/calendarLocalSnapshot.ts')).toContain(
            "from '@/app/services/calendar/calendarStorageKeys'",
        );
        expect(read('vite.config.mts')).toContain("return 'calendar-storage-keys'");
    });

    it('جسر التقويم لا يستورد مصنع الإضبارة لأجل ثابت أول مرافعة', () => {
        const shared = read('src/app/services/calendar/bridgePersistence/shared.ts');
        expect(shared).toContain("from '@/app/domain/lawsuit/firstHearingTimelineId'");
        expect(shared).not.toContain("from '@/app/domain/lawsuit/lawsuitFileFactory'");
        const leaf = read('src/app/domain/lawsuit/firstHearingTimelineId.ts');
        expect(leaf).toContain("appt_first_hearing");
        expect(leaf).not.toMatch(/^import /m);
    });

    it('مرآة جدول الدعوى لا تسحب عرض المراحل ولا برميل الأحكام', () => {
        const mirror = read('src/app/services/lawsuitTimelineCalendarMirror.ts');
        expect(mirror).toContain("from '@/app/components/lawyer/personal-status/personalStatusAppealStageHelpers'");
        expect(mirror).toContain("from '@/app/components/lawyer/smart-modal/smartFile/judgmentStageNames'");
        expect(mirror).not.toContain('personalStatusStageDisplay');
        expect(mirror).not.toContain('extraordinaryAppealGateway');
        expect(mirror).not.toContain("from '@/app/components/lawyer/smart-modal/smartFile/judgmentTypes'");
        expect(mirror).not.toContain('lawsuitFileFactory');
        const helpers = read(
            'src/app/components/lawyer/personal-status/personalStatusAppealStageHelpers.ts',
        );
        expect(helpers).toContain("from './personalStatusFileKind'");
        expect(helpers).not.toContain('personalStatusValidation');
        expect(helpers).not.toContain('wordLists');
        expect(helpers).not.toContain('LawyerNewCase/validation');
        const kind = read(
            'src/app/components/lawyer/personal-status/personalStatusFileKind.ts',
        );
        expect(kind).toContain('PERSONAL_STATUS_STAGE_OPTIONS');
        expect(kind).toContain('isPersonalStatusFile');
        expect(kind).not.toContain('wordLists');
        expect(kind).not.toContain('LawyerNewCase/validation');
        expect(kind).not.toContain('stepperPipeline');
    });

    it('localYmd ورقة بلا اعتماديات؛ صدفة التقويم تستوردها لا خط إقلاع التنفيذ', () => {
        const leaf = read('src/app/utils/localYmd.ts');
        expect(leaf).toContain('export function getLocalTodayYmd');
        expect(leaf).toContain('export function formatDateToLocalYmd');
        expect(leaf).not.toMatch(/^import /m);
        expect(read('src/app/components/lawyer/dashboard/schedule/radarOpenInstantChromeModel.ts')).toContain(
            "from '@/app/utils/localYmd'",
        );
        expect(read('src/app/components/lawyer/SmartLegalRadar/eventCardViewModel.ts')).toContain(
            "from '@/app/utils/localYmd'",
        );
        expect(read('src/app/components/lawyer/dashboard/schedule/radarOpenInstantChromeModel.ts')).not.toContain(
            'ExecutionDashboard',
        );
        expect(read('src/app/components/lawyer/SmartLegalRadar/eventCardViewModel.ts')).not.toContain(
            'ExecutionDashboard',
        );
        expect(read('vite.config.mts')).toContain("return 'local-ymd'");
    });

    it('صدفة التقويم المشتركة تُسمّى خارج MainView حتى لا يستوردها Host من المنزل', () => {
        const vite = read('vite.config.mts');
        expect(vite).toContain("return 'schedule-chrome-lite'");
        expect(vite).toContain('calendarShellSession');
        expect(vite).toContain('legalDeadlineEngine');
        expect(vite).toContain('calendarEventForm');
        expect(vite).toContain('calendarEventRecord');
        expect(vite).toContain('radarOpenInstantChromeClasses');
        expect(vite).toContain('RadarEventFormInstantCover');
        expect(read('src/app/services/calendar/calendarEventForm.ts')).toContain('EMPTY_FORM');
        expect(read('src/app/components/lawyer/SmartLegalRadar.tsx')).toContain(
            'RadarEventFormInstantCover',
        );
        expect(read('src/app/components/lawyer/dashboard/schedule/RadarOpenInstantAddHost.tsx')).toContain(
            'RadarEventFormInstantCover',
        );
    });

    it('hop السحابة مسمّى خارج lawyer-boot-peek حتى لا يسحب المضيف أرشيف المنزل', () => {
        const vite = read('vite.config.mts');
        expect(vite).toContain("return 'calendar-cloud-runtime'");
        expect(vite).toContain("return 'calendarCloudLoader'");
        expect(vite).toContain("return 'calendar-events-cache'");
        const runtime = read('src/app/services/calendar/calendarCloudRuntime.ts');
        expect(runtime).toContain('hop ثانٍ');
        expect(runtime).toContain("import('@/app/services/calendar/calendarCloudLoader')");
        expect(runtime).not.toContain('homeHubRadarWarmCache');
        expect(read('src/app/components/lawyer/hooks/useCalendarData.ts')).toContain(
            "from '@/app/services/calendar/calendarCloudRuntime'",
        );
        expect(read('src/app/components/lawyer/hooks/useCalendarData.ts')).not.toContain(
            'homeHubRadarWarmCache',
        );
        const radar = read('src/app/workspace/useCalendarRadar48h.ts');
        expect(radar).toContain("from '@/app/services/calendar/calendarCloudRuntime'");
        expect(radar).toContain('fetchCalendarEvents');
        expect(radar).toContain("from '@/app/services/alerts/homeHubRadarPeek'");
        expect(radar).not.toContain('homeHubRadarWarmCache');
        expect(radar).toContain("from '@/app/services/calendar/calendarEventAuthorship'");
        expect(radar).not.toContain("from '@/app/services/calendarAuthenticity'");
        expect(radar).not.toMatch(/from ['"]@\/app\/services\/cloud\/lawyerCalendarCloud['"]/);
        expect(radar).not.toContain('CalendarDB');
        const model = read('src/app/infrastructure/notificationModel.ts');
        expect(model).toContain('export function deriveNotificationCategory');
        expect(model).not.toMatch(/^import /m);
        const peekNotif = read('src/app/infrastructure/notificationPeekLite.ts');
        expect(peekNotif).toContain('peekLocalNotifications');
        expect(peekNotif).not.toMatch(/from ['"]@\/app\/infrastructure\/NotificationRepository['"]/);
        expect(peekNotif).not.toContain('notificationStore');
        expect(read('src/app/services/forum/forumNotificationsWarmCache.ts')).toContain(
            "from '@/app/infrastructure/notificationPeekLite'",
        );
        expect(read('src/app/services/forum/forumNotificationsWarmCache.ts')).not.toContain(
            "from '@/app/stores/notificationStore'",
        );
        expect(read('src/app/services/cloud/lawyerCommunityCloud.ts')).toContain(
            "from '@/app/utils/uuidv4'",
        );
        expect(read('src/app/services/cloud/lawyerCommunityCloud.ts')).not.toContain(
            "from '@/app/services/cloud/lawyerCloudKv'",
        );
        expect(read('src/app/utils/uuidv4.ts')).not.toMatch(/^import /m);
        expect(read('src/app/security/kvProxyKeyOwnership.ts')).not.toMatch(/^import /m);
        expect(read('vite.config.mts')).toContain("return 'lawyer-work-cloud-gate'");
        expect(read('vite.config.mts')).toContain("return 'notification-model'");
        expect(read('vite.config.mts')).toContain("return 'notification-peek-lite'");
        const liveAuth = read('src/app/utils/liveAuthUserId.ts');
        expect(liveAuth).toContain(
            "import('@/app/services/auth/resetLawyerSessionUiForIdentityChange')",
        );
        expect(liveAuth).not.toMatch(
            /from '@\/app\/services\/auth\/resetLawyerSessionUiForIdentityChange'/,
        );
        expect(liveAuth).not.toContain('userIdentityUiState');
        expect(liveAuth).not.toContain('homeHubRadarWarmCache');
    });

    it('bffJsonResponse ورقة بلا اعتماديات؛ OTP يستوردها لا خط أنابيب التنفيذ', () => {
        const leaf = read('src/app/utils/bffJsonResponse.ts');
        expect(leaf).toMatch(/export async function parseJsonResponse/);
        expect(leaf).not.toMatch(/^import /m);
        expect(read('src/app/services/auth/authOtpClient.ts')).toContain(
            "from '@/app/utils/bffJsonResponse'",
        );
        expect(read('src/app/bootstrap/lawyerAuth/LawyerAuthOtpPanel.tsx')).not.toContain(
            'ExecutionDashboard',
        );
        expect(read('src/app/bootstrap/lawyerAuth/LawyerAuthOtpPanel.tsx')).not.toContain(
            'persist-pipeline',
        );
    });

    it('المنتدى يستورد الحركة والبوابة من أوراقهما لا من ExecutionDashboard', () => {
        const overlay = read('src/app/components/lawyer/CommunityScreen/forumOverlayPortal.ts');
        expect(overlay).toContain("from '@/app/utils/overlayPortal'");
        expect(overlay).not.toContain('ExecutionDashboard');
        const sheet = read(
            'src/app/components/lawyer/CommunityScreen/components/AddQuestionSheet.tsx',
        );
        expect(sheet).toContain("from '@/app/motion/overlayMotionRuntime'");
        expect(sheet).not.toContain("from 'motion/react'");
        const vite = read('vite.config.mts');
        expect(vite).toContain("return 'overlay-motion-runtime'");
        const appStateContent = read('src/app/runtime/appStateEvents.ts');
        const allImports = [...appStateContent.matchAll(/^import .*from\s+['"]([^'"]+)['"]/gm)];
        const heavyImports = allImports.filter(([, mod]) => mod !== '@/app/runtime/eventConstants');
        expect(heavyImports).toHaveLength(0);
        expect(appStateContent).not.toContain('ExecutionDashboard');
        expect(appStateContent).not.toContain('@capacitor');
    });

    it('أوراق Sentry/التخزين/المستودع تُسمّى خارج persist-foundation', () => {
        const vite = read('vite.config.mts');
        expect(vite).toContain('calendarSentryReporting');
        expect(vite).toContain('forumSentryReporting');
        expect(vite).toContain('transactionsInputSecurity');
        expect(vite).toContain('readSecureOrDrainLegacySync');
        expect(vite).toContain('lawyerRepositoryCloud');
        expect(vite).toContain("return 'secure-json-legacy'");
        const persistFoundation = vite.slice(
            vite.indexOf('function resolveHamiPersistFoundationChunk'),
            vite.indexOf('function resolveHamiPersistFoundationChunk') + 600,
        );
        expect(persistFoundation).not.toContain('readSecureOrDrainLegacySync');
        expect(vite).toContain('storageEncryptionError');
        expect(vite).toContain('persistTransactionsSecure');
        expect(vite).toContain('transactionsThreadingStoreRuntime');
        expect(read('src/app/services/storage/storageEncryptionError.ts')).toContain(
            'export class StorageEncryptionError',
        );
        expect(read('src/app/services/transactions/notifyTransactionsPersistFailure.ts')).toContain(
            "from '@/app/services/storage/storageEncryptionError'",
        );
        expect(read('src/app/services/cloud/lawyerRepositoryCloud.ts')).toContain(
            'export const RepositoryDB',
        );
        expect(read('src/app/services/lawyer-cloud.ts')).toContain(
            "from '@/app/services/cloud/lawyerRepositoryCloud'",
        );
        expect(read('src/app/services/lawyer-cloud.ts')).not.toContain(
            "from '@/app/services/storage/readSecureOrDrainLegacySync'",
        );
    });

    it('المنتدى والإعدادات لا يسحبان برميل lawyer-cloud أو مسح الحساب عند أول تقييم', () => {
        const search = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useCommunityScreenSearchOverlay.ts',
        );
        expect(search).toMatch(/import type \{[^}]*\} from '@\/app\/services\/lawyer-cloud'/);
        expect(search).toContain("import('@/app/services/cloud/lawyerRepositoryCloud')");
        expect(search).not.toMatch(/^import \{[^}]*RepositoryDB/m);

        const bootstrap = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useLegalRepositoryBootstrap.ts',
        );
        expect(bootstrap).toContain("from '@/app/services/cloud/lawyerRepositoryCloud'");
        expect(bootstrap).not.toContain("from '@/app/services/lawyer-cloud'");

        const account = read(
            'src/app/components/lawyer/HamiSettings/account/useAccountSectionActions.ts',
        );
        expect(account).toContain("import('@/app/services/settings/deleteLawyerAccount')");
        expect(account).toContain('@/app/services/settings/verifySensitiveSettingsAction');
        expect(account).not.toMatch(/^import \{[^}]*deleteLawyerAccount/m);
        expect(account).not.toMatch(/^import \{[^}]*verifySensitiveSettingsAction/m);

        const retry = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useForumRepositoryIndexRetry.ts',
        );
        expect(retry).toContain("import('@/app/services/forum/forumRepositoryIndexRetryWorker')");
        expect(retry).not.toMatch(/^import \{[^}]*startForumRepositoryIndexRetryWorker/m);

        const addTask = read(
            'src/app/components/lawyer/TransactionsThreading/AddTaskBottomSheet.tsx',
        );
        expect(addTask).toContain('@/app/modules/transactionsThreading/store');
        expect(addTask).toMatch(/await import\(/);
        expect(addTask).not.toMatch(/^import \{[^}]*useTransactionsThreadingStore/m);

        const forumCore = read('src/app/services/forum/forumApi/forumApiClientCore.ts');
        expect(forumCore).toContain("import('@/app/lib/supabase-client')");
        expect(forumCore).not.toMatch(/^import \{ supabase \} from '@\/app\/lib\/supabase-client'/m);

        const attach = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useCommunityAddQuestionAttachment.ts',
        );
        expect(attach).toContain("import('@/app/services/storage/lawyerStorageRuntime')");
        expect(attach).not.toMatch(/^import \{[^}]*LawyerStorage/m);

        const secureApi = read('src/app/services/SecureAPIClient.ts');
        expect(secureApi).toContain("import('@/app/lib/supabase-client')");
        expect(secureApi).not.toMatch(/^import \{ supabase \} from '@\/app\/lib\/supabase-client'/m);

        const wifeSigning = read('src/app/services/secureApiWifeSigning.ts');
        expect(wifeSigning).toContain("import('./RequestSigningService')");
        expect(wifeSigning).not.toMatch(/^import \{ RequestSigningService \}/m);

        const notif = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useForumAppBarNotifications.ts',
        );
        expect(notif).toContain("from '@/app/runtime/forumSurfaceLive'");
        expect(notif).not.toContain('forumOpenIntent');

        const searchRow = read(
            'src/app/components/lawyer/CommunityScreen/components/ForumAppBarSearchRow.tsx',
        );
        expect(searchRow).toContain('LazyForumAppBarFilterOverlays');
        expect(searchRow).toContain('communityScreenFilterLazy');
        expect(searchRow).not.toContain('communityScreenLazyEntries');
        expect(searchRow).not.toContain("from './ForumAppBarFilterOverlays'");

        const compose = read(
            'src/app/components/lawyer/CommunityScreen/components/CommunityScreenComposeOverlays.tsx',
        );
        expect(compose).toContain('LazyForumDeleteConfirmModal');
        expect(compose).not.toContain("from '@/app/components/lawyer/CommunityScreen/components/ForumDeleteConfirmModal'");

        const attachUrl = read(
            'src/app/components/lawyer/CommunityScreen/useForumAttachmentUrl.ts',
        );
        expect(attachUrl).toContain("from '@/app/services/forum/forumAttachmentResolve'");
        expect(attachUrl).not.toContain('forumAttachmentService');

        const voice = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useCommunityAddQuestionVoice.ts',
        );
        expect(voice).toContain("import('@/app/services/platform/requestMicrophoneStream')");
        expect(voice).not.toMatch(/^import \{[^}]*requestMicrophoneStream/m);
    });

    it('أول فتح الخلاصة لا يسحب برميل lazyComponents ولا تسخين النية ثابتاً', () => {
        const interactions = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useCommunityScreenInteractions.ts',
        );
        expect(interactions).toContain("import('@/app/runtime/royalLawyerProfileLoader')");
        expect(interactions).not.toContain("from '@/app/utils/lazyComponents'");
        expect(interactions).not.toContain("from '@/app/runtime/royalLawyerProfileLoader'");

        const controller = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useCommunityScreenController.ts',
        );
        expect(controller).toContain("import('@/app/hooks/lawyerDashboard/forumIntentWarm')");
        expect(controller).not.toMatch(
            /from ['"]@\/app\/hooks\/lawyerDashboard\/forumIntentWarm['"]/,
        );

        const compose = read(
            'src/app/components/lawyer/CommunityScreen/components/CommunityScreenComposeOverlays.tsx',
        );
        expect(compose).toContain('LazyForumDeleteConfirmModal');
        expect(compose).toContain('communityScreenLazyEntries');
        expect(compose).not.toContain('legalRepositoryLazyModals');
        expect(compose).not.toContain(
            "from '@/app/components/lawyer/CommunityScreen/components/ForumDeleteConfirmModal'",
        );

        const overlay = read(
            'src/app/components/lawyer/CommunityScreen/components/ForumMemberProfileOverlay.tsx',
        );
        expect(overlay).toContain("import('@/app/runtime/royalLawyerProfileLoader')");
        expect(overlay).not.toContain("from '@/app/utils/lazyComponents'");
        expect(overlay).not.toContain("from '@/app/runtime/royalLawyerProfileLoader'");

        const loader = read('src/app/runtime/royalLawyerProfileLoader.ts');
        expect(loader).toContain("import('@/app/services/profile/profileWarmCache')");
        expect(loader).not.toMatch(/from ['"]@\/app\/services\/profile\/profileWarmCache['"]/);

        const lazyEntries = read(
            'src/app/components/lawyer/CommunityScreen/communityScreenLazyEntries.tsx',
        );
        expect(lazyEntries).toContain('LazyForumDeleteConfirmModal');
        expect(lazyEntries).toContain('forumDeleteConfirmImport');
        expect(lazyEntries).not.toContain('LazyForumAppBarFilterOverlays');
        expect(lazyEntries).not.toContain('forumFilterOverlaysImport');
        const filterLazy = read(
            'src/app/components/lawyer/CommunityScreen/communityScreenFilterLazy.tsx',
        );
        expect(filterLazy).toContain('LazyForumAppBarFilterOverlays');
        expect(filterLazy).toContain('forumFilterOverlaysImport');

        const content = read(
            'src/app/components/lawyer/CommunityScreen/CommunityScreenContent.tsx',
        );
        expect(content).toContain('useForumRepositoryIndexRetry');
        expect(content).toContain('communityOverlaysNeeded');
        expect(content).toContain("import('./components/CommunityScreenOverlays')");
        expect(content).not.toMatch(
            /from ['"]\.\/components\/CommunityScreenOverlays['"]/,
        );
        const overlaysNeeded = read(
            'src/app/components/lawyer/CommunityScreen/communityOverlaysNeeded.ts',
        );
        expect(overlaysNeeded).toContain('isAddQuestionOpen');
        expect(overlaysNeeded).toContain('isSearchOpen');
        expect(overlaysNeeded).toContain('profileView');

        const screen = read('src/app/components/lawyer/CommunityScreen.tsx');
        expect(screen).toContain("import('./CommunityScreen/communityScreenLazySections')");
        expect(screen).toContain('prefetchPersistedCommunitySectionChunk');
        expect(screen).not.toMatch(
            /from ['"]\.\/CommunityScreen\/communityScreenLazySections['"]/,
        );

        const panes = read(
            'src/app/components/lawyer/CommunityScreen/components/CommunityScreenLazySectionPanes.tsx',
        );
        expect(panes).toContain('LazyLegalRepository');
        expect(panes).toContain("import('@/app/components/lawyer/CommunityScreen/components/LegalRepository')");
        expect(panes).not.toContain('communityScreenLazySections');

        const chrome = read(
            'src/app/components/lawyer/CommunityScreen/components/CommunityScreenBodyChrome.tsx',
        );
        expect(chrome).toContain('LazyForumFollowingPanel');
        expect(chrome).toContain('ForumFollowingInstantCover');
        expect(chrome).toContain('importForumFollowingPanel');
        expect(chrome).not.toContain('communityScreenLazySections');
        expect(chrome).not.toContain('fallback={null}');

        const mount = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useCommunityScreenLazySectionMount.ts',
        );
        expect(mount).toContain('prefetchOpenForumInnerSectionChunks');
        expect(mount).toContain(
            "import('@/app/components/lawyer/CommunityScreen/communityScreenLazySections')",
        );
        expect(mount).not.toMatch(
            /from ['"]@\/app\/components\/lawyer\/CommunityScreen\/communityScreenLazySections['"]/,
        );

        const innerLazy = read(
            'src/app/components/lawyer/CommunityScreen/communityScreenLazySections.tsx',
        );
        expect(innerLazy).toContain('prefetchCommunityRepositorySectionChunk');
        expect(innerLazy).toContain('settleIdleChunkPrefetch');
        expect(innerLazy).toContain("from '@/app/components/lawyer/CommunityScreen/communityFollowingPrefetch'");
        expect(innerLazy).not.toContain('export const LazyLegalRepository');
        expect(innerLazy).not.toContain('export const LazyForumFollowingPanel');
        expect(innerLazy).not.toContain('.catch(() => undefined)');

        const tools = read(
            'src/app/components/lawyer/CommunityScreen/components/ForumAppBarTools.tsx',
        );
        expect(tools).toContain('LazyForumNotificationsPanel');
        expect(tools).toContain("from '../communityNotificationsPrefetch'");
        expect(tools).toContain("from '../communityFollowingPrefetch'");
        expect(tools).toContain('onPointerDown={prefetchForumNotificationsPanel}');
        expect(tools).toContain('onPointerDown={prefetchCommunityFollowingPanel}');
        expect(tools).not.toMatch(/from ['"]\.\/ForumNotificationsPanel['"]/);
        expect(tools).not.toContain('communityScreenLazySections');
        expect(tools).not.toContain('notifPanelArmed');
        expect(tools).not.toMatch(/function prefetchCommunityFollowingPanel/);
        expect(tools).not.toContain('.catch(() => undefined)');

        const followingPrefetch = read(
            'src/app/components/lawyer/CommunityScreen/communityFollowingPrefetch.ts',
        );
        expect(followingPrefetch).toContain('settleIdleChunkPrefetch');
        expect(followingPrefetch).toContain(
            "import('@/app/components/lawyer/CommunityScreen/components/ForumFollowingPanel')",
        );
        expect(followingPrefetch).not.toContain('.catch(() => undefined)');

        const notifPrefetch = read(
            'src/app/components/lawyer/CommunityScreen/communityNotificationsPrefetch.ts',
        );
        expect(notifPrefetch).toContain('settleIdleChunkPrefetch');
        expect(notifPrefetch).toContain(
            "import('@/app/components/lawyer/CommunityScreen/components/ForumNotificationsPanel')",
        );
        expect(notifPrefetch).not.toContain('.catch(() => undefined)');

        const settle = read(
            'src/app/components/lawyer/CommunityScreen/settleIdleChunkPrefetch.ts',
        );
        expect(settle).toContain('readIdlePrefetchFailures');
        expect(settle).toContain('failures.push');
        expect(settle).toContain('[hami:prefetch]');
        expect(settle).toContain('import.meta.env.DEV');
    });

    it('واجهة المنتدى لا تقيّم تنبيهات/تعليقات/اجتماعي ولا مخزن الإشعارات عند أول فتح', () => {
        const api = read('src/app/services/forumApiService.ts');
        expect(api).not.toContain("from '@/app/services/forum/forumApi/forumApiComments'");
        expect(api).not.toContain("from '@/app/services/forum/forumApi/forumApiSocial'");
        expect(api).not.toContain("from '@/app/services/forum/forumApi/forumApiNotifications'");
        expect(api).toContain('lazyListForumNotifications');
        expect(api).toContain('lazyAddForumComment');
        expect(api).toContain('lazyListForumFollowing');

        const lazy = read('src/app/services/forum/forumApi/forumApiServiceLazy.ts');
        expect(lazy).toContain("import('@/app/services/forum/forumApi/forumApiNotifications')");
        expect(lazy).toContain("import('@/app/services/forum/forumApi/forumApiComments')");
        expect(lazy).toContain("import('@/app/services/forum/forumApi/forumApiSocial')");
        expect(lazy).not.toMatch(/from ['"]@\/app\/services\/forum\/forumApi\/forumApiNotifications['"]/);
        expect(lazy).not.toMatch(/from ['"]@\/app\/services\/forum\/forumApi\/forumApiComments['"]/);
        expect(lazy).not.toMatch(/from ['"]@\/app\/services\/forum\/forumApi\/forumApiSocial['"]/);

        const upvote = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useCommunityPostUpvote.ts',
        );
        expect(upvote).toContain("import('@/app/services/notifications/notificationForumStorage')");
        expect(upvote).not.toMatch(
            /from ['"]@\/app\/services\/notifications\/notificationForumStorage['"]/,
        );

        const signals = read(
            'src/app/components/lawyer/CommunityScreen/hooks/useCommunityPostCommentSignals.ts',
        );
        expect(signals).toContain("import('@/app/services/notifications/notificationForumStorage')");
        expect(signals).not.toMatch(
            /from ['"]@\/app\/services\/notifications\/notificationForumStorage['"]/,
        );
    });

    it('bffAuthFlags وdeviceId مثبتان في أوراق الإقلاع لا في persist', () => {
        const vite = read('vite.config.mts');
        expect(vite).toMatch(/bffAuthFlags[\s\S]*?return 'boot-local-only'/);
        expect(vite).toMatch(/nativePlatform[\s\S]*?return 'boot-local-only'/);
        expect(vite).toMatch(/bootStemIcons[\s\S]*?return 'boot-paint-leaves'/);
        expect(vite).toMatch(/deviceId[\s\S]*?return 'boot-runtime'/);
        expect(read('src/app/utils/bffAuthFlags.ts')).not.toMatch(/^import /m);
    });
});
