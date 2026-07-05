/** مهلة آمنة لعمليات المنتدى — لا تُعلّق واجهة المستخدم */
export async function withForumAsyncTimeout<T>(
    promise: Promise<T>,
    ms: number,
    fallback: T,
): Promise<T> {
    try {
        return await Promise.race([
            promise,
            new Promise<never>((_, reject) => {
                window.setTimeout(() => reject(new Error('forum-async-timeout')), ms);
            }),
        ]);
    } catch {
        return fallback;
    }
}
