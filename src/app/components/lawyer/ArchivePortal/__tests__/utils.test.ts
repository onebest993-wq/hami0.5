import { describe, expect, it } from 'vitest';
import {
    formatExecutionArchiveCreditorLabel,
    formatExecutionArchiveDebtorLabel,
    readExecutionFileLiveSnapshot,
    resolveExecutionArchiveCardView,
    resolveExecutionArchiveFileNumberYear,
} from '../utils';
import type { LooseArchiveFile } from '../types';

describe('ArchivePortal execution card snapshot', () => {
    it('prefers creditors/debtors arrays over stale scalar fields', () => {
        const file = {
            id: 'exec-1',
            type: 'execution',
            creditor: 'اسم قديم',
            debtor: 'مدين قديم',
            creditors: [{ id: 1, name: 'زينب محمد الربيعي', role: 'الدائن', isClient: true }],
            debtors: [{ id: 2, fullName: 'حسين سعد العراقي', role: 'المدين', isClient: false }],
            fileNumber: '2341',
            fileYear: '2026',
            claimType: 'استحصال دين مالي',
            docType: 'السندات المتضمنة إقراراً بدين',
            totalAmount: 5_054_544,
        } as LooseArchiveFile;

        const snap = readExecutionFileLiveSnapshot(file);
        expect(formatExecutionArchiveCreditorLabel(snap)).toBe('زينب محمد الربيعي');
        expect(formatExecutionArchiveDebtorLabel(snap)).toBe('حسين سعد العراقي');
        const view = resolveExecutionArchiveCardView(file);
        expect(view.fileNumber).toBe('2341');
        expect(view.year).toBe('2026');
        expect(view.claimLabelAr).toBe('استحصال دين مالي');
        expect(view.docTypeLabel).toBe('السندات المتضمنة إقراراً بدين');
        expect(view.totalDemand).toBe(5_054_544);
        expect(view.statusLabel).toBe('');
        expect(view.dossierLifecycleStatus).toBe('active');
        expect(view.dossierLifecycleBadge).toBe('نشطة');
        expect(view.demandLabel).toBe('إجمالي المطلوب (تقدير)');
        expect(view.syncedFromLedger).toBe(false);
    });

    it('uses index remaining without ledger decrypt', () => {
        const file = {
            id: 'exec-remain',
            type: 'execution',
            totalAmount: 5_000_000,
            total_remaining_balance: 1_250_000,
        } as LooseArchiveFile;
        const view = resolveExecutionArchiveCardView(file);
        expect(view.totalDemand).toBe(5_000_000);
        expect(view.remainingDemand).toBe(1_250_000);
        expect(view.demandLabel).toBe('متبقي الوعاء');
        expect(view.syncedFromLedger).toBe(false);
    });

    it('treats index remaining 0 as paid-off, not as a missing hint', () => {
        const file = {
            id: 'exec-paid-off',
            type: 'execution',
            totalAmount: 5_000_000,
            total_remaining_balance: 0,
        } as LooseArchiveFile;
        const view = resolveExecutionArchiveCardView(file);
        expect(view.totalDemand).toBe(5_000_000);
        expect(view.remainingDemand).toBe(0);
        expect(view.demandLabel).toBe('متبقي الوعاء');
        expect(view.syncedFromLedger).toBe(false);
        expect(view.secondaryDemandLabel).toContain('الإجمالي');
    });

    it('joins multiple debtors', () => {
        const file = {
            id: 'exec-2',
            type: 'execution',
            debtors: [
                { id: 1, name: 'أحمد', role: 'المدين' },
                { id: 2, name: 'علي', role: 'المدين' },
            ],
        } as LooseArchiveFile;
        const snap = readExecutionFileLiveSnapshot(file);
        expect(formatExecutionArchiveDebtorLabel(snap)).toBe('أحمد · علي');
    });

    it('splits caseNo when fileNumber/fileYear missing', () => {
        const file = {
            id: 'exec-3',
            type: 'execution',
            caseNo: '120/2025',
        } as LooseArchiveFile;
        const snap = readExecutionFileLiveSnapshot(file);
        expect(resolveExecutionArchiveFileNumberYear(snap)).toEqual({
            fileNumber: '120',
            year: '2025',
        });
    });
});
