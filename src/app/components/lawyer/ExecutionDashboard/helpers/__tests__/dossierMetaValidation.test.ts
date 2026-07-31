import { describe, expect, it } from 'vitest';
import {
    formatDossierFileRef,
    parseDossierFileRef,
    validateDossierMetaDraft,
} from '../dossierMetaValidation';

describe('parseDossierFileRef / formatDossierFileRef', () => {
    it('formats and parses number/year', () => {
        expect(formatDossierFileRef('444', '2024')).toBe('444/2024');
        expect(parseDossierFileRef('444/2024')).toEqual({ fileNumber: '444', fileYear: '2024' });
        expect(parseDossierFileRef('444 / 2024')).toEqual({ fileNumber: '444', fileYear: '2024' });
    });
});

describe('validateDossierMetaDraft', () => {
    it('requires directorate, file number, and year', () => {
        expect(validateDossierMetaDraft({ directorate: '', fileNumber: '1', fileYear: '2026' }).ok).toBe(
            false,
        );
        expect(
            validateDossierMetaDraft({ directorate: 'الكرخ', fileNumber: '', fileYear: '2026' }).ok,
        ).toBe(false);
        expect(
            validateDossierMetaDraft({ directorate: 'الكرخ', fileNumber: '1', fileYear: '26' }).ok,
        ).toBe(false);
        expect(
            validateDossierMetaDraft({ directorate: 'الكرخ', fileNumber: '444', fileYear: '' }).ok,
        ).toBe(false);
    });

    it('accepts a valid draft with separate or combined file ref', () => {
        expect(
            validateDossierMetaDraft({
                directorate: 'تنفيذ الكرخ',
                fileNumber: '12',
                fileYear: '2026',
            }).ok,
        ).toBe(true);
        expect(
            validateDossierMetaDraft({
                directorate: 'تنفيذ الكرخ',
                fileNumber: '444/2024',
                fileYear: '',
            }).ok,
        ).toBe(true);
    });

    it('requires property number for eviction dossiers', () => {
        expect(
            validateDossierMetaDraft(
                {
                    directorate: 'الكرخ',
                    fileNumber: '1',
                    fileYear: '2026',
                    property_number: '',
                },
                { isEviction: true },
            ).ok,
        ).toBe(false);
    });

    it('rejects oversized free-text fields', () => {
        expect(
            validateDossierMetaDraft({
                directorate: 'د'.repeat(161),
                fileNumber: '1',
                fileYear: '2026',
            }).ok,
        ).toBe(false);
        expect(
            validateDossierMetaDraft({
                directorate: 'الكرخ',
                fileNumber: '1',
                fileYear: '2026',
                classification: 'ت'.repeat(201),
            }).ok,
        ).toBe(false);
    });
});
