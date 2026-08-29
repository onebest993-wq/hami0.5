import { describe, it, expect } from 'vitest';
import {
    communityTagMatchesFilter,
    formatRepositoryTag,
    normalizeCommunityTags,
    repositoryDocMatchesTag,
    resolveCommunityPostTags,
    resolveRepositoryDocTags,
    repositoryDocMatchesSearch,
} from '../repositoryTagUtils';

describe('community tag matching', () => {
    it('يوحّد المسافات والـ # في الوسوم', () => {
        expect(formatRepositoryTag('أحوال شخصية')).toBe('#أحوال_شخصية');
        expect(formatRepositoryTag('#تنفيذ')).toBe('#تنفيذ');
        expect(formatRepositoryTag('تنفيذ')).toBe('#تنفيذ');
    });

    it('يطابق تصنيف المنتدى حتى مع اختلاف شكل الوسم', () => {
        const tags = ['#أحوال شخصية', 'تنفيذ'];
        expect(communityTagMatchesFilter(tags, 'أحوال شخصية')).toBe(true);
        expect(communityTagMatchesFilter(tags, 'تنفيذ')).toBe(true);
        expect(communityTagMatchesFilter(tags, 'جنائي')).toBe(false);
    });

    it('يطابق تصنيف المستودع بنفس المنطق', () => {
        const tags = ['#جنائي', '#مدني'];
        expect(repositoryDocMatchesTag(tags, 'جنائي')).toBe(true);
        expect(repositoryDocMatchesTag(tags, 'مدني')).toBe(true);
        expect(repositoryDocMatchesTag(tags, 'تنفيذ')).toBe(false);
    });

    it('normalizeCommunityTags يزيل التكرار ويوحّد الشكل', () => {
        expect(normalizeCommunityTags(['تنفيذ', '#تنفيذ', 'أحوال شخصية'])).toEqual([
            '#تنفيذ',
            '#أحوال_شخصية',
        ]);
    });

    it('يستنتج وسوماً من محتوى المنشور عند غياب الوسوم المحفوظة', () => {
        expect(resolveCommunityPostTags('قضية تنفيذ حكم على عقار', [])).toEqual(
            expect.arrayContaining(['#تنفيذ', '#عقاري']),
        );
        expect(communityTagMatchesFilter(resolveCommunityPostTags('دعوى طلاق ونفقة', []), 'أحوال شخصية')).toBe(true);
    });

    it('يستنتج وسوم المستند من العنوان والوصف', () => {
        const tags = resolveRepositoryDocTags('عقد شركات', 'اتفاقية بين شريكين', []);
        expect(tags).toContain('#شركات');
        expect(repositoryDocMatchesTag(tags, 'شركات')).toBe(true);
    });

    it('repositoryDocMatchesSearch يبحث في العنوان والنوع والوصف والوسوم', () => {
        const doc = {
            title: 'عقد بيع عقار',
            description: 'اتفاقية بين طرفين',
            type: 'عقد' as const,
            tags: ['#عقاري'],
        };
        expect(repositoryDocMatchesSearch(doc, 'عقد')).toBe(true);
        expect(repositoryDocMatchesSearch(doc, 'عقاري')).toBe(true);
        expect(repositoryDocMatchesSearch(doc, 'بحث')).toBe(false);
    });

    it('repositoryDocMatchesSearch يطوي الهمزات والأرقام الهندية', () => {
        const doc = {
            title: 'مذكرة أحمد ٢٠٢٥',
            description: 'وصف',
            type: 'بحث' as const,
            tags: [],
        };
        expect(repositoryDocMatchesSearch(doc, 'احمد')).toBe(true);
        expect(repositoryDocMatchesSearch(doc, '2025')).toBe(true);
    });

    it('بدون تصنيف مختار يُظهر الكل', () => {
        expect(communityTagMatchesFilter(['#مدني'], null)).toBe(true);
        expect(repositoryDocMatchesTag(['#مدني'], null)).toBe(true);
    });
});
