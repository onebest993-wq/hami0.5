import { describe, expect, it } from 'vitest';
import { repositoryCardTypeBadgeClass } from '../repositoryCardTypeBadge';

describe('repositoryCardTypeBadgeClass', () => {
    it('يميّز أنواع المستندات', () => {
        expect(repositoryCardTypeBadgeClass('عقد')).toContain('blue');
        expect(repositoryCardTypeBadgeClass('قرار حكم')).toContain('purple');
        expect(repositoryCardTypeBadgeClass('عريضة')).toContain('emerald');
        expect(repositoryCardTypeBadgeClass('بحث قانوني')).toContain('amber');
        expect(repositoryCardTypeBadgeClass('أخرى')).toContain('gray');
    });
});
