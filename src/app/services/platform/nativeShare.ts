export type NativeSharePayload = {
    title?: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
};

export type NativeShareResult = 'shared' | 'copied' | 'cancelled' | 'unavailable';

function isAbortError(err: unknown): boolean {
    return err instanceof Error && err.name === 'AbortError';
}

async function tryCapacitorShare(payload: NativeSharePayload): Promise<NativeShareResult | null> {
    try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return null;
        const { Share } = await import('@capacitor/share');
        await Share.share({
            title: payload.title,
            text: payload.text,
            url: payload.url,
            dialogTitle: payload.dialogTitle ?? payload.title ?? 'مشاركة',
        });
        return 'shared';
    } catch (err) {
        if (isAbortError(err)) return 'cancelled';
        return null;
    }
}

/**
 * مشاركة أصلية: Capacitor Share على الجهاز، ثم Web Share API، ثم الحافظة.
 */
export async function shareNative(payload: NativeSharePayload): Promise<NativeShareResult> {
    const capacitorResult = await tryCapacitorShare(payload);
    if (capacitorResult) return capacitorResult;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
            await navigator.share({
                title: payload.title,
                text: payload.text,
                url: payload.url,
            });
            return 'shared';
        } catch (err) {
            if (isAbortError(err)) return 'cancelled';
        }
    }

    const clipboardText = [payload.text, payload.url].filter(Boolean).join('\n');
    if (clipboardText && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(clipboardText);
        return 'copied';
    }

    return 'unavailable';
}
