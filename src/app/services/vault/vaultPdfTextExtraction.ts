import { loadVaultPdfDocument, type VaultPdfSource } from '@/app/services/vault/vaultPdfDocument';

const DEFAULT_MAX_CHARS = 12_000;

/** استخراج نص من PDF محلياً عبر pdf.js — بدون OCR */
export async function extractTextFromVaultPdf(
    source: VaultPdfSource,
    maxChars: number = DEFAULT_MAX_CHARS,
): Promise<string> {
    const pdf = await loadVaultPdfDocument(source);
    const parts: string[] = [];
    try {
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            const pageText = content.items
                .map((item) => ('str' in item ? String(item.str ?? '') : ''))
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
            if (pageText) parts.push(pageText);
            if (parts.join('\n').length >= maxChars) break;
        }
    } finally {
        await pdf.destroy().catch(() => {});
    }
    return parts.join('\n').slice(0, maxChars).trim();
}
