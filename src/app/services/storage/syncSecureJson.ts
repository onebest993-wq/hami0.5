import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clearLegacyPlaintextMirror,
    persistSecurePayloadWhenReady,
    readSecureOrDrainLegacySync,
    readSecurePayloadWhenReady,
    writeSecureAndClearLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

/** كتابة متزامنة مشفّرة ثم محو المرآة، مع انتظار IndexedDB في الخلفية. */
export function writeSecureJsonValue(key: string, value: unknown): void {
    const payload = JSON.stringify(value);
    writeSecureAndClearLegacySync(key, payload);
    if (import.meta.env.VITEST) return;
    void persistSecurePayloadWhenReady(key, payload);
}

/** يمحو المفتاح من SecureStore ومرآة localStorage. */
export function clearSecureJsonValue(key: string): void {
    try {
        SecureStoreService.deleteItemSync(key);
    } catch {
        /* ignore */
    }
    clearLegacyPlaintextMirror(key);
}

export function readSecureJsonRawSync(key: string): string | null {
    return readSecureOrDrainLegacySync(key);
}

export async function readSecureJsonRaw(key: string): Promise<string | null> {
    return readSecurePayloadWhenReady(key);
}

export async function persistSecureJsonValue(key: string, value: unknown): Promise<void> {
    const payload = JSON.stringify(value);
    writeSecureAndClearLegacySync(key, payload);
    if (import.meta.env.VITEST) return;
    await persistSecurePayloadWhenReady(key, payload);
}
