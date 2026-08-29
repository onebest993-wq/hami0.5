import { afterEach, describe, expect, it } from 'vitest';
import {
    hasLegalRepositoryLocalReport,
    recordLegalRepositoryLocalReport,
    resetLegalRepositoryLocalReportsForTests,
} from '../legalRepositoryLocalReports';

describe('legalRepositoryLocalReports', () => {
    beforeEach(() => {
        resetLegalRepositoryLocalReportsForTests();
    });
    afterEach(() => {
        resetLegalRepositoryLocalReportsForTests();
    });

    it('يسجّل البلاغ ويمنع التكرار لنفس المستخدم والمستند', () => {
        expect(recordLegalRepositoryLocalReport('u1', 'doc-1', 'عقد')).toBe(true);
        expect(hasLegalRepositoryLocalReport('u1', 'doc-1')).toBe(true);
        expect(recordLegalRepositoryLocalReport('u1', 'doc-1', 'عقد')).toBe(false);
        expect(hasLegalRepositoryLocalReport('u2', 'doc-1')).toBe(false);
    });

    it('يرفض المعرّفات الطويلة ويتجاهل JSON التالف', () => {
        expect(recordLegalRepositoryLocalReport('u1', 'x'.repeat(81), 'عقد')).toBe(false);
        window.localStorage.setItem('hami:forum:repo-reports:v1', '{not-json');
        expect(hasLegalRepositoryLocalReport('u1', 'doc-1')).toBe(false);
        expect(recordLegalRepositoryLocalReport('u1', 'doc-2', 'مذكرة')).toBe(true);
    });
});
