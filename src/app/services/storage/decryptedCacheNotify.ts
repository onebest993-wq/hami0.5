type DecryptedCacheListener = (key: string, value: string) => void;

const listeners: DecryptedCacheListener[] = [];

/** يُسجَّل من وحدات شواهد القبر — بلا استيراد SecureStore. */
export function onDecryptedCacheWrite(listener: DecryptedCacheListener): void {
    listeners.push(listener);
}

export function notifyDecryptedCacheWrite(key: string, value: string): void {
    for (const listener of listeners) listener(key, value);
}
