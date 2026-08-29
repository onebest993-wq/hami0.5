import { describe, expect, it } from 'vitest';
import {
    EMPTY_HQ_DIRECTORY_QUERY,
    HQ_DIRECTORY_PAGE_SIZE,
    hqDirectorySearchParams,
    needsHqDirectoryPresenceScan,
    parseHqDirectoryListQuery,
} from '@/app/domain/admin/hqDirectoryQuery';

describe('parseHqDirectoryListQuery', () => {
    it('يفرض الصفحة عند 50 ويصفر قيماً غير معروفة', () => {
        const parsed = parseHqDirectoryListQuery({
            get: (key) =>
                ({
                    limit: '500',
                    offset: '-4',
                    status: 'hack',
                    role: 'client',
                    created: 'year',
                    q: '  علي  ',
                })[key] ?? null,
        });
        expect(parsed.limit).toBe(HQ_DIRECTORY_PAGE_SIZE);
        expect(parsed.offset).toBe(0);
        expect(parsed.status).toBe('all');
        expect(parsed.role).toBe('all');
        expect(parsed.created).toBe('all');
        expect(parsed.q).toBe('علي');
    });

    it('يبني عنواناً بلا معاملات افتراضية', () => {
        expect(hqDirectorySearchParams(EMPTY_HQ_DIRECTORY_QUERY)).toBe('/api/admin/users');
        expect(
            hqDirectorySearchParams({
                ...EMPTY_HQ_DIRECTORY_QUERY,
                q: 'محام',
                offset: 50,
                status: 'frozen',
            }),
        ).toBe('/api/admin/users?q=%D9%85%D8%AD%D8%A7%D9%85&status=frozen&offset=50');
    });

    it('يعدّ فلاتر التوثيق تحتاج مسحاً والباقي صفحة SQL', () => {
        expect(needsHqDirectoryPresenceScan('all')).toBe(false);
        expect(needsHqDirectoryPresenceScan('frozen')).toBe(false);
        expect(needsHqDirectoryPresenceScan('pending')).toBe(true);
        expect(needsHqDirectoryPresenceScan('name_mismatch')).toBe(true);
    });
});
