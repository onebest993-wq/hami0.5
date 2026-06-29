import { describe, expect, it } from 'vitest';
import {
    clampTransactionText,
    sanitizeTransactionCreateFields,
    sanitizeTransactionTemplateName,
    TX_CLIENT_NAME_MAX,
    TX_DEPARTMENT_MAX,
    TX_TEMPLATE_NAME_MAX,
    TX_TITLE_MAX,
} from '@/app/services/transactions/transactionsInputSecurity';

describe('transactionsInputSecurity', () => {
    it('يقصّ الحقول عند الحد الأقصى', () => {
        const long = 'أ'.repeat(TX_TITLE_MAX + 20);
        expect(clampTransactionText(long, TX_TITLE_MAX)).toHaveLength(TX_TITLE_MAX);
    });

    it('ينظّف مسافات الحقول عند الإنشاء', () => {
        const sanitized = sanitizeTransactionCreateFields({
            title: '  معاملة  ',
            clientName: '  موكل  ',
            targetDepartment: '  دائرة  ',
        });
        expect(sanitized).toEqual({
            title: 'معاملة',
            clientName: 'موكل',
            targetDepartment: 'دائرة',
        });
    });

    it('يحترم حدود client و department', () => {
        const sanitized = sanitizeTransactionCreateFields({
            title: 'عنوان',
            clientName: 'ب'.repeat(TX_CLIENT_NAME_MAX + 5),
            targetDepartment: 'ج'.repeat(TX_DEPARTMENT_MAX + 5),
        });
        expect(sanitized.clientName).toHaveLength(TX_CLIENT_NAME_MAX);
        expect(sanitized.targetDepartment).toHaveLength(TX_DEPARTMENT_MAX);
    });

    it('يزيل محارف التحكم ويقصّ أسماء القوالب', () => {
        expect(clampTransactionText('a\u0007b', TX_TITLE_MAX)).toBe('ab');
        expect(sanitizeTransactionTemplateName('  \u0007  ', 'مسار افتراضي')).toBe('مسار افتراضي');
        expect(sanitizeTransactionTemplateName('  قالب  ', 'x')).toBe('قالب');
        expect(sanitizeTransactionTemplateName('', 'x').length).toBeLessThanOrEqual(TX_TEMPLATE_NAME_MAX);
    });
});
