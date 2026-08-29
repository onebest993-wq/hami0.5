import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

let depth = 0;

export function isNativeSensitivePromptActive(): boolean {
    return depth > 0;
}

export function resetNativeSensitivePromptForTests(): void {
    depth = 0;
}

async function invokeNative(begin: boolean): Promise<void> {
    if (!isCapacitorNativePlatform()) return;
    try {
        const [{ Capacitor }, { HamiPrivacy }] = await Promise.all([
            import('@capacitor/core'),
            import('@/plugins/hami-privacy-guard'),
        ]);
        if (!Capacitor.isPluginAvailable('HamiPrivacy')) return;
        if (begin) await HamiPrivacy.beginSensitivePrompt();
        else await HamiPrivacy.endSensitivePrompt();
    } catch {
        /* plugin قديم أو غير مسجّل */
    }
}

/**
 * نافذة البصمة تُخرج النشاط إلى الخلفية — بدون هذا العمق يُقفل المكتب ويُرسم التمويه فوق الجلسة.
 */
export async function withNativeSensitivePrompt<T>(fn: () => Promise<T>): Promise<T> {
    depth += 1;
    try {
        if (depth === 1) await invokeNative(true);
        return await fn();
    } finally {
        depth = Math.max(0, depth - 1);
        if (depth === 0) await invokeNative(false);
    }
}
