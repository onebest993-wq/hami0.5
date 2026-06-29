import fs from 'fs';
import path from 'path';

const root = process.cwd();
const clusterPath = path.join(
    root,
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardCoreHandlerCluster.ts',
);
const coreDir = path.dirname(clusterPath);

const src = fs.readFileSync(clusterPath, 'utf8');
const lines = src.split('\n');

function slice(start1, end1) {
    return lines.slice(start1 - 1, end1).join('\n');
}

const destructureStart = lines.findIndex((l) => l.trim() === 'const {') + 1;
const destructureEnd = lines.findIndex((l) => l.trim() === '} = c as any;');
const destructureKeys = lines
    .slice(destructureStart, destructureEnd)
    .map((l) => l.trim().replace(/,$/, '').split(':')[0].trim())
    .filter(Boolean);

function keysUsedIn(body) {
    const used = new Set();
    for (const key of destructureKeys) {
        const re = new RegExp(`(?<![a-zA-Z0-9_.])${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-zA-Z0-9_])`);
        if (re.test(body)) used.add(key);
    }
    if (/\bDebtor\b/.test(body)) used.add('debtors');
    return [...used].sort();
}

function buildDestructure(usedKeys) {
    if (!usedKeys.length) return '    const {} = c as any;';
    const inner = usedKeys.map((k) => `        ${k},`).join('\n');
    return `    const {\n${inner}\n    } = c as any;`;
}

const sections = {
    dossier: { start: 430, end: 549, file: 'useExecutionDashboardCoreHandlerClusterDossier.ts', fn: 'useExecutionDashboardCoreHandlerClusterDossier' },
    party: { start: 553, end: 982, file: 'useExecutionDashboardCoreHandlerClusterPartyLifecycle.ts', fn: 'useExecutionDashboardCoreHandlerClusterPartyLifecycle' },
    eviction: { start: 996, end: 1317, file: 'useExecutionDashboardCoreHandlerClusterEviction.ts', fn: 'useExecutionDashboardCoreHandlerClusterEviction' },
    seizureFollowup: { start: 1319, end: 1429, file: 'useExecutionDashboardCoreHandlerClusterSeizureFollowup.ts', fn: 'useExecutionDashboardCoreHandlerClusterSeizureFollowup' },
};

const importBlocks = {
    dossier: `import { useMemo } from 'react';
import { useExecutionDashboardDossierFollowupHandlers } from './useExecutionDashboardDossierFollowupHandlers';
import { useExecutionDashboardParentDossierPersistence } from './useExecutionDashboardParentDossierPersistence';
import { useExecutionDossierLifecycleActionsOrchestrator } from '../../orchestrators';
import { useDossierMeta } from '../useDossierMeta';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export type HandlerClusterPushTimelineDeps = {
    pushTimelineEvent: (...args: unknown[]) => unknown;
};

export function useExecutionDashboardCoreHandlerClusterDossier(
    c: ExecutionDashboardCoreHandlerClusterInput,
    deps: HandlerClusterPushTimelineDeps,
) {
    const { pushTimelineEvent } = deps;
`,
    party: `import { useMemo, useCallback, useLayoutEffect } from 'react';
import { useExecutionDashboardDebtorEmploymentHandlers } from './useExecutionDashboardDebtorEmploymentHandlers';
import { useExecutionDashboardPersonalCoerciveDecisionSync } from './useExecutionDashboardPersonalCoerciveDecisionSync';
import { useExecutionDashboardEmployeeInvestigationSync } from './useExecutionDashboardEmployeeInvestigationSync';
import { useExecutionDashboardExecutiveDetentionLifecycle } from './useExecutionDashboardExecutiveDetentionLifecycle';
import { useExecutionDashboardStayHandlers } from './useExecutionDashboardStayHandlers';
import { useExecutionDashboardPartyDeathHandlers } from './useExecutionDashboardPartyDeathHandlers';
import { useExecutionDashboardVoluntaryPeriodHandlers } from './useExecutionDashboardVoluntaryPeriodHandlers';
import { useExecutionDashboardEmployeeAssignmentHandlers } from './useExecutionDashboardEmployeeAssignmentHandlers';
import { useExecutionDashboardPublicationNoticeHandlers } from './useExecutionDashboardPublicationNoticeHandlers';
import { useExecutionDashboardNotesTasksHandlers } from './useExecutionDashboardNotesTasksHandlers';
import { useExecutionDashboardAppointmentHandlers } from './useExecutionDashboardAppointmentHandlers';
import { useExecutionDashboardPaymentHandlers } from './useExecutionDashboardPaymentHandlers';
import { useExecutionDashboardNotifyDebtorHandler } from './useExecutionDashboardNotifyDebtorHandler';
import { useExecutionDashboardHeirsNotificationHandlers } from './useExecutionDashboardHeirsNotificationHandlers';
import { useExecutionDashboardDebtorSummonsCoerciveHandlers } from './useExecutionDashboardDebtorSummonsCoerciveHandlers';
import { useExecutionDashboardDecisionsHeirsModalExclusivity } from './useExecutionDashboardRuntimeSyncEffects';
import { useExecutionDashboardHeirsInvestigationSync } from './useExecutionDashboardDecisionAndEventSync';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import type { HandlerClusterPushTimelineDeps } from './useExecutionDashboardCoreHandlerClusterDossier';

export function useExecutionDashboardCoreHandlerClusterPartyLifecycle(
    c: ExecutionDashboardCoreHandlerClusterInput,
    deps: HandlerClusterPushTimelineDeps,
) {
    const { pushTimelineEvent } = deps;
`,
    eviction: `import { useMemo, useCallback } from 'react';
import { useExecutionDashboardGracePeriodEndHandler } from './useExecutionDashboardGracePeriodEndHandler';
import { useExecutionDashboardEvictionHeirsMemoHandlers } from './useExecutionDashboardEvictionHeirsMemoHandlers';
import { useExecutionDashboardEvictionResidentialGraceHandlers } from './useExecutionDashboardEvictionResidentialGraceHandlers';
import { useExecutionDashboardPoliceAssistanceHandlers } from './useExecutionDashboardPoliceAssistanceHandlers';
import { useExecutionDashboardBreakInventoryHandlers } from './useExecutionDashboardBreakInventoryHandlers';
import { useExecutionDashboardGuarantorFollowupHandlers } from './useExecutionDashboardGuarantorFollowupHandlers';
import { useExecutionDashboardEvictionFinancialHandlers } from './useExecutionDashboardEvictionFinancialHandlers';
import { useExecutionDashboardModuleExpenseHandlers } from './useExecutionDashboardModuleExpenseHandlers';
import { useEvictionLawyerFeeOutcome } from '../useEvictionLawyerFeeOutcome';
import { useEvictionProcedures } from '../useEvictionProcedures';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import type { HandlerClusterPushTimelineDeps } from './useExecutionDashboardCoreHandlerClusterDossier';

export function useExecutionDashboardCoreHandlerClusterEviction(
    c: ExecutionDashboardCoreHandlerClusterInput,
    deps: HandlerClusterPushTimelineDeps,
) {
    const { pushTimelineEvent } = deps;
`,
    seizureFollowup: `import { useExecutionDashboardFollowupSeizureHandlers } from './useExecutionDashboardFollowupSeizureHandlers';
import { useExecutionDashboardSeizureAssetModalHandlers } from './useExecutionDashboardSeizureAssetModalHandlers';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
import type { HandlerClusterPushTimelineDeps } from './useExecutionDashboardCoreHandlerClusterDossier';

export function useExecutionDashboardCoreHandlerClusterSeizureFollowup(
    c: ExecutionDashboardCoreHandlerClusterInput,
    deps: HandlerClusterPushTimelineDeps,
) {
    const { pushTimelineEvent } = deps;
`,
};

const returnBlocks = {
    dossier: `    return {
        dossierLifecycleActions,
        dossierMetaWorkflow,
        parentDossierPersistence,
        dossierFollowupHandlers,
        debtorsForPartyPatch,
    };
}`,
    party: `    return {
        debtorEmploymentHandler,
        stayHandlers,
        partyDeathHandlers,
        voluntaryPeriodHandlers,
        employeeAssignmentHandlers,
        publicationNoticeHandlers,
        notesTasksHandlers,
        appointmentHandler,
        paymentHandlers,
        notifyDebtorHandler,
        heirsNotificationHandlers,
        debtorSummonsCoerciveHandlers,
    };
}`,
    eviction: `    return {
        gracePeriodEndHandler,
        evictionProceduresHandlers,
        evictionHeirsMemoHandlers,
        showResidentialEvictionGraceControl,
        showResidentialGraceEarlyEndRequest,
        residentialGraceAllowsFieldwork,
        showBreakInventoryRequest,
        evictionResidentialGraceHandlers,
        policeAssistanceHandlers,
        breakInventoryHandlers,
        guarantorFollowupHandlers,
        evictionFinancialHandlers,
        moduleExpenseHandlers,
    };
}`,
    seizureFollowup: `    return {
        followupSeizureHandlers,
        seizureAssetModalHandlers,
        focusSeizurePropertyInlineCompletion,
        focusSeizureMovableInlineCompletion,
        focusSeizureThirdPartyInlineCompletion,
        focusSeizureNoticeInlineCompletion,
    };
}`,
};

for (const [key, cfg] of Object.entries(sections)) {
    const body = slice(cfg.start, cfg.end);
    const used = keysUsedIn(body);
    const destructure = buildDestructure(used);
    const header = `// @ts-nocheck
/** Phase B — handler cluster ${key} */
${importBlocks[key]}
${destructure}

`;
    const out = `${header}${body}\n${returnBlocks[key]}\n`;
    fs.writeFileSync(path.join(coreDir, cfg.file), out, 'utf8');
    console.log(cfg.file, 'keys', used.length, 'body', body.split('\n').length);
}

const fnStart = lines.findIndex((l) => l.includes('export function useExecutionDashboardCoreHandlerCluster'));
const foundationLine = lines.findIndex((l) => l.includes('useExecutionDashboardCoreHandlerClusterFoundation(c)'));
const beforeDestructure = lines.slice(fnStart, fnStart + 2).join('\n');
const afterFoundation = lines.slice(foundationLine + 9, 429).join('\n'); // through pushTimelineEvent destructure end
const tailFromSeizureCoercive = lines.slice(lines.findIndex((l) => l.includes('const seizureCoercive ='))).join('\n');

const orchestration = `
    const dossierBlock = useExecutionDashboardCoreHandlerClusterDossier(c, { pushTimelineEvent });
    const {
        dossierLifecycleActions,
        dossierMetaWorkflow,
        parentDossierPersistence,
        dossierFollowupHandlers,
    } = dossierBlock;

    const partyBlock = useExecutionDashboardCoreHandlerClusterPartyLifecycle(c, { pushTimelineEvent });
    const {
        debtorEmploymentHandler,
        stayHandlers,
        partyDeathHandlers,
        voluntaryPeriodHandlers,
        employeeAssignmentHandlers,
        publicationNoticeHandlers,
        notesTasksHandlers,
        appointmentHandler,
        paymentHandlers,
        notifyDebtorHandler,
        heirsNotificationHandlers,
        debtorSummonsCoerciveHandlers,
    } = partyBlock;

    const evictionBlock = useExecutionDashboardCoreHandlerClusterEviction(c, { pushTimelineEvent });
    const {
        gracePeriodEndHandler,
        evictionProceduresHandlers,
        evictionHeirsMemoHandlers,
        showResidentialEvictionGraceControl,
        showResidentialGraceEarlyEndRequest,
        residentialGraceAllowsFieldwork,
        showBreakInventoryRequest,
        evictionResidentialGraceHandlers,
        policeAssistanceHandlers,
        breakInventoryHandlers,
        guarantorFollowupHandlers,
        evictionFinancialHandlers,
        moduleExpenseHandlers,
    } = evictionBlock;

    const seizureFollowupBlock = useExecutionDashboardCoreHandlerClusterSeizureFollowup(c, { pushTimelineEvent });
    const {
        followupSeizureHandlers,
        seizureAssetModalHandlers,
        focusSeizurePropertyInlineCompletion,
        focusSeizureMovableInlineCompletion,
        focusSeizureThirdPartyInlineCompletion,
        focusSeizureNoticeInlineCompletion,
    } = seizureFollowupBlock;

`;

const newMain = `// @ts-nocheck
/** Phase C Slice 22 — cluster handlers + persistence wiring (extracted from core) */
import { useExecutionDashboardCoreHandlerClusterFoundation } from './useExecutionDashboardCoreHandlerClusterFoundation';
import { useExecutionDashboardCoreHandlerClusterSeizureCoercive } from './useExecutionDashboardCoreHandlerClusterSeizureCoercive';
import { useExecutionDashboardCoreHandlerClusterDossier } from './useExecutionDashboardCoreHandlerClusterDossier';
import { useExecutionDashboardCoreHandlerClusterPartyLifecycle } from './useExecutionDashboardCoreHandlerClusterPartyLifecycle';
import { useExecutionDashboardCoreHandlerClusterEviction } from './useExecutionDashboardCoreHandlerClusterEviction';
import { useExecutionDashboardCoreHandlerClusterSeizureFollowup } from './useExecutionDashboardCoreHandlerClusterSeizureFollowup';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
export type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerCluster(c: ExecutionDashboardCoreHandlerClusterInput) {
    const foundation = useExecutionDashboardCoreHandlerClusterFoundation(c);
    const {
        executionCopilotDecisions,
        firstActiveAppealDecisionId,
        removeJudicialCustodianEntry,
        pushTimelineEventBinding,
        pushTimelineEvent,
        propertyInlineSaveCtx,
        realEstateSeizureHandlers,
        thirdPartySeizureHandlers,
    } = foundation;
${orchestration}${tailFromSeizureCoercive}
`;

fs.writeFileSync(clusterPath, newMain, 'utf8');
console.log('main cluster lines', newMain.split('\n').length);
