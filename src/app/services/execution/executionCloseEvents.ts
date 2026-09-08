import './executionNetworkAbort';

export const EXECUTION_TEARDOWN_EVENT = 'hami:execution:teardown';

export type ExecutionTeardownSurface =
    | 'execution-shell'
    | 'execution-creation'
    | 'execution-dashboard'
    | 'execution-seizure'
    | 'execution-financial'
    | 'execution-summons'
    | 'execution-archive'
    | 'execution-followup'
    | 'global';

export { unblockAllExecutionOverlayEscape } from './executionEscapeStack';

export function abortExecutionNetworkAllSafe(): void {
    if (typeof window === 'undefined') return;
    try {
        const winAny = window as unknown as Record<string, unknown>;
        const abortAll = winAny.__hamiExecAbortNetworkAll as (() => void) | undefined;
        if (typeof abortAll === 'function') {
            abortAll();
            return;
        }
        const keys = Object.getOwnPropertyNames(winAny).filter(
            (k) => k.startsWith('__hamiExecAbort') && k !== '__hamiExecAbortNetworkAll',
        );
        for (const k of keys) {
            const fn = winAny[k] as (() => void) | undefined;
            if (typeof fn === 'function') fn();
        }
    } catch {
        /* لا يُرمى من مسار تفكيك */
    }
}

/*
 * ⚠️ هذا الاستدعاء يُنفَّذ ولا يُلغي شيئاً — والسبب ليس ما يوحي به التعليق السابق.
 *
 * كان مكتوباً هنا: «Task8 AbortController globals attach side-effect boot will
 * activate» — أي أن التفعيل منتظَر. وهو **وقع فعلاً**: السطر الأول من هذا الملف
 * `import './executionNetworkAbort'` يُحمّل الوحدة، فتنشر `__hamiExecAbortNetworkAll`
 * على `window`، والدالّة أعلاه تجدها وتستدعيها عند كل إغلاق.
 *
 * المفقود شيء آخر تماماً: **لا طلب واحد في التطبيق مرتبط بإشارات تلك الـcontrollers.**
 * `getExecFilesHydrateSignal` و`getExecFinancialSyncSignal` و
 * `getExecSummonsFollowupSignal` — صفر مستهلك خارج ملفها. فالإلغاء يُلغي ثلاثة
 * controllers لا يستمع إليها أحد.
 *
 * وقبل وصلها يجب إصلاح دورة حياتها: هي مفردات على مستوى الوحدة تُنشأ مرة واحدة،
 * و`AbortController` أحادي الاستعمال بلا إعادة ضبط — فأول إغلاق يُبقيها ملغاة
 * إلى الأبد، ومن يمرّرها إلى `fetch` غداً ستعمل مرة واحدة ثم تكسر كل طلب تالٍ.
 *
 * التفصيل الكامل: hami-audit/FINDING-009. والتعليق القديم ضلّل مراجعةً فعلية
 * حتى كادت تُحذف بنية موصولة — فتُرك هذا مكانه كي لا يتكرّر.
 */
