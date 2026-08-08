import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { extractTextFromDocumentImage } from '@/app/services/documentOcrService';
import { extractTextFromVaultPdf } from '@/app/services/vault/vaultPdfTextExtraction';
import { isVaultDocImage, isVaultDocPdf, resolveVaultDocBlob } from '@/app/services/vaultUploadService';
import { isSparkVaultExtractEnabled } from '@/app/spark/audit/sparkVaultExtractConfig';
import { VAULT_EXTRACT_MAX_CHARS } from '@/app/spark/audit/sparkVaultExtractConfig';

async function blobToBase64(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

/** يستخرج نصاً من مرفق خزنة — PDF محلياً، صورة عبر OCR محلي ثم Gemini اختيارياً */
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

    if (isVaultDocImage(doc)) {
        const local = await extractTextFromDocumentImage(blob);
        if (local.text.trim().length >= 24) {
            return local.text.trim().slice(0, VAULT_EXTRACT_MAX_CHARS);
        }

        if (isSparkVaultExtractEnabled()) {
            try {
                const { requestSparkVaultExtract } = await import(
                    '@/app/spark/audit/sparkVaultExtractService'
                );
                const base64Data = await blobToBase64(blob);
                const remote = await requestSparkVaultExtract({
                    mimeType: doc.mimeType || 'image/jpeg',
                    base64Data,
                    fileName: doc.fileName,
                });
                if (remote?.text) return remote.text;
            } catch {
                /* Gemini غير متاح */
            }
        }
    }

    return '';
}
