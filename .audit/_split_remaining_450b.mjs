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

// party edit overlay + open
{
    const rel = 'src/app/components/lawyer/ExecutionDashboard/hooks/usePartyEditWorkflow.ts';
    const overlay = slice(rel, 103, 136);
    write(
        'src/app/components/lawyer/ExecutionDashboard/hooks/usePartyEditOverlaySync.ts',
        `import { useEffect } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { clearPartyEditDisplayOverlay, getPartyEditDisplayOverlay } from '../helpers/partyEditDisplayOverlay';

export function usePartyEditOverlaySync(executionData: ExecutionFile | null | undefined) {
    useEffect(() => {
${overlay}
    }, [executionData?.creditors, executionData?.debtors]);
}
`,
    );
    const openBody = slice(rel, 144, 297);
    write(
        'src/app/components/lawyer/ExecutionDashboard/hooks/openPartyEditDraft.ts',
        `import { flushSync } from 'react-dom';
import type { Creditor, Debtor, ExecutionFile, Party } from '@/app/types/execution';
import {
    getCreditorHeirSubstitutionRequestStatus,
    getDebtorHeirSubstitutionRequestStatus,
} from '@/app/utils/executorDecisionReadQueries';
import { getPartyDeathCaseForRole } from '@/app/utils/partyDeathCaseScope';
import type { HeirDetailRow } from '../helpers/heirUtils';
import type { PartyEditTargetState } from '../helpers/partyEditPersistence';
import type { PartyEditDraftState } from './usePartyEditWorkflow.types';
import type { HeirUtilsModule } from './usePartyEditWorkflow.types';

export async function openPartyEditDraft(args: {
    kind: 'creditor' | 'debtor';
    index: number;
    opts?: { forceHeirs?: boolean; party?: Party | Creditor | Debtor };
    loadPartyEditPersistence: () => Promise<{
        getPartyListFromFile: typeof import('../helpers/partyEditPersistence').getPartyListFromFile;
        resolvePartyIndexInList: typeof import('../helpers/partyEditPersistence').resolvePartyIndexInList;
    }>;
    ensureHeirUtils: () => Promise<HeirUtilsModule>;
    heirUtilsCache: HeirUtilsModule | null;
    setHeirUtilsEpoch: (fn: (n: number) => number) => void;
    executionDataRef: { current: ExecutionFile | null | undefined };
    viewExecutionData: ExecutionFile | null | undefined;
    executionData: ExecutionFile | null | undefined;
    decisionsStorageExecutionId: string;
    showToast: (message: string, type?: string) => void;
    setPartyEditDraft: (draft: PartyEditDraftState) => void;
    setEditPartyTarget: (target: PartyEditTargetState) => void;
}): Promise<void> {
    const {
        kind,
        index,
        opts,
        loadPartyEditPersistence,
        ensureHeirUtils,
        heirUtilsCache,
        setHeirUtilsEpoch,
        executionDataRef,
        viewExecutionData,
        executionData,
        decisionsStorageExecutionId,
        showToast,
        setPartyEditDraft,
        setEditPartyTarget,
    } = args;
${openBody}
}
`,
    );
    splice(
        rel,
        102,
        308,
        `    usePartyEditOverlaySync(executionData);

    const openEditParty = useCallback(
        async (
            kind: 'creditor' | 'debtor',
            index: number,
            opts?: { forceHeirs?: boolean; party?: Party | Creditor | Debtor },
        ) => {
            await openPartyEditDraft({
                kind,
                index,
                opts,
                loadPartyEditPersistence,
                ensureHeirUtils,
                heirUtilsCache,
                setHeirUtilsEpoch,
                executionDataRef,
                viewExecutionData,
                executionData,
                decisionsStorageExecutionId,
                showToast,
                setPartyEditDraft,
                setEditPartyTarget,
            });
        },
        [
            viewExecutionData,
            executionData,
            decisionsStorageExecutionId,
            executionData?.is_creditor_deceased,
            executionData?.is_debtor_deceased,
            showToast,
            executionDataRef,
        ],
    );`,
    );
}

console.log('party edit extracted');
