import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const coreRoot = path.join(
    process.cwd(),
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore',
);

function lineCount(filePath: string): number {
    return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).length;
}

describe('Phase 4 pipelines/scopeBag factories honesty', () => {
    it('chain inputs barrel is thin and named domain modules exist', () => {
        const barrel = path.join(coreRoot, 'buildExecutionDashboardCorePipelinesChainInputs.ts');
        const modules = [
            'pipelinesChainInputs/types.ts',
            'pipelinesChainInputs/buildWorkspacePipelineInput.ts',
            'pipelinesChainInputs/buildFollowupDebtorPipelineInput.ts',
            'pipelinesChainInputs/buildClaimFinancialLedgerPipelineInput.ts',
            'pipelinesChainInputs/buildGraceMasterEvictionPipelineInput.ts',
            'pipelinesChainInputs/buildPersistHandlerPipelineInput.ts',
        ].map((rel) => path.join(coreRoot, rel));

        expect(fs.existsSync(barrel)).toBe(true);
        for (const mod of modules) {
            expect(fs.existsSync(mod)).toBe(true);
        }

        const barrelSrc = fs.readFileSync(barrel, 'utf8');
        expect(barrelSrc).toContain("from './pipelinesChainInputs/buildWorkspacePipelineInput'");
        expect(barrelSrc).toContain('buildExecutionDashboardCoreWorkspacePipelineInput');
        expect(barrelSrc).toContain('buildExecutionDashboardCoreFollowupDebtorPipelineInput');
        expect(barrelSrc).toContain('buildExecutionDashboardCoreClaimFinancialLedgerPipelineInput');
        expect(barrelSrc).toContain('buildExecutionDashboardCoreGraceMasterEvictionPipelineInput');
        expect(barrelSrc).toContain('buildExecutionDashboardCorePersistHandlerPipelineInput');
        expect(barrelSrc).toContain('ExecutionDashboardCoreFollowupDebtorPipelineInput');

        const graceSrc = fs.readFileSync(
            path.join(coreRoot, 'pipelinesChainInputs/buildGraceMasterEvictionPipelineInput.ts'),
            'utf8',
        );
        expect(graceSrc).toMatch(
            /paidClientFees: workspacePipeline\.paidClientFees,\s*activeDebtorIsEmployee,\s*followupSpecializationEffective,\s*followupModalSpecialization,/,
        );
        expect(graceSrc).toContain('followupModalDebtorIsDeceased,');

        const ledgerSrc = fs.readFileSync(
            path.join(coreRoot, 'pipelinesChainInputs/buildClaimFinancialLedgerPipelineInput.ts'),
            'utf8',
        );
        expect(ledgerSrc).toMatch(/seizureMatrixRef: workspacePipeline\.followupOrchestrator\.seizureMatrixRef,\s*openFollowupModalPersisted,/);

        const persistSrc = fs.readFileSync(
            path.join(coreRoot, 'pipelinesChainInputs/buildPersistHandlerPipelineInput.ts'),
            'utf8',
        );
        expect(persistSrc).toContain('openFollowupModalPersisted: input.openFollowupModalPersisted');

        expect(lineCount(barrel)).toBeLessThan(40);
        // Each domain builder stays under the former monolithic ~623 ceiling
        for (const mod of modules) {
            expect(lineCount(mod)).toBeLessThan(250);
        }
    });
});
