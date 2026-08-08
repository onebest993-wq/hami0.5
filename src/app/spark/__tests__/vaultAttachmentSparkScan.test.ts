import { describe, expect, it } from 'vitest';
import {
    extractDateHintsFromVaultText,
    scanVaultDocAttachmentSignals,
    vaultDocNeedsTextExtraction,
} from '@/app/spark/engine/vaultAttachmentSparkScan';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';

const baseDoc = (overrides: Partial<SmartVaultDoc> = {}): SmartVaultDoc =>
    ({
        id: 'doc-1',
        title: 'حكم',
        type: 'pdf',
        tags: [],
        authorId: 'u1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        fileSize: 1000,
        fileName: 'scan.pdf',
        mimeType: 'application/pdf',
        storagePath: 'idb:vault:u1:doc-1',
        boundDossierId: null,
        ...overrides,
    }) as SmartVaultDoc;

describe('vaultAttachmentSparkScan', () => {
    it('يحدد الحاجة لاستخراج النص', () => {
        expect(vaultDocNeedsTextExtraction(baseDoc())).toBe(true);
        expect(
            vaultDocNeedsTextExtraction(
                baseDoc({ extractedText: 'نص طويل بما يكفي للتحليل والمطابقة مع السجل' }),
            ),
        ).toBe(false);
    });

    it('يستخرج تلميحات تواريخ من النص', () => {
        const hints = extractDateHintsFromVaultText('الجلسة بتاريخ 2026-03-15 والمهلة 10/04/2026');
        expect(hints.length).toBeGreaterThan(0);
    });

    it('يربط المرفق بنص مستخرج', () => {
        const signals = scanVaultDocAttachmentSignals(
            baseDoc({
                extractedText:
                    'محضر جلسة تنفيذية بتاريخ 2026-02-01 يتضمن مهلة للمدين خلال أسبوع',
            }),
        );
        expect(signals.needsExtraction).toBe(false);
        expect(signals.dateHints.length).toBeGreaterThan(0);
    });
});
