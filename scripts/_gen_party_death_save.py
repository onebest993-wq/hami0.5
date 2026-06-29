from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
body = (ROOT / 'scripts/_party_death_body.txt').read_text(encoding='utf-8')

destructure = """
    const {
        executionDataRef,
        executionData,
        claimType,
        creditors,
        debtors,
        decisionsStorageExecutionId,
        partyDeathModalDecisionId,
        nextTimelineId,
        persistExecutionMerge,
        patchExecutorDecisionRow,
        showToast,
        setTimelineEvents,
    } = deps;
"""

header = """// @ts-nocheck
/** مسار وفاة الخصوم — منطق الحفظ المستخرج من core */
import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import type { Creditor, Debtor, ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { PartyDeathSavePayload } from '@/app/components/lawyer/execution/PartyDeathReportModal';
import { hasOngoingAlimonyInExecution } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import { buildExecutionMergeForCreditorPartyDeath } from '@/app/utils/creditorPartyDeathPersistence';
import {
    appendCreditorPartyDeathRequest,
    getCreditorHeirSubstitutionRequestStatus,
    getDebtorHeirSubstitutionRequestStatus,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    buildDossierAutoFinishPatch,
    isHeirSubstitutionAllowedForClaim,
    shouldAutoFinishDossierOnDeathReport,
} from '@/app/utils/partyDeathClaimPolicy';
import {
    buildScopedPartyDeathPersistPatch,
    getPartyDeathCaseForRole,
} from '@/app/utils/partyDeathCaseScope';

export type PartyDeathSaveDeps = {
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    executionData: ExecutionFile | null | undefined;
    claimType: string | undefined;
    creditors: Creditor[];
    debtors: Debtor[];
    decisionsStorageExecutionId: string;
    partyDeathModalDecisionId: string | null;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    patchExecutorDecisionRow: typeof patchExecutorDecisionRow;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
};

export function runPartyDeathSave(payload: PartyDeathSavePayload, deps: PartyDeathSaveDeps): boolean {
"""

out = ROOT / 'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardPartyDeathSave.ts'
out.write_text(header + destructure + body + '\n}\n', encoding='utf-8')
print('written', out.stat().st_size)
