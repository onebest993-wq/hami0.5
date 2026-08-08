import { describe, expect, it } from 'vitest';
import { formatUnifiedChildDossierTabLabel } from '../formatUnifiedChildDossierTabLabel';

describe('formatUnifiedChildDossierTabLabel', () => {
    it('prefers file number and year', () => {
        expect(
            formatUnifiedChildDossierTabLabel({
                id: 'child-1',
                fileNumber: '444',
                fileYear: '2024',
            } as never)
        ).toBe('444/2024');
    });

    it('never shows raw inaba technical id', () => {
        expect(
            formatUnifiedChildDossierTabLabel({
                id: '__inaba__:exec_29290724-7877-4f6d-bff0-e799b62c0557',
                fileNumber: '',
            } as never)
        ).toBe('إضبارة الإنابة');
    });

    it('falls back to directorate', () => {
        expect(
            formatUnifiedChildDossierTabLabel({
                id: 'child-2',
                directorate: 'مديرية تنفيذ الكرخ',
            } as never)
        ).toBe('مديرية تنفيذ الكرخ');
    });

    it('falls back to generic unified label', () => {
        expect(formatUnifiedChildDossierTabLabel({ id: 'child-3' } as never)).toBe('إضبارة موحّدة');
    });
});
