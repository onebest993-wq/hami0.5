import { SmartVaultDB } from '@/app/services/vault/smartVaultRuntime';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { mergeVaultDocsWarmCache, notifySmartVaultDocsUpdated } from '@/app/services/vault/vaultDocsWarmCache';
import { upsertVaultLocalIndexDocImmediate } from '@/app/services/vault/vaultLocalIndex';
import { isVaultDocImage, isVaultDocPdf } from '@/app/services/vaultUploadService';

const inFlight = new Set<string>();

/**
 * جدولة استخراج نص غير حاجب بعد حفظ المرفق — Wave 6
 * يحدّث extractedText على SmartVaultDoc عند النجاح.
 */
export function scheduleVaultTextExtraction(doc: SmartVaultDoc, afterPersist?: Promise<void>): void {
    if (!isVaultDocPdf(doc) && !isVaultDocImage(doc)) return;
    if (String(doc.extractedText ?? '').trim().length >= 24) return;
    if (inFlight.has(doc.id)) return;
    inFlight.add(doc.id);

    void (async () => {
        try {
            if (afterPersist) await afterPersist.catch(() => {});
            const { extractTextFromVaultDoc } = await import(
                '@/app/services/vault/vaultTextExtractionService'
            );
            const text = await extractTextFromVaultDoc(doc);
            if (text.length < 12) return;

            const updated: SmartVaultDoc = {
                ...doc,
                extractedText: text,
                extractedTextAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isProcessing: false,
                aiSummary: doc.aiSummary || text.slice(0, 500),
            };
            upsertVaultLocalIndexDocImmediate(updated);
            mergeVaultDocsWarmCache(doc.authorId, [updated]);
            notifySmartVaultDocsUpdated(doc.authorId, [updated]);
            await SmartVaultDB.saveDoc(updated, doc.authorId);
        } catch {
            /* فشل صامت — التنبيهات الهيكلية تكفي */
        } finally {
            inFlight.delete(doc.id);
        }
    })();
}

/** للاختبارات */
export function resetVaultTextExtractionRuntimeForTests(): void {
    inFlight.clear();
}
