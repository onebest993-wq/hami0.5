import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const write = (rel, contents) => {
    const out = contents.endsWith('\n') ? contents : contents + '\n';
    fs.writeFileSync(path.join(root, rel), out);
    console.log(String(out.split('\n').length).padStart(4), rel);
};
const linesOf = (src) => src.split('\n');
const slice = (rel, a, b) => linesOf(read(rel)).slice(a - 1, b).join('\n');
const splice = (rel, a, b, replacement) => {
    const lines = linesOf(read(rel));
    write(
        rel,
        `${lines.slice(0, a - 1).join('\n')}\n${replacement}\n${lines.slice(b).join('\n')}`.replace(
            /\n{3,}/g,
            '\n\n',
        ),
    );
};

// --- creditor party death save ---
{
    const rel =
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardPartyDeathSave.ts';
    const body = slice(rel, 57, 267);
    write(
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/runCreditorPartyDeathSave.ts',
        `import type { Creditor, ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { PartyDeathSavePayload } from '@/app/components/lawyer/execution/PartyDeathReportModal';
import { hasOngoingAlimonyInExecution } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import { buildExecutionMergeForCreditorPartyDeath } from '@/app/utils/creditorPartyDeathPersistence';
import {
    appendCreditorPartyDeathRequest,
    getCreditorHeirSubstitutionRequestStatus,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    buildDossierAutoFinishPatch,
    shouldAutoFinishDossierOnDeathReport,
} from '@/app/utils/partyDeathClaimPolicy';
import {
    buildScopedPartyDeathPersistPatch,
    getPartyDeathCaseForRole,
} from '@/app/utils/partyDeathCaseScope';
import type { PartyDeathSaveDeps } from './executionDashboardPartyDeathSave.types';
import { mergeHeirDetails, mergeHeirNames } from './partyDeathSaveHeirHelpers';

export function runCreditorPartyDeathSave(
    payload: PartyDeathSavePayload,
    deps: PartyDeathSaveDeps,
    base: ExecutionFile | null | undefined,
): boolean {
    const {
        creditors,
        debtors,
        claimType,
        decisionsStorageExecutionId,
        partyDeathModalDecisionId,
        nextTimelineId,
        persistExecutionMerge,
        patchExecutorDecisionRow,
        showToast,
        setTimelineEvents,
        executionData,
    } = deps;
${body}
    return false;
}
`,
    );
    splice(
        rel,
        56,
        267,
        `            if (payload.deceased_party === 'creditor') {
                return runCreditorPartyDeathSave(payload, deps, base);
            }`,
    );
}

// --- notes commit ---
{
    const rel =
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardNotesTasksHandlers.ts';
    const body = slice(rel, 189, 251);
    write(
        'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/commitDossierNoteAction.ts',
        `import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { TimelineEvent } from '@/app/types/execution';
import type { CaseNotesLog } from './timelineAssetsClusterHelpers';

export async function commitDossierNoteAction(
    payload: { title: string; bodyHtml: string; noteId?: string },
    deps: {
        showToast: (message: string, type?: string) => void;
        caseNotesLogRef: MutableRefObject<CaseNotesLog>;
        timelineEventsRef: MutableRefObject<TimelineEvent[]>;
        nextTimelineId: () => string;
        setCaseNotesLog: Dispatch<SetStateAction<CaseNotesLog>>;
        setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
        persistExecutionMerge: (patch: Record<string, unknown>) => void;
        setNoteTitle: Dispatch<SetStateAction<string>>;
        setNoteBody: Dispatch<SetStateAction<string>>;
        setEditingNoteId: Dispatch<SetStateAction<string | null>>;
    },
): Promise<void> {
    const {
        showToast,
        caseNotesLogRef,
        timelineEventsRef,
        nextTimelineId,
        setCaseNotesLog,
        setTimelineEvents,
        persistExecutionMerge,
        setNoteTitle,
        setNoteBody,
        setEditingNoteId,
    } = deps;
${body.replace(/^            /gm, '    ')}
}
`,
    );
    splice(
        rel,
        188,
        265,
        `    const commitDossierNote = useCallback(
        async (payload: { title: string; bodyHtml: string; noteId?: string }) => {
            await commitDossierNoteAction(payload, {
                showToast,
                caseNotesLogRef,
                timelineEventsRef,
                nextTimelineId,
                setCaseNotesLog,
                setTimelineEvents,
                persistExecutionMerge,
                setNoteTitle,
                setNoteBody,
                setEditingNoteId,
            });
        },
        [
            caseNotesLogRef,
            timelineEventsRef,
            nextTimelineId,
            persistExecutionMerge,
            showToast,
            setCaseNotesLog,
            setTimelineEvents,
            setNoteTitle,
            setNoteBody,
            setEditingNoteId,
        ],
    );`,
    );
}

console.log('notes + creditor extracted');
