/**
 * سياسة تضمين Sentry في الحزمة — مصدر واحد للحقيقة (بناء + وقت التشغيل).
 * VITE_ENABLE_SENTRY=false يُسقِط vendor-sentry بالكامل عبر alias في vite.config.
 */
export function isSentryEnabledInBuild(): boolean {
    if (import.meta.env.VITE_ENABLE_SENTRY === 'false') return false;
    const dsn = String(import.meta.env.VITE_SENTRY_DSN ?? '').trim();
    return Boolean(dsn && !dsn.includes('examplePublicKey'));
}
