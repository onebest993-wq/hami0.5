import { describe, expect, it } from 'vitest';
import { stripRepositoryHtml } from './stripRepositoryHtml';

describe('stripRepositoryHtml', () => {
    it('يزيل الوسوم ويضغط المسافات', () => {
        expect(stripRepositoryHtml('<p>مرحبا <strong>بالعالم</strong></p>')).toBe('مرحبا بالعالم');
        expect(stripRepositoryHtml('   ')).toBe('');
        expect(stripRepositoryHtml('نص عادي')).toBe('نص عادي');
    });
});
