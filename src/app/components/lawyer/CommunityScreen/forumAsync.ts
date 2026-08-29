/** مهلة آمنة لعمليات المنتدى — لا تُعلّق واجهة المستخدم ولا تترك رفضاً معلّقاً */
export type ForumAsyncFallback<T> = T | (() => T);

function unwrapForumAsyncFallback<T>(fallback: ForumAsyncFallback<T>): T {
    return typeof fallback === 'function' ? (fallback as () => T)() : fallback;
}

export async function withForumAsyncTimeout<T>(
    promise: Promise<T>,
    ms: number,
    fallback: ForumAsyncFallback<T>,
): Promise<T> {
    let timer: ReturnType<typeof window.setTimeout> | undefined;
    // يمنع unhandledrejection إذا رُفض العمل الأصلي بعد سقوط المهلة
    void promise.then(undefined, () => undefined);
    try {
        return await Promise.race([
            promise,
            new Promise<never>((_, reject) => {
                timer = window.setTimeout(() => reject(new Error('forum-async-timeout')), ms);
            }),
        ]);
    } catch {
        return unwrapForumAsyncFallback(fallback);
    } finally {
        if (timer !== undefined) window.clearTimeout(timer);
    }
}
