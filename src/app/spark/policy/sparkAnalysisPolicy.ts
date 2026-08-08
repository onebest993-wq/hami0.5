/**
 * سياسة تحليل سبارك — ليس مراقباً دائماً.
 *
 * - `live_debounced`: فقط أثناء تحرير مسودة/ملف (بعد توقف الكتابة).
 * - `on_context_change`: عند تغيّر بيانات الإضبارة المحفوظة أو overlay — لا مع كل حرف.
 * - `on_demand`: مراجعة Shell / Gemini فقط عند طلب المستخدم.
 */

export const SPARK_LIVE_ANALYSIS_DEBOUNCE_MS = 420;

/** أطول تأخير لحمولة مراجعة Shell — لا تُبنى مع كل ضغطة مفتاح */
export const SPARK_SHELL_REVIEW_DEBOUNCE_MS = 720;

export type SparkAnalysisTrigger = 'live_debounced' | 'on_context_change' | 'on_demand';

/** أين يُسمح بتحليل «حي» مؤجّل أثناء الكتابة */
export const SPARK_LIVE_DEBOUNCED_HOSTS = new Set([
    'execution_creation',
    'lawsuit_open_file',
]);

export function isSparkLiveDebouncedHost(hostId: string): boolean {
    return SPARK_LIVE_DEBOUNCED_HOSTS.has(hostId);
}

/** Gemini والمراجعة التنظيمية — دائماً عند الطلب فقط (لا تلقائي على الكتابة) */
export const SPARK_ON_DEMAND_ONLY = true as const;
