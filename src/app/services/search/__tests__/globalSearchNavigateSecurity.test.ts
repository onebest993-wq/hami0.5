import { describe, expect, it } from 'vitest';
import { sanitizeGlobalSearchNavigate } from '@/app/services/search/globalSearchNavigateSecurity';

describe('globalSearchNavigateSecurity', () => {
    it('يقبل تنقّلاً نظيفاً', () => {
        expect(sanitizeGlobalSearchNavigate({ type: 'file', fileId: 'f-1', stageIndex: 2 })).toEqual({
            type: 'file',
            fileId: 'f-1',
            stageIndex: 2,
        });
        expect(sanitizeGlobalSearchNavigate({ type: 'calendar', date: '2026-01-15', eventId: 'ev-1' })).toEqual({
            type: 'calendar',
            date: '2026-01-15',
            eventId: 'ev-1',
        });
    });

    it('يرفض معرّفات بمخططات أو علامات HTML', () => {
        expect(sanitizeGlobalSearchNavigate({ type: 'file', fileId: 'javascript:alert(1)' })).toBeNull();
        expect(sanitizeGlobalSearchNavigate({ type: 'criminal', criminalId: '<img>' })).toBeNull();
        expect(sanitizeGlobalSearchNavigate({ type: 'community', postId: 'data:text/html,x' })).toBeNull();
    });

    it('يرفض تاريخ تقويم غير ISO صالح', () => {
        expect(sanitizeGlobalSearchNavigate({ type: 'calendar', date: '2026-13-40' })).toBeNull();
        expect(sanitizeGlobalSearchNavigate({ type: 'calendar', date: 'tomorrow' })).toBeNull();
    });

    it('يرفض مؤشر مرحلة غير منطقي', () => {
        expect(sanitizeGlobalSearchNavigate({ type: 'file', fileId: 'f-1', stageIndex: 1.5 })).toBeNull();
        expect(sanitizeGlobalSearchNavigate({ type: 'file', fileId: 'f-1', stageIndex: -1 })).toBeNull();
        expect(sanitizeGlobalSearchNavigate({ type: 'file', fileId: 'f-1', stageIndex: 9999 })).toBeNull();
    });
});
