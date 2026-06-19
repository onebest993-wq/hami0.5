/**
 * Split useSmartFileJudgmentActions into domain hooks under hooks/judgment/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcPath = path.join(root, 'src/app/components/lawyer/smart-modal/hooks/useSmartFileJudgmentActions.ts');
const outDir = path.join(root, 'src/app/components/lawyer/smart-modal/hooks/judgment');

const raw = fs.readFileSync(srcPath, 'utf8');
const lines = raw.split(/\r?\n/);

const OPTIONS_TYPE = lines.slice(46, 65).join('\n');

const BASE_IMPORTS = `import type { Dispatch, SetStateAction } from 'react';
import type { CaseStage, Party, TimelineEvent } from '../../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { validateJudgmentData } from '@/app/utils/validationUtils';
import { logError } from '@/app/utils/errorHandler';
import { debug } from '@/app/utils/debug';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { applyStageTransition } from '../../smartFile/stageTransition';
import {
    applyAppealStageTransition,
    applyCassationRemand,
    cassationRemandSuccessMessage,
    resolveCassationRemandTarget,
} from '../../smartFile/appealStageTransition';
import type { SmartFileParentData } from '../../smartFile/parentDataInit';
import type {
    AppealTransitionPayload,
    CrossAppealPayload,
    JudgmentPayload,
    SmartFileAttachment,
    StageTransitionPayload,
} from '../../smartFile/judgmentTypes';
import {
    addDaysYmd,
    isSulhJudgmentType,
    JUDGMENT_TYPE_PETITION_NULLIFIED_LEGACY,
    JUDGMENT_TYPE_WAIVER,
    parseJudgmentDateInput,
    prependTimeline,
    stageAttachments,
    str,
} from '../../smartFile/judgmentTypes';
import {
    interpleaderClientAwaitingOpponentAppeal,
    interpleaderOriginalClaimOutcome,
    isInterpleaderJudgmentType,
    resolveInterpleaderDecisionText,
    resolveLawyerJudgmentBucket,
} from '../../smartFile/interpleaderJudgmentEngine';
import { resolveAppealDossierLayout, inferAppellantSideFromLawyer } from '../../smartFile/appealPartyEngine';
import {
    markPartiesAsCrossAppellants,
    resolveCrossAppealEligibility,
} from '../../smartFile/crossAppealEngine';
import type { UseSmartFileJudgmentActionsOptions } from './judgmentHookTypes';
`;

function sliceBody(start, end) {
    return lines
        .slice(start - 1, end)
        .map((l) => (l.startsWith('        ') ? l.slice(8) : l))
        .join('\n');
}

function handlersIn(body) {
    return [...body.matchAll(/const (handle[A-Za-z]+) =/g)].map((m) => m[1]);
}

const chunks = [
    { file: 'useJudgmentConfirmAction.ts', start: 90, end: 697 },
    { file: 'useAppealTransitionAction.ts', start: 701, end: 784 },
    { file: 'useCrossAppealAndCassationActions.ts', start: 788, end: 919 },
    { file: 'useStageTransitionActions.ts', start: 923, end: 963 },
];

fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
    path.join(outDir, 'judgmentHookTypes.ts'),
    `import type { Dispatch, SetStateAction } from 'react';
import type { CaseStage } from '../../../LawyerShared';
import type { SmartFileParentData } from '../../smartFile/parentDataInit';
import type { JudgmentPayload } from '../../smartFile/judgmentTypes';

export type SaveToCloud = (
    updatedStages: CaseStage[],
    updatedParent?: SmartFileParentData,
    stageIndex?: number,
) => void;

${OPTIONS_TYPE}
`,
);

for (const { file, start, end } of chunks) {
    const body = sliceBody(start, end);
    const handlers = handlersIn(body);
    const hookFn = file.replace('.ts', '');

    const content = `${BASE_IMPORTS}
export function ${hookFn}(options: UseSmartFileJudgmentActionsOptions) {
    const {
        stages,
        setStages,
        activeStageIndex,
        setActiveStageIndex,
        setViewingStageIndex,
        currentStage,
        parentData,
        saveToCloud,
        setStatus,
        tempJudgmentData,
        setTempJudgmentData,
        setShowAppealTransitionModal,
        setShowAppealModal,
        setShowObjectionRegistrationModal,
        setShowJudgmentModal,
        setShowCrossAppealModal,
        setShowTransitionModal,
    } = options;

${body}

    return {
        ${handlers.join(',\n        ')},
    };
}
`;

    fs.writeFileSync(path.join(outDir, file), content);
}

const mainHook = `import type { UseSmartFileJudgmentActionsOptions } from './judgment/judgmentHookTypes';
export type { UseSmartFileJudgmentActionsOptions } from './judgment/judgmentHookTypes';

import { useJudgmentConfirmAction } from './judgment/useJudgmentConfirmAction';
import { useAppealTransitionAction } from './judgment/useAppealTransitionAction';
import { useCrossAppealAndCassationActions } from './judgment/useCrossAppealAndCassationActions';
import { useStageTransitionActions } from './judgment/useStageTransitionActions';

export function useSmartFileJudgmentActions(options: UseSmartFileJudgmentActionsOptions) {
    return {
        ...useJudgmentConfirmAction(options),
        ...useAppealTransitionAction(options),
        ...useCrossAppealAndCassationActions(options),
        ...useStageTransitionActions(options),
    };
}
`;

fs.writeFileSync(srcPath, mainHook);
console.log('Split judgment actions into', chunks.length, 'domain hooks');
