import { describe, expect, it, beforeEach } from 'vitest';
import {
    requestCalendarOpenSource,
    resetCalendarOpenSourceForTests,
    subscribeCalendarOpenSource,
} from '@/app/services/calendar/calendarOpenSourceIntent';

describe('calendarOpenSourceIntent', () => {
    beforeEach(() => {
        resetCalendarOpenSourceForTests();
    });

    it('يصفّر الطلب إن لم يكن هناك مستمع ثم يسلّمه عند الاشتراك', () => {
        const seen: string[] = [];
        requestCalendarOpenSource({
            sourceModule: 'lawsuit',
            sourceEntityId: 'file-1',
            sourceEventId: 'ev-1',
        });
        const unsub = subscribeCalendarOpenSource((detail) => {
            seen.push(`${detail.sourceModule}:${detail.sourceEntityId}:${detail.sourceEventId}`);
        });
        expect(seen).toEqual(['lawsuit:file-1:ev-1']);
        unsub();
    });

    it('يسلّم فوراً إن وُجد مستمع ويتجاهل معرّفاً فارغاً', () => {
        const seen: string[] = [];
        const unsub = subscribeCalendarOpenSource((detail) => {
            seen.push(detail.sourceEntityId);
        });
        requestCalendarOpenSource({ sourceModule: 'lawsuit', sourceEntityId: '  ' });
        requestCalendarOpenSource({ sourceModule: 'execution', sourceEntityId: 'ex-9' });
        expect(seen).toEqual(['ex-9']);
        unsub();
    });
});
