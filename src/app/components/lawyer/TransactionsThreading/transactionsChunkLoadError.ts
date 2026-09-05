/** فشل مقطع Vite/Rollup — لا أخطاء الرسم المنطقية */
export function isTransactionsChunkLoadError(error: unknown): boolean {
    const name = error instanceof Error ? error.name : '';
    const message = error instanceof Error ? error.message : String(error ?? '');
    return (
        name === 'ChunkLoadError' ||
        /Failed to fetch dynamically imported module/i.test(message) ||
        /error loading dynamically imported module/i.test(message) ||
        /Loading chunk\s/i.test(message) ||
        /Loading CSS chunk/i.test(message)
    );
}
