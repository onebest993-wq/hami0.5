import { describe, expect, it } from 'vitest';
import {
    buildMaskedView,
    maskCaseNumber,
    maskCourtLabel,
    maskPersonName,
} from '../caseShareMasking';
import type { CaseShareVisibleFields, DossierShareSource } from '../caseShareTypes';

const baseSource: DossierShareSource = {
    module: 'lawsuit',
    dossierId: 'd-1',
    title: 'دعوى — موكل',
    caseNumbers: ['1234/2024'],
    partyNames: ['أحمد محمد علي'],
    courtLabel: 'محكمة بداءة الرصافة — الغرفة 12 — القاضي كريم',
    courtProvince: 'القادسية',
    narrativeText: 'نزاع على مبلغ 5000000 دينار في بغداد',
    documentCount: 3,
    catalog: [
        {
            key: 'parties',
            title: 'الأطراف',
            items: [{ id: 'party:1', kind: 'meta', label: 'أحمد محمد علي', preview: 'مدعي' }],
        },
        {
            key: 'notes',
            title: 'الملاحظات',
            items: [{ id: 'note:1', kind: 'note', label: 'ملاحظة', preview: 'نص' }],
        },
        {
            key: 'documents',
            title: 'المستندات',
            items: [{ id: 'doc:1', kind: 'document', label: 'مرفق', preview: 'pdf' }],
        },
    ],
};

const defaultFields: CaseShareVisibleFields = {
    documents: true,
    case_numbers: true,
    parties_names: 'full',
    court_details: 'full',
};

describe('caseShareMasking', () => {
    it('masks case numbers when case_numbers is false', () => {
        expect(maskCaseNumber('1234/2024', false)).toBe('[XXXX]');
        expect(maskCaseNumber('1234/2024', true)).toBe('1234/2024');
    });

    it('partially masks party names', () => {
        expect(maskPersonName('أحمد محمد علي', 'partial')).toBe('أحمد ع.');
        expect(maskPersonName('أحمد محمد علي', 'hidden')).toBe('[الطرف مجهول]');
    });

    it('partially masks court details with province only', () => {
        const masked = maskCourtLabel(
            'محكمة بداءة الرصافة — الغرفة 12',
            'القادسية',
            'partial',
        );
        expect(masked).toBe('محكمة بداءة في القادسية');
        expect(maskCourtLabel('محكمة استئناف بغداد', 'بغداد', 'partial')).toContain('استئناف');
    });

    it('buildMaskedView hides documents flag and masks terms', () => {
        const view = buildMaskedView(baseSource, {
            ...defaultFields,
            documents: false,
            case_numbers: false,
            parties_names: 'partial',
            court_details: 'hidden',
            masked_terms: ['5000000'],
        });
        expect(view.documentsIncluded).toBe(false);
        expect(view.caseNumbers[0]).toBe('[XXXX]');
        expect(view.parties[0]).toBe('أحمد ع.');
        expect(view.court).toBe('[محكمة مجهولة]');
        expect(view.narrative).toContain('████');
        expect(view.narrative).not.toContain('5000000');
    });

    it('uses text_masking summary when provided', () => {
        const view = buildMaskedView(baseSource, {
            ...defaultFields,
            text_masking: 'ملخص قانوني موجز للزميل',
        });
        expect(view.narrative).toBe('ملخص قانوني موجز للزميل');
    });

    it('masks catalog party labels when parties_names is partial', () => {
        const view = buildMaskedView(baseSource, {
            ...defaultFields,
            parties_names: 'partial',
        });
        const parties = view.visibleCatalog?.find((s) => s.key === 'parties');
        expect(parties?.items[0]?.label).toBe('أحمد ع.');
    });
});
