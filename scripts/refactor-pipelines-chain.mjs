import fs from 'fs';

const path =
    'c:/Users/HEX STORE/Downloads/New folder/src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCorePipelinesChain.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    `import { useExecutionDashboardCoreClaimFinancialLedgerPipeline } from './useExecutionDashboardCoreClaimFinancialLedgerPipeline';
import { useExecutionDashboardCoreGraceMasterEvictionPipeline } from './useExecutionDashboardCoreGraceMasterEvictionPipeline';
import { useExecutionDashboardCorePersistHandlerPipeline } from './useExecutionDashboardCorePersistHandlerPipeline';`,
    `import { useExecutionDashboardCoreClaimGracePersistSegment } from './useExecutionDashboardCoreClaimGracePersistSegment';`,
);

const start = content.indexOf('    const restrictedFollowupTabIds = useMemo(');
const end = content.indexOf('    const specificDeliveryConvertedAmount =');
if (start < 0 || end < 0) throw new Error('markers not found');

const segmentCall = `    const {
        claimFinancialLedger,
        graceMasterPipeline,
        persistHandlerPipeline,
        financialStatus,
        specificDeliveryConvertedAmount,
        specificDeliveryFinancialized,
    } = useExecutionDashboardCoreClaimGracePersistSegment({
        boot,
        file,
        executionId,
        onUpdate,
        executionData,
        viewExecutionData,
        executionDataRef,
        workspacePipeline,
        fileMetadataBinding,
        followupDebtor,
        showToast,
        gracePeriodEnded,
        setShowStatuteWarning,
    });

`;

content = content.slice(0, start) + segmentCall + content.slice(end);
fs.writeFileSync(path, content);
console.log(content.split('\n').length);
