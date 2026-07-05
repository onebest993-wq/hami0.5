import { beforeEach, describe, expect, it } from 'vitest';
import { buildLawsuitCalendarContext } from './lawsuitCalendarContext';

describe('buildLawsuitCalendarContext', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('uses the explicit calendar user id when provided', () => {
        const result = buildLawsuitCalendarContext(
            {
                id: 'case-1',
                caseNo: '123/ب',
                court: 'محكمة البداءة',
                parties: [{ name: 'أحمد' }],
            },
            'explicit-user',
        );

        expect(result.userId).toBe('explicit-user');
        expect(result.clientName).toBe('أحمد');
    });

    it('falls back to persisted auth user id when calendar user id is missing', () => {
        localStorage.setItem(
            'hami-auth-token',
            JSON.stringify({
                currentSession: {
                    user: {
                        id: 'persisted-user-42',
                    },
                },
            }),
        );

        const result = buildLawsuitCalendarContext(
            {
                id: 'case-2',
                parties: [{ name: 'سارة' }],
            },
            undefined,
        );

        expect(result.userId).toBe('persisted-user-42');
        expect(result.clientName).toBe('سارة');
    });
});
