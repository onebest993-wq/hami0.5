import fs from 'node:fs';
import path from 'node:path';

const root = 'src/app/components/lawyer/execution/personalCoercive/hooks';
const srcPath = path.join(root, 'usePersonalCoerciveActions.ts');
const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);
const body = (a, b) => lines.slice(a - 1, b).join('\n');

const actionsDir = path.join(root, 'actions');
fs.mkdirSync(actionsDir, { recursive: true });

const types = `// @ts-nocheck
import type { PersonalCoerciveFollowupPanelProps } from '../../types';
import type { PersonalCoercivePanelState } from '../usePersonalCoercivePanelState';
import type { PersonalCoerciveDecisions } from '../usePersonalCoerciveDecisions';
import type { PersonalCoerciveDerived } from '../usePersonalCoerciveDerived';

/** Flattened bag for personal-coercive action modules (props + priority hooks). */
export type PersonalCoerciveActionsCtx = PersonalCoerciveFollowupPanelProps &
    PersonalCoercivePanelState &
    PersonalCoerciveDecisions &
    PersonalCoerciveDerived;

export function buildPersonalCoerciveActionsCtx(
    props: PersonalCoerciveFollowupPanelProps,
    state: PersonalCoercivePanelState,
    decisions: PersonalCoerciveDecisions,
    derived: PersonalCoerciveDerived,
): PersonalCoerciveActionsCtx {
    return { ...props, ...state, ...decisions, ...derived };
}
`;

/** Shared flatten destructure — unused locals are fine under @ts-nocheck. */
const ctxDestructure = `    const {
        coerciveUiLocked,
        gracePeriodEndedFlag,
        forcedSummonAllowed,
        forcedSummonLockReason,
        executionData,
        debtorPresentEffective,
        debtRemainingIqd,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        showToast,
        onOpenDecisions,
        onOpenSummonsCenter,
        activeDebtorKey,
        primaryDebtorKey,
        isHistoricalMode,
        allDecisionRowsRef,
        appealSync,
        applyOptimisticPersistPatch,
        arrest,
        arrestStage,
        arrestSync,
        canActivateDossierAbsentiaPath,
        coerciveWriteLocked,
        confirmingKey,
        debtorNotified,
        debtorTimelineMeta,
        decisionsNavForSubtype,
        detentionJudgeEligibleDecisionId,
        detentionLaneEnded,
        dossierAbsentiaPathOpen,
        dossierCycleActive,
        dossierEffective,
        employeeDetentionRestricted,
        exId,
        exKey,
        executionDataEffective,
        findGoverningDossierDecisionId,
        findLatestDecisionIdForSubtype,
        forced,
        forcedAwaitingOutcome,
        forcedEffective,
        forcedFlowStep,
        forcedNeedsOutcomeUi,
        forcedOutcomeAbsconded,
        forcedSync,
        judgeDecisionIdStored,
        judgeRejectedResubmitVisible,
        judgeSync,
        outcome,
        queueEncryptedPayloadForDecision,
        relaxedPersonal,
        releaseConfirmBusy,
        renderWaiveInitialAppeal,
        scopedRequestTitle,
        sendingKey,
        setConfirmingKey,
        setDetentionRejectionOpen,
        setDetentionRejectionReason,
        setDossierInlineResolved,
        setForcedBringWithdrawBusy,
        setForcedBringWithdrawConfirmOpen,
        setForcedInlineResolved,
        setForcedOutcomePick,
        setJudgeDetailsOpen,
        setLocalDecisionsTick,
        setOptimisticForcedOutcome,
        setReleaseConfirmBusy,
        setReleaseConfirmOpen,
        setReleaseReason,
        setReleaseReasonOpen,
        setSendingKey,
        setTravelPanelOpen,
        travel,
        travelActive,
        travelBanEnforced,
        travelBanWithdrawn,
        wanted,
        warrantCustodyRecorded,
        investigationFlowStep,
        investigationSessionOpen,
        forcedBringWithdrawBusy,
        inAbsentia,
    } = ctx;
`;

function wrapHook(name, imports, bodyText, signatureExtra = '', afterDestructure = '') {
    return `// @ts-nocheck
${imports}

import type { PersonalCoerciveActionsCtx } from './types';

export function ${name}(ctx: PersonalCoerciveActionsCtx${signatureExtra}) {
${ctxDestructure}${afterDestructure}
${bodyText}
}
`;
}

// ---------- submit / request core ----------
const submitBody = [
    body(292, 399),
    body(401, 451),
    body(457, 667),
    body(902, 910),
    body(1412, 1446),
    `    return {
        handleExecutorInlineResolved,
        renderInlineGate,
        submitRequest,
        goBackToPersonalCoerciveHub,
        notifyDebtorFirstToast,
        guardSummonsGate,
    };`,
].join('\n\n');

const submitImports = `import React, { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { Send } from 'lucide-react';
import {
    appendPersonalCoerciveByExecutorOrder,
    appendPersonalCoerciveExecutorRequest,
    closePersonalCoerciveSubtypeDecisionCycle,
    DECISIONS_RELOAD_EVENT,
    dispatchDecisionsReload,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    buildDebtorTravelBanActivePatch,
    buildDebtorTravelBanCycleWithdrawnPatch,
    buildDebtorTravelBanWithdrawnPatch,
} from '@/app/utils/coerciveDebtorScope';
import { buildPersonalCoerciveExecutionMerge } from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import { appealSyncForRequestSubtype } from '../../utils/appealSyncMap';`;

fs.writeFileSync(path.join(actionsDir, 'types.ts'), types);
fs.writeFileSync(
    path.join(actionsDir, 'usePersonalCoerciveSubmitCore.ts'),
    wrapHook('usePersonalCoerciveSubmitCore', submitImports, submitBody),
);

// ---------- forced bring ----------
const forcedBody = [
    body(669, 736),
    body(1451, 1567),
    `    return {
        recordForcedOutcome,
        forcedButtonLabel,
        forcedActivationGateOpen,
        forcedShowStartStrip,
        forcedButtonDisabled,
        handleForcedBringHeaderClick,
        runForcedBringSubmit,
    };`,
].join('\n\n');

const forcedImports = `import React, { useCallback } from 'react';
import { closePersonalCoerciveSubtypeDecisionCycle } from '@/app/utils/executorSeizureDecisionQueue';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    buildForcedBringPersonalOutcomePatch,
    type ForcedBringPersonalOutcome,
} from '@/app/components/lawyer/execution/coerciveStackUtils';
import type { PersonalCoerciveSubmitCore } from './submitCoreTypes';`;

fs.writeFileSync(
    path.join(actionsDir, 'usePersonalCoerciveForcedBringActions.ts'),
    wrapHook(
        'usePersonalCoerciveForcedBringActions',
        forcedImports,
        forcedBody,
        ', core: Pick<PersonalCoerciveSubmitCore, \'submitRequest\' | \'guardSummonsGate\'>',
        '\n    const { submitRequest, guardSummonsGate } = core;\n',
    ),
);

// ---------- investigation ----------
const investigationBody = [
    body(453, 455),
    body(738, 900),
    body(1360, 1410),
    body(1670, 1682),
    body(1726, 1750),
    `    return {
        showInvestigationBlock,
        closeInvestigationAndForcedBringDecisionCycles,
        recordInvestigationDebtorAttended,
        markWarrantIssued,
        recordSecuredBringAfterWarrant,
        withdrawInvestigationCourtPath,
        runArrestInvestigationSubmit,
        investigationAwaitingManualSend,
        investigationButtonLabel,
        investigationButtonDisabled,
    };`,
].join('\n\n');

const investigationImports = `import React, { useCallback } from 'react';
import {
    closePersonalCoerciveSubtypeDecisionCycle,
    dispatchDecisionsReload,
} from '@/app/utils/executorSeizureDecisionQueue';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    buildInvestigationCourtWithdrawExecutionPatch,
    buildInvestigationDebtorAttendedPatch,
    buildInvestigationWarrantIssuedPatch,
    buildInvestigationSecuredBringPatch,
    shouldShowInvestigationCourtBlock,
} from '@/app/components/lawyer/execution/coerciveStackUtils';
import { syncPersonalCoerciveWithdrawn } from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import type { PersonalCoerciveSubmitCore } from './submitCoreTypes';`;

fs.writeFileSync(
    path.join(actionsDir, 'usePersonalCoerciveInvestigationActions.ts'),
    wrapHook(
        'usePersonalCoerciveInvestigationActions',
        investigationImports,
        investigationBody,
        ', core: Pick<PersonalCoerciveSubmitCore, \'submitRequest\'>',
        '\n    const { submitRequest } = core;\n',
    ),
);

// ---------- detention / judge ----------
const detentionBody = [
    body(913, 1220),
    body(1752, 1782),
    `    return {
        buildReleaseDetentionPatch,
        recordExecutiveDetentionJudgeOutcome,
        startDetentionFourMonths,
        handleApproveExecutiveDetention,
        confirmReleaseDetention,
        renderJudgeRejectedResubmitBlock,
    };`,
].join('\n\n');

const detentionImports = `import React, { useCallback } from 'react';
import {
    appendExecutiveDetentionJudgeDecision,
    archiveExecutiveDetentionCycleDecisions,
    closePersonalCoerciveSubtypeDecisionCycle,
    dispatchDecisionsReload,
    resolveExecutorDecisionRowContext,
} from '@/app/utils/executorSeizureDecisionQueue';
import { formatDateToLocalYmd, getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    appendImplicitForcedBringBroughtPatch,
    buildExecutiveDetentionReleasePatch,
    buildExecutiveDetentionJudgeRejectedClosurePatch,
} from '@/app/components/lawyer/execution/coerciveStackUtils';
import { CoerciveSubsectionFold } from '../../chrome/CoerciveSubsectionFold';
import type { PersonalCoerciveSubmitCore } from './submitCoreTypes';`;

fs.writeFileSync(
    path.join(actionsDir, 'usePersonalCoerciveDetentionJudgeActions.ts'),
    wrapHook(
        'usePersonalCoerciveDetentionJudgeActions',
        detentionImports,
        detentionBody,
        ', core: Pick<PersonalCoerciveSubmitCore, \'goBackToPersonalCoerciveHub\'>',
        '\n    const { goBackToPersonalCoerciveHub } = core;\n',
    ),
);

// ---------- travel ban ----------
const travelBody = [
    body(1222, 1358),
    body(1448, 1449),
    body(1655, 1668),
    `    return {
        liftTravelBanEnforcement,
        withdrawTravelBanRequestCycle,
        canSubmitTravelBan,
        runTravelBanSubmit,
    };`,
].join('\n\n');

const travelImports = `import React, { useCallback } from 'react';
import { closePersonalCoerciveSubtypeDecisionCycle } from '@/app/utils/executorSeizureDecisionQueue';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    buildDebtorTravelBanActivePatch,
    buildDebtorTravelBanCycleWithdrawnPatch,
    buildDebtorTravelBanWithdrawnPatch,
} from '@/app/utils/coerciveDebtorScope';
import { syncPersonalCoerciveWithdrawn } from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import type { PersonalCoerciveSubmitCore } from './submitCoreTypes';`;

fs.writeFileSync(
    path.join(actionsDir, 'usePersonalCoerciveTravelBanActions.ts'),
    wrapHook(
        'usePersonalCoerciveTravelBanActions',
        travelImports,
        travelBody,
        ', core: Pick<PersonalCoerciveSubmitCore, \'submitRequest\'>',
        '\n    const { submitRequest } = core;\n',
    ),
);

// ---------- dossier presentation ----------
const dossierBody = [
    body(1569, 1653),
    body(1684, 1724),
    `    return {
        dossierCanResubmitToExecutor,
        canSubmitExecutiveDetention,
        activateDossierAbsentiaPath,
        dossierSubmitBlockedReason,
        handleDossierHeaderClick,
        runDossierPresentationSubmit,
    };`,
].join('\n\n');

const dossierImports = `import React, { useCallback, useMemo } from 'react';
import type { PersonalCoerciveSubmitCore } from './submitCoreTypes';`;

fs.writeFileSync(
    path.join(actionsDir, 'usePersonalCoerciveDossierPresentationActions.ts'),
    wrapHook(
        'usePersonalCoerciveDossierPresentationActions',
        dossierImports,
        dossierBody,
        ', core: Pick<PersonalCoerciveSubmitCore, \'submitRequest\' | \'guardSummonsGate\'>',
        '\n    const { submitRequest, guardSummonsGate } = core;\n',
    ),
);

// submitCoreTypes — avoid circular import for Pick<>
const submitCoreTypes = `// @ts-nocheck
import type { usePersonalCoerciveSubmitCore } from './usePersonalCoerciveSubmitCore';

export type PersonalCoerciveSubmitCore = ReturnType<typeof usePersonalCoerciveSubmitCore>;
`;
fs.writeFileSync(path.join(actionsDir, 'submitCoreTypes.ts'), submitCoreTypes);

const index = `export { buildPersonalCoerciveActionsCtx } from './types';
export type { PersonalCoerciveActionsCtx } from './types';
export type { PersonalCoerciveSubmitCore } from './submitCoreTypes';
export { usePersonalCoerciveSubmitCore } from './usePersonalCoerciveSubmitCore';
export { usePersonalCoerciveForcedBringActions } from './usePersonalCoerciveForcedBringActions';
export { usePersonalCoerciveInvestigationActions } from './usePersonalCoerciveInvestigationActions';
export { usePersonalCoerciveDetentionJudgeActions } from './usePersonalCoerciveDetentionJudgeActions';
export { usePersonalCoerciveTravelBanActions } from './usePersonalCoerciveTravelBanActions';
export { usePersonalCoerciveDossierPresentationActions } from './usePersonalCoerciveDossierPresentationActions';
`;
fs.writeFileSync(path.join(actionsDir, 'index.ts'), index);

const composer = `// @ts-nocheck
import type { PersonalCoerciveFollowupPanelProps } from '../types';
import type { PersonalCoercivePanelState } from './usePersonalCoercivePanelState';
import type { PersonalCoerciveDecisions } from './usePersonalCoerciveDecisions';
import type { PersonalCoerciveDerived } from './usePersonalCoerciveDerived';
import {
    buildPersonalCoerciveActionsCtx,
    usePersonalCoerciveSubmitCore,
    usePersonalCoerciveForcedBringActions,
    usePersonalCoerciveInvestigationActions,
    usePersonalCoerciveDetentionJudgeActions,
    usePersonalCoerciveTravelBanActions,
    usePersonalCoerciveDossierPresentationActions,
} from './actions';

export type PersonalCoerciveActions = ReturnType<typeof usePersonalCoerciveActions>;

/** Thin composer — domain logic lives under hooks/actions/. */
export function usePersonalCoerciveActions(
    props: PersonalCoerciveFollowupPanelProps,
    state: PersonalCoercivePanelState,
    decisions: PersonalCoerciveDecisions,
    derived: PersonalCoerciveDerived,
) {
    const ctx = buildPersonalCoerciveActionsCtx(props, state, decisions, derived);
    const core = usePersonalCoerciveSubmitCore(ctx);
    const forcedBring = usePersonalCoerciveForcedBringActions(ctx, core);
    const investigation = usePersonalCoerciveInvestigationActions(ctx, core);
    const detentionJudge = usePersonalCoerciveDetentionJudgeActions(ctx, core);
    const travelBan = usePersonalCoerciveTravelBanActions(ctx, core);
    const dossierPresentation = usePersonalCoerciveDossierPresentationActions(ctx, core);

    return {
        ...core,
        ...forcedBring,
        ...investigation,
        ...detentionJudge,
        ...travelBan,
        ...dossierPresentation,
    };
}
`;
fs.writeFileSync(path.join(root, 'usePersonalCoerciveActions.ts'), composer);

console.log('Wrote actions split:');
for (const name of fs.readdirSync(actionsDir).sort()) {
    const p = path.join(actionsDir, name);
    const n = fs.readFileSync(p, 'utf8').split(/\r?\n/).length;
    console.log(`  actions/${name}: ${n}`);
}
console.log(
    '  usePersonalCoerciveActions.ts:',
    fs.readFileSync(path.join(root, 'usePersonalCoerciveActions.ts'), 'utf8').split(/\r?\n/).length,
);
