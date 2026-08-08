/** Wave 2 — معطّل افتراضياً حتى نشر Edge Function وتفعيله صراحةً */
export function isSparkTextAuditEnabled(): boolean {
    return import.meta.env.VITE_SPARK_TEXT_AUDIT_ENABLED === 'true';
}

/** منع إغراق الشبكة عند تعديلات متكررة على نفس الإضبارة */
export const SPARK_TEXT_AUDIT_COOLDOWN_MS = 10 * 60 * 1000;

/** حد ذاكرة تنبيهات التدقيق المؤقتة */
export const SPARK_AUDIT_STORE_MAX_ENTRIES = 32;
