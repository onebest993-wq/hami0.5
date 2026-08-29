/** خطافات نافذة E2E — DEV أو حزمة `VITE_E2E=1` فقط (لا تُشحن في إنتاج حقيقي). */
export function isViteE2eHooksEnabled(): boolean {
    return (
        import.meta.env.DEV ||
        import.meta.env.VITE_E2E === '1' ||
        import.meta.env.VITE_E2E === 'true'
    );
}
