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
        expect(view.dossierLifecycleBadge).toBe('🟢 نشطة');
        expect(view.demandLabel).toBe('إجمالي المطلوب (تقدير)');
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
