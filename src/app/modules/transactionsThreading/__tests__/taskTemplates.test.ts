import { describe, expect, it, beforeEach } from 'vitest';
import { listTaskTemplates, saveTaskTemplate } from '@/app/modules/transactionsThreading/taskTemplates';
import SecureStoreService from '@/app/services/SecureStoreService';

describe('taskTemplates isolation', () => {
    beforeEach(async () => {
        if (typeof window !== 'undefined') window.localStorage.clear();
        await SecureStoreService.deleteItem('hami:transactions:taskTemplates:v1:u1');
        await SecureStoreService.deleteItem('hami:transactions:taskTemplates:v1:u2');
    });

    it('لا يكتب قالباً بمفتاح مشترك عندما يكون userId فارغاً', () => {
        expect(saveTaskTemplate('', { name: 'قالب', tasks: [{ title: 'خطوة', parentTaskId: null, deadline: null }] })).toBeNull();
        expect(listTaskTemplates('')).toEqual([]);
        expect(listTaskTemplates('   ')).toEqual([]);
    });

    it('يعقّم العنوان ويعزل المستخدمين', () => {
        const saved = saveTaskTemplate('u1', {
            name: '  قالب\u0007  ',
            tasks: [{ title: '  خطوة  ', parentTaskId: null, deadline: null }],
        });
        expect(saved?.name).toBe('قالب');
        expect(saved?.tasks[0]?.title).toBe('خطوة');
        expect(listTaskTemplates('u2')).toEqual([]);
        expect(listTaskTemplates('u1')).toHaveLength(1);
        expect(window.localStorage.getItem('hami:transactions:taskTemplates:v1:u1')).toBeNull();
    });
});
