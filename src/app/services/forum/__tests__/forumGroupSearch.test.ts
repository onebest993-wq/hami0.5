import { describe, expect, it } from 'vitest';
import { escapePostgrestIlike } from '../forumGroupSearch';

describe('escapePostgrestIlike', () => {
    it('escapes percent and underscore wildcards', () => {
        expect(escapePostgrestIlike('100%')).toBe('100\\%');
        expect(escapePostgrestIlike('a_b')).toBe('a\\_b');
    });

    it('escapes backslashes first', () => {
        expect(escapePostgrestIlike('path\\test')).toBe('path\\\\test');
    });
});
