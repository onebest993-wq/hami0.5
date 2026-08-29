/**
 * حارس المسح على حالة خيوط المعاملات.
 *
 * الخطر: قراءة فاشلة (ciphertext بارد أو حمولة تالفة) تُظهر قسماً خالياً، فتكتب
 * أول حفظة حالةً بمصفوفات خالية فوق المهام والمستندات. والمقابل الذي يجب ألا
 * يُكسَر: «احذف كل المعاملات» طريق مشروع يكتب نفس الشكل تماماً.
 */
import { describe, expect, it } from 'vitest';
import {
    isEmptyingPayload,
    readProtectedItemCount,
    shouldRejectDossierWipe,
} from '@/app/services/dossierPersistence/dossierWipeGuard';
import { isProtectedStorageKey, backupDomainForStorageKey } from '@/app/services/dossierPersistence/protectedStorageKeys';

const KEY = 'hami:transactionsThreading:v1:lawyer-guard-1';

function state(counts: {
    transactions?: number;
    tasks?: number;
    documents?: number;
    financeRecords?: number;
}): string {
    const rows = (n: number, tag: string) =>
        Array.from({ length: n }, (_, i) => ({ id: `${tag}-${i}`, title: `${tag} ${i}` }));
    return JSON.stringify({
        userId: 'lawyer-guard-1',
        transactions: rows(counts.transactions ?? 0, 'tx'),
        tasks: rows(counts.tasks ?? 0, 'task'),
        financeRecords: rows(counts.financeRecords ?? 0, 'fee'),
        documents: rows(counts.documents ?? 0, 'doc'),
        updatedAt: '2026-08-29T00:00:00.000Z',
    });
}

describe('transactionsThreading wipe guard', () => {
    it('المفتاح محمي', () => {
        expect(isProtectedStorageKey(KEY)).toBe(true);
    });

    it('العدّ على السجلات لا على أسماء الحقول', () => {
        expect(readProtectedItemCount(KEY, state({}))).toBe(0);
        expect(readProtectedItemCount(KEY, state({ tasks: 3 }))).toBe(3);
        expect(readProtectedItemCount(KEY, state({ transactions: 2, tasks: 1, documents: 4 }))).toBe(7);
        expect(readProtectedItemCount(KEY, state({ financeRecords: 2 }))).toBe(2);
        expect(isEmptyingPayload(KEY, state({}))).toBe(true);
        expect(isEmptyingPayload(KEY, state({ financeRecords: 1 }))).toBe(false);
    });

    it('يرفض التفريغ فوق ciphertext بارد لم يُفكّ', () => {
        const cold = 'hami_enc_v2:AAAAstillEncrypted';
        expect(readProtectedItemCount(KEY, cold)).toBe(null);
        expect(shouldRejectDossierWipe(KEY, state({}), cold)).toBe(true);
    });

    it('يرفض التفريغ فوق حمولة تالفة', () => {
        expect(shouldRejectDossierWipe(KEY, state({}), '{ not json')).toBe(true);
    });

    it('لا يرفض حذف الكل المشروع فوق حالة مقروءة', () => {
        expect(shouldRejectDossierWipe(KEY, state({}), state({ transactions: 2, tasks: 5 }))).toBe(false);
    });

    it('لا يرفض الكتابة الأولى ولا الحفظ العادي', () => {
        expect(shouldRejectDossierWipe(KEY, state({ tasks: 1 }), null)).toBe(false);
        expect(shouldRejectDossierWipe(KEY, state({ tasks: 2 }), state({ tasks: 1 }))).toBe(false);
    });

    it('كتابة غير فارغة فوق ciphertext بارد تمرّ — لا تقييد يشلّ القسم', () => {
        const cold = 'hami_enc_v2:AAAAstillEncrypted';
        expect(shouldRejectDossierWipe(KEY, state({ tasks: 1 }), cold)).toBe(false);
    });
});

describe('transactions task templates wipe guard', () => {
    const TEMPLATES = 'hami:transactions:taskTemplates:v1:lawyer-guard-1';

    it('المفتاح محمي وله مجال نسخ', () => {
        expect(isProtectedStorageKey(TEMPLATES)).toBe(true);
        expect(backupDomainForStorageKey(TEMPLATES)).toBe('transactions');
        expect(backupDomainForStorageKey('hami:transactions:v1')).toBe('transactions');
    });

    it('يرفض التفريغ فوق ciphertext بارد', () => {
        expect(shouldRejectDossierWipe(TEMPLATES, '[]', 'hami_enc_v2:AAAAstillEncrypted')).toBe(true);
    });

    it('لا يرفض حذف آخر قالب فوق قائمة مقروءة', () => {
        expect(shouldRejectDossierWipe(TEMPLATES, '[]', JSON.stringify([{ id: 'tpl-1', name: 'قالب' }]))).toBe(
            false,
        );
    });
});
