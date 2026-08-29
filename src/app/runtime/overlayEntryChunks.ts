/**
 * تسخين مقاطع مداخل الطبقات بعد استقرار المحتوى.
 *
 * كانت هذه المداخل تُستورد ساكناً في `LawyerDashboardMainView` بحجّة «الفتح بلا
 * Suspense»، فتدخل مقطع اللوحة كاملةً: الجدول ~١٧٦٥ ك.ب، المنتدى ~١٤٧١، الإعدادات
 * ٨٣٦، البحث ٥٢٧، المعاملات ٣٩٠، المستودع ٣٦٤، الميدان ٣٣١، والملفّ الشخصي ٢٣٨.
 *
 * صارت كسولة. تُسخَّن بعد `boot-reveal-done` حتى لا تنافس بايتات مخزن التنفيذ
 * أثناء نافذة CSS-uncover. مسار المخزن نفسه يُطلب أولاً عبر
 * `prefetchHubArchivesAfterHomePaint` (بايتات بلا Host).
 * ترتيب الاستيراد في هذا الملف يُبقي ProfileTabHost قبل ExecutionOverlayEntry.
 *
 * المنتدى (~١٫٤ م.ب): ليس هنا — hover/فتح عبر forumIntentWarm وcommunityShellOpenFlow.
 * الجدول: التسخين عبر scheduleHubLoader؛ الفتح فوري وقشرة InstantChrome تغطي Suspense.
 *
 * البحث: لا prefetch هنا. بعد interactive تُسخَّن قشرة الطلاء فقط؛ المقطع الكامل
 * عند pointerdown/فتح. Motion داخل idle (الجسر ينتظر هدوء الإقلاع أصلاً).
 */
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import {
    getCachedLawyerHomeHubCard,
    prefetchLawyerHomeHubCardModule,
} from '@/app/runtime/homeHubCardLoader';
import { prefetchNotificationShellModule } from '@/app/runtime/notificationShellLoader';
import { prefetchLawsuitsOverlayEntry } from '@/app/runtime/lawsuitsOverlayEntryLoader';
import { prefetchSmartFileOverlayEntry } from '@/app/runtime/smartFileOverlayEntryLoader';
import { prefetchSettingsOverlayEntry } from '@/app/runtime/settingsOverlayEntryLoader';
import { prefetchOverlayMotion } from '@/app/motion/loadOverlayMotion';

let warmed = false;

/** يُعيد دالّة إلغاء الجدولة */
export function warmOverlayEntryChunks(): () => void {
    if (typeof window === 'undefined' || warmed) return () => undefined;
    warmed = true;

    const swallow = () => undefined;

    return scheduleIdleWork(
        () => {
            prefetchOverlayMotion();
            void import('@/app/runtime/hubArchiveAfterHomePaint')
                .then((m) => m.prefetchHubArchivesAfterHomePaint())
                .catch(swallow);
            /* الملف أولاً بين مداخل الطبقات في هذا الملف — عقد اختبارات الملف */
            void import('@/app/components/lawyer/dashboard/profile/ProfileTabHost').catch(swallow);
            void import('@/app/runtime/royalLawyerProfileLoader')
                .then((m) => m.prefetchProfileHubModule())
                .catch(swallow);
            prefetchSettingsOverlayEntry();
            if (!getCachedLawyerHomeHubCard()) prefetchLawyerHomeHubCardModule();
            prefetchNotificationShellModule();
            prefetchLawsuitsOverlayEntry();
            prefetchSmartFileOverlayEntry();
            void import('@/app/runtime/scheduleHubLoader')
                .then((m) => {
                    m.prefetchScheduleTabHostModule();
                    m.prefetchScheduleHubModule();
                })
                .catch(swallow);
            void import('@/app/runtime/transactionsHubLoader')
                .then((m) => m.prefetchTransactionsHubModule())
                .catch(swallow);
            void import('@/app/runtime/fieldTasksHubLoader')
                .then((m) => m.prefetchFieldTasksSheetModule())
                .catch(swallow);
            void import('@/app/runtime/repositoryHubLoader')
                .then((m) => m.prefetchRepositoryHubModule())
                .catch(swallow);
            void import(
                '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry'
            ).catch(swallow);
            void import(
                '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionDossierOverlayEntry'
            ).catch(swallow);
            void import(
                '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionCreateOverlayEntry'
            ).catch(swallow);
            void import('@/app/hooks/lawyerDashboard/LawyerDashboardWorkspaceHeavyLayer').catch(swallow);
        },
        { minDelayMs: 0, timeoutMs: 6_000 },
    );
}
