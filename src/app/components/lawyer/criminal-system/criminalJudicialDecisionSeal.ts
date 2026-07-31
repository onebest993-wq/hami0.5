import type { JudicialDecision } from '@/app/types/criminal';
import type { CriminalCase } from './criminalCaseModel';
import {
    coalesceJudicialDecisions,
    findJudicialDecisionStoreIndex,
    mergeJudicialDecisionAppeals,
} from './judicialDecisionsEngine';

export function persistSealedJudicialDecisionOnCase(
    caseRecord: CriminalCase,
    mergedDecision: JudicialDecision,
): CriminalCase {
    const sealed: JudicialDecision = { ...mergedDecision, isLocked: true };
    const list = Array.isArray(caseRecord.judicialDecisions) ? [...caseRecord.judicialDecisions] : [];
    const storeIdx = findJudicialDecisionStoreIndex(list, sealed);
    const nextList =
        storeIdx >= 0
            ? list.map((decision, index) => {
                  if (index !== storeIdx) return decision;
                  const prior = list[storeIdx]!;
                  return {
                      ...sealed,
                      id: prior.id,
                      sourceRequestId: sealed.sourceRequestId ?? prior.sourceRequestId,
                      appeals: mergeJudicialDecisionAppeals(prior.appeals, sealed.appeals),
                      isLocked: true,
                  };
              })
            : [...list, sealed];

    return { ...caseRecord, judicialDecisions: coalesceJudicialDecisions(nextList) };
}
