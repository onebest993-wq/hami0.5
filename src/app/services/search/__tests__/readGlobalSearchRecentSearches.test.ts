import { describe, expect, it, vi, beforeEach } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    hydrateGlobalSearchRecentSearches,
    readGlobalSearchRecentSearchesSync,
} from '@/app/services/search/readGlobalSearchRecentSearchesSync';
import { LEGACY_RECENT_SEARCHES_KEY } from '@/app/services/search/globalSearchQuerySecurity';

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItemSync: vi.fn(),
        setItemSync: vi.fn(),
        deleteItemSync: vi.fn(),
        getItem: vi.fn(),
        setItem: vi.fn(),
        deleteItem: vi.fn(),
    },
}));

describe('readGlobalSearchRecentSearches', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يقرأ sync من الذاكرة الدافئة', () => {
        vi.mocked(SecureStoreService.getItemSync).mockReturnValue(JSON.stringify(['دعوى ١']));
        expect(readGlobalSearchRecentSearchesSync('lawyer-1')).toEqual(['دعوى ١']);
    });

    it('يحذف مفتاح legacy المشترك دون ترحيله لحساب آخر', () => {
        vi.mocked(SecureStoreService.getItemSync).mockImplementation((key: string) => {
            if (key === 'lawyer_recent_searches:lawyer-1') return null;
            if (key === LEGACY_RECENT_SEARCHES_KEY) return JSON.stringify(['قديم']);
            return null;
        });

        expect(readGlobalSearchRecentSearchesSync('lawyer-1')).toEqual([]);
        expect(SecureStoreService.setItem).not.toHaveBeenCalled();
        expect(SecureStoreService.deleteItemSync).toHaveBeenCalledWith(LEGACY_RECENT_SEARCHES_KEY);
    });

    it('يفك التشفير async عبر hydrate', async () => {
        vi.mocked(SecureStoreService.getItem).mockResolvedValue(JSON.stringify(['مشفّر']));
        await expect(hydrateGlobalSearchRecentSearches('lawyer-2')).resolves.toEqual(['مشفّر']);
    });
});
