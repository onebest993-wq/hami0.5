const decodedSources = new Set<string>();

/**
 * يضمن فك ترميز الصورة قبل رسمها كخلفية — يمنع وميض/فراغ أثناء paint.
 * يفشل بصمت (لا يحجب الإقلاع).
 */
export async function ensureWallpaperDecoded(src: string | undefined | null): Promise<void> {
    if (!src || typeof Image === 'undefined') return;
    if (decodedSources.has(src)) return;

    await new Promise<void>((resolve) => {
        const img = new Image();
        const finish = () => {
            decodedSources.add(src);
            resolve();
        };
        img.onload = () => {
            if (typeof img.decode === 'function') {
                void img.decode().then(finish).catch(finish);
                return;
            }
            finish();
        };
        img.onerror = finish;
        img.src = src;
    });
}

export function clearWallpaperDecodeCache(): void {
    decodedSources.clear();
}
