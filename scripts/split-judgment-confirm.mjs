/**
 * Split useJudgmentConfirmAction into judgmentConfirm/* scenario modules.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcPath = path.join(
    root,
    'src/app/components/lawyer/smart-modal/hooks/judgment/useJudgmentConfirmAction.ts',
);
const outDir = path.join(root, 'src/app/components/lawyer/smart-modal/hooks/judgment/judgmentConfirm');

const raw = fs.readFileSync(srcPath, 'utf8');
const lines = raw.split(/\r?\n/);

function sliceBody(start, end) {
    return lines
        .slice(start - 1, end)
        .map((l) => l.replace(/^    /, ''))
        .join('\n');
}

function patchMutables(body) {
    return body
        .replace(/\bhandled = /g, 'rt.handled = ')
        .replace(/\bsuccessToast = /g, 'rt.successToast = ')
        .replace(/\bopenAppealModalAfterSave = /g, 'rt.openAppealModalAfterSave = ')
        .replace(/\bopenObjectionModalAfterSave = /g, 'rt.openObjectionModalAfterSave = ')
        .replace(/\bremandNewActiveIndex = /g, 'rt.remandNewActiveIndex = ');
}

const SCENARIO_IMPORTS = `import type { Party } from '../../../../LawyerShared';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    isSulhJudgmentType,
    JUDGMENT_TYPE_PETITION_NULLIFIED_LEGACY,
    JUDGMENT_TYPE_WAIVER,
} from '../../../smartFile/judgmentTypes';
import {
    interpleaderClientAwaitingOpponentAppeal,
    isInterpleaderJudgmentType,
    resolveInterpleaderDecisionText,
    resolveLawyerJudgmentBucket,
} from '../../../smartFile/interpleaderJudgmentEngine';
import { applyCassationRemand, cassationRemandSuccessMessage, resolveCassationRemandTarget } from '../../../smartFile/appealStageTransition';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from './judgmentConfirmTypes';
`;

const scenarios = [
    {
        file: 'scenarioWaitAppeal.ts',
        fn: 'applyWaitAppealScenarios',
        start: 107,
        end: 287,
        extra: '',
        dispatch: `if (action === 'waiting_for_appeal' || action === 'waiting_for_cassation' || action === 'seal_plaintiff_win') {
        applyWaitAppealScenarios(scope, rt);
    }`,
    },
    {
        file: 'scenarioArchive.ts',
        fn: 'applyArchiveScenarios',
        start: 292,
        end: 378,
        dispatch: `else if (action === 'archive_review' || action === 'archive_annulled' || action === 'finalize_non_merit') {
        applyArchiveScenarios(scope, rt);
    }`,
    },
    {
        file: 'scenarioTransition.ts',
        fn: 'applyTransitionScenario',
        start: 383,
        end: 463,
        extra: `import type { CaseStage, Party } from '../../../../LawyerShared';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
`,
        dispatch: `else if (action === 'transition') {
        applyTransitionScenario(scope, rt);
    }`,
    },
    {
        file: 'scenarioFinalClose.ts',
        fn: 'applyFinalCloseScenario',
        start: 468,
        end: 494,
        dispatch: `else if (action === 'final_close') {
        applyFinalCloseScenario(scope, rt);
    }`,
    },
    {
        file: 'scenarioCassation.ts',
        fn: 'applyCassationScenarios',
        start: 499,
        end: 571,
        dispatch: `else if (
        action === 'final_ratification' ||
        action === 'remand_to_lower' ||
        action === 'correction_request'
    ) {
        applyCassationScenarios(scope, rt);
    }`,
    },
];

fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
    path.join(outDir, 'judgmentConfirmTypes.ts'),
    `import type { CaseStage } from '../../../../LawyerShared';
import type { JudgmentPayload } from '../../../smartFile/judgmentTypes';
import type { SmartFileParentData } from '../../../smartFile/parentDataInit';
import type { UseSmartFileJudgmentActionsOptions } from '../judgmentHookTypes';

export type JudgmentConfirmScope = Pick<
    UseSmartFileJudgmentActionsOptions,
    'stages' | 'currentStage' | 'activeStageIndex' | 'parentData' | 'setStatus' | 'setActiveStageIndex'
>;

export type JudgmentConfirmRuntime = {
    judgmentData: JudgmentPayload;
    action: string;
    judgmentType: string;
    judgmentForm: string;
    judgmentDate: string;
    notes: string;
    nextStage: string;
    now: Date;
    stageName: string;
    addDays: (date: Date, days: number) => string;
    updatedStages: CaseStage[];
    handled: boolean;
    successToast: string;
    openAppealModalAfterSave: boolean;
    openObjectionModalAfterSave: boolean;
    remandNewActiveIndex: number | null;
};
`,
);

for (const { file, fn, start, end, extra = '' } of scenarios) {
    let body = patchMutables(sliceBody(start, end));
    body = body.replace(/^    else if \(action === /gm, 'if (action === ');
    body = body.replace(/^    else if \(/gm, 'else if (');
    const content = `${SCENARIO_IMPORTS}${extra}
export function ${fn}(scope: JudgmentConfirmScope, rt: JudgmentConfirmRuntime): void {
    const { currentStage, activeStageIndex, parentData, stages, setStatus, setActiveStageIndex } = scope;
    const {
        judgmentData,
        action,
        judgmentType,
        judgmentForm,
        judgmentDate,
        notes,
        nextStage,
        now,
        stageName,
        addDays,
        updatedStages,
    } = rt;

${body}
}
`;
    fs.writeFileSync(path.join(outDir, file), content);
}

const syncBody = patchMutables(sliceBody(577, 639));
fs.writeFileSync(
    path.join(outDir, 'syncAttachmentShield.ts'),
    `import { debug } from '@/app/utils/debug';
import { interpleaderOriginalClaimOutcome, prependTimeline, stageAttachments } from '../../../smartFile/judgmentTypes';
import type { SmartFileAttachment } from '../../../smartFile/judgmentTypes';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from './judgmentConfirmTypes';

export function syncAttachmentShieldOnJudgment(scope: JudgmentConfirmScope, rt: JudgmentConfirmRuntime): void {
    const { currentStage, activeStageIndex } = scope;
    const { judgmentType, judgmentDate, remandNewActiveIndex, updatedStages } = rt;

${syncBody}
}
`,
);

const dispatchBlocks = scenarios.map((s) => s.dispatch).join('\n    ');
fs.writeFileSync(
    path.join(outDir, 'dispatchJudgmentScenarios.ts'),
    `import { applyWaitAppealScenarios } from './scenarioWaitAppeal';
import { applyArchiveScenarios } from './scenarioArchive';
import { applyTransitionScenario } from './scenarioTransition';
import { applyFinalCloseScenario } from './scenarioFinalClose';
import { applyCassationScenarios } from './scenarioCassation';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from './judgmentConfirmTypes';

export function dispatchJudgmentScenarios(scope: JudgmentConfirmScope, rt: JudgmentConfirmRuntime): void {
    const { action } = rt;
    ${dispatchBlocks}
}
`,
);

const applyConfirm = `import { SmartToast } from '@/app/components/ui/SmartToast';
import { validateJudgmentData } from '@/app/utils/validationUtils';
import { logError } from '@/app/utils/errorHandler';
import { debug } from '@/app/utils/debug';
import type { JudgmentPayload } from '../../../smartFile/judgmentTypes';
import { addDaysYmd, parseJudgmentDateInput, str } from '../../../smartFile/judgmentTypes';
import type { UseSmartFileJudgmentActionsOptions } from '../judgmentHookTypes';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from './judgmentConfirmTypes';
import { dispatchJudgmentScenarios } from './dispatchJudgmentScenarios';
import { syncAttachmentShieldOnJudgment } from './syncAttachmentShield';

export function applyJudgmentConfirm(
    judgmentData: JudgmentPayload,
    options: UseSmartFileJudgmentActionsOptions,
): boolean {
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
        setTempJudgmentData,
        setShowAppealTransitionModal,
        setShowAppealModal,
        setShowObjectionRegistrationModal,
        setShowJudgmentModal,
    } = options;

    try {
        const validation = validateJudgmentData(judgmentData);
        if (!validation.valid) {
            SmartToast.error(validation.error || 'بيانات الحكم غير صحيحة');
            return false;
        }

        const action = str(judgmentData.action);
        const judgmentType = str(judgmentData.judgmentType);
        const judgmentForm = str(judgmentData.judgmentForm) || 'حضوري';
        const judgmentDate = str(judgmentData.judgmentDate);
        const notes = str(judgmentData.notes);
        const nextStage = str(judgmentData.nextStage);
        const openAppealTransitionModal = Boolean(judgmentData.openAppealTransitionModal);

        debug.log('⚖️ بدء معالجة قرار الحكم:', action);

        if (openAppealTransitionModal) {
            debug.log('🔄 فتح نافذة بوابة الطعن...');
            setTempJudgmentData(judgmentData);
            setShowAppealTransitionModal(true);
            setShowJudgmentModal(false);
            return true;
        }

        const scope: JudgmentConfirmScope = {
            stages,
            currentStage,
            activeStageIndex,
            parentData,
            setStatus,
            setActiveStageIndex,
        };

        const rt: JudgmentConfirmRuntime = {
            judgmentData,
            action,
            judgmentType,
            judgmentForm,
            judgmentDate,
            notes,
            nextStage,
            now: parseJudgmentDateInput(judgmentDate),
            stageName: currentStage.stageName ?? '',
            addDays: (date: Date, days: number) => addDaysYmd(date, days),
            updatedStages: [...stages],
            handled: false,
            successToast: 'تم حفظ قرار الحكم بنجاح ⚖️',
            openAppealModalAfterSave: false,
            openObjectionModalAfterSave: false,
            remandNewActiveIndex: null,
        };

        dispatchJudgmentScenarios(scope, rt);
        syncAttachmentShieldOnJudgment(scope, rt);

        if (!rt.handled) {
            debug.error('❌ إجراء حكم غير معروف:', action);
            SmartToast.error('تعذّر حفظ الحكم — إجراء غير معروف');
            return false;
        }

        setStages(rt.updatedStages);
        saveToCloud(rt.updatedStages, parentData);
        if (rt.remandNewActiveIndex !== null) {
            setActiveStageIndex(rt.remandNewActiveIndex);
            setViewingStageIndex(rt.remandNewActiveIndex);
        }
        setShowJudgmentModal(false);

        debug.log('✅ تم حفظ قرار الحكم بنجاح');
        SmartToast.success(rt.successToast);

        if (rt.openObjectionModalAfterSave) {
            setShowObjectionRegistrationModal(true);
        }
        if (rt.openAppealModalAfterSave) {
            setShowAppealModal(true);
        }

        return true;
    } catch (error) {
        logError('handleJudgmentConfirm', error, judgmentData);
        SmartToast.error('حدث خطأ أثناء حفظ قرار الحكم');
        return false;
    }
}
`;

fs.writeFileSync(path.join(outDir, 'applyJudgmentConfirm.ts'), applyConfirm);

fs.writeFileSync(
    path.join(root, 'src/app/components/lawyer/smart-modal/hooks/judgment/useJudgmentConfirmAction.ts'),
    `import type { UseSmartFileJudgmentActionsOptions } from './judgmentHookTypes';
import { applyJudgmentConfirm } from './judgmentConfirm/applyJudgmentConfirm';

export function useJudgmentConfirmAction(options: UseSmartFileJudgmentActionsOptions) {
    const handleJudgmentConfirm = (judgmentData: Parameters<typeof applyJudgmentConfirm>[0]) =>
        applyJudgmentConfirm(judgmentData, options);

    return { handleJudgmentConfirm };
}
`,
);

console.log('Split judgment confirm into', scenarios.length + 2, 'modules under judgmentConfirm/');
