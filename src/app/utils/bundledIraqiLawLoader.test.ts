import { beforeEach, describe, expect, it } from 'vitest';
import {
    CIVIL_LAW_CANONICAL_NAMES,
    EXECUTION_LAW_CANONICAL_NAME,
    IRAQI_LAW_CANONICAL_NAMES,
} from '@/app/constants/iraqiLawCatalog';
import {
    hasBundledLawArticles,
    isBundledLawRegistered,
    loadBundledLawRows,
    resetBundledLawLoaderCacheForTests,
} from './bundledIraqiLawLoader';

describe('bundledIraqiLawLoader', () => {
    beforeEach(() => {
        resetBundledLawLoaderCacheForTests();
    });

    it('loads civil procedure articles on demand from src/data/laws', async () => {
        const lawName = CIVIL_LAW_CANONICAL_NAMES.civil_procedure;
        expect(isBundledLawRegistered(lawName)).toBe(true);
        await expect(hasBundledLawArticles(lawName)).resolves.toBe(true);
        const rows = await loadBundledLawRows(lawName);
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.every((row) => row.law_name === lawName)).toBe(true);
    });

    it('keeps evidence articles isolated from civil procedure bundle', async () => {
        const civil = await loadBundledLawRows(CIVIL_LAW_CANONICAL_NAMES.civil_procedure);
        const evidence = await loadBundledLawRows(CIVIL_LAW_CANONICAL_NAMES.evidence);
        expect(civil.length).toBeGreaterThan(0);
        expect(evidence.length).toBeGreaterThan(0);
        expect(civil[0]?.law_name).not.toBe(evidence[0]?.law_name);
    });

    it('ships non-empty criminal and execution fallback bundles', async () => {
        const lawNames = [
            IRAQI_LAW_CANONICAL_NAMES.penal,
            IRAQI_LAW_CANONICAL_NAMES.procedure,
            IRAQI_LAW_CANONICAL_NAMES.juvenile,
            EXECUTION_LAW_CANONICAL_NAME,
        ];

        for (const lawName of lawNames) {
            expect(isBundledLawRegistered(lawName)).toBe(true);
            await expect(hasBundledLawArticles(lawName)).resolves.toBe(true);
            const rows = await loadBundledLawRows(lawName);
            expect(rows.length).toBeGreaterThan(0);
            expect(rows.every((row) => row.law_name === lawName)).toBe(true);
        }
    });
});
