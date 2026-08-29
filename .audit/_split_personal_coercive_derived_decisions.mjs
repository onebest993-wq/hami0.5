import fs from 'node:fs';
import path from 'node:path';

const root = 'src/app/components/lawyer/execution/personalCoercive/hooks';
const derivedPath = path.join(root, 'usePersonalCoerciveDerived.ts');
const decisionsPath = path.join(root, 'usePersonalCoerciveDecisions.ts');

const derivedLines = fs.readFileSync(derivedPath, 'utf8').split(/\r?\n/);
const decisionsLines = fs.readFileSync(decisionsPath, 'utf8').split(/\r?\n/);
const slice = (lines, a, b) => lines.slice(a - 1, b).join('\n');

const derivedDir = path.join(root, 'derived');
const decisionsDir = path.join(root, 'decisions');
fs.mkdirSync(derivedDir, { recursive: true });
fs.mkdirSync(decisionsDir, { recursive: true });

// ─── DERIVED ───────────────────────────────────────────────────────────────
const derivedTypes = `// @ts-nocheck
import type { PersonalCoerciveFollowupPanelProps } from '../../types';
import type { PersonalCoercivePanelState } from '../usePersonalCoercivePanelState';
import type { PersonalCoerciveDecisions } from '../usePersonalCoerciveDecisions';

/** Flattened bag for personal-coercive derived modules (props + state + decisions). */
export type PersonalCoerciveDerivedCtx = PersonalCoerciveFollowupPanelProps &
    PersonalCoercivePanelState &
    PersonalCoerciveDecisions;

export function buildPersonalCoerciveDerivedCtx(
    props: PersonalCoerciveFollowupPanelProps,
    state: PersonalCoercivePanelState,
    decisions: PersonalCoerciveDecisions,
): PersonalCoerciveDerivedCtx {
    return { ...props, ...state, ...decisions };
}
`;

const derivedCtxDestructure = `    const {
        coerciveUiLocked,
        gracePeriodEndedFlag,
        executionData,
        debtorPresentEffective,
        debtRemainingIqd,
        persistExecutionMerge,
        activeDebtorKey,
        primaryDebtorKey,
        isHistoricalMode,
        hideDossierJudgePresentation,
        hideExecutiveDetentionJudgeCard,
        decisionsReloadEpoch,
        allDecisionRows,
        applyOptimisticPersistPatch,
        arrest,
        arrestSync,
        coerciveWriteLocked,
        debtorNotified,
        detentionLaneEnded,
        detentionPeriodNaturalEnd,
        detentionReleasedAt,
        dossier,
        dossierEffective,
        dossierInlineResolved,
        dossierPhaseEffective,
        dossierSync,
        employeeDetentionRestricted,
        exId,
        executionDataEffective,
        findGoverningDossierDecisionId,
        findLatestDecisionIdForSubtype,
        findLatestDecisionRowForSubtype,
        forced,
        forcedEffective,
        forcedInlineResolved,
        forcedSync,
        fullPersonalCoerciveCycleClosed,
        hasOpenCardForSubtype,
        judgeDetailsOpen,
        judgeSync,
        localDecisionsTick,
        optionalRemainingProceduresOpen,
        relaxedPersonal,
        sendingKey,
        setDossierInlineResolved,
        setForcedInlineResolved,
        setJudgeDetailsOpen,
        setLocalDecisionsTick,
        showEmbeddedSection,
        travel,
        travelSync,
    } = ctx;
`;

function wrapDerivedHook(name, imports, bodyText, signatureExtra = '', afterDestructure = '') {
    return `// @ts-nocheck
${imports}

import type { PersonalCoerciveDerivedCtx } from './types';

export function ${name}(ctx: PersonalCoerciveDerivedCtx${signatureExtra}) {
${derivedCtxDestructure}${afterDestructure}
${bodyText}
}
`;
}

// Band 1: lane flags + sync effects (lines 216–420)
const laneCoreBody = [
    slice(derivedLines, 216, 420),
    `    return {
        outcome,
        forcedOutcomeAbsconded,
        forcedOutcomeRecorded,
        showForcedBringInSection,
        forcedBringCycleResolved,
        forcedNeedsOutcomeUi,
        arrestStage,
        travelBanWithdrawn,
        travelBanRequestCycleWithdrawn,
        travelCycleActive,
        travelLaneSettled,
        judgeDetentionStored,
        detentionJudgeEligibleDecisionId,
        dossierGoverningRow,
        dossierCycleActive,
        judgeDetention,
        travelBanEnforced,
        travelLiftReady,
        travelShowLiftAction,
        travelShowInitialSubmit,
        travelActive,
        wanted,
        detentionActive,
        detentionUntil,
        detentionInAbsentia,
        inAbsentia,
        dossierAbsentiaPathOpen,
        canActivateDossierAbsentiaPath,
        executionPatchDiffers,
    };`,
].join('\n\n');

const laneCoreImports = `import React, { useMemo, useCallback, useEffect } from 'react';
import {
    archiveExecutiveDetentionCycleDecisions,
    closePersonalCoerciveSubtypeDecisionCycle,
    dispatchDecisionsReload,
    getGoverningDossierPresentationRowFromDecisions,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    isDebtorTravelBanActive,
    isDebtorTravelBanCycleWithdrawn,
    isDebtorTravelBanWithdrawn,
} from '@/app/utils/coerciveDebtorScope';
import {
    isExecutiveDetentionPeriodActive,
    isForcedBringCycleResolved,
    buildExecutiveDetentionReleasePatch,
    resolveExecutiveDetentionJudgeUiOutcome,
    resolveForcedBringNeedsOutcomeUi,
} from '@/app/components/lawyer/execution/coerciveStackUtils';
import { buildPersonalCoerciveAppealExecutionSyncPatch } from '@/app/utils/personalCoerciveAppealSync';`;

fs.writeFileSync(path.join(derivedDir, 'types.ts'), derivedTypes);
fs.writeFileSync(
    path.join(derivedDir, 'usePersonalCoerciveDerivedLaneCore.ts'),
    wrapDerivedHook('usePersonalCoerciveDerivedLaneCore', laneCoreImports, laneCoreBody),
);

// Band 2: investigation + forced flow + helpers + travel UI (422–603)
// Fix canSubmitTravelBan: local mirror of actions formula (was undeclared after hooks split).
const flowTravelRaw = slice(derivedLines, 422, 603);
const flowTravelFixed = flowTravelRaw.replace(
    /const travelSubmitButtonDisabled =\s*isHistoricalMode \|\| coerciveUiLocked \|\| travel\.alternative \|\| !canSubmitTravelBan;/,
    `const canSubmitTravelBanLocal =
        !coerciveUiLocked && !travelActive && !travel.pending && !travel.alternative;
    const travelSubmitButtonDisabled =
        isHistoricalMode || coerciveUiLocked || travel.alternative || !canSubmitTravelBanLocal;`,
);

const flowTravelBody = [
    flowTravelFixed,
    `    return {
        warrantCustodyRecorded,
        investigationSessionOpen,
        investigationPostApprovalActive,
        derivedInvestigationInnerStep,
        forcedGoverningRow,
        forcedByExecutorOrder,
        forcedAwaitingOutcome,
        forcedHasExpandablePanel,
        forcedFlowStep,
        investigationCompletionActive,
        investigationHasExpandablePanel,
        investigationFlowStep,
        queueEncryptedPayloadForDecision,
        scopedRequestTitle,
        travelButtonLabel,
        travelSubmitButtonDisabled,
        travelRejectedAppealOpen,
        travelAppealFollowupVisible,
        travelEnforcedSettled,
        showTravelBanSection,
    };`,
].join('\n\n');

const flowTravelImports = `import React, { useMemo, useCallback, useEffect } from 'react';
import { patchExecutorDecisionRow } from '@/app/utils/executorSeizureDecisionQueue';
import { resolveDebtorDisplayNameForKey } from '@/app/utils/coerciveDebtorScope';
import { CryptoService } from '@/app/services/CryptoService';
import { isExecutorRejectedAppealFollowupDismissed } from '@/app/utils/personalCoerciveAppealSync';
import type { usePersonalCoerciveDerivedLaneCore } from './usePersonalCoerciveDerivedLaneCore';`;

const laneCorePick = `Pick<
    ReturnType<typeof usePersonalCoerciveDerivedLaneCore>,
    | 'outcome'
    | 'forcedOutcomeAbsconded'
    | 'forcedOutcomeRecorded'
    | 'forcedBringCycleResolved'
    | 'forcedNeedsOutcomeUi'
    | 'arrestStage'
    | 'wanted'
    | 'travelBanEnforced'
    | 'travelBanWithdrawn'
    | 'travelBanRequestCycleWithdrawn'
    | 'travelCycleActive'
    | 'travelLaneSettled'
    | 'travelLiftReady'
    | 'travelShowLiftAction'
    | 'travelActive'
>`;

fs.writeFileSync(
    path.join(derivedDir, 'usePersonalCoerciveDerivedFlowTravel.ts'),
    wrapDerivedHook(
        'usePersonalCoerciveDerivedFlowTravel',
        flowTravelImports,
        flowTravelBody,
        `, lane: ${laneCorePick}`,
        `\n    const {
        outcome,
        forcedNeedsOutcomeUi,
        arrestStage,
        wanted,
        travelBanEnforced,
        travelBanWithdrawn,
        travelBanRequestCycleWithdrawn,
        travelCycleActive,
        travelLaneSettled,
        travelLiftReady,
        travelShowLiftAction,
        travelActive,
    } = lane;\n`,
    ),
);

// Band 3: dossier / judge (605–845)
const dossierJudgeBody = [
    slice(derivedLines, 605, 845),
    `    return {
        dossierLaneAnchored,
        dossierExecutorPhaseComplete,
        optionalRemainingProceduresUnlocked,
        showOptionalRemainingProceduresEntry,
        showTravelBanInMainFlow,
        dossierPresentationGloballyAllowed,
        dossierAwaitingJudge,
        dossierIdle,
        judgeDecisionIdStored,
        dossierShowStartPeriod,
        dossierRequestPhaseActive,
        showDossierPresentationCard,
        dossierHasExpandablePanel,
        dossierButtonDisabled,
        judgeRejectedResubmitVisible,
        judgeCassationOverturnVisible,
        dossierHandedToJudgeStalled,
        dossierJudgeLaneReady,
        judgeApprovedAwaitingDetentionStart,
        detentionPeriodActivePanel,
        judgeHasActionablePanel,
        executiveDetentionJudgeCardAllowed,
        showJudgeDetentionCard,
        dossierPhaseSyncRef,
    };`,
].join('\n\n');

const dossierJudgeImports = `import React, { useEffect } from 'react';
import { closePersonalCoerciveSubtypeDecisionCycle } from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRejectedAppealFollowupDismissed } from '@/app/utils/personalCoerciveAppealSync';
import type { usePersonalCoerciveDerivedLaneCore } from './usePersonalCoerciveDerivedLaneCore';`;

const laneForDossierPick = `Pick<
    ReturnType<typeof usePersonalCoerciveDerivedLaneCore>,
    | 'detentionJudgeEligibleDecisionId'
    | 'judgeDetentionStored'
    | 'judgeDetention'
    | 'detentionActive'
    | 'dossierCycleActive'
    | 'travelBanEnforced'
    | 'travelCycleActive'
    | 'executionPatchDiffers'
>`;

fs.writeFileSync(
    path.join(derivedDir, 'usePersonalCoerciveDossierJudgeDerived.ts'),
    wrapDerivedHook(
        'usePersonalCoerciveDossierJudgeDerived',
        dossierJudgeImports,
        dossierJudgeBody,
        `, lane: ${laneForDossierPick}, showTravelBanSection: boolean`,
        `\n    const {
        detentionJudgeEligibleDecisionId,
        judgeDetentionStored,
        judgeDetention,
        detentionActive,
        dossierCycleActive,
        travelBanEnforced,
        travelCycleActive,
        executionPatchDiffers,
    } = lane;\n`,
    ),
);

const derivedIndex = `export { buildPersonalCoerciveDerivedCtx } from './types';
export type { PersonalCoerciveDerivedCtx } from './types';
export { usePersonalCoerciveDerivedLaneCore } from './usePersonalCoerciveDerivedLaneCore';
export { usePersonalCoerciveDerivedFlowTravel } from './usePersonalCoerciveDerivedFlowTravel';
export { usePersonalCoerciveDossierJudgeDerived } from './usePersonalCoerciveDossierJudgeDerived';
`;
fs.writeFileSync(path.join(derivedDir, 'index.ts'), derivedIndex);

const derivedComposer = `// @ts-nocheck
import type { PersonalCoerciveFollowupPanelProps } from '../types';
import type { PersonalCoercivePanelState } from './usePersonalCoercivePanelState';
import type { PersonalCoerciveDecisions } from './usePersonalCoerciveDecisions';
import {
    buildPersonalCoerciveDerivedCtx,
    usePersonalCoerciveDerivedLaneCore,
    usePersonalCoerciveDerivedFlowTravel,
    usePersonalCoerciveDossierJudgeDerived,
} from './derived';

export type PersonalCoerciveDerived = ReturnType<typeof usePersonalCoerciveDerived>;

/** Thin composer — domain logic lives under hooks/derived/. */
export function usePersonalCoerciveDerived(
    props: PersonalCoerciveFollowupPanelProps,
    state: PersonalCoercivePanelState,
    decisions: PersonalCoerciveDecisions,
) {
    const ctx = buildPersonalCoerciveDerivedCtx(props, state, decisions);
    const lane = usePersonalCoerciveDerivedLaneCore(ctx);
    const flowTravel = usePersonalCoerciveDerivedFlowTravel(ctx, lane);
    const dossierJudge = usePersonalCoerciveDossierJudgeDerived(
        ctx,
        lane,
        flowTravel.showTravelBanSection,
    );

    return {
        ...lane,
        ...flowTravel,
        ...dossierJudge,
    };
}
`;
fs.writeFileSync(derivedPath, derivedComposer);

// ─── DECISIONS ─────────────────────────────────────────────────────────────
const decisionsTypes = `// @ts-nocheck
import type { PersonalCoerciveFollowupPanelProps } from '../../types';
import type { PersonalCoercivePanelState } from '../usePersonalCoercivePanelState';

/** Flattened bag for personal-coercive decision modules (props + panel state). */
export type PersonalCoerciveDecisionsCtx = PersonalCoerciveFollowupPanelProps &
    PersonalCoercivePanelState;

export function buildPersonalCoerciveDecisionsCtx(
    props: PersonalCoerciveFollowupPanelProps,
    state: PersonalCoercivePanelState,
): PersonalCoerciveDecisionsCtx {
    return { ...props, ...state };
}
`;

const decisionsCtxDestructure = `    const {
        executionId,
        decisionsReloadEpoch,
        coerciveUiLocked,
        executionData,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        showToast,
        onOpenDecisions,
        activeDebtorKey,
        primaryDebtorKey,
        isHistoricalMode,
        dossierInlineResolved,
        forcedInlineResolved,
        localDecisionsTick,
        optimisticForcedOutcome,
        optimisticPersistPatch,
        setLocalDecisionsTick,
        setOptimisticForcedOutcome,
        setOptimisticPersistPatch,
    } = ctx;
`;

function wrapDecisionsHook(name, imports, bodyText, signatureExtra = '', afterDestructure = '') {
    return `// @ts-nocheck
${imports}

import type { PersonalCoerciveDecisionsCtx } from './types';

export function ${name}(ctx: PersonalCoerciveDecisionsCtx${signatureExtra}) {
${decisionsCtxDestructure}${afterDestructure}
${bodyText}
}
`;
}

// Band 1: rows + optimistic + subtype states through appealSync (170–355)
// Fix detentionJudgeEligibleDecisionId reference inside finders band instead.
const rowsStatesBody = [
    slice(decisionsLines, 170, 355),
    `    return {
        exId,
        exKey,
        allDecisionRows,
        allDecisionRowsRef,
        applyOptimisticPersistPatch,
        executionDataEffective,
        debtorScopeOpts,
        decisionsNavForSubtype,
        hasOpenCardForSubtype,
        debtorNotified,
        debtorTimelineMeta,
        coerciveDecisionStates,
        coerciveWriteLocked,
        forced,
        forcedEffective,
        arrest,
        travel,
        dossier,
        dossierPhase,
        dossierEffective,
        dossierPhaseEffective,
        fullPersonalCoerciveCycleClosed,
        detentionReleasedAt,
        detentionPeriodNaturalEnd,
        detentionLaneEnded,
        guarantorDec,
        guarantorAwaitingSave,
        appealSync,
        forcedSync,
        travelSync,
        arrestSync,
        dossierSync,
        judgeSync,
    };`,
].join('\n\n');

const rowsStatesImports = `import React, { useMemo, useCallback, useEffect } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { guarantorFollowupAwaitingDetailsSave } from '@/app/types/execution';
import {
    appendPersonalCoerciveExecutorRequest,
    hasActivePersonalCoerciveSubtypeCardFromDecisions,
    resolvePersonalCoerciveDecisionsNavFromDecisions,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    getGoverningDossierPresentationRowFromDecisions,
    isGuarantorRequestDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    readExecutorDecisionsUnionAcrossCandidateIds,
    warmExecutorDecisionsStorage,
} from '@/app/utils/executionDecisionsNamespace';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';
import { isDebtorNotifiedForCoerciveActions } from '@/app/utils/noticeDebtorScope';
import {
    isExecutiveDetentionPeriodActive,
    buildForcedBringPersonalOutcomePatch,
    isPersonalCoerciveCycleClosed,
} from '@/app/components/lawyer/execution/coerciveStackUtils';
import { resolveAllPersonalCoerciveAppealSync } from '@/app/utils/personalCoerciveAppealSync';
import { coerciveOutcomeFromDecisionRow } from '../../utils/coerciveOutcomeFromDecisionRow';`;

fs.writeFileSync(path.join(decisionsDir, 'types.ts'), decisionsTypes);
fs.writeFileSync(
    path.join(decisionsDir, 'usePersonalCoerciveDecisionRowsStates.ts'),
    wrapDecisionsHook('usePersonalCoerciveDecisionRowsStates', rowsStatesImports, rowsStatesBody),
);

// Band 2: finders (357–393) — read eligible id from executionDataEffective (same source as derived)
let findersRaw = slice(decisionsLines, 357, 393);
findersRaw = findersRaw.replace(
    `const eligible = String(detentionJudgeEligibleDecisionId ?? '').trim();
        return id || eligible || null;
    }, [activeDebtorKey, allDecisionRows, detentionJudgeEligibleDecisionId, primaryDebtorKey]);`,
    `const eligible = String(
            executionDataEffective?.executive_detention_judge_eligible_decision_id ?? '',
        ).trim();
        return id || eligible || null;
    }, [activeDebtorKey, allDecisionRows, executionDataEffective, primaryDebtorKey]);`,
);

const findersBody = [
    findersRaw,
    `    return {
        findLatestDecisionIdForSubtype,
        findGoverningDossierDecisionId,
        findLatestGuarantorDecisionId,
        findLatestDecisionRowForSubtype,
    };`,
].join('\n\n');

const findersImports = `import React, { useCallback } from 'react';
import {
    appendPersonalCoerciveExecutorRequest,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    getGoverningDossierPresentationRowFromDecisions,
    isGuarantorRequestDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import type { usePersonalCoerciveDecisionRowsStates } from './usePersonalCoerciveDecisionRowsStates';`;

const rowsPickForFinders = `Pick<
    ReturnType<typeof usePersonalCoerciveDecisionRowsStates>,
    'allDecisionRows' | 'exId' | 'executionDataEffective'
>`;

fs.writeFileSync(
    path.join(decisionsDir, 'usePersonalCoerciveDecisionFinders.ts'),
    wrapDecisionsHook(
        'usePersonalCoerciveDecisionFinders',
        findersImports,
        findersBody,
        `, rows: ${rowsPickForFinders}`,
        `\n    const { allDecisionRows, exId, executionDataEffective } = rows;\n`,
    ),
);

// Band 3: appeal renderers + guarantor (395–589)
const appealBody = [
    slice(decisionsLines, 395, 589),
    `    return {
        handleWaiveInitialAppealApplied,
        renderWaiveInitialAppeal,
        renderRejectedExecutorAppealSection,
        handleWaiveCassationFromPanel,
        renderAppealSyncFollowup,
        findLatestGuarantorDecisionRow,
        guarantorFollowupBlock,
    };`,
].join('\n\n');

const appealImports = `import React, { useMemo, useCallback } from 'react';
import {
    isGuarantorRequestDecisionRow,
    type PersonalCoerciveSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import { readExecutorDecisionsUnionAcrossCandidateIds } from '@/app/utils/executionDecisionsNamespace';
import { ExecutionInlineExecutorDecisionActions } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { buildPersonalCoerciveExecutionMerge } from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import { resolveExecutorRequestFollowupBlockFromRecord } from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import {
    buildPersonalCoerciveAppealExecutionSyncPatch,
    isExecutorRejectedAppealFollowupDismissed,
    type PersonalCoerciveAppealSyncView,
} from '@/app/utils/personalCoerciveAppealSync';
import {
    ExecutorRequestFollowupBlockPanel,
    WaiveInitialAppealButton,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/decisionCardPresentation';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import { applyWaiveCassationAfterDebtorGrievanceForExecution } from '@/app/utils/waiveCassationAfterDebtorGrievance';
import { CoerciveSubsectionFold } from '../../chrome/CoerciveSubsectionFold';
import type { usePersonalCoerciveDecisionRowsStates } from './usePersonalCoerciveDecisionRowsStates';`;

const rowsPickForAppeal = `Pick<
    ReturnType<typeof usePersonalCoerciveDecisionRowsStates>,
    'allDecisionRows' | 'exId' | 'executionDataEffective' | 'debtorTimelineMeta'
>`;

fs.writeFileSync(
    path.join(decisionsDir, 'usePersonalCoerciveAppealRenderers.ts'),
    wrapDecisionsHook(
        'usePersonalCoerciveAppealRenderers',
        appealImports,
        appealBody,
        `, rows: ${rowsPickForAppeal}`,
        `\n    const { allDecisionRows, exId, executionDataEffective, debtorTimelineMeta } = rows;\n`,
    ),
);

const decisionsIndex = `export { buildPersonalCoerciveDecisionsCtx } from './types';
export type { PersonalCoerciveDecisionsCtx } from './types';
export { usePersonalCoerciveDecisionRowsStates } from './usePersonalCoerciveDecisionRowsStates';
export { usePersonalCoerciveDecisionFinders } from './usePersonalCoerciveDecisionFinders';
export { usePersonalCoerciveAppealRenderers } from './usePersonalCoerciveAppealRenderers';
`;
fs.writeFileSync(path.join(decisionsDir, 'index.ts'), decisionsIndex);

const decisionsComposer = `// @ts-nocheck
import type { PersonalCoerciveFollowupPanelProps } from '../types';
import type { PersonalCoercivePanelState } from './usePersonalCoercivePanelState';
import {
    buildPersonalCoerciveDecisionsCtx,
    usePersonalCoerciveDecisionRowsStates,
    usePersonalCoerciveDecisionFinders,
    usePersonalCoerciveAppealRenderers,
} from './decisions';

export type PersonalCoerciveDecisions = ReturnType<typeof usePersonalCoerciveDecisions>;

/** Thin composer — domain logic lives under hooks/decisions/. */
export function usePersonalCoerciveDecisions(
    props: PersonalCoerciveFollowupPanelProps,
    state: PersonalCoercivePanelState,
) {
    const ctx = buildPersonalCoerciveDecisionsCtx(props, state);
    const rows = usePersonalCoerciveDecisionRowsStates(ctx);
    const finders = usePersonalCoerciveDecisionFinders(ctx, rows);
    const appeal = usePersonalCoerciveAppealRenderers(ctx, rows);

    return {
        ...rows,
        ...finders,
        ...appeal,
    };
}
`;
fs.writeFileSync(decisionsPath, decisionsComposer);

function countLines(filePath) {
    return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).length;
}

console.log('Derived:');
for (const name of fs.readdirSync(derivedDir).sort()) {
    console.log(`  derived/${name}: ${countLines(path.join(derivedDir, name))}`);
}
console.log(`  usePersonalCoerciveDerived.ts: ${countLines(derivedPath)}`);

console.log('Decisions:');
for (const name of fs.readdirSync(decisionsDir).sort()) {
    console.log(`  decisions/${name}: ${countLines(path.join(decisionsDir, name))}`);
}
console.log(`  usePersonalCoerciveDecisions.ts: ${countLines(decisionsPath)}`);
