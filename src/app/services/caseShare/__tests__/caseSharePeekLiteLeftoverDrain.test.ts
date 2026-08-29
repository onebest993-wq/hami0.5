import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import { CASE_SHARE_LOCAL_KEY } from '@/app/services/caseShare/caseShareLocalStore';
import { peekCaseSharePendingCount } from '@/app/services/caseShare/caseSharePeekLite';
import {
    DEFAULT_CASE_SHARE_VISIBLE_FIELDS,
    type CaseShareRecord,
} from '@/app/services/caseShare/caseShareTypes';

const leftover: CaseShareRecord = {
    id: 'share-ls',
    ownerId: 'owner',
    ownerName: 'محامي',
    recipientId: 'recipient-1',
    recipientName: 'زميل',
    dossierModule: 'lawsuit',
    dossierId: '42',
    dossierTitle: 'دعوى leftover',
    visibleFields: DEFAULT_CASE_SHARE_VISIBLE_FIELDS,
    maskedView: {
        module: 'lawsuit',
        dossierId: '42',
        title: 'دعوى leftover',
        caseNumbers: ['2026/1'],
        parties: ['علي'],
        court: 'بداءة',
        narrative: 'ملخص',
        documentsIncluded: false,
    },
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
};

describe('caseSharePeekLite first-paint leftover', () => {
    beforeEach(() => {
        for (const key of SecureStoreService.listKeysSync()) {
            SecureStoreService.deleteItemSync(key);
        }
        localStorage.removeItem(CASE_SHARE_LOCAL_KEY);
    });

    it('يعدّ leftover pending بلا ترحيل/تشفير على أول طلاء', () => {
        localStorage.setItem(CASE_SHARE_LOCAL_KEY, JSON.stringify([leftover]));
        expect(peekCaseSharePendingCount('recipient-1')).toBe(1);
        expect(localStorage.getItem(CASE_SHARE_LOCAL_KEY)).not.toBeNull();
        expect(SecureStoreService.getItemSync(CASE_SHARE_LOCAL_KEY)).toBeNull();
    });

    it('لا يسمّ leftover فوق أصل unread', () => {
        SecureStoreService.setItemSync(CASE_SHARE_LOCAL_KEY, 'hami_enc_v2:share-cold');
        SecureStoreService.clearDecryptedMemoryCache();
        localStorage.setItem(CASE_SHARE_LOCAL_KEY, JSON.stringify([leftover]));
        expect(peekCaseSharePendingCount('recipient-1')).toBe(0);
        expect(localStorage.getItem(CASE_SHARE_LOCAL_KEY)).not.toBeNull();
    });
});
