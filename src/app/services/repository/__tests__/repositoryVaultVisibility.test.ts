import { describe, expect, it } from 'vitest';
import {
    buildRepositoryFeed,
    buildRepositoryVisibleFeedByMainFilter,
    filterRepositoryFeed,
} from '@/app/services/repository/repositoryUnifiedFeed';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';

const vaultDoc = (overrides: Partial<SmartVaultDoc> = {}): SmartVaultDoc =>
    ({
        id: 'vault-1',
        title: 'صورة هوية',
        type: 'image',
        tags: [],
        authorId: 'u1',
        createdAt: '2026-07-02T10:00:00.000Z',
        updatedAt: '2026-07-02T10:00:00.000Z',
        fileSize: 1024,
        fileName: 'id.jpg',
        mimeType: 'image/jpeg',
        storagePath: 'idb:vault:u1:vault-1',
        signedUrl: null,
        isProcessing: false,
        boundDossierId: null,
        ...overrides,
    }) as SmartVaultDoc;

describe('repository vault visibility scenarios', () => {
    it('scenario: بعد رفع ملف يظهر في فلتر صور وملفات', () => {
        const items = buildRepositoryFeed({
            globalNotes: [],
            lawsuitFiles: [],
            executionFiles: [],
            vaultDocs: [vaultDoc()],
        });

        expect(filterRepositoryFeed(items, 'media')).toHaveLength(1);
        expect(filterRepositoryFeed(items, 'all')).toHaveLength(1);
        expect(filterRepositoryFeed(items, 'drafts')).toHaveLength(0);
    });

    it('scenario: بطاقة بمرفق vault تظهر في media (بدون تكرار الملف المنفصل)', () => {
        const items = buildRepositoryFeed({
            globalNotes: [
                {
                    id: 'note-1',
                    title: 'بطاقة بمرفق',
                    body: 'نص',
                    isPinned: false,
                    attachmentDocId: 'vault-1',
                    type: 'media',
                },
            ],
            lawsuitFiles: [],
            executionFiles: [],
            vaultDocs: [vaultDoc()],
        });

        const visible = buildRepositoryVisibleFeedByMainFilter(items, 'الكل', '', [vaultDoc()]);
        expect(visible.media).toHaveLength(1);
        expect(visible.media[0]?.kind).toBe('global');
        expect(visible.all).toHaveLength(1);
    });

    it('scenario: مسح ضوئي يظهر كملف vault في media', () => {
        const scanDoc = vaultDoc({
            id: 'scan-1',
            title: 'مسح ضوئي',
            tags: ['مسح ضوئي'],
            type: 'image',
        });
        const items = buildRepositoryFeed({
            globalNotes: [],
            lawsuitFiles: [],
            executionFiles: [],
            vaultDocs: [scanDoc],
        });
        expect(filterRepositoryFeed(items, 'media')).toHaveLength(1);
    });
});
