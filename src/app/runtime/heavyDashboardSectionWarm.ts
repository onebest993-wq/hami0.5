import { isLitePerformanceActive, isMeteredOrSlowNetwork } from '@/app/runtime/devicePerformanceTier';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { yieldToMain } from '@/app/runtime/yieldToMain';
import { peekLastOpenedSectionChunk } from '@/app/runtime/sectionChunkRecency';

/** سقف requestIdleCallback — ليس انتظارًا جداريًا قبل البدء */
const LAST_OPENED_IDLE_TIMEOUT_MS = 4_000;
const FULL_INNER_IDLE_TIMEOUT_MS = 6_000;

let heavyWarmStarted = false;
let lawsuitEarlyWarmStarted = false;
let executionInnerStarted = false;
let cancelHeavyWarm: (() => void) | null = null;
let cancelLawsuitEarlyWarm: (() => void) | null = null;
let cancelLastOpenedInner: (() => void) | null = null;

export function resetHeavyDashboardSectionWarmForTests(): void {
    heavyWarmStarted = false;
    lawsuitEarlyWarmStarted = false;
    executionInnerStarted = false;
    cancelHeavyWarm?.();
    cancelHeavyWarm = null;
    cancelLawsuitEarlyWarm?.();
    cancelLawsuitEarlyWarm = null;
    cancelLastOpenedInner?.();
    cancelLastOpenedInner = null;
}

/**
 * لا ساعة جدارية بعد المنزل (٨ ث / ٢٫٥ ث أُلغيت).
 * الجدولة بعد content-ready؛ الخمول الحقيقي (rIC) يمنع منافسة إطار المنزل.
 */
export function heavyDashboardFullWarmDelayMs(): number {
    return 0;
}

/** آخر قسم يُسجَّل أولاً في طابور الخمول — بلا انتظار إضافي */
export function lastOpenedHeavyInnerDelayMs(): number {
    return 0;
}

async function warmExecutionInnerLayer(): Promise<void> {
    if (executionInnerStarted) return;
    executionInnerStarted = true;

    const archiveOpen = await import('@/app/runtime/executionArchiveOpenSession');
    archiveOpen.prefetchExecutionArchiveOpen();
    await yieldToMain();

    const execution = await import('@/app/runtime/executionWorkspaceWarm');
    execution.warmExecutionWorkspace({ includeSecondary: true });
    await yieldToMain();

    const dashboard = await import('@/app/runtime/executionDashboardLoader');
    dashboard.prefetchExecutionDashboardByMode('deferred');
    await yieldToMain();

    const hub = await import('@/app/runtime/hubArchiveLoader');
    hub.prefetchExecutionArchiveContent();
}

async function warmLawsuitInnerLayer(): Promise<void> {
    if (lawsuitEarlyWarmStarted) return;
    lawsuitEarlyWarmStarted = true;

    const lawsuit = await import('@/app/runtime/lawsuitWorkspaceWarm');
    lawsuit.warmLawsuitWorkspace({ includeSecondary: false });
    await yieldToMain();

    const hub = await import('@/app/runtime/hubArchiveLoader');
    hub.prefetchLawsuitArchiveContent();
}

/**
 * تسخين موحّد للأقسام الثقيلة (تنفيذ / أرشيف / دعاوى) بعد interactive —
 * لا يُنافس أول paint للمنزل. التحليل متسلسل مع yield — لا ثلاث كِسر معاً.
 * إن سُخِّن باطن آخر قسم أبكر، الخطوات هنا idempotent.
 */
function isConstrainedInnerWarm(): boolean {
    if (isLitePerformanceActive()) return true;
    return typeof isMeteredOrSlowNetwork === 'function' && isMeteredOrSlowNetwork();
}

export function warmHeavyDashboardSections(): void {
    if (typeof window === 'undefined' || heavyWarmStarted || isConstrainedInnerWarm()) return;
    heavyWarmStarted = true;

    void (async () => {
        try {
            await warmExecutionInnerLayer();
            await yieldToMain();
            await warmLawsuitInnerLayer();
        } catch {
            /* تسخين أفضل-جهد */
        }
    })();
}

export function scheduleHeavyDashboardSectionWarm(): () => void {
    if (typeof window === 'undefined' || heavyWarmStarted) {
        return () => undefined;
    }

    const constrained = isConstrainedInnerWarm();
    const lastId = peekLastOpenedSectionChunk();
    const lastOpenedInner =
        lastId === 'execution'
            ? () => {
                  void warmExecutionInnerLayer().catch(() => undefined);
              }
            : lastId === 'lawsuit'
              ? () => {
                    void warmLawsuitInnerLayer().catch(() => undefined);
                }
              : null;

    if (constrained && !lastOpenedInner) {
        return () => undefined;
    }

    if (lastOpenedInner) {
        cancelLastOpenedInner = scheduleIdleWork(lastOpenedInner, {
            minDelayMs: lastOpenedHeavyInnerDelayMs(),
            timeoutMs: LAST_OPENED_IDLE_TIMEOUT_MS,
        });
    }

    if (constrained) {
        return () => {
            cancelLastOpenedInner?.();
            cancelLastOpenedInner = null;
        };
    }

    cancelHeavyWarm = scheduleIdleWork(warmHeavyDashboardSections, {
        minDelayMs: heavyDashboardFullWarmDelayMs(),
        timeoutMs: FULL_INNER_IDLE_TIMEOUT_MS,
    });
    return () => {
        cancelLastOpenedInner?.();
        cancelLastOpenedInner = null;
        cancelHeavyWarm?.();
        cancelHeavyWarm = null;
    };
}

/** باطن الدعاوى على الخمول — الموجة الكاملة تغطّيه؛ يُبقى للتوافق */
export function warmLawsuitArchiveEarly(): void {
    if (typeof window === 'undefined' || isConstrainedInnerWarm()) return;
    void warmLawsuitInnerLayer().catch(() => undefined);
}

export function scheduleLawsuitArchiveEarlyWarm(): () => void {
    if (typeof window === 'undefined' || lawsuitEarlyWarmStarted || isConstrainedInnerWarm()) {
        return () => undefined;
    }
    /* recency دعاوى يغطّيه lastOpenedHeavyInner — لا جدولان لنفس الطبقة */
    if (peekLastOpenedSectionChunk() === 'lawsuit') {
        return () => undefined;
    }

    cancelLawsuitEarlyWarm = scheduleIdleWork(warmLawsuitArchiveEarly, {
        minDelayMs: 0,
        timeoutMs: LAST_OPENED_IDLE_TIMEOUT_MS,
    });
    return () => {
        cancelLawsuitEarlyWarm?.();
        cancelLawsuitEarlyWarm = null;
    };
}
