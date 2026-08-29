import { describe, expect, it, vi } from 'vitest';
import { EXECUTION_LAW_CANONICAL_NAME } from '@/app/constants/iraqiLawCatalog';
import { HAMI_LAWS_CATALOG_CHANGED_EVENT } from '@/app/kernel/laws/lawCatalogSync';
import { SecureFetchError } from '@/app/services/SecureFetchError';
import {
    mapBrowseLawRows,
    parseSecureApiErrorMessage,
    refreshLawReaderCaches,
} from '@/app/components/admin/adminLawEntryApi';
import { resolveAdminLawTargetName } from '@/app/components/admin/adminLawEntryTypes';

describe('adminLawEntryApi', () => {
    it('parseSecureApiErrorMessage يفضّل نص JSON ثم رسالة الحالة دون مفتاح خدمة', () => {
        const privileged = ['SERVICE', '_ROLE'].join('');
        const jsonErr = new SecureFetchError('x', 400, '{"error":"ممنوع","details":"تحقق"}', '/api/laws/add');
        expect(parseSecureApiErrorMessage(jsonErr)).toBe('ممنوع — تحقق');
        expect(parseSecureApiErrorMessage(new SecureFetchError('x', 401, '', '/api/laws/add'))).toContain(
            'غير مصرح',
        );
        expect(parseSecureApiErrorMessage(new SecureFetchError('x', 403, '', '/api/laws/add'))).toContain(
            'صلاحية',
        );
        expect(parseSecureApiErrorMessage(new SecureFetchError('x', 503, '', '/api/laws/add'))).toContain(
            'قاعدة البيانات غير مهيأة',
        );
        expect(parseSecureApiErrorMessage(jsonErr)).not.toContain(privileged);
        expect(parseSecureApiErrorMessage(new Error('شبكة'))).toBe('شبكة');
    });

    it('mapBrowseLawRows يسقط الأسماء غير المسموحة ويبقي النص الأطول عند التكرار', () => {
        const rows = mapBrowseLawRows([
            {
                id: '1',
                law_name: 'قانون مزيف',
                article_number: '1',
                content: 'أ',
            },
            {
                id: '2',
                law_name: EXECUTION_LAW_CANONICAL_NAME,
                article_number: '٩',
                content: 'قصير',
            },
            {
                id: '3',
                law_name: EXECUTION_LAW_CANONICAL_NAME,
                article_number: '9',
                content: 'نص أطول للمادة نفسها',
            },
        ]);
        expect(rows).toHaveLength(1);
        expect(rows[0]?.lawName).toBe(EXECUTION_LAW_CANONICAL_NAME);
        expect(rows[0]?.content).toBe('نص أطول للمادة نفسها');
    });

    it('refreshLawReaderCaches يبث حدث النواة دون استيراد كاش المحامي', () => {
        const handler = vi.fn();
        window.addEventListener(HAMI_LAWS_CATALOG_CHANGED_EVENT, handler);
        refreshLawReaderCaches(EXECUTION_LAW_CANONICAL_NAME);
        expect(handler).toHaveBeenCalledTimes(1);
        const event = handler.mock.calls[0]?.[0] as CustomEvent<{ lawName: string }>;
        expect(event.detail?.lawName).toBe(EXECUTION_LAW_CANONICAL_NAME);
        window.removeEventListener(HAMI_LAWS_CATALOG_CHANGED_EVENT, handler);
    });
});

describe('resolveAdminLawTargetName', () => {
    it('يرجع اسم التنفيذ أو تبويب الجزائي/المدني/الأحوال', () => {
        expect(
            resolveAdminLawTargetName('execution', 'penal', 'civil_procedure', 'personal_status_188'),
        ).toBeTruthy();
        expect(
            resolveAdminLawTargetName('criminal', 'juvenile', 'civil_procedure', 'personal_status_188'),
        ).toContain('الأحداث');
        expect(resolveAdminLawTargetName('civil', 'penal', 'evidence', 'personal_status_188')).toContain(
            'الإثبات',
        );
    });
});
