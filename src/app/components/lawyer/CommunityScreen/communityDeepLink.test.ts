import { describe, expect, it } from 'vitest';
import {
    buildCommunityPostShareUrl,
    parseCommunityDeepLinkFromHash,
    parseCommunityPostIdFromHash,
    parseCommunityPostIdFromLocation,
} from './communityDeepLink';

describe('communityDeepLink', () => {
    it('parses post id from hash', () => {
        expect(parseCommunityPostIdFromHash('#community/post/abc-123')).toBe('abc-123');
        expect(parseCommunityPostIdFromHash('community/post/xyz')).toBe('xyz');
        expect(parseCommunityPostIdFromHash('#home')).toBeNull();
    });

    it('parses openComments from hash', () => {
        expect(parseCommunityDeepLinkFromHash('#community/post/p1/comments')?.openComments).toBe(true);
        expect(parseCommunityDeepLinkFromHash('#community/post/p1')?.openComments).toBe(false);
    });

    it('parses from location', () => {
        expect(
            parseCommunityPostIdFromLocation({ hash: '#community/post/%D8%AA%D8%AC%D8%B1%D9%8A%D8%A8%D9%8A' }),
        ).toBe('تجريبي');
    });

    it('builds share url with encoded id', () => {
        const url = buildCommunityPostShareUrl('post/1');
        expect(url).toContain('#community/post/');
        expect(url).toContain(encodeURIComponent('post/1'));
    });
});
