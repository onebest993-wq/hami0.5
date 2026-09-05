import { describe, expect, it, beforeEach } from 'vitest';
import {
    drainFieldTasksInstantCompleteQueue,
    requestFieldTasksInstantComplete,
    requestFieldTasksInstantManage,
    takeFieldTasksInstantManageQueued,
} from '@/app/runtime/fieldTasksInstantActions';

describe('fieldTasksInstantActions', () => {
    beforeEach(() => {
        drainFieldTasksInstantCompleteQueue();
        takeFieldTasksInstantManageQueued();
    });
    it('يجمع إنهاء فوري ويفرّغ الصف مرة واحدة', () => {
        requestFieldTasksInstantComplete('a');
        requestFieldTasksInstantComplete('a');
        requestFieldTasksInstantComplete('b');
        expect(drainFieldTasksInstantCompleteQueue()).toEqual(['a', 'b']);
        expect(drainFieldTasksInstantCompleteQueue()).toEqual([]);
    });

    it('يتجاهل معرّف إنهاء فارغ', () => {
        requestFieldTasksInstantComplete('  ');
        expect(drainFieldTasksInstantCompleteQueue()).toEqual([]);
    });

    it('يصفّ إدارة الكل حتى يلحق الـ hook', () => {
        requestFieldTasksInstantManage();
        expect(takeFieldTasksInstantManageQueued()).toBe(true);
        expect(takeFieldTasksInstantManageQueued()).toBe(false);
    });
});
