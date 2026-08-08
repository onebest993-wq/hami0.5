/** وضع تطوير سبارك — يعطّل كتم التنبيهات ويُعرّض أدوات إعادة الضبط في الكونسول */
export function isSparkDevMode(): boolean {
    return (
        import.meta.env.MODE === 'development' &&
        import.meta.env.VITE_SPARK_DEV_MODE === 'true'
    );
}

export function installSparkDevTools(): void {
    if (!isSparkDevMode() || typeof window === 'undefined') return;
    const w = window as Window & { __hamiResetSpark?: () => void };
    if (w.__hamiResetSpark) return;

    w.__hamiResetSpark = () => {
        void import('@/app/spark/memory/sparkPreferenceStore').then(({ resetSparkPreferences }) => {
            resetSparkPreferences();
            void import('@/app/spark/audit/triggerSparkDocumentAudit').then(
                ({ resetSparkAuditRuntimeForTests }) => {
                    resetSparkAuditRuntimeForTests();
                },
            );
            void import('@/app/spark/audit/requestSparkShellOrganizationalReview').then(
                ({ resetSparkShellReviewRuntimeForTests }) => {
                    resetSparkShellReviewRuntimeForTests();
                },
            );
            // eslint-disable-next-line no-console
            console.info('[Spark] تم إعادة ضبط التفضيلات — حدّث الصفحة إن لم يظهر التنبيه.');
        });
    };

    // eslint-disable-next-line no-console
    console.info('[Spark dev] للاختبار: __hamiResetSpark() ثم تحديث الصفحة');
}
