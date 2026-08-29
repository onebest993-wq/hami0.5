import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const PROPS = path.resolve(__dirname, '../ExecutionFinancialHubPortalProps.ts');

function countAnyTokens(src: string): number {
    const matches = src.match(/\bany\b/g);
    return matches?.length ?? 0;
}

describe('ExecutionFinancialHubPortalProps honesty', () => {
    it('keeps concrete seizure / ledger / toast types and near-zero any', () => {
        expect(fs.existsSync(PROPS)).toBe(true);
        const src = fs.readFileSync(PROPS, 'utf8');
        expect(src).toContain('RealEstateSeizureAsset');
        expect(src).toContain('FinancialLedgerEntry');
        expect(src).toContain('EvictionCaseExpenseRow');
        expect(src).toContain('ExecutionStatusMeta');
        expect(src).toContain('FinancialOperationsCenterProps');
        expect(src).toContain('TimelineEvent');
        expect(src).not.toContain('Record<string, any>');
        expect(countAnyTokens(src)).toBeLessThanOrEqual(0);
    });
});
