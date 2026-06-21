import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useForumMentionAutocomplete } from '@/app/hooks/useForumMentionAutocomplete';

const candidates = [
    { id: 'u1', name: 'أحمد علي' },
    { id: 'u2', name: 'سارة محمود' },
];

describe('useForumMentionAutocomplete', () => {
    it('opens suggestions after @', () => {
        let value = '';
        const { result, rerender } = renderHook(() =>
            useForumMentionAutocomplete(value, (v) => {
                value = v;
            }, candidates),
        );

        act(() => {
            result.current.handleValueChange('مرحباً @س', 9);
        });
        rerender();
        expect(result.current.showSuggestions).toBe(true);
        expect(result.current.suggestions.length).toBeGreaterThan(0);
    });

    it('inserts mention token', () => {
        let value = '@';
        const { result, rerender } = renderHook(() =>
            useForumMentionAutocomplete(value, (v) => {
                value = v;
            }, candidates),
        );

        act(() => {
            result.current.handleValueChange('@', 1);
        });
        rerender();
        act(() => {
            result.current.insertMention(candidates[1]!);
        });
        rerender();
        expect(value).toBe('@سارة محمود ');
    });
});
