/** تسجيل أخطاء خفيف — بلا SecureStore / Toast / تخزين. */

export function logError(context: string, error: unknown, details?: unknown): void {
    console.error(`❌ [${context}]`, error);
    if (details) {
        console.error('التفاصيل:', details);
    }
}

export function logErrorWithContext(
    context: string,
    error: unknown,
    additionalInfo?: Record<string, unknown>,
): void {
    const err = error as { message?: unknown; stack?: unknown };
    console.error(`❌ [${context}]`, {
        message: err?.message || error,
        stack: err?.stack,
        timestamp: new Date().toISOString(),
        context,
        ...additionalInfo,
    });
}
