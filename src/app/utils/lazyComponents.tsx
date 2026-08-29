/**
 * محور التحميل المؤجَّل — التصديرات الموصولة وحدها.
 *
 * كان هذا الملفّ يُصدّر ٦٣ اسماً، ٤٠ منها لا يستوردها أحد ولا ينادي عضوها أحد:
 * أغلفةٌ لمُحمِّلات صارت تُنادى من مصدرها مباشرة (`LazyCriminalDashboard`،
 * `LazyNotificationPanel`، `LazyTasksManager`…)، وأربع قشرات تحميل وخطأ بُنيت
 * بـ`const` سهميّ، ودالّات `reset*` لاختبارات لم تعد تستدعيها.
 *
 * وحارس الوحدات الميتة كان أخضر لأنه يسأل «هل يُستورد هذا **الملفّ**؟» لا «هل
 * يُستورد هذا **التصدير**؟». فبقيت أربعون وحدة ميتة تُشحن في المقطع، وأبقت أضلعَ
 * استيراد ثابتة ثمنها حقيقيّ:
 *
 *   - `communityHubLoader` كان يُستورد لأجل `prefetchCommunityScreen` الميتة، وهو
 *     ضلعٌ يُغلق دائرة من سبعة ملفّات على مسار المنتدى
 *   - `lazySmartFileModalWidgets` كان يُستورد ولا يُستعمل إطلاقاً — سطرٌ لا يُنادى
 *   - `smartFileModalLoader` و`globalSearchLoader` و`profileSettingsStudioTabsLoader`
 *     كانت تُشحن لأجل دالّات ميتة
 *
 * وقشرات التحميل الأربع كانت `const` سهميّة، وهي الصيغة التي تسقط في منطقة الموت
 * الزمنيّ حين يقلب ضلعٌ راجعٌ ترتيبَ التهيئة. حذفُها أزال السطح لا خفّفه.
 *
 * قاعدة هذا الملفّ من الآن: **لا تصدير بلا مستهلك**. من احتاج مُحمِّلاً فليأخذه من
 * مصدره؛ المحور لِما يحتاج تجميعاً حقيقياً (تسخين قسم يمسّ أكثر من مُحمِّل).
 */

import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import {
    type ExecutionDashboardPrefetchMode,
    loadExecutionDashboardModule,
    prefetchExecutionDashboardByMode,
} from '@/app/runtime/executionDashboardLoader';
import { loadTransactionsHubModule } from '@/app/runtime/transactionsHubLoader';
import { prefetchHamiSettingsModule } from '@/app/runtime/hamiSettingsLoader';
import { prefetchNotificationPanel as prefetchNotificationPanelModule } from '@/app/runtime/notificationPanelLoader';
import { loadProfileSettingsSheetModule as loadProfileSettingsSheetLoaderModule } from '@/app/runtime/profileSettingsSheetLoader';
import { primeProfileStudio } from '@/app/runtime/profileShellPrime';
import {
    loadRoyalLawyerProfileModule,
    prefetchRoyalLawyerProfile as prefetchRoyalLawyerProfileModule,
} from '@/app/runtime/royalLawyerProfileLoader';
import { prefetchRepositoryHubModule } from '@/app/runtime/repositoryHubLoader';

export { prefetchArchivePortal } from '@/app/runtime/archivePortalPrefetch';

// ═══════════════════════════════════════════════════════════════════════════
// مكوّنات مؤجَّلة موصولة
// ═══════════════════════════════════════════════════════════════════════════

export const LazyRoyalLawyerProfile = lazyWithRetry(() =>
    loadRoyalLawyerProfileModule().then((mod) => ({
        default: mod.RoyalLawyerProfile as unknown as LazyComponent,
    })),
);

// ═══════════════════════════════════════════════════════════════════════════
// تسخين أقسام — تفويض إلى مُحمِّلات النطاق
// ═══════════════════════════════════════════════════════════════════════════

/** أرشيف الدعاوى — يفوض إلى lawsuitWorkspaceWarm (بلا SmartFile عاجل على أول فتح) */
export function warmLawsuitWorkspace(options?: {
    includeSecondary?: boolean;
    secondaryDelayMs?: number;
}): void {
    if (typeof window === 'undefined') return;
    void import('@/app/runtime/lawsuitWorkspaceWarm')
        .then((m) =>
            m.warmLawsuitWorkspace({
                includeSecondary: options?.includeSecondary ?? false,
                secondaryDelayMs: options?.secondaryDelayMs ?? 2_000,
            }),
        )
        .catch(() => undefined);
}

/** قسم التنفيذ/الأرشيف — يفوض إلى executionWorkspaceWarm */
export function warmExecutionWorkspace(options?: {
    includeSecondary?: boolean;
    secondaryDelayMs?: number;
    userId?: string | null;
}): void {
    if (typeof window === 'undefined') return;
    void import('@/app/runtime/executionWorkspaceWarm')
        .then((m) =>
            m.warmExecutionWorkspace({
                includeSecondary: options?.includeSecondary ?? false,
                secondaryDelayMs: options?.secondaryDelayMs ?? 1_200,
                userId: options?.userId,
            }),
        )
        .catch(() => undefined);
}

/*
 * غير مُصدَّرة: مستهلكها الوحيد `warmExecutionDossier` تحته. تصديرُها كان ميتاً،
 * وبقاء الحالة الوحدويّة (`executionDashboardPrefetch`) لازم لئلّا يتكرّر التحميل
 * على كل تمرير مؤشّر فوق بطاقة.
 */
let executionDashboardPrefetch: Promise<void> | null = null;

function prefetchExecutionDashboard(mode: ExecutionDashboardPrefetchMode): void {
    if (typeof window === 'undefined') return;
    const run = Promise.resolve().then(() => {
        prefetchExecutionDashboardByMode(mode);
        if (mode === 'urgent') {
            return loadExecutionDashboardModule().then(() => undefined);
        }
        return undefined;
    });
    if (mode === 'urgent' || !executionDashboardPrefetch) {
        executionDashboardPrefetch = run.catch((err) => {
            executionDashboardPrefetch = null;
            throw err;
        });
    }
    void executionDashboardPrefetch.catch(() => undefined);
}

/** فتح إضبارة تنفيذ واحدة — intent للـ hover و urgent للنقرة الفعلية */
export function warmExecutionDossier(mode: ExecutionDashboardPrefetchMode = 'intent'): void {
    if (typeof window === 'undefined') return;
    prefetchExecutionDashboard(mode);
}

/** تحميل مسبق لوحة الإضبارة الجزائية — store ثم dashboard */
export function prefetchCriminalDashboard(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/runtime/criminalDashboardLoader').then((m) => {
        m.prefetchCriminalDashboardPhased();
    });
}

export function warmTasksWorkspace(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/components/lawyer/dashboard/FieldTasksBottomSheet');
    void import('@/app/components/lawyer/dashboard/TasksManagerOverlay');
    void import('@/app/components/lawyer/dashboard/TasksManager');
}

// ═══════════════════════════════════════════════════════════════════════════
// المستودع والملف المهني والإعدادات
// ═══════════════════════════════════════════════════════════════════════════

/** prefetch فقط — المستودع يُفتح عبر SmartRepositoryHost وليس lazy modal */
export function prefetchSmartRepositoryModal(): void {
    prefetchRepositoryHubModule();
}

/** استوديو الملف المهني — نقطة دخول موحّدة عبر profileShellPrime */
export function prefetchProfileSettingsSheet(): void {
    if (typeof window === 'undefined') return;
    primeProfileStudio();
}

export function loadProfileSettingsSheetModule(): Promise<
    typeof import('@/app/components/lawyer/RoyalLawyerProfile/components/ProfileSettingsSheet')
> {
    prefetchProfileSettingsSheet();
    return loadProfileSettingsSheetLoaderModule();
}

export function prefetchRoyalLawyerProfile(userId?: string | null): void {
    if (typeof window === 'undefined') return;
    prefetchRoyalLawyerProfileModule(userId);
}

/** المستودع + صفحة الملف — بلا استوديو (الاستوديو عند نية فتحه) */
export function warmNotepadAndProfile(userId?: string | null): void {
    if (typeof window === 'undefined') return;
    prefetchSmartRepositoryModal();
    prefetchRoyalLawyerProfileModule(userId);
}

/* غير مُصدَّرة: مستهلكها الوحيد `warmSettingsShell` */
function prefetchHamiSettings(): void {
    if (typeof window === 'undefined') return;
    prefetchHamiSettingsModule();
}

/** الإعدادات فقط — بلا مستودع */
export function warmSettingsShell(): void {
    if (typeof window === 'undefined') return;
    prefetchHamiSettings();
}

// ═══════════════════════════════════════════════════════════════════════════
// نوافذ ولوحات
// ═══════════════════════════════════════════════════════════════════════════

let voiceRecorderModalPrefetch: Promise<unknown> | null = null;

export function prefetchVoiceRecorderModal(): void {
    if (typeof window === 'undefined') return;
    if (!voiceRecorderModalPrefetch) {
        voiceRecorderModalPrefetch = import('@/app/components/lawyer/ActionModals/VoiceRecorderModal').catch(
            (err) => {
                voiceRecorderModalPrefetch = null;
                throw err;
            },
        );
    }
    void voiceRecorderModalPrefetch.catch(() => undefined);
}

export function prefetchNotificationPanel(): void {
    if (typeof window === 'undefined') return;
    prefetchNotificationPanelModule();
}

let transactionsHubPrefetch: Promise<unknown> | null = null;

/** تحميل مسبق مسار المعاملات — الواجهة + مخزن البيانات */
export function prefetchTransactionsHub(): void {
    if (typeof window === 'undefined') return;
    if (!transactionsHubPrefetch) {
        transactionsHubPrefetch = Promise.all([
            loadTransactionsHubModule(),
            import('@/app/modules/transactionsThreading/store').catch(() => undefined),
        ]).catch((err) => {
            transactionsHubPrefetch = null;
            throw err;
        });
    }
    void transactionsHubPrefetch.catch(() => undefined);
}

// ═══════════════════════════════════════════════════════════════════════════
// قشرة الرئيسية
// ═══════════════════════════════════════════════════════════════════════════

function prefetchLawyerHomeHubCard(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/runtime/homeHubCardLoader').then((m) => m.prefetchLawyerHomeHubCardModule());
}

/** الحد الأدنى لواجهة الرئيسية — بلاطات القيادة + بطاقة الهاب (الهيدر sync في MainView) */
export function warmLawyerHomeShellCritical(): void {
    if (typeof window === 'undefined') return;
    void import('@/app/runtime/commandHubTilesLoader').then((m) => m.prefetchCommandHubTiles());
    prefetchLawyerHomeHubCard();
}

/** الطبقات الثانوية للرئيسية — التنبيهات والدوك تُسخّن فقط بعد أن يطلبها المسار */
export function warmLawyerHomeShellSecondary(): void {
    if (typeof window === 'undefined') return;
    prefetchLawyerHomeHubCard();
}

export function prefetchLawyerHomeShellWidgets(): void {
    if (typeof window === 'undefined') return;
    warmLawyerHomeShellSecondary();
    prefetchSmartRepositoryModal();
    prefetchTransactionsHub();
}
