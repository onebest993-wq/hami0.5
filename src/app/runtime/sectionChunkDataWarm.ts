/**
 * بيانات القسم ليست كِسرة JS.
 *
 * التشفير المحلي، الفهرسة، الشبكة، السحابة، منشورات المنتدى تحتاج وقتاً بعد رسم
 * الهيكل. هذا المسار يبدأ تلك الطبقة لآخر قسم دون فك كل الأضابير ودون انتظار
 * اكتمال تحليل الشيفرة.
 *
 * الشبكة تُحترم فيها سياسة prefetch / localOnly / lite / 2G. اللقطات المحلية (peek/قرص) رخيصة.
 */
import type { SectionChunkId } from '@/app/runtime/sectionChunkRecency';

async function liveUserId(): Promise<string | null> {
    const { getLiveAuthUserId } = await import('@/app/utils/liveAuthUserId');
    return getLiveAuthUserId();
}

async function networkPrefetchAllowed(): Promise<boolean> {
    const { isSectionBackgroundPrefetchAllowed } = await import(
        '@/app/runtime/sectionPrefetchPolicy'
    );
    return isSectionBackgroundPrefetchAllowed();
}

export async function warmSectionData(id: SectionChunkId): Promise<void> {
    if (typeof window === 'undefined') return;

    const uid = await liveUserId();
    const net = await networkPrefetchAllowed();

    switch (id) {
        case 'forum':
            await import('@/app/services/forum/forumPostsWarmCache').then((m) => {
                m.warmForumPostsCacheFromLocal();
                if (net) m.warmForumPostsCache();
            });
            return;
        case 'schedule':
            await import('@/app/services/calendar/calendarEventsWarm').then((m) => {
                m.primeCalendarEventsCacheFromPeek(uid);
                if (net) void m.warmCalendarEventsCache(uid).catch(() => undefined);
            });
            return;
        case 'repository':
            await import('@/app/services/forum/repositoryDocsWarmCache').then((m) => {
                m.warmRepositoryDocsCache();
            });
            if (net && uid) {
                await import('@/app/hooks/lawyerDashboard/repositoryIntentWarm').then((m) =>
                    m.warmRepositoryDataCache(uid),
                );
            }
            return;
        case 'profile':
            if (!uid) return;
            await import('@/app/services/profile/profileWarmCache').then((m) => {
                m.hydrateProfileWarmCachePeekSync(uid);
                return m.warmProfileDataCache(uid);
            });
            return;
        case 'search':
            if (!net) return;
            if (uid) {
                void import('@/app/services/globalSearchLoad')
                    .then((m) => m.warmGlobalSearchExtras(uid))
                    .catch(() => undefined);
            }
            await import('@/app/hooks/lawyerDashboard/globalSearchIntentWarm').then((m) => {
                m.warmGlobalSearchOnHover();
            });
            return;
        case 'fieldTasks':
            await import('@/app/hooks/lawyerDashboard/fieldTasks/fieldTasksLazyImports').then((m) => {
                m.warmQuantumTasksDiskRead();
            });
            return;
        case 'transaction':
            if (!uid) return;
            await import('@/app/services/transactions/transactionsDiskWarm').then((m) => {
                m.warmTransactionsDiskRead(uid);
            });
            return;
        case 'lawsuit':
            await import('@/app/runtime/lawsuitFilesEagerHydrate').then((m) => {
                m.startLawsuitFilesEagerHydrate();
            });
            return;
        case 'execution':
            await import('@/app/services/SecureStoreService').then((m) =>
                m.default.ensureExecutionIndexReady(),
            );
            if (uid) {
                await import('@/app/runtime/executionFilesEagerHydrate').then((m) => {
                    m.startExecutionFilesEagerHydrate(uid);
                });
            }
            return;
        case 'notifications':
            await import('@/app/stores/notificationStore').catch(() => undefined);
            return;
        case 'criminal':
        case 'settings':
            /* لا فك أضابير. الإعدادات لقطة جاهزة. */
            return;
        default:
            return;
    }
}
