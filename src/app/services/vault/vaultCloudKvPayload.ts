import { sealWorkCloudKvValue, unsealWorkCloudKvValue } from '@/app/services/cloud/workCloudKvSeal';
import { sanitizeVaultPlainNote, sanitizeVaultPreviewUrl } from '@/app/services/vault/vaultPreviewUrlSafety';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';

function isVaultDocShape(value: unknown, uid?: string): value is SmartVaultDoc {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const o = value as Record<string, unknown>;
    if (typeof o.id !== 'string' || !o.id.trim()) return false;
    if (typeof o.title !== 'string' || typeof o.authorId !== 'string') return false;
    if (uid && o.authorId !== uid) return false;
    return true;
}

/** بيانات الفهرس للمزامنة — بلا OCR ولا روابط مؤقتة ولا حالة واجهة */
export function vaultDocPayloadForKv(doc: SmartVaultDoc): SmartVaultDoc {
    return {
        ...doc,
        signedUrl: null,
        extractedText: null,
        extractedTextAt: null,
        isProcessing: false,
        lawyerNote: sanitizeVaultPlainNote(doc.lawyerNote),
        aiSummary: sanitizeVaultPlainNote(doc.aiSummary),
    };
}

export async function sealVaultDocForKv(doc: SmartVaultDoc): Promise<unknown> {
    return sealWorkCloudKvValue(vaultDocPayloadForKv(doc));
}

export async function parseVaultDocFromKv(raw: unknown, uid?: string): Promise<SmartVaultDoc | null> {
    const plain = await unsealWorkCloudKvValue(raw);
    if (!isVaultDocShape(plain, uid)) return null;
    return {
        ...plain,
        signedUrl: sanitizeVaultPreviewUrl(plain.signedUrl),
    };
}

/** الفائز زمنياً مع الإبقاء على نص البحث المحلي إن غاب عن السحابة */
export function mergeVaultDocPair(winner: SmartVaultDoc, other: SmartVaultDoc): SmartVaultDoc {
    return {
        ...winner,
        signedUrl: winner.signedUrl ?? other.signedUrl ?? null,
        storagePath: winner.storagePath || other.storagePath,
        extractedText: winner.extractedText || other.extractedText || null,
        extractedTextAt: winner.extractedTextAt || other.extractedTextAt || null,
    };
}
