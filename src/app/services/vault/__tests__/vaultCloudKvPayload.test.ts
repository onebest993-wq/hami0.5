import { describe, expect, it, vi } from 'vitest';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';

vi.mock('@/app/services/CryptoService', () => {
    const plainByCipher = new Map<string, string>();
    let n = 0;
    return {
        CryptoService: {
            initialize: vi.fn(async () => undefined),
            encryptData: vi.fn(async (plain: string) => {
                const cipher = `c${++n}`;
                plainByCipher.set(cipher, plain);
                return cipher;
            }),
            decryptData: vi.fn(async (cipher: string) => plainByCipher.get(cipher) ?? '{}'),
            generateDataSignature: vi.fn(async () => 'sig'),
            verifyDataSignature: vi.fn(async () => true),
        },
    };
});

import {
    mergeVaultDocPair,
    parseVaultDocFromKv,
    sealVaultDocForKv,
    vaultDocPayloadForKv,
} from '@/app/services/vault/vaultCloudKvPayload';
import { isSealedWorkCloudKv } from '@/app/services/cloud/workCloudKvSeal';

function sampleDoc(over: Partial<SmartVaultDoc> = {}): SmartVaultDoc {
    return {
        id: 'd1',
        title: 'شكوى جناية — المتهم فلان',
        type: 'pdf',
        tags: ['عرائض'],
        authorId: 'u1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        fileSize: 1200,
        fileName: 'complaint.pdf',
        mimeType: 'application/pdf',
        storagePath: 'idb:vault:u1:d1',
        signedUrl: 'blob:http://localhost/abc',
        extractedText: 'نص OCR طويل جداً فيه اسم الموكل',
        extractedTextAt: '2026-01-02T00:00:00.000Z',
        isProcessing: true,
        lawyerNote: '<b>سري</b>',
        aiSummary: 'ملخص',
        ...over,
    };
}

describe('vaultCloudKvPayload', () => {
    it('يحذف OCR والروابط المحلية من حمولة KV', () => {
        const payload = vaultDocPayloadForKv(sampleDoc());
        expect(payload.extractedText).toBeNull();
        expect(payload.extractedTextAt).toBeNull();
        expect(payload.isProcessing).toBe(false);
        expect(payload.signedUrl).toBeNull();
        expect(payload.lawyerNote).toBe('سري');
        expect(payload.title).toBe('شكوى جناية — المتهم فلان');
    });

    it('يختم الحمولة فلا يظهر العنوان في JSON الغلاف', async () => {
        const sealed = await sealVaultDocForKv(sampleDoc());
        expect(isSealedWorkCloudKv(sealed)).toBe(true);
        expect(JSON.stringify(sealed)).not.toContain('المتهم فلان');
        expect(JSON.stringify(sealed)).not.toContain('نص OCR');
        const parsed = await parseVaultDocFromKv(sealed, 'u1');
        expect(parsed?.title).toBe('شكوى جناية — المتهم فلان');
        expect(parsed?.extractedText).toBeNull();
    });

    it('يفكّ الإرث الصريح ويعقّم javascript:', async () => {
        const parsed = await parseVaultDocFromKv(
            sampleDoc({
                storagePath: 'u1/vault/doc.pdf',
                signedUrl: 'javascript:alert(1)',
            }),
            'u1',
        );
        expect(parsed?.id).toBe('d1');
        expect(parsed?.signedUrl).toBeNull();
    });

    it('يرفض وثيقة مستخدم آخر', async () => {
        await expect(parseVaultDocFromKv(sampleDoc(), 'other')).resolves.toBeNull();
    });

    it('يحفظ نص البحث المحلي عند فوز سجل سحابي بلا OCR', () => {
        const local = sampleDoc({ updatedAt: '2026-01-01T00:00:00.000Z' });
        const remote = sampleDoc({
            updatedAt: '2026-01-03T00:00:00.000Z',
            title: 'عنوان محدّث',
            extractedText: null,
            extractedTextAt: null,
        });
        const merged = mergeVaultDocPair(remote, local);
        expect(merged.title).toBe('عنوان محدّث');
        expect(merged.extractedText).toBe('نص OCR طويل جداً فيه اسم الموكل');
    });
});
