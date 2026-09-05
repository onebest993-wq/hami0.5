/**
 * تسخين مقاطع مداخل الطبقات بعد استقرار المحتوى — موجات حسب الوزن.
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
 * البحث: لا prefetch هنا. قشرة الطلاء بعد interactive؛ المقطع الكامل عند pointerdown.
 *
 * حجم المنتج: لا تُطلق كل الكِسَر في idle واحد بعد المنزل. خفيف فوراً،
 * مداخل التنفيذ/الجزائي فور انتهاء الخفيف (بلا انتظار المتوسط)،
 * متوسط بعد هدوء قصير (إعدادات/دعاوى/ملف ذكي)،
 * ثقيل أخيراً (جدول ~١٫٧ م.ب + طبقة workspace). الوضع الخفيف
 * وتوفير البيانات / 2G: آخر قسم + motion + بطاقة المنزل فقط؛ الملف/الإشعارات/المستودع
 * خلفية. كِسرة ستارة المهام وحدها (بلا hydrate/بطاقات) تُؤجَّل بعد استقرار المنزل
 * حتى لا يبقى أول فتح بارد معلّقاً على المقطع. الشبكة البطيئة تُحجب.
 *
 * تحليل الشيفرة: داخل كل موجة الخطوات متسلسلة مع yieldToMain — لا دفعة parse
 * متوازية على الـ main thread (خصوصاً الأصل حيث القرص فوري).
 */
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { runWarmSteps } from '@/app/runtime/yieldToMain';
import {
    getCachedLawyerHomeHubCard,
    prefetchLawyerHomeHubCardModule,
} from '@/app/runtime/homeHubCardLoader';
import { prefetchNotificationShellModule } from '@/app/runtime/notificationShellLoader';
import { prefetchLawsuitsOverlayEntry } from '@/app/runtime/lawsuitsOverlayEntryLoader';
import { prefetchSmartFileOverlayEntry } from '@/app/runtime/smartFileOverlayEntryLoader';
import { prefetchSettingsOverlayEntry } from '@/app/runtime/settingsOverlayEntryLoader';
import { prefetchOverlayMotion } from '@/app/motion/loadOverlayMotion';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import {
    isSectionBackgroundPrefetchAllowed,
    isRepositoryHubJsWarmAllowed,
    isTransactionsHubJsWarmAllowed,
} from '@/app/runtime/sectionPrefetchPolicy';

let warmed = false;

const swallow = () => undefined;

/** مداخل التنفيذ/الجزائي — بعد الموجة الخفيفة مباشرة، بلا انتظار إعدادات/دعاوى */
export function overlayEntryExecutionHostWaveDelayMs(): number {
    return 0;
}

/** متوسط: إعدادات/دعاوى/ملف ذكي — لا ينافس أول إطار */
export function overlayEntryMediumWaveDelayMs(): number {
    return isCapacitorNativePlatform() ? 480 : 1_050;
}

/** ثقيل: جدول ~١٫٧ م.ب — بلا مداخل التنفيذ (تلك بعد الخفيف فوراً) */
export function overlayEntryHeavyWaveDelayMs(): number {
    return isCapacitorNativePlatform() ? 1_800 : 3_200;
}

export function resetOverlayEntryChunksForTests(): void {
    warmed = false;
}

function overlayEntryBackgroundWavesAllowed(): boolean {
    return isSectionBackgroundPrefetchAllowed();
}

/** كِسرة الستارة على lite بعد استقرار المنزل — بلا hydrate. الشبكة البطيئة تُحجب. */
function overlayEntryLiteSheetPrefetchAllowed(): boolean {
    return isSectionBackgroundPrefetchAllowed({ allowOnLite: true, allowOnLocalOnly: true });
}

/** يُعيد دالّة إلغاء الجدولة */
export function warmOverlayEntryChunks(): () => void {
    if (typeof window === 'undefined' || warmed) return () => undefined;
    warmed = true;

    const nestedCancels: Array<() => void> = [];
    let chainCancelled = false;

    const cancelLight = scheduleIdleWork(
        () => {
            void runWarmSteps(
                [
                    () => {
                        if (!isRepositoryHubJsWarmAllowed()) return;
                        return import('@/app/runtime/repositoryHubLoader').then((m) =>
                            m.prefetchRepositoryHubModule(),
                        );
                    },
                    () => {
                        if (!isTransactionsHubJsWarmAllowed()) return;
                        return import('@/app/runtime/transactionsHubLoader').then((m) =>
                            m.prefetchTransactionsHubModule(),
                        );
                    },
                    () =>
                        import('@/app/runtime/sectionChunkRecency').then((m) =>
                            m.warmLastOpenedSectionChunk(),
                        ),
                    () => {
                        prefetchOverlayMotion();
                    },
                    () =>
                        import('@/app/runtime/hubArchiveAfterHomePaint').then((m) =>
                            m.prefetchHubArchivesAfterHomePaint(),
                        ),
                    () => {
                        if (!getCachedLawyerHomeHubCard()) prefetchLawyerHomeHubCardModule();
                    },
                    /* الملف/إشعارات/مستودع/مهام: خلفية — على lite تغطّيها كِسرة recency */
                    () => {
                        if (!overlayEntryBackgroundWavesAllowed()) return;
                        return import('@/app/runtime/profileTabHostLoader').then((m) =>
                            m.prefetchProfileTabHost(),
                        );
                    },
                    () => {
                        if (!overlayEntryBackgroundWavesAllowed()) return;
                        return import('@/app/runtime/royalLawyerProfileLoader').then((m) =>
                            m.prefetchProfileHubModule(),
                        );
                    },
                    () => {
                        if (!overlayEntryBackgroundWavesAllowed()) return;
                        prefetchNotificationShellModule();
                    },
                    () => {
                        if (!overlayEntryBackgroundWavesAllowed()) return;
                        return import('@/app/runtime/fieldTasksHubLoader').then((m) => {
                            m.prefetchFieldTasksSheetModule();
                            m.prefetchFieldTasksCurtainCardSurfaces();
                            return m.hydrateFieldTasksSheetForInstantOpen();
                        });
                    },
                ],
                () => chainCancelled,
            )
                .catch(swallow)
                .finally(() => {
                    if (chainCancelled) return;
                    if (!overlayEntryBackgroundWavesAllowed()) {
                        if (!overlayEntryLiteSheetPrefetchAllowed()) return;
                        nestedCancels.push(
                            scheduleIdleWork(
                                () => {
                                    void import('@/app/runtime/fieldTasksHubLoader').then((m) => {
                                        m.prefetchFieldTasksSheetModule();
                                    });
                                },
                                {
                                    minDelayMs: overlayEntryMediumWaveDelayMs(),
                                    timeoutMs: overlayEntryMediumWaveDelayMs() + 4_000,
                                },
                            ),
                        );
                        return;
                    }

                    nestedCancels.push(
                        scheduleIdleWork(
                            () => {
                                void
                                    /* LawyerDashboardExecutionOverlayEntry + dossier + create عبر الختم */
                                    import('@/app/runtime/overlayHeavyStamp')
                                        .then((m) => m.stampMainViewOverlayEntryPreloads())
                                        .catch(swallow);
                            },
                            {
                                minDelayMs: overlayEntryExecutionHostWaveDelayMs(),
                                timeoutMs: overlayEntryExecutionHostWaveDelayMs() + 4_000,
                            },
                        ),
                    );

                    nestedCancels.push(
                        scheduleIdleWork(
                            () => {
                                void runWarmSteps(
                                    [
                                        () => {
                                            prefetchSettingsOverlayEntry();
                                        },
                                        () => {
                                            prefetchLawsuitsOverlayEntry();
                                        },
                                        () => {
                                            prefetchSmartFileOverlayEntry();
                                        },
                                    ],
                                    () => chainCancelled,
                                ).catch(swallow);
                            },
                            {
                                minDelayMs: overlayEntryMediumWaveDelayMs(),
                                timeoutMs: overlayEntryMediumWaveDelayMs() + 4_000,
                            },
                        ),
                    );

                    nestedCancels.push(
                        scheduleIdleWork(
                            () => {
                                void runWarmSteps(
                                    [
                                        () =>
                                            import('@/app/runtime/scheduleHubLoader').then((m) =>
                                                m.prefetchScheduleTabHostModule(),
                                            ),
                                        () =>
                                            import(
                                                '@/app/hooks/lawyerDashboard/LawyerDashboardWorkspaceHeavyLayer'
                                            ).then(swallow, swallow),
                                    ],
                                    () => chainCancelled,
                                ).catch(swallow);
                            },
                            {
                                minDelayMs: overlayEntryHeavyWaveDelayMs(),
                                timeoutMs: overlayEntryHeavyWaveDelayMs() + 6_000,
                            },
                        ),
                    );
                });
        },
        { minDelayMs: 0, timeoutMs: 6_000 },
    );

    return () => {
        chainCancelled = true;
        cancelLight();
        for (const cancel of nestedCancels) cancel();
    };
}
