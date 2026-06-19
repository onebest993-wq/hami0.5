/**
 * Split useSmartFileProceduralActions into domain hooks under procedural/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcPath = path.join(
    root,
    'src/app/components/lawyer/smart-modal/hooks/useSmartFileProceduralActions.ts',
);
const outDir = path.join(root, 'src/app/components/lawyer/smart-modal/hooks/procedural');

const raw = fs.readFileSync(srcPath, 'utf8');
const lines = raw.split(/\r?\n/);

const BASE_IMPORTS = lines.slice(0, 54).join('\n');

const CALENDAR_CTX = `import { buildLawsuitCalendarContext } from './lawsuitCalendarContext';

`;

function sliceBody(start, end) {
    return lines
        .slice(start - 1, end)
        .map((l) => (l.startsWith('        ') ? l.slice(8) : l))
        .join('\n');
}

function handlersIn(body) {
    const names = [...body.matchAll(/const (handle[A-Za-z]+) =/g)].map((m) => m[1]);
    return names;
}

const chunks = [
    { file: 'useProceduralTaskActions.ts', start: 116, end: 299 },
    { file: 'useProceduralIncidentalActions.ts', start: 300, end: 949 },
    { file: 'useProceduralTimelineActions.ts', start: 950, end: 1346 },
    { file: 'useProceduralPauseActions.ts', start: 1347, end: 1670 },
    { file: 'useProceduralLifecycleActions.ts', start: 1671, end: 1906 },
];

fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(
    path.join(outDir, 'lawsuitCalendarContext.ts'),
    `import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';

export function buildLawsuitCalendarContext(
    parentData: UseSmartFileProceduralActionsOptions['parentData'],
    calendarUserId: UseSmartFileProceduralActionsOptions['calendarUserId'],
) {
    const parties = parentData?.parties;
    const firstParty =
        Array.isArray(parties) && parties[0] && typeof parties[0] === 'object'
            ? (parties[0] as { name?: string })
            : null;
    return {
        userId: calendarUserId ?? null,
        fileId: String(parentData?.id ?? ''),
        caseNo: typeof parentData?.caseNo === 'string' ? parentData.caseNo : undefined,
        court: typeof parentData?.court === 'string' ? parentData.court : undefined,
        parties,
        clientName: firstParty?.name?.trim() || undefined,
    };
}
`,
);

const hookNames = [];

for (const { file, start, end } of chunks) {
    const body = sliceBody(start, end);
    const handlers = handlersIn(body);
    hookNames.push(`use${file.replace('.ts', '').replace('useProcedural', 'Procedural')}`.replace('ProceduralTaskActions', 'ProceduralTaskActions'));

    const hookFn = file.replace('.ts', '');
    const needsCalendar = body.includes('lawsuitCalendarContext');
    const calendarSetup = needsCalendar
        ? '    const lawsuitCalendarContext = () => buildLawsuitCalendarContext(parentData, calendarUserId);\n\n'
        : '';

    const content = `${BASE_IMPORTS}
import type { UseSmartFileProceduralActionsOptions } from '../../smartFile/proceduralTypes';
${needsCalendar ? CALENDAR_CTX : ''}
export function ${hookFn}(options: UseSmartFileProceduralActionsOptions) {
    const {
        stages,
        setStages,
        activeStageIndex,
        viewingStageIndex,
        currentStage,
        parentData,
        setParentData,
        saveToCloud,
        setStatus,
        setIsPaused,
        setPauseReason,
        setLinkedCaseNo,
        setIsInterrupted,
        setInterruptionData,
        setEditingTask,
        setEditingIncidental,
        setEditingFastTrack,
        setEditingAttachment,
        setEditingEvent,
        setShowFastTrackModal,
        setShowAttachmentModal,
        setShowJudgeRecusalModal,
        setShowTransferJurisdictionModal,
        setShowCaseConsolidationModal,
        setShowAttorneyResignationModal,
        setShowExecutionTransferModal,
        setShowMaterialErrorModal,
        setShowPauseModal,
        setShowInterruptionModal,
        setShowResumeInterruptionModal,
        setShowExtraordinaryAppealModal,
        setShowProvisionalOrderModal,
        setShowInterlocutoryModal,
        isPaused,
        pauseReason,
        isInterrupted,
        interruptionData,
        status,
        calendarUserId,
        setAppealOutcomeTask,
    } = options;

${calendarSetup}${body}

    return {
        ${handlers.join(',\n        ')},
    };
}
`;

    fs.writeFileSync(path.join(outDir, file), content);
}

const mainHook = `${BASE_IMPORTS}
import type { UseSmartFileProceduralActionsOptions } from '../smartFile/proceduralTypes';
import { useProceduralTaskActions } from './procedural/useProceduralTaskActions';
import { useProceduralIncidentalActions } from './procedural/useProceduralIncidentalActions';
import { useProceduralTimelineActions } from './procedural/useProceduralTimelineActions';
import { useProceduralPauseActions } from './procedural/useProceduralPauseActions';
import { useProceduralLifecycleActions } from './procedural/useProceduralLifecycleActions';

export function useSmartFileProceduralActions(options: UseSmartFileProceduralActionsOptions) {
    return {
        ...useProceduralTaskActions(options),
        ...useProceduralIncidentalActions(options),
        ...useProceduralTimelineActions(options),
        ...useProceduralPauseActions(options),
        ...useProceduralLifecycleActions(options),
    };
}
`;

fs.writeFileSync(srcPath, mainHook);
console.log('Split procedural actions into', chunks.length, 'domain hooks');
