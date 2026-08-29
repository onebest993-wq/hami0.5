import { describe, expect, it } from 'vitest';
import { forumTileFallbackPaintAvatarUrl } from '@/app/components/lawyer/dashboard/forumProfile/forumTileFallbackPaintAvatarUrl';

describe('forumTileFallbackPaintAvatarUrl', () => {
    it('يبقي https بعد التنقية', () => {
        expect(forumTileFallbackPaintAvatarUrl('https://cdn.example/a.jpg')).toBe(
            'https://cdn.example/a.jpg',
        );
    });

    it('يرفض data: وjavascript', () => {
        expect(forumTileFallbackPaintAvatarUrl('data:image/jpeg;base64,AAAA')).toBe('');
        expect(forumTileFallbackPaintAvatarUrl('javascript:alert(1)')).toBe('');
    });
});
