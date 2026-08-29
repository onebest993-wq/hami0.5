import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { extractTextFromVaultPdf } from '@/app/services/vault/vaultPdfTextExtraction';
import { isVaultDocPdf, resolveVaultDocBlob } from '@/app/services/vaultUploadService';

const VAULT_EXTRACT_MAX_CHARS = 12_000;

/** يستخرج نصاً من مرفق خزنة — PDF محلياً عبر pdf.js؛ الصور بلا استخراج */
export async function extractTextFromVaultDoc(doc: SmartVaultDoc): Promise<string> {
    const existing = String(doc.extractedText ?? doc.aiSummary ?? '').trim();
    if (existing.length >= 24) return existing.slice(0, VAULT_EXTRACT_MAX_CHARS);

    const blob = await resolveVaultDocBlob(doc);
    if (!blob) return '';

    if (isVaultDocPdf(doc)) {
        try {
            return await extractTextFromVaultPdf(blob, VAULT_EXTRACT_MAX_CHARS);
        } catch {
            return '';
        }
    }

    return '';
}
