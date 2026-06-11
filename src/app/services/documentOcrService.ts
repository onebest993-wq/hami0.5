export type DocumentOcrResult = {
    text: string;
    source: 'none' | 'local';
};

/** V1 — OCR via external AI disabled; returns placeholder for stored images. */
export async function extractTextFromDocumentImage(
    _input: Blob | string,
): Promise<DocumentOcrResult> {
    return {
        text: '',
        source: 'none',
    };
}

export function formatOcrFallbackMessage(): string {
    return 'تم حفظ الصورة في المخزن — التعرف النصي غير متاح في هذه النسخة';
}

/** @deprecated use formatOcrFallbackMessage */
export function ocrFallbackMessage(_uploaded?: boolean): string {
    return formatOcrFallbackMessage();
}
