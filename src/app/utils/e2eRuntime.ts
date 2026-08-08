/** يُفعَّل عند بناء/تشغيل بوابة E2E (VITE_E2E=1) — ليس إنتاجاً حقيقياً */
export function isE2eRuntime(): boolean {
    const flag = import.meta.env.VITE_E2E;
    return flag === '1' || flag === 'true';
}

/** جسور window للاختبارات — DEV أو بناء E2E المخصّص */
export function isE2eBridgeEnabled(): boolean {
    return import.meta.env.DEV || isE2eRuntime();
}
