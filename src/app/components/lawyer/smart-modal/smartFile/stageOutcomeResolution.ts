import type { StageOutcome } from '../../lawyerShared/stageTransitionMetadataTypes';
import type { FirstInstanceAppealAction, FirstInstanceAppealRights } from './firstInstanceAppealRightsTypes';
import { resolveAbsentObjectionClientRole } from './absentJudgmentFlow';
import { resolveClientMarkedParty } from './clientMarkedParty';
import { normalizePartyId, normalizePartyIdList } from './judgmentStageMetadataTypes';
import type { CaseStage } from '../../LawyerShared';

/** يحوّل مخرجات محرك البداءة/الاعتراض إلى StageOutcome صريح */
export function stageOutcomeFromFirstInstanceRights(
    rights: Pick<FirstInstanceAppealRights, 'action'>,
    judgmentType?: string | null,
): StageOutcome | null {
    switch (rights.action) {
        case 'wait_opponent':
            return 'WIN';
        case 'self_appeal':
            return 'LOSS';
        case 'both_paths':
            return 'PARTIAL';
        case 'finalize_non_merit':
        case 'archive_void':
            return 'FINALIZED';
        case 'none':
        default:
            if (String(judgmentType ?? '').includes('جزئياً')) {
                return 'PARTIAL';
            }
            return null;
    }
}

export function stageOutcomeFromFirstInstanceAction(
    action: FirstInstanceAppealAction,
    judgmentType?: string | null,
): StageOutcome | null {
    return stageOutcomeFromFirstInstanceRights({ action }, judgmentType);
}

/** يحدد appellant/appellee ids عند hop الطعn */
export function resolveTransitionPartyIds(
    parties?: Array<{ id?: number | string; isClient?: boolean; lawyer?: { isMyOffice?: boolean }; isMyOffice?: boolean }> | null,
    mode: 'client_appeal' | 'opponent_appeal' = 'client_appeal',
    includedAppellantPartyIds?: Array<number | string>,
    includedOpponentPartyIds?: Array<number | string>,
): { appellantPartyIds: string[]; appelleePartyIds: string[] } {
    const client = resolveClientMarkedParty(parties);
    const clientId = normalizePartyId(client?.id);
    const allIds = normalizePartyIdList(
        parties?.map((p) => p.id).filter((id) => id != null) as Array<number | string>,
    );

    if (mode === 'opponent_appeal') {
        const appellantPartyIds = normalizePartyIdList(
            includedAppellantPartyIds?.length ? includedAppellantPartyIds : allIds.filter((id) => id !== clientId),
        );
        const appelleePartyIds = clientId ? [clientId] : normalizePartyIdList(includedOpponentPartyIds);
        return { appellantPartyIds, appelleePartyIds };
    }

    const appellantPartyIds = normalizePartyIdList(
        includedAppellantPartyIds?.length ? includedAppellantPartyIds : clientId ? [clientId] : [],
    );
    const appelleePartyIds = normalizePartyIdList(
        includedOpponentPartyIds?.length
            ? includedOpponentPartyIds
            : allIds.filter((id) => !appellantPartyIds.includes(id)),
    );
    return { appellantPartyIds, appelleePartyIds };
}

/** يكتب clientStageOutcome على patch المرحلة إن وُجدت نتيجة */
export function withClientStageOutcome<T extends { clientStageOutcome?: StageOutcome }>(
    patch: T,
    outcome: StageOutcome | null | undefined,
): T & { clientStageOutcome?: StageOutcome } {
    if (!outcome) return patch;
    return { ...patch, clientStageOutcome: outcome };
}

/** نتيجة موكلك عند فتح مرحلة الاعتراض الغيابي — المعترض خاسر الحكم الغيابي */
export function resolveAbsentObjectionOpeningPriorOutcome(
    currentStage: Pick<CaseStage, 'clientStageOutcome' | 'parties'>,
): StageOutcome {
    if (currentStage.clientStageOutcome) return currentStage.clientStageOutcome;
    const clientRole = resolveAbsentObjectionClientRole(currentStage.parties);
    if (clientRole === 'objector') return 'LOSS';
    if (clientRole === 'objected') return 'WIN';
    return 'LOSS';
}

/**
 * عند تسجيل طعن الخصم: النتيجة السابقة تكون WIN عادةً (الخصم يطعن لأنه خسر).
 * يُفضّل clientStageOutcome الصريح، ثم awaitingOpponentAppeal، ثم WIN كافتراض قانوني للطعن الخصمي.
 */
export function resolveOpponentAppealPriorOutcome(
    currentStage: Pick<CaseStage, 'clientStageOutcome' | 'awaitingOpponentAppeal'>,
): StageOutcome {
    if (currentStage.clientStageOutcome) return currentStage.clientStageOutcome;
    if (currentStage.awaitingOpponentAppeal) return 'WIN';
    return 'WIN';
}
