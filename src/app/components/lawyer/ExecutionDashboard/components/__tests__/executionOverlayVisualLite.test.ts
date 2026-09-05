import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dashboard = resolve(__dirname, '../..');
const lawyer = resolve(__dirname, '../../../');

function readDashboard(rel: string): string {
    return readFileSync(resolve(dashboard, rel), 'utf8');
}

function readLawyer(rel: string): string {
    return readFileSync(resolve(lawyer, rel), 'utf8');
}

describe('execution overlay visual lite (explicit design permission)', () => {
    it('shared phone chrome is navy + white/10 without thick decorative borders', () => {
        const shell = readDashboard('executionModalMobileShell.ts');
        expect(shell).toContain("bg-[#0A0F1C]");
        expect(shell).toContain('sm:border-white/10');
        expect(shell).toContain('EXEC_OVERLAY_PHONE_SHEET');
        expect(shell).toContain('min-h-[44px]');
        expect(shell).not.toContain('border-cyan-500');
        expect(shell).not.toContain('border-amber-500');
    });

    it('vault drops cyan chrome, gradients, and overlay motion', () => {
        const vault = readLawyer('DocumentVault.tsx');
        expect(vault).toContain('EXEC_OVERLAY_PHONE_SHEET_WIDE');
        expect(vault).not.toContain('overlayMotionRuntime');
        expect(vault).not.toContain('border-2 border-cyan');
        expect(vault).not.toContain('from-cyan-600');
        expect(vault).not.toContain('backdrop-blur-xl');
    });

    it('appointment and notes use the shared phone sheet', () => {
        expect(readDashboard('components/ExecutionAppointmentModal.tsx')).toContain(
            'EXEC_OVERLAY_PHONE_SHEET',
        );
        expect(readDashboard('components/ExecutionNotesAndAppointmentModalsReady.tsx')).toContain(
            'EXEC_OVERLAY_PHONE_SHEET',
        );
        expect(readDashboard('components/ExecutionNotesModalHeader.tsx')).toContain(
            'EXEC_OVERLAY_SEG_ACTIVE',
        );
        expect(readDashboard('components/ExecutionNotesModalHeader.tsx')).not.toContain(
            'bg-[#0B1120]',
        );
    });

    it('law reference drops blur and purple leaf chips', () => {
        const law = readLawyer('execution/ExecutionLawReferencePanel.tsx');
        expect(law).not.toContain('backdrop-blur-sm');
        expect(law).not.toContain('border-purple-500');
        expect(law).toContain('LEAF_CHIP_ACTIVE = PARENT_CHIP_ACTIVE');
    });

    it('followup shell is full-bleed phone chrome without decorative blur', () => {
        const shell = readDashboard('components/ExecutionFollowupModalShell.tsx');
        expect(shell).toContain('EXEC_OVERLAY_PHONE_SHEET_XL');
        expect(shell).toContain('min-h-[44px]');
        expect(shell).toContain('touch-manipulation');
        expect(shell).not.toContain('onWheelCapture');
        expect(shell).not.toContain('backdrop-blur');
        const expand = readLawyer('execution/SeizureMatrixExpandLink.tsx');
        expect(expand).toContain('min-h-[44px]');
        expect(expand).toContain('touch-manipulation');
        expect(expand).not.toContain('backdrop-blur');
        expect(expand).not.toContain('bg-gradient-to');
    });

    it('financial hub no longer duplicates totals already painted by FocFundsCardHeader', () => {
        const foc = readLawyer('FinancialOperationsCenter.tsx');
        expect(foc).not.toContain('renderLedgerToolbar');
        expect(foc).toContain('FocFundsCardHeader');
        const afterHeader = foc.split('FocFundsCardHeader')[2] ?? '';
        expect(afterHeader).not.toContain('إجمالي الدين');
    });
});
