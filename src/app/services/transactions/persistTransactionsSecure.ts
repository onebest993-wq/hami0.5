import { persistSecurePayloadWhenReady } from '@/app/services/storage/readSecureOrDrainLegacySync';
import { notifyTransactionsPersistFailure } from '@/app/services/transactions/notifyTransactionsPersistFailure';

/** بعد setItemSync: false حتى لا تُتخطى كتابة IndexedDB لأن الذاكرة تطابقت */
export function persistTransactionsSecure(key: string, payload: string): void {
    void persistSecurePayloadWhenReady(key, payload, { skipIfUnchanged: false }).catch((error: unknown) => {
        notifyTransactionsPersistFailure(error);
    });
}

export async function persistTransactionsSecureAwait(key: string, payload: string): Promise<void> {
    try {
        await persistSecurePayloadWhenReady(key, payload);
    } catch (error) {
        notifyTransactionsPersistFailure(error);
        throw error;
    }
}
