/**
 * Extract pipeline chain from useExecutionDashboardCore into useExecutionDashboardCorePipelinesChain.ts
 */
import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const outPath = 'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCorePipelinesChain.ts';
const core = fs.readFileSync(corePath, 'utf8');
const lines = core.split('\n');

const bootDestrStart = lines.findIndex((l) => l.trim() === 'const {') ;
const bootDestrEnd = lines.findIndex((l, i) => i > bootDestrStart && l.trim() === '} = boot;');
const chainStart = lines.findIndex((l) => l.includes('const workspacePipeline = useExecutionDashboardCoreWorkspacePipeline'));
const chainEnd = lines.findIndex((l, i) => i > chainStart && l.includes('const specificDeliveryFinancialized = Boolean('));
const chainEndLine = chainEnd + 3; // include closing );

const bootDestr = lines.slice(bootDestrStart + 1, bootDestrEnd).join('\n');
const chainBody = lines.slice(chainStart, chainEndLine + 1).join('\n');

const header = `// @ts-nocheck
/** Phase C Slice 32 — workspace → persist pipeline chain */
import { useMemo } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { openBreakInventoryCompletion, openJudicialCustodianCompletion } from '@/app/utils/executorApprovalWorkflow';
import type { ExecutionDashboardProps } from '../../types';
import { useExecutionDashboardCoreWorkspacePipeline } from './useExecutionDashboardCoreWorkspacePipeline';
import { useExecutionDashboardCoreFileMetadataBinding } from './useExecutionDashboardCoreFileMetadataBinding';
import { useExecutionDashboardCoreFollowupDebtorPipeline } from './useExecutionDashboardCoreFollowupDebtorPipeline';
import { useExecutionDashboardCoreClaimFinancialLedgerPipeline } from './useExecutionDashboardCoreClaimFinancialLedgerPipeline';
import { useExecutionDashboardCoreGraceMasterEvictionPipeline } from './useExecutionDashboardCoreGraceMasterEvictionPipeline';
import { useExecutionDashboardCorePersistHandlerPipeline } from './useExecutionDashboardCorePersistHandlerPipeline';

export function useExecutionDashboardCorePipelinesChain({
    boot,
    file,
    executionId,
    onUpdate,
}: {
    boot: Record<string, unknown>;
    file: ExecutionDashboardProps['file'];
    executionId: string | undefined;
    onUpdate: ExecutionDashboardProps['onUpdate'];
}) {
    const {
${bootDestr}
    } = boot;

`;

const footer = `
    return {
        workspacePipeline,
        fileMetadataBinding,
        followupDebtor,
        claimFinancialLedger,
        graceMasterPipeline,
        persistHandlerPipeline,
        financialStatus,
        specificDeliveryConvertedAmount,
        specificDeliveryFinancialized,
    };
}
`;

fs.writeFileSync(outPath, header + chainBody + footer, 'utf8');
console.log('wrote', outPath, 'lines:', (header + chainBody + footer).split('\n').length);
