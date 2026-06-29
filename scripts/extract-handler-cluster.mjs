import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const outPath =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreHandlerCluster.ts';
const keysPath = 'scripts/handler-cluster-ctx-keys.json';

const core = fs.readFileSync(corePath, 'utf8');
const lines = core.split('\n');

const startIdx = lines.findIndex((l) => l.includes('executionCopilotDecisions,')) - 1;
const endIdx = lines.findIndex((l) => l.includes('const specificDeliveryConvertedAmount ='));
const body = lines.slice(startIdx, endIdx).join('\n');

const ctxKeys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));

const returnKeys = [
    'firstActiveAppealDecisionId',
    'executionCopilotDecisions',
    'removeJudicialCustodianEntry',
    'pushTimelineEventBinding',
    'pushTimelineEvent',
    'propertyInlineSaveCtx',
    'realEstateSeizureHandlers',
    'thirdPartySeizureHandlers',
    'dossierLifecycleActions',
    'dossierMetaWorkflow',
    'parentDossierPersistence',
    'dossierFollowupHandlers',
    'debtorEmploymentHandler',
    'stayHandlers',
    'partyDeathHandlers',
    'voluntaryPeriodHandlers',
    'employeeAssignmentHandlers',
    'publicationNoticeHandlers',
    'notesTasksHandlers',
    'appointmentHandler',
    'paymentHandlers',
    'notifyDebtorHandler',
    'heirsNotificationHandlers',
    'debtorSummonsCoerciveHandlers',
    'gracePeriodEndHandler',
    'evictionProceduresHandlers',
    'evictionHeirsMemoHandlers',
    'showResidentialEvictionGraceControl',
    'showResidentialGraceEarlyEndRequest',
    'residentialGraceAllowsFieldwork',
    'showBreakInventoryRequest',
    'evictionResidentialGraceHandlers',
    'policeAssistanceHandlers',
    'breakInventoryHandlers',
    'guarantorFollowupHandlers',
    'evictionFinancialHandlers',
    'moduleExpenseHandlers',
    'followupSeizureHandlers',
    'seizureAssetModalHandlers',
    'coerciveActionBridge',
    'coerciveActionHandlers',
    'seizureReleaseHandlers',
    'thirdPartyReceiveHandlers',
    'standaloneMarkHandlers',
    'salarySeizurePatch',
];

const hook = `// @ts-nocheck
/** Phase C Slice 22 — cluster handlers + persistence wiring (extracted from core) */
import { useMemo } from 'react';
import { useExecutionDashboardRealEstateSeizureModalHandlers } from './useExecutionDashboardRealEstateSeizureModalHandlers';
import { useExecutionDashboardThirdPartySeizureHandlers } from './useExecutionDashboardThirdPartySeizureHandlers';
import { useExecutionDashboardJudicialCustodianRemove } from './useExecutionDashboardJudicialCustodianRemove';
import { useExecutionDashboardPushTimelineEvent } from './useExecutionDashboardPushTimelineEvent';
import { useExecutionDashboardPropertyInlineSaveContext } from './useExecutionDashboardPropertyInlineSaveContext';
import { useExecutionDashboardDossierFollowupHandlers } from './useExecutionDashboardDossierFollowupHandlers';
import { useExecutionDashboardPublicationNoticeHandlers } from './useExecutionDashboardPublicationNoticeHandlers';
import { useExecutionDashboardPaymentHandlers } from './useExecutionDashboardPaymentHandlers';
import { useExecutionDashboardStayHandlers } from './useExecutionDashboardStayHandlers';
import { useExecutionDashboardPartyDeathHandlers } from './useExecutionDashboardPartyDeathHandlers';
import { useExecutionDashboardBreakInventoryHandlers } from './useExecutionDashboardBreakInventoryHandlers';
import { useExecutionDashboardEmployeeAssignmentHandlers } from './useExecutionDashboardEmployeeAssignmentHandlers';
import { useExecutionDashboardEvictionHeirsMemoHandlers } from './useExecutionDashboardEvictionHeirsMemoHandlers';
import { useExecutionDashboardParentDossierPersistence } from './useExecutionDashboardParentDossierPersistence';
import { useExecutionDashboardVoluntaryPeriodHandlers } from './useExecutionDashboardVoluntaryPeriodHandlers';
import { useExecutionDashboardNotifyDebtorHandler } from './useExecutionDashboardNotifyDebtorHandler';
import { useExecutionDashboardHeirsNotificationHandlers } from './useExecutionDashboardHeirsNotificationHandlers';
import { useExecutionDashboardDebtorSummonsCoerciveHandlers } from './useExecutionDashboardDebtorSummonsCoerciveHandlers';
import { useExecutionDashboardGracePeriodEndHandler } from './useExecutionDashboardGracePeriodEndHandler';
import { useExecutionDashboardEvictionResidentialGraceHandlers } from './useExecutionDashboardEvictionResidentialGraceHandlers';
import { useExecutionDashboardPoliceAssistanceHandlers } from './useExecutionDashboardPoliceAssistanceHandlers';
import { useExecutionDashboardGuarantorFollowupHandlers } from './useExecutionDashboardGuarantorFollowupHandlers';
import { useExecutionDashboardEvictionFinancialHandlers } from './useExecutionDashboardEvictionFinancialHandlers';
import { useExecutionDashboardModuleExpenseHandlers } from './useExecutionDashboardModuleExpenseHandlers';
import { useExecutionDashboardFollowupSeizureHandlers } from './useExecutionDashboardFollowupSeizureHandlers';
import { useExecutionDashboardSeizureAssetModalHandlers } from './useExecutionDashboardSeizureAssetModalHandlers';
import { useExecutionDashboardCoerciveActionBridge } from './useExecutionDashboardCoerciveActionBridge';
import { useExecutionDashboardCoerciveActionHandlers } from './useExecutionDashboardCoerciveActionHandlers';
import { useExecutionDashboardSeizureReleaseHandlers } from './useExecutionDashboardSeizureReleaseHandlers';
import { useExecutionDashboardThirdPartyReceiveHandlers } from './useExecutionDashboardThirdPartyReceiveHandlers';
import { useExecutionDashboardStandaloneMarkHandlers } from './useExecutionDashboardStandaloneMarkHandlers';
import { useExecutionDashboardSalarySeizurePatch } from './useExecutionDashboardSalarySeizurePatch';
import { useExecutionDashboardNotesTasksHandlers } from './useExecutionDashboardNotesTasksHandlers';
import { useExecutionDashboardAppointmentHandlers } from './useExecutionDashboardAppointmentHandlers';
import { useExecutionDashboardDebtorEmploymentHandlers } from './useExecutionDashboardDebtorEmploymentHandlers';
import { useExecutionDashboardSupabaseTimelineHydrate } from './useExecutionDashboardRuntimeSyncEffects';
import { useExecutionAICopilot } from '../useExecutionAICopilot';
import {
    useExecutionDossierLifecycleActionsOrchestrator,
} from '../../orchestrators';
import { useDossierMeta } from '../useDossierMeta';
import { useEvictionProcedures } from '../useEvictionProcedures';

export type ExecutionDashboardCoreHandlerClusterInput = Record<string, unknown>;

export function useExecutionDashboardCoreHandlerCluster(c: ExecutionDashboardCoreHandlerClusterInput) {
    const {
${ctxKeys.map((k) => `        ${k},`).join('\n')}
    } = c as any;

${body}

    return {
${returnKeys.map((k) => `        ${k},`).join('\n')}
    };
}
`;

fs.writeFileSync(outPath, hook, 'utf8');
console.log('extract-handler-cluster: wrote', outPath);
console.log('body lines', endIdx - startIdx, 'ctx keys', ctxKeys.length);

// Patch core
const ctxCall = `    const handlerCluster = useExecutionDashboardCoreHandlerCluster({\n${ctxKeys.map((k) => `        ${k},`).join('\n')}\n    });\n\n    const {\n${returnKeys.map((k) => `        ${k},`).join('\n')}\n    } = handlerCluster;\n\n`;

const newCore = lines.slice(0, startIdx).join('\n') + '\n' + ctxCall + lines.slice(endIdx).join('\n');

// Add import
let finalCore = newCore;
if (!finalCore.includes('useExecutionDashboardCoreHandlerCluster')) {
    finalCore = finalCore.replace(
        "import { buildExecutionDashboardCoreScopeRestBundles } from './executionDashboardCore/buildExecutionDashboardCoreScopeRestBundles';",
        `import { buildExecutionDashboardCoreScopeRestBundles } from './executionDashboardCore/buildExecutionDashboardCoreScopeRestBundles';
import { useExecutionDashboardCoreHandlerCluster } from './executionDashboardCore/useExecutionDashboardCoreHandlerCluster';`,
    );
}

fs.writeFileSync(corePath, finalCore, 'utf8');
console.log('patch core: OK, lines', finalCore.split('\n').length);
