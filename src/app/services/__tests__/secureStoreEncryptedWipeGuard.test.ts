import { beforeEach, describe, expect, it } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';

/*
 * الحارس يعدّ عناصر JSON، والمخزَّن لهذه المفاتيح نصّ مشفَّر. حين كان النصّ
 * المشفَّر يُمرَّر كما هو، يفشل التحليل ويُقرأ «صفر عنصر» فتنطفئ الحماية عن
 * أثمن المفاتيح وحدها — الدعاوى والإضابير والملاحظات — بينما تبقى ظاهرياً
 * مفعّلة في الاختبارات التي تُمرّر نصّاً صريحاً.
 */

const ENCRYPTED_PROTECTED_KEYS = ['lawyer_files', 'executionFiles', 'lawyer_notes'] as const;

describe('SecureStoreService — حماية المفاتيح المشفَّرة من الكتابة المُفرِّغة', () => {
    beforeEach(async () => {
        for (const key of SecureStoreService.listKeysSync()) {
            await SecureStoreService.deleteItem(key);
        }
    });

    it.each(ENCRYPTED_PROTECTED_KEYS)('يرفض استبدال %s الممتلئ بمصفوفة فارغة', async (key) => {
        const stored = JSON.stringify([{ id: 'a', caseNo: '2026/1' }, { id: 'b', caseNo: '2026/2' }]);
        await SecureStoreService.setItem(key, stored);

        await SecureStoreService.setItem(key, '[]');

        expect(JSON.parse(String(await SecureStoreService.getItem(key)))).toHaveLength(2);
    });

    it('يمرّر التحديث الحقيقي فوق قيمة مشفَّرة', async () => {
        await SecureStoreService.setItem('lawyer_files', JSON.stringify([{ id: 'a' }]));
        await SecureStoreService.setItem('lawyer_files', JSON.stringify([{ id: 'a' }, { id: 'b' }]));

        expect(JSON.parse(String(await SecureStoreService.getItem('lawyer_files')))).toHaveLength(2);
    });

    it('يمرّر أول كتابة حين لا يوجد سابق', async () => {
        await SecureStoreService.setItem('lawyer_files', '[]');
        expect(await SecureStoreService.getItem('lawyer_files')).toBe('[]');
    });

    it('لا يستبدل نصاً مشفّراً فوراً حين الذاكرة باردة — التفريغ يُرفض', async () => {
        const stored = JSON.stringify([{ id: 'a' }, { id: 'b' }]);
        await SecureStoreService.setItem('lawyer_files', stored);
        SecureStoreService.clearDecryptedMemoryCache();

        expect(SecureStoreService.getItemSync('lawyer_files')).toBeNull();
        expect(SecureStoreService.isUnreadSync('lawyer_files')).toBe(true);

        SecureStoreService.setItemSync('lawyer_files', '[]');
        expect(SecureStoreService.getItemSync('lawyer_files')).toBeNull();

        await SecureStoreService.waitForPendingSetItem('lawyer_files');
        expect(JSON.parse(String(await SecureStoreService.getItem('lawyer_files')))).toHaveLength(2);
    });

    it('يرفض الكتابة غير الفارغة فوق أصل مشفَّر بارد لمفاتيح الدعاوى', async () => {
        await SecureStoreService.setItem(
            'lawyer_files',
            JSON.stringify([{ id: 'a' }, { id: 'b' }]),
        );
        SecureStoreService.clearDecryptedMemoryCache();

        const accepted = SecureStoreService.setItemSync(
            'lawyer_files',
            JSON.stringify([{ id: 'a' }]),
        );
        expect(accepted).toBe(false);
        expect(SecureStoreService.getItemSync('lawyer_files')).toBeNull();
        expect(SecureStoreService.isUnreadSync('lawyer_files')).toBe(true);
    });

    it('يرفض كتابة أفقر عندما المرآة صريحة والقرص مشفّر أغنى', async () => {
        await SecureStoreService.setItem(
            'lawyer_files',
            JSON.stringify([{ id: 'a' }, { id: 'b' }]),
        );
        SecureStoreService.poisonMemoryMirrorForTests('lawyer_files', JSON.stringify([{ id: 'a' }]));

        await SecureStoreService.setItem('lawyer_files', JSON.stringify([{ id: 'a' }]));

        expect(JSON.parse(String(await SecureStoreService.getItem('lawyer_files')))).toHaveLength(2);
    });

    it('getItem يعيد الأصل المشفّر إذا سُمّمت المرآة بفراغ', async () => {
        await SecureStoreService.setItem(
            'lawyer_files',
            JSON.stringify([{ id: 'a' }, { id: 'b' }]),
        );
        SecureStoreService.poisonMemoryMirrorForTests('lawyer_files', '[]');

        expect(JSON.parse(String(await SecureStoreService.getItem('lawyer_files')))).toHaveLength(2);
    });

    it('getItem يعيد الذاكرة المفكوكة دون إعادة فكّ عندما ليست فارغة', async () => {
        await SecureStoreService.setItem(
            'lawyer_files',
            JSON.stringify([{ id: 'a' }, { id: 'b' }]),
        );
        const first = await SecureStoreService.getItem('lawyer_files');
        const second = await SecureStoreService.getItem('lawyer_files');
        expect(second).toBe(first);
        expect(JSON.parse(String(second))).toHaveLength(2);
    });
});
