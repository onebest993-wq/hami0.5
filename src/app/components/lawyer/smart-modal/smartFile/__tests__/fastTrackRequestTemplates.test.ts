import { describe, expect, it } from 'vitest';
import {
    addRequestTypeTemplate,
    normalizeRequestTypeTemplate,
    removeRequestTypeTemplate,
} from '../fastTrackRequestTemplates';

describe('fastTrackRequestTemplates', () => {
    it('normalizes and dedupes on add', () => {
        expect(addRequestTypeTemplate([], '  منع سفر  ')).toEqual(['منع سفر']);
        expect(addRequestTypeTemplate(['منع سفر'], 'منع سفر')).toEqual(['منع سفر']);
        expect(addRequestTypeTemplate(['منع سفر'], 'أمر ولائي')).toEqual(['أمر ولائي', 'منع سفر']);
    });

    it('removes template by normalized text', () => {
        expect(removeRequestTypeTemplate(['أ', 'ب'], '  أ ')).toEqual(['ب']);
    });

    it('rejects empty templates', () => {
        expect(normalizeRequestTypeTemplate('   ')).toBe('');
        expect(addRequestTypeTemplate(['x'], '   ')).toEqual(['x']);
    });
});
