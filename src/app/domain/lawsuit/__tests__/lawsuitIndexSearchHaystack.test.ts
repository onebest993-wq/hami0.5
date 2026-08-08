import { describe, expect, it } from 'vitest';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import {
    buildLawsuitIndexSearchHaystack,
    resolveLawsuitIndexClientName,
} from '@/app/domain/lawsuit/lawsuitIndexSearchHaystack';
import { buildLawsuitIndexEntryFromFile } from '@/app/domain/lawsuit/lawsuitLifecycleIndex';

const file: FileData = {
    id: 9,
    type: 'lawsuit',
    status: 'deleted',
    caseNo: '2026/ب/9',
    court: 'بداءة الكرخ',
    docType: 'دعوى',
    parties: [
        { id: 1, name: 'أحمد المحامي', role: 'مدعي', isClient: true },
        { id: 2, name: 'سارة المدعى عليها', role: 'مدعى عليه' },
    ],
    notes: [{ id: 1, text: 'ملاحظة سرية للبحث', meta: '', stageCtx: '', date: '' }],
    history: [],
    images: [],
    date: '2026-01-01',
};

describe('lawsuitIndexSearchHaystack', () => {
    it('يجمع أطراف وملاحظات في haystack مضغوط', () => {
        const hay = buildLawsuitIndexSearchHaystack(file);
        expect(hay).toContain('أحمد المحامي');
        expect(hay).toContain('سارة المدعى عليها');
        expect(hay).toContain('ملاحظة سرية للبحث');
        expect(hay).toContain('بداءة الكرخ');
    });

    it('buildLawsuitIndexEntryFromFile يخزّن clientName و searchHaystack', () => {
        const entry = buildLawsuitIndexEntryFromFile(file);
        expect(entry.clientName).toBe('أحمد المحامي');
        expect(entry.court).toBe('بداءة الكرخ');
        expect(entry.searchHaystack).toContain('ملاحظة سرية للبحث');
    });

    it('resolveLawsuitIndexClientName يفضّل isClient', () => {
        expect(resolveLawsuitIndexClientName(file)).toBe('أحمد المحامي');
    });
});
