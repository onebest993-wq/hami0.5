import { describe, expect, it } from 'vitest';
import type { RepositoryFeedItem } from '@/app/services/repository/repositoryUnifiedFeed';
import {
    consumeRepositoryFeedFocus,
    indexOfRepositoryFeedFocus,
    repositoryFeedFocusId,
    repositoryFeedItemsSignature,
    repositoryNoteIdSelector,
    resolveRepositoryFocusRoomFilter,
} from '../repositoryFeedFocus';

function globalItem(id: string): RepositoryFeedItem {
    return {
        kind: 'global',
        note: { id, title: 't', body: '', isPinned: false },
        sortKey: 1,
    };
}

describe('repositoryFeedFocus', () => {
    it('يجد بطاقة الملاحظة العامة', () => {
        const items = [globalItem('a'), globalItem('b')];
        expect(repositoryFeedFocusId(items[1]!)).toBe('b');
        expect(indexOfRepositoryFeedFocus(items, 'b')).toBe(1);
        expect(indexOfRepositoryFeedFocus(items, 'missing')).toBe(-1);
    });

    it('يُثبّت توقيع القائمة عند تغيّر المرجع لا المحتوى', () => {
        const items = [globalItem('a'), globalItem('b')];
        expect(repositoryFeedItemsSignature(items)).toBe(repositoryFeedItemsSignature([...items]));
        expect(repositoryFeedItemsSignature(items)).not.toBe(
            repositoryFeedItemsSignature([globalItem('c'), ...items]),
        );
        expect(repositoryFeedItemsSignature(items)).not.toBe(
            repositoryFeedItemsSignature([globalItem('a'), globalItem('x')]),
        );
    });

    it('يهرب محدّد البطاقة فلا ينكسر على علامات الاقتباس', () => {
        expect(repositoryNoteIdSelector('plain')).toBe('[data-note-id="plain"]');
        expect(repositoryNoteIdSelector('n"x')).not.toBe('[data-note-id="n"x"]');
    });

    it('يستهلك التركيز مرة لكل معرّف بعد ظهور البطاقة', () => {
        const applied = { current: null as string | null };
        expect(consumeRepositoryFeedFocus('n1', applied, false)).toBe(false);
        expect(consumeRepositoryFeedFocus('n1', applied, true)).toBe(true);
        expect(consumeRepositoryFeedFocus('n1', applied, true)).toBe(false);
        expect(consumeRepositoryFeedFocus(undefined, applied, false)).toBe(false);
        expect(applied.current).toBeNull();
        expect(consumeRepositoryFeedFocus('n2', applied, true)).toBe(true);
    });

    it('يختار غرفة البطاقة عند فتح البحث ولا يغيّر شيئاً قبل التحميل', () => {
        expect(resolveRepositoryFocusRoomFilter([], 'n1')).toBeNull();
        expect(
            resolveRepositoryFocusRoomFilter([{ id: 'n1', roomId: null }], 'n1'),
        ).toBe('main');
        expect(
            resolveRepositoryFocusRoomFilter([{ id: 'n1', roomId: 'room_a' }], 'n1'),
        ).toBe('room_a');
    });

    it('يتغيّر التوقيع عند تبديل بطاقة وسطى بنفس الطرفين', () => {
        const ends = [globalItem('a'), globalItem('b'), globalItem('c')];
        const mid = [globalItem('a'), globalItem('x'), globalItem('c')];
        expect(repositoryFeedItemsSignature(ends)).not.toBe(repositoryFeedItemsSignature(mid));
    });
});
