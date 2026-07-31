const loaded = new Set<string>();

async function _loadKey(key: string, loader: () => Promise<unknown>): Promise<void> {
    if (loaded.has(key)) return;
    loaded.add(key);
    await loader();
}

/**
 * tokens+material+hero+section+block+portrait تُحمَّل متزامناً عبر profilePageFx.css.
 * تبقى الدالة للتوافق مع تسليح المضيف والاختبارات — تُعلّم المفاتيح فوراً.
 */
export function ensureProfilePageSecondaryFxLoaded(): void {
    if (typeof window === 'undefined') return;
    loaded.add('section');
    loaded.add('block');
    loaded.add('portrait');
}

/** وعد يستقر فوراً بعد الاستيراد المتزامن — بوابة كشف الإطار النهائي */
export function ensureProfilePageSecondaryFxLoadedAsync(): Promise<void> {
    ensureProfilePageSecondaryFxLoaded();
    return Promise.resolve();
}

export function resetProfilePageFxLoaderForTests(): void {
    loaded.clear();
}
