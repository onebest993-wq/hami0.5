import { isSparkVaultExtractEnabled } from '@/app/spark/audit/sparkVaultExtractConfig';

export type DocumentOcrResult = {
    text: string;
    source: 'none' | 'local' | 'remote';
};

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

async function resolveImageBlob(input: Blob | string): Promise<Blob | null> {
    if (input instanceof Blob) return input;
    const raw = String(input ?? '').trim();
    if (!raw) return null;
    try {
        const response = await fetch(raw);
        if (!response.ok) return null;
        return await response.blob();
    } catch {
        return null;
    }
}

/** استخراج نص من صورة — Gemini عبر spark-vault-extract عند التفعيل */
export async function extractTextFromDocumentImage(
    input: Blob | string,
): Promise<DocumentOcrResult> {
    if (!isSparkVaultExtractEnabled()) {
        return { text: '', source: 'none' };
    }

    try {
        const blob = await resolveImageBlob(input);
        if (!blob) return { text: '', source: 'none' };

        const { requestSparkVaultExtract } = await import('@/app/spark/audit/sparkVaultExtractService');
        const remote = await requestSparkVaultExtract({
            mimeType: blob.type || 'image/jpeg',
            base64Data: await blobToBase64(blob),
        });
        const text = String(remote?.text ?? '').trim();
        if (text.length >= 8) {
            return { text, source: 'remote' };
        }
    } catch {
        /* الخدمة غير متاحة */
    }

    return { text: '', source: 'none' };
}

export function formatOcrFallbackMessage(): string {
    return 'تم حفظ الصورة في المخزن — فعّل استخراج سبارك للخزنة لقراءة النص تلقائياً';
}

/** @deprecated use formatOcrFallbackMessage */
export function ocrFallbackMessage(_uploaded?: boolean): string {
    return formatOcrFallbackMessage();
}
