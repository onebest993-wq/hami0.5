import type { CassationAppealResult } from '@/app/types/criminal';
import type { CriminalCase, StageConclusion } from './criminalCaseModel';
import { migrateLegacyCassationToProceeding } from './cassationFilingApply';
import { recordCassationResult } from './cassationResultRecord';

export type { RecordCassationResultOutcome } from './cassationResultRecord';
export {
    recordCassationResult,
    resolvePersonalBeneficiaryIds,
} from './cassationResultRecord';

export function applyCassationOutcome(
    caseRecord: CriminalCase,
    conclusion: StageConclusion,
): CriminalCase {
    const date = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const details = String(conclusion.details ?? '').trim();
    const shared269b = conclusion.sharedObjectiveGrounds269b === true;
    const proceeding =
        caseRecord.cassationProceeding ?? migrateLegacyCassationToProceeding(caseRecord);
    const appellants = proceeding?.appellantDefendantIds ?? [];

    const appealResult: CassationAppealResult | null =
        conclusion.decisionType === 'cassation_confirm'
            ? 'affirmation'
            : conclusion.decisionType === 'cassation_quash_remand'
              ? 'quash_remand'
              : conclusion.decisionType === 'cassation_quash_acquit_release'
                ? 'quash_dismissal'
                : conclusion.decisionType === 'cassation_quash_reduce'
                  ? 'quash_modify'
                  : null;

    if (!appealResult) return caseRecord;

    const out = recordCassationResult(caseRecord, {
        result: appealResult,
        date,
        details,
        isObjectiveGrounds: shared269b,
        targetDefendantIds: conclusion.targetDefendantIds ?? conclusion.defendantIds,
        virtualAppellantDefendantIds:
            appellants.length ? appellants : (conclusion.targetDefendantIds ?? conclusion.defendantIds),
        modifiedArticle: appealResult === 'quash_modify' ? details : undefined,
    });
    return out.error ? caseRecord : out.caseRecord;
}
