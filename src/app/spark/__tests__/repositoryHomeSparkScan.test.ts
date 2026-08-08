import { describe, expect, it } from 'vitest';
import { scanRepositoryHomeSparkHits } from '@/app/spark/engine/repositoryHomeSparkScan';

describe('repositoryHomeSparkScan', () => {
    it('يكتشف تذكير ملاحظة قريب', () => {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const hits = scanRepositoryHomeSparkHits({
            vaultDocs: [],
            notes: [
                {
                    id: 'note-1',
                    title: 'تذكير عقد',
                    reminder_at: tomorrow,
                } as import('@/app/components/lawyer/LawyerDashboardParts/types').GlobalNote,
            ],
            lawsuitFiles: [],
            executionFiles: [],
        });

        expect(hits).toHaveLength(1);
        expect(hits[0].kind).toBe('repository.note_reminder_near');
        expect(hits[0].targetFileId).toBe('note-1');
    });

    it('يكتشف ملفات خزنة غير مربوطة', () => {
        const hits = scanRepositoryHomeSparkHits({
            vaultDocs: [
                {
                    id: 'vault-1',
                    name: 'عقد.pdf',
                    boundDossierId: null,
                    type: 'pdf',
                    category: 'عام',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                } as import('@/app/services/vault/vaultTypes').SmartVaultDoc,
            ],
            notes: [],
            lawsuitFiles: [],
            executionFiles: [],
        });

        expect(hits).toHaveLength(1);
        expect(hits[0].kind).toBe('repository.vault_unbound_docs');
    });
});
