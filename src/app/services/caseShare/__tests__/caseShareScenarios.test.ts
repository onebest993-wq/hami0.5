import { beforeEach, describe, expect, it } from 'vitest';
import { CaseShareRepository } from '../caseShareRepository';
import { buildMaskedView } from '../caseShareMasking';
import {
    PERSONAS,
    fieldsWith,
    resetCaseShareStore,
    richLawsuitSource,
    seedOwnedLawsuitForShareTests,
} from './caseShareTestFixtures';

function noteIds(view: { visibleCatalog?: { key: string; items: { id: string }[] }[] }) {
    return view.visibleCatalog?.find((s) => s.key === 'notes')?.items.map((i) => i.id) ?? [];
}

function docIds(view: { visibleCatalog?: { key: string; items: { id: string }[] }[] }) {
    return view.visibleCatalog?.find((s) => s.key === 'documents')?.items.map((i) => i.id) ?? [];
}

describe('سيناريوهات استشارة الزميل — مرسل ↔ مستقبل', () => {
    beforeEach(() => {
        resetCaseShareStore();
        seedOwnedLawsuitForShareTests();
    });

    it('سيناريو 1: مشاركة كاملة — المستقبل يرى كل الأقسام', async () => {
        const source = richLawsuitSource();
        expect(source.catalog.some((s) => s.key === 'notes')).toBe(true);
        expect(source.catalog.some((s) => s.key === 'timeline')).toBe(true);
        expect(source.catalog.some((s) => s.key === 'documents')).toBe(true);

        const share = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source,
            visibleFields: fieldsWith({}),
        });

        const view = share.maskedView;
        expect(view.documentsIncluded).toBe(true);
        expect(noteIds(view).length).toBeGreaterThanOrEqual(3);
        expect(view.parties[0]).toContain('محمد');
        expect(view.caseNumbers[0]).toBe('4521/2024');
    });

    it('سيناريو 2: إخفاء كل الملاحظات — المستقبل لا يرى قسم الملاحظات', async () => {
        const source = richLawsuitSource();
        const fields = fieldsWith({
            sectionMode: { notes: 'none', timeline: 'all', documents: 'all' },
        });

        const preview = buildMaskedView(source, fields);
        expect(noteIds(preview)).toHaveLength(0);
        expect(preview.visibleCatalog?.some((s) => s.key === 'notes')).toBeFalsy();

        const share = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source,
            visibleFields: fields,
        });

        expect(noteIds(share.maskedView)).toHaveLength(0);
    });

    it('سيناريو 3: إخفاء ملاحظة حساسة واحدة — باقي الملاحظات تظهر', async () => {
        const source = richLawsuitSource();
        const secretNoteId = 'note:103';

        const fields = fieldsWith({
            sectionMode: { notes: 'pick' },
            hiddenItemIds: [secretNoteId],
        });

        const preview = buildMaskedView(source, fields);
        const visibleNotes = noteIds(preview);
        expect(visibleNotes).toHaveLength(2);
        expect(visibleNotes).not.toContain(secretNoteId);

        const share = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source,
            visibleFields: fields,
        });

        expect(noteIds(share.maskedView)).toEqual(visibleNotes);
    });

    it('سيناريو 4: إخفاء كل المستندات', async () => {
        const source = richLawsuitSource();
        const fields = fieldsWith({
            documents: true,
            sectionMode: { documents: 'none' },
        });

        const share = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source,
            visibleFields: fields,
        });

        expect(share.maskedView.documentsIncluded).toBe(false);
        expect(docIds(share.maskedView)).toHaveLength(0);
    });

    it('سيناريو 5: مستند واحد فقط من الإضبارة', async () => {
        const source = richLawsuitSource();
        const docsSection = source.catalog.find((s) => s.key === 'documents')!;
        const keep = docsSection.items[0]!;
        const hide = docsSection.items.slice(1).map((i) => i.id);

        const fields = fieldsWith({
            sectionMode: { documents: 'pick' },
            hiddenItemIds: hide,
        });

        const share = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source,
            visibleFields: fields,
        });

        expect(docIds(share.maskedView)).toEqual([keep.id]);
        expect(share.maskedView.documentsIncluded).toBe(true);
    });

    it('سيناريو 6: تجهيل الأطراف والمحكمة وأرقام الدعوى + ملخص موجّه', async () => {
        const source = richLawsuitSource();
        const fields = fieldsWith({
            parties_names: 'partial',
            court_details: 'hidden',
            case_numbers: false,
            text_masking: 'نزاع تجاري — يطلب الزميل رأياً في مدى صحة الإنذار',
            masked_terms: ['8000000'],
        });

        const share = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source,
            visibleFields: fields,
        });

        const view = share.maskedView;
        expect(view.parties[0]).toMatch(/محمد/);
        expect(view.parties[0]).not.toContain('الكاظمي');
        expect(view.court).toBe('[محكمة مجهولة]');
        expect(view.caseNumbers[0]).toBe('[XXXX]');
        expect(view.narrative).toBe('نزاع تجاري — يطلب الزميل رأياً في مدى صحة الإنذار');
    });

    it('سيناريو 7: إخفاء السجل الزمني مع الإبقاء على الملاحظات', async () => {
        const source = richLawsuitSource();
        const fields = fieldsWith({
            sectionMode: { timeline: 'none', notes: 'all' },
        });

        const share = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source,
            visibleFields: fields,
        });

        const timeline = share.maskedView.visibleCatalog?.find((s) => s.key === 'timeline');
        expect(timeline).toBeUndefined();
        expect(noteIds(share.maskedView).length).toBeGreaterThan(0);
    });

    it('سيناريو 8: دورة حياة كاملة — إرسال → قبول → المستقبل يفتح السجل', async () => {
        const source = richLawsuitSource();
        const fields = fieldsWith({
            sectionMode: { notes: 'pick' },
            hiddenItemIds: ['note:103'],
        });

        const created = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source,
            visibleFields: fields,
        });

        const pending = await CaseShareRepository.listIncoming(PERSONAS.recipient.id);
        expect(pending[0]!.status).toBe('pending');
        expect(noteIds(pending[0]!.maskedView)).not.toContain('note:103');

        await CaseShareRepository.updateStatus(created.id, PERSONAS.recipient.id, 'accepted');

        const opened = await CaseShareRepository.getById(created.id, PERSONAS.recipient.id);
        expect(opened?.status).toBe('accepted');
        expect(opened?.maskedView.ownerDisplayName).toBe(PERSONAS.sender.name);
        expect(noteIds(opened!.maskedView)).toHaveLength(2);
    });

    it('سيناريو 10: إنهاء الجلسة من المرسل أو المستقبل', async () => {
        const created = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source: richLawsuitSource(),
            visibleFields: fieldsWith({}),
        });
        await CaseShareRepository.updateStatus(created.id, PERSONAS.recipient.id, 'accepted');

        const byRecipient = await CaseShareRepository.endSession(created.id, PERSONAS.recipient.id);
        expect(byRecipient?.status).toBe('ended');
        expect(byRecipient?.sessionEndedAt).toBeTruthy();
        expect(byRecipient?.endedByUserId).toBe(PERSONAS.recipient.id);

        const created2 = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source: richLawsuitSource(),
            visibleFields: fieldsWith({}),
        });
        await CaseShareRepository.updateStatus(created2.id, PERSONAS.recipient.id, 'accepted');
        const bySender = await CaseShareRepository.endSession(created2.id, PERSONAS.sender.id);
        expect(bySender?.status).toBe('ended');
        expect(bySender?.endedByUserId).toBe(PERSONAS.sender.id);

        const blocked = await CaseShareRepository.endSession(created.id, PERSONAS.outsider.id);
        expect(blocked).toBeNull();
    });

    it('سيناريو 9: طلبان متزامن من مرسلين مختلفين', async () => {
        const source = richLawsuitSource();

        await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source,
            visibleFields: fieldsWith({ sectionMode: { notes: 'none' } }),
        });

        await CaseShareRepository.createShare({
            ownerId: PERSONAS.outsider.id,
            ownerName: PERSONAS.outsider.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source,
            visibleFields: fieldsWith({}),
        });

        const incoming = await CaseShareRepository.listIncoming(PERSONAS.recipient.id);
        expect(incoming).toHaveLength(2);
        expect(incoming.map((s) => s.ownerId).sort()).toEqual(
            [PERSONAS.outsider.id, PERSONAS.sender.id].sort(),
        );
    });
});
