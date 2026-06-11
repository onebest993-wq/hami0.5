/** بعد رفض المنفذ — فتح بطاقة القرار في تبويب «القرارات السابقة» */
export function navigateToAppealsAfterExecutorRejection(
    executionId: string | undefined,
    decisionId: string | undefined
): void {
    const exId = String(executionId || '').trim();
    const did = String(decisionId || '').trim();
    if (!exId || exId === 'undefined' || !did) return;
    try {
        window.dispatchEvent(
            new CustomEvent('hami-open-decisions-modal', {
                detail: {
                    executionId: exId,
                    tab: 'previous' as const,
                    decisionId: did,
                },
            })
        );
    } catch {
        /* ignore */
    }
}
