import { describe, expect, it } from 'vitest';
import { extractExecutionShareSource } from '@/app/services/caseShare/caseShareExtractors';
import { buildExecutionShareCatalog } from '@/app/services/caseShare/caseShareCatalogBuilder';

describe('execution share guards', () => {
    it('extractExecutionShareSource tolerates legacy notes array', () => {
        expect(() =>
            extractExecutionShareSource({
                id: 'exec-1',
                notes: [],
            } as never),
        ).not.toThrow();
    });

    it('extractExecutionShareSource includes executionMeta', () => {
        const source = extractExecutionShareSource({
            id: 'exec-2',
            directorate: 'مديرية الرصافة',
            fileNumber: '1540',
            fileYear: '2026',
            claimType: 'استحصال دين مالي',
            notes: 'ملاحظة',
        } as never);
        expect(source.executionMeta?.directorate).toBe('مديرية الرصافة');
        expect(source.executionMeta?.fileNumber).toBe('1540');
        expect(source.executionMeta?.claimType).toBe('استحصال دين مالي');
    });

    it('buildExecutionShareCatalog does not throw on notes array', () => {
        const catalog = buildExecutionShareCatalog({
            id: 'exec-1',
            notes: [],
        } as never);
        const notes = catalog.find((s) => s.key === 'notes');
        expect(notes).toBeTruthy();
        expect(notes?.items.length).toBe(0);
    });

    it('buildExecutionShareCatalog includes string notes', () => {
        const catalog = buildExecutionShareCatalog({
            id: 'exec-2',
            notes: 'ملاحظة',
        } as never);
        expect(catalog.some((s) => s.key === 'notes')).toBe(true);
    });
});
