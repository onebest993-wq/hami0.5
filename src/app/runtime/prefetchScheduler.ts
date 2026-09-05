import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import { isLitePerformanceActive, isMeteredOrSlowNetwork } from '@/app/runtime/devicePerformanceTier';
type PrefetchPriority = 'critical' | 'high' | 'low';

export type PrefetchJob = {
    id: string;
    priority?: PrefetchPriority;
    loader: () => Promise<unknown>;
};

const scheduled = new Set<string>();
const inflight = new Set<string>();

function canPrefetch(): boolean {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
    if (typeof navigator === 'undefined') return true;
    try {
        const s = getLawyerSettingsSnapshot();
        if (isLitePerformanceActive(s.performance.litePerformance)) return false;
    } catch {
        if (isLitePerformanceActive()) return false;
    }
    if (typeof isMeteredOrSlowNetwork === 'function' && isMeteredOrSlowNetwork()) return false;
    return true;
}

function settingsAllowPrefetch(): boolean {
    try {
        const s = getLawyerSettingsSnapshot();
        if (s.security.localOnlyMode) return false;
        return s.performance.prefetchScreens !== false;
    } catch {
        return true;
    }
}

function runJob(job: PrefetchJob): void {
    if (inflight.has(job.id)) return;
    inflight.add(job.id);
    void job.loader()
        .catch(() => {
            /* prefetch اختياري */
        })
        .finally(() => {
            inflight.delete(job.id);
        });
}

/**
 * Prefetch عند النية فقط — hover / لمس / قرب فتح شاشة.
 * يعمل في التطوير والإنتاج. lite / saveData / 2G / localOnly تبقى.
 * Vite في DEV يحلّل وحدات غير مجمّعة فيبقى أثقل من حزمة الإنتاج.
 */
export const PrefetchScheduler = {
    /** الطريقة الوحيدة المفضّلة لجدولة تحميل مسبق */
    prefetchOnIntent(job: PrefetchJob): void {
        if (!canPrefetch() || !settingsAllowPrefetch()) return;
        if (scheduled.has(job.id)) return;
        scheduled.add(job.id);

        const start = () => runJob(job);
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(start, { timeout: 2_500 });
        } else {
            window.setTimeout(start, 120);
        }
    },

    /** @deprecated — استخدم prefetchOnIntent عبر lawyerDashboardIntentPrefetch */
    enqueue(job: PrefetchJob): void {
        this.prefetchOnIntent(job);
    },

    /** @deprecated — الموجات الزمنية أُلغيت؛ لا تحميل خلفي تلقائي */
    enqueueWave(_jobs: PrefetchJob[], _options?: { delayMs?: number }): void {
        /* intent-only — لا موجات */
    },

    /** @deprecated */
    planAuthenticatedEntry(): void {
        /* intent-only */
    },

    /** @deprecated */
    planLawyerShellWidgetsWave(): void {},

    /** @deprecated */
    planSecondaryAppScreensWave(): void {},

    /** @deprecated */
    planLawyerHomeWave(): void {},

    /** @deprecated */
    planLawyerSecondaryWave(): void {},

    reset(): void {
        scheduled.clear();
        inflight.clear();
    },
};
