import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { isVaultDocImage, isVaultDocPdf } from '@/app/services/vaultUploadService';

const DATE_PATTERNS = [
    /\b20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/g,
    /\b\d{1,2}[-/.]\d{1,2}[-/.]20\d{2}\b/g,
    /\b\d{1,2}\s+(?:كانون الثاني|شباط|آذار|نيسان|أيار|حزيران|تموز|آب|أيلول|تشرين الأول|تشرين الثاني|كانون الأول)\s+20\d{2}\b/gi,
];

export function vaultDocNeedsTextExtraction(doc: SmartVaultDoc): boolean {
    if (!isVaultDocPdf(doc) && !isVaultDocImage(doc)) return false;
    if (doc.isProcessing) return false;
    const text = String(doc.extractedText ?? '').trim();
    return text.length < 24;
}

export function extractDateHintsFromVaultText(text: string): string[] {
    const hints = new Set<string>();
    for (const pattern of DATE_PATTERNS) {
        const matches = text.match(pattern);
        if (matches) {
            for (const m of matches) hints.add(m.trim());
        }
    }
    return Array.from(hints).slice(0, 5);
}

export function scanVaultDocAttachmentSignals(doc: SmartVaultDoc): {
    needsExtraction: boolean;
    dateHints: string[];
} {
    const text = String(doc.extractedText ?? doc.aiSummary ?? '').trim();
    return {
        needsExtraction: vaultDocNeedsTextExtraction(doc),
        dateHints: text.length >= 24 ? extractDateHintsFromVaultText(text) : [],
    };
}
