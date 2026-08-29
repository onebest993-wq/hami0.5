import { persistSecurePayloadWhenReady } from '@/app/services/storage/readSecureOrDrainLegacySync';
import { notifyTransactionsPersistFailure } from '@/app/services/transactions/notifyTransactionsPersistFailure';

/** كتابة غير متزامنة: لا تُترك الرفض بلا معالجة بعد أن صار المسار تشفيراً أو فشلاً */
export function persistTransactionsSecure(key: string, payload: string): void {
    void persistSecurePayloadWhenReady(key, payload).catch((error: unknown) => {
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
