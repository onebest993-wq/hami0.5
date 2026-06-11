import { describe, expect, it } from 'vitest';
import {
    SETTLEMENT_DEFAULT_DUE_DAYS,
    hasActiveSalarySeizurePath,
    hasActiveSettlementPath,
    releaseSalarySeizedAssets,
    resolveSalaryGarnishmentBlockedBySettlement,
    resolveSalaryGarnishmentButtonVisible,
    resolveSettlementBlockedBySalarySeizure,
} from '../settlementSalaryExclusion';
import type { PendingSettlement } from '../types';

const pending: PendingSettlement = {
    id: 'stl-1',
    amount: 500_000,
    dueDate: '2026-07-04',
    createdAt: '2026-06-04T00:00:00.000Z',
};

describe('settlementSalaryExclusion', () => {
    it('exposes 30-day default settlement window', () => {
        expect(SETTLEMENT_DEFAULT_DUE_DAYS).toBe(30);
    });

    it('blocks salary garnishment while settlement is pending', () => {
        expect(resolveSalaryGarnishmentBlockedBySettlement(pending)).toBe(true);
        expect(resolveSalaryGarnishmentBlockedBySettlement(null)).toBe(false);
        expect(hasActiveSettlementPath(pending)).toBe(true);
    });

    it('keeps salary request visible while settlement is pending until completion conflict', () => {
        expect(
            resolveSalaryGarnishmentButtonVisible({
                matrixAllowsSalary: true,
                matrixBlocksSeizure: false,
            })
        ).toBe(true);
    });

    it('blocks settlement when salary seizure path is active', () => {
        expect(
            resolveSettlementBlockedBySalarySeizure({
                garnishment: true,
            })
        ).toBe(true);

        expect(
            resolveSettlementBlockedBySalarySeizure({
                seizedAssets: [
                    {
                        id: 's1',
                        type: 'salary',
                        status: 'seized',
                        details: { seizureUiKind: 'salary' },
                    },
                ],
            })
        ).toBe(true);

        expect(resolveSettlementBlockedBySalarySeizure({})).toBe(false);
    });

    it('releases active salary seized assets', () => {
        const next = releaseSalarySeizedAssets([
            {
                id: 's1',
                type: 'salary',
                status: 'seized',
                details: { seizureUiKind: 'salary' },
            },
            {
                id: 'p1',
                type: 'real_estate',
                status: 'seized',
            },
        ]);
        expect(String(next[0].status)).toBe('released');
        expect(String(next[1].status)).toBe('seized');
    });

    it('respects seizure matrix gates', () => {
        expect(
            resolveSalaryGarnishmentButtonVisible({
                matrixAllowsSalary: false,
                matrixBlocksSeizure: false,
            })
        ).toBe(false);

        expect(
            resolveSalaryGarnishmentButtonVisible({
                matrixAllowsSalary: true,
                matrixBlocksSeizure: true,
            })
        ).toBe(false);
    });
});
