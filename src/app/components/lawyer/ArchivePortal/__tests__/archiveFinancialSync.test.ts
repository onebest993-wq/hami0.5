import { describe, expect, it } from 'vitest';
import {
    buildArchiveLedgerParams,
    resolveExecutionArchiveFinancialDemand,
} from '../archiveFinancialSync';
import { readExecutionFileLiveSnapshot } from '../utils';
import type { LooseArchiveFile } from '../types';

describe('archiveFinancialSync', () => {
    it('builds ledger params from live execution snapshot', () => {
        const file = {
            id: 'exec-fin-1',
            type: 'execution',
            claimType: 'استحصال دين مالي',
            totalAmount: 5_000_000,
            lawyerFeesAmount: 150_000,
            courtFees: 0,
            directorateFees: 0,
        } as LooseArchiveFile;
        const snap = readExecutionFileLiveSnapshot(file);
        const params = buildArchiveLedgerParams(snap, file);
        expect(params.principal_amount).toBe(5_000_000);
        expect(params.courtOrderedFeesSafe).toBe(150_000);
        expect(params.seedLawyerId).toBe('seed-lawyer-exec-fin-1');
    });

    it('falls back to estimate when no ledger exists', () => {
        const file = {
            id: 'exec-estimate',
            type: 'execution',
            claimType: 'استحصال دين مالي',
            totalAmount: 1_250_000,
        } as LooseArchiveFile;
        const snap = readExecutionFileLiveSnapshot(file);
        const demand = resolveExecutionArchiveFinancialDemand(snap, file);
        expect(demand.syncedFromLedger).toBe(false);
        expect(demand.totalDemand).toBe(1_250_000);
        expect(demand.demandLabel).toBe('إجمالي المطلوب (تقدير)');
    });

    it('uses unified total when dossier is merged', () => {
        const file = {
            id: 'exec-parent',
            type: 'execution',
            totalAmount: 2_000_000,
        } as LooseArchiveFile;
        const snap = readExecutionFileLiveSnapshot(file);
        const demand = resolveExecutionArchiveFinancialDemand(snap, file, {
            unifiedCount: 2,
            unifiedTotalDemand: 4_500_000,
        });
        expect(demand.syncedFromLedger).toBe(true);
        expect(demand.totalDemand).toBe(4_500_000);
        expect(demand.demandLabel).toBe('إجمالي المطلوب (بعد التوحيد)');
    });

    it('zeroes principal for encroachment and specific-delivery claims', () => {
        for (const claimType of ['إزالة تجاوز', 'تسليم شيء معين']) {
            const file = {
                id: `exec-${claimType}`,
                type: 'execution',
                claimType,
                totalAmount: 9_000_000,
            } as LooseArchiveFile;
            const snap = readExecutionFileLiveSnapshot(file);
            const params = buildArchiveLedgerParams(snap, file);
            expect(params.principal_amount).toBe(0);
        }
    });
});
