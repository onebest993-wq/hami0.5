import { describe, expect, it } from 'vitest';
import { scanRepositoryForSpark } from '@/app/spark/engine/repositorySparkScan';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';

const baseDoc = (overrides: Partial<SmartVaultDoc> = {}): SmartVaultDoc =>
    ({
        id: 'doc-1',
        name: 'scan.pdf',
        type: 'pdf',
        category: 'عام',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        boundDossierId: null,
        ...overrides,
    }) as SmartVaultDoc;

describe('repositorySparkScan', () => {
    it('يُفضّل تنبيه الرفع المعلّق على غير المربوط', () => {
        const result = scanRepositoryForSpark({
            unboundVaultDocs: [baseDoc()],
            pendingUpload: true,
            uploadQueueCount: 1,
        });
        expect(result.nudge?.kind).toBe('repository.upload_meta_pending');
    });

    it('ينبّه عند وجود ملفات غير مربوطة', () => {
        const result = scanRepositoryForSpark({
            unboundVaultDocs: [baseDoc({ id: 'a' }), baseDoc({ id: 'b' })],
            pendingUpload: false,
        });
        expect(result.unboundCount).toBe(2);
        expect(result.nudge?.kind).toBe('repository.vault_unbound_docs');
    });

    it('ينبّه عند ملفات بانتظار استخراج النص', () => {
        const result = scanRepositoryForSpark({
            unboundVaultDocs: [],
            pendingUpload: false,
            vaultDocsForScan: [
                baseDoc({
                    id: 'pending',
                    type: 'image',
                    mimeType: 'image/jpeg',
                    extractedText: null,
                }),
            ],
        });
        expect(result.nudge?.kind).toBe('repository.vault_text_pending');
    });

    it('ينبّه عند تواريخ في نص مستخرج', () => {
        const result = scanRepositoryForSpark({
            unboundVaultDocs: [],
            pendingUpload: false,
            vaultDocsForScan: [
                baseDoc({
                    extractedText: 'محضر جلسة بتاريخ 2026-05-20',
                }),
            ],
        });
        expect(result.nudge?.kind).toBe('repository.vault_date_hint');
        expect(result.nudge?.targetFileId).toBeDefined();
    });

    it('يُفضّل تنبيه المرفق المربوط غير المسجّل على تلميح عام', () => {
        const result = scanRepositoryForSpark({
            unboundVaultDocs: [],
            pendingUpload: false,
            vaultDocsForScan: [
                baseDoc({
                    id: 'bound-doc',
                    boundDossierId: '42',
                    mimeType: 'application/pdf',
                    extractedText: 'محضر جلسة رسمية بتاريخ 2026-08-10 في المحكمة',
                }),
            ],
            lawsuitFiles: [
                {
                    id: 42,
                    caseNo: '100/2026',
                    history: [{ id: 1, stage: 'جلسة', result: 'تأجيل', date: '2026-03-01' }],
                    notes: [],
                    date: '2026-01-01',
                } as import('@/app/components/lawyer/LawyerShared').FileData,
            ],
            executionFiles: [],
        });
        expect(result.nudge?.kind).toBe('repository.vault_bound_date_unregistered');
    });

    it('لا تنبيه عند خزنة نظيفة', () => {
        const result = scanRepositoryForSpark({
            unboundVaultDocs: [],
            pendingUpload: false,
        });
        expect(result.nudge).toBeNull();
    });
});
