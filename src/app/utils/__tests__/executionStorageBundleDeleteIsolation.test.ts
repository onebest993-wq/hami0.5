import { beforeEach, describe, expect, it } from 'vitest';

import SecureStoreService from '@/app/services/SecureStoreService';
import { removeExecutionStorageBundleAsync } from '@/app/utils/executionStorageKeys';

/**
 * حذف إضبارة لا يجوز أن يمسّ إضبارة أخرى.
 *
 * كان المسح بالبادئة `k.startsWith('execution_1')` يطابق `execution_12...`
 * أيضاً، فحذف الإضبارة `1` يُبيد بيانات الإضبارة `12` صامتاً: قرارات ووثائق
 * وسجلاً مالياً لملف سليم لم يطلب أحد حذفه. لا رسالة ولا سبيل للتراجع.
 *
 * أي معرّف يكون معرّف غيره بادئةً له يُظهر العطل: 1/12، 2/20، 7/77.
 */
describe('deleting one dossier leaves prefix-neighbour dossiers intact', () => {
    beforeEach(() => {
        SecureStoreService.listKeysSync().forEach((k) => SecureStoreService.deleteItemSync(k));
    });

    it('keeps dossier 12 when dossier 1 is deleted', async () => {
        SecureStoreService.setItemSync('execution_1', JSON.stringify({ id: '1' }));
        SecureStoreService.setItemSync('execution_1_decisions', JSON.stringify([{ id: 'd1' }]));
        SecureStoreService.setItemSync('execution_12', JSON.stringify({ id: '12' }));
        SecureStoreService.setItemSync('execution_12_decisions', JSON.stringify([{ id: 'd12' }]));
        SecureStoreService.setItemSync('execution_12_documents', JSON.stringify([{ id: 'doc12' }]));

        await removeExecutionStorageBundleAsync('1');

        expect(SecureStoreService.getItemSync('execution_1')).toBeNull();
        expect(SecureStoreService.getItemSync('execution_1_decisions')).toBeNull();

        expect(SecureStoreService.getItemSync('execution_12')).not.toBeNull();
        expect(SecureStoreService.getItemSync('execution_12_decisions')).not.toBeNull();
        expect(SecureStoreService.getItemSync('execution_12_documents')).not.toBeNull();
    });

    it('keeps the neighbour financial ledger while purging its own', async () => {
        SecureStoreService.setItemSync('hami_unified_funds_ledger_2', JSON.stringify({ seeded: true }));
        SecureStoreService.setItemSync('hami_unified_funds_ledger_20', JSON.stringify({ seeded: true }));

        await removeExecutionStorageBundleAsync('2');

        expect(SecureStoreService.getItemSync('hami_unified_funds_ledger_2')).toBeNull();
        expect(SecureStoreService.getItemSync('hami_unified_funds_ledger_20')).not.toBeNull();
    });

    it('purges a key family nobody remembered to enumerate', async () => {
        // الحزمة تُعدّد المفاتيح، والتعداد يتخلّف: هكذا نجا السجل المالي.
        // المسح بالبادئة+المعرّف يجعل العائلة الجديدة محذوفة بلا تعداد.
        SecureStoreService.setItemSync('hami_eviction_grace_brand_new_5', '{"x":1}');
        SecureStoreService.setItemSync('hami:employee_personal_unlock:5', '{"x":1}');
        SecureStoreService.setItemSync('hami_eviction_grace_brand_new_50', '{"x":1}');

        await removeExecutionStorageBundleAsync('5');

        expect(SecureStoreService.getItemSync('hami_eviction_grace_brand_new_5')).toBeNull();
        expect(SecureStoreService.getItemSync('hami:employee_personal_unlock:5')).toBeNull();
        expect(SecureStoreService.getItemSync('hami_eviction_grace_brand_new_50')).not.toBeNull();
    });

    it('leaves keys of other sections alone', async () => {
        SecureStoreService.setItemSync('lawyer_notes_9', '{"x":1}');
        SecureStoreService.setItemSync('client_profile_9', '{"x":1}');

        await removeExecutionStorageBundleAsync('9');

        expect(SecureStoreService.getItemSync('lawyer_notes_9')).not.toBeNull();
        expect(SecureStoreService.getItemSync('client_profile_9')).not.toBeNull();
    });

    it('still purges every suffix family of the deleted dossier', async () => {
        const own = [
            'execution_7',
            'execution_7_decisions',
            'execution_7_documents',
            'execution_7_document_folders',
            'hami_unified_funds_ledger_7',
            'hami_eviction_grace_pinned_7',
            'hami_eviction_grace_hidden_7',
            'hami:employee_personal_unlock:7',
            'garnishment_7',
            'hami_garnishment_details_7',
            'hami_party_badges_hidden_7',
        ];
        own.forEach((k) => SecureStoreService.setItemSync(k, '{"x":1}'));
        SecureStoreService.setItemSync('execution_77', JSON.stringify({ id: '77' }));

        await removeExecutionStorageBundleAsync('7');

        for (const key of own) {
            expect(SecureStoreService.getItemSync(key), `${key} survived deletion`).toBeNull();
        }
        expect(SecureStoreService.getItemSync('execution_77')).not.toBeNull();
    });
});
