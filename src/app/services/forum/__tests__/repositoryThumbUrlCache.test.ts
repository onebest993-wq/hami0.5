import { describe, expect, it, beforeEach } from 'vitest';
import {
    cacheRepositoryThumbUrl,
    clearRepositoryThumbUrl,
    peekRepositoryThumbUrl,
    resetRepositoryThumbUrlCacheForTests,
} from '@/app/services/forum/repositoryThumbUrlCache';

describe('repositoryThumbUrlCache', () => {
    beforeEach(() => {
        resetRepositoryThumbUrlCacheForTests();
    });

    it('caches and peeks thumb urls', () => {
        cacheRepositoryThumbUrl('path/a', 'https://example.com/a.jpg');
        expect(peekRepositoryThumbUrl('path/a')).toBe('https://example.com/a.jpg');
    });

    it('clears a cached thumb url', () => {
        cacheRepositoryThumbUrl('path/a', 'https://example.com/a.jpg');
        clearRepositoryThumbUrl('path/a');
        expect(peekRepositoryThumbUrl('path/a')).toBeNull();
    });
});
