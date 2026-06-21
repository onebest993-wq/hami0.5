import { beforeEach, describe, expect, it } from 'vitest';
import { CaseShareRepository } from '../caseShareRepository';
import { PERSONAS, fieldsWith, resetCaseShareStore, richLawsuitSource } from './caseShareTestFixtures';

describe('CaseShareRepository — محاكاة طرفين', () => {
    beforeEach(() => {
        resetCaseShareStore();
    });

    it('المرسل ينشئ طلباً والمستقبل يراه في الوارد', async () => {
        const source = richLawsuitSource();
        const share = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source,
            visibleFields: fieldsWith({}),
        });

        expect(share.status).toBe('pending');
        expect(share.ownerId).toBe(PERSONAS.sender.id);
        expect(share.recipientId).toBe(PERSONAS.recipient.id);
        expect(share.maskedView.title).toBe(source.title);

        const senderList = await CaseShareRepository.listForUser(PERSONAS.sender.id);
        const incoming = await CaseShareRepository.listIncoming(PERSONAS.recipient.id);

        expect(senderList.some((s) => s.id === share.id)).toBe(true);
        expect(incoming).toHaveLength(1);
        expect(incoming[0]!.id).toBe(share.id);
        expect(incoming[0]!.ownerName).toBe(PERSONAS.sender.name);
    });

    it('المستقبل لا يرى تفاصيل الإضبارة قبل الموافقة', async () => {
        await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source: richLawsuitSource(),
            visibleFields: fieldsWith({}),
        });

        const incoming = await CaseShareRepository.listIncoming(PERSONAS.recipient.id);
        expect(incoming[0]!.maskedView.parties).toEqual([]);
        expect(incoming[0]!.maskedView.caseNumbers).toEqual([]);
        expect(incoming[0]!.dossierId).toBe('');

        const senderList = await CaseShareRepository.listForUser(PERSONAS.sender.id, { summary: true });
        expect(senderList[0]!.maskedView.parties).toEqual([]);

        const senderDetail = await CaseShareRepository.getById(
            (await CaseShareRepository.listForUser(PERSONAS.sender.id))[0]!.id,
            PERSONAS.sender.id,
        );
        expect(senderDetail?.maskedView.parties.length).toBeGreaterThan(0);
    });

    it('يرفض الإرسال لمستلم خارج شبكة المتابعة', async () => {
        await expect(
            CaseShareRepository.createShare({
                ownerId: PERSONAS.sender.id,
                ownerName: PERSONAS.sender.name,
                recipientId: PERSONAS.outsider.id,
                recipientName: PERSONAS.outsider.name,
                source: richLawsuitSource(),
                visibleFields: fieldsWith({}),
            }),
        ).rejects.toThrow('RECIPIENT_NOT_IN_NETWORK');
    });

    it('طرف ثالث لا يرى الطلب ولا يستطيع قبوله', async () => {
        const share = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source: richLawsuitSource(),
            visibleFields: fieldsWith({}),
        });

        const outsiderList = await CaseShareRepository.listForUser(PERSONAS.outsider.id);
        expect(outsiderList.some((s) => s.id === share.id)).toBe(false);

        const blocked = await CaseShareRepository.updateStatus(share.id, PERSONAS.outsider.id, 'accepted');
        expect(blocked).toBeNull();

        const stillPending = await CaseShareRepository.getById(share.id, PERSONAS.recipient.id);
        expect(stillPending).toBeNull();
    });

    it('المستقبل يقبل ثم يرى الحالة accepted', async () => {
        const share = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source: richLawsuitSource(),
            visibleFields: fieldsWith({}),
        });

        const accepted = await CaseShareRepository.updateStatus(share.id, PERSONAS.recipient.id, 'accepted');
        expect(accepted?.status).toBe('accepted');
        expect(accepted?.respondedAt).toBeTruthy();

        const reloaded = await CaseShareRepository.getById(share.id, PERSONAS.recipient.id);
        expect(reloaded?.status).toBe('accepted');
    });

    it('المستقبل يرفض الطلب', async () => {
        const share = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source: richLawsuitSource(),
            visibleFields: fieldsWith({}),
        });

        const declined = await CaseShareRepository.updateStatus(share.id, PERSONAS.recipient.id, 'declined');
        expect(declined?.status).toBe('declined');
    });

    it('المرسل لا يستطيع قبول طلبه نيابةً عن المستقبل', async () => {
        const share = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source: richLawsuitSource(),
            visibleFields: fieldsWith({}),
        });

        const forged = await CaseShareRepository.updateStatus(share.id, PERSONAS.sender.id, 'accepted');
        expect(forged).toBeNull();
    });

    it('المرسل أو المستقبل ينهيان الجلسة النشطة', async () => {
        const share = await CaseShareRepository.createShare({
            ownerId: PERSONAS.sender.id,
            ownerName: PERSONAS.sender.name,
            recipientId: PERSONAS.recipient.id,
            recipientName: PERSONAS.recipient.name,
            source: richLawsuitSource(),
            visibleFields: fieldsWith({}),
        });
        await CaseShareRepository.updateStatus(share.id, PERSONAS.recipient.id, 'accepted');

        const ended = await CaseShareRepository.endSession(share.id, PERSONAS.sender.id);
        expect(ended?.status).toBe('ended');
        expect(ended?.endedByUserId).toBe(PERSONAS.sender.id);
    });
});
