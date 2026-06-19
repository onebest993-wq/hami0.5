import { describe, expect, it } from 'vitest';
import {
    addManualClassificationTemplate,
    normalizeManualClassificationTag,
    removeManualClassificationTemplate,
} from '../manualClassificationTemplates';

describe('manualClassificationTemplates', () => {
    it('normalizes tags with hash prefix', () => {
        expect(normalizeManualClassificationTag('  مرافعة  ')).toBe('#مرافعة');
        expect(normalizeManualClassificationTag('#محضر')).toBe('#محضر');
        expect(normalizeManualClassificationTag('   ')).toBe('');
    });

    it('dedupes on add', () => {
        const first = addManualClassificationTemplate([], 'مرافعة');
        expect(first).toEqual(['#مرافعة']);
        const second = addManualClassificationTemplate(first, '#مرافعة');
        expect(second).toEqual(['#مرافعة']);
        const third = addManualClassificationTemplate(second, 'مشاهدة');
        expect(third).toEqual(['#مشاهدة', '#مرافعة']);
    });

    it('removes by normalized tag', () => {
        const list = ['#أ', '#ب'];
        expect(removeManualClassificationTemplate(list, 'أ')).toEqual(['#ب']);
    });
});
