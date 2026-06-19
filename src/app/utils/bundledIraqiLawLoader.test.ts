import { describe, expect, it } from 'vitest';
import { CIVIL_LAW_CANONICAL_NAMES } from '@/app/constants/iraqiLawCatalog';
import { getBundledLawRows, hasBundledLawArticles } from './bundledIraqiLawLoader';

describe('bundledIraqiLawLoader', () => {
    it('loads civil procedure articles bundled in src/data/laws', () => {
        const lawName = CIVIL_LAW_CANONICAL_NAMES.civil_procedure;
        expect(hasBundledLawArticles(lawName)).toBe(true);
        const rows = getBundledLawRows(lawName);
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.every((row) => row.law_name === lawName)).toBe(true);
    });

    it('keeps evidence articles isolated from civil procedure bundle', () => {
        const civil = getBundledLawRows(CIVIL_LAW_CANONICAL_NAMES.civil_procedure);
        const evidence = getBundledLawRows(CIVIL_LAW_CANONICAL_NAMES.evidence);
        expect(civil.length).toBeGreaterThan(0);
        expect(evidence.length).toBeGreaterThan(0);
        expect(civil[0]?.law_name).not.toBe(evidence[0]?.law_name);
    });
});
