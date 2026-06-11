import { describe, expect, it } from 'vitest';
import { resolveDossierHeaderFields } from '@/app/utils/executionDossierHeaderFields';
import type { ExecutionFile } from '@/app/types/execution';

describe('resolveDossierHeaderFields', () => {
    it('reads intake fields without mock defaults', () => {
        const file = {
            id: '1',
            type: 'execution',
            directorate: 'مديرية تنفيذ الرصافة',
            fileNumber: '4521',
            fileYear: '2025',
            docType: 'قرارات وأحكام المحاكم',
            claimType: 'مبلغ نقدي',
            classification: 'مدني',
            docNumber: '123/2024',
            judgmentDate: '2024-06-01',
        } as ExecutionFile;

        const h = resolveDossierHeaderFields(file);
        expect(h.directorate).toBe('مديرية تنفيذ الرصافة');
        expect(h.fileRefDisplay).toBe('4521 / 2025');
        expect(h.docType).toBe('قرارات وأحكام المحاكم');
        expect(h.claimTypeDisplay).toContain('مبلغ نقدي');
        expect(h.classificationDisplay).toBe('مدني');
    });

    it('parses caseNo when fileNumber/year missing', () => {
        const h = resolveDossierHeaderFields({
            id: '2',
            caseNo: '99/2023',
            directorate: 'كرخ',
        } as ExecutionFile);
        expect(h.fileRefDisplay).toBe('99 / 2023');
    });
});
