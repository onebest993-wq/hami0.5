import type { CaseStage } from '../../LawyerShared';
import {
    applyArt210CassationExtension,
    parseCassationGroundsScope,
    type CassationGroundsScope,
} from '@/app/domain/lawsuit/cassationArt210';
import type { DisputeIntegrity } from '@/app/domain/lawsuit/partyJudgmentDisposition';
import { findPriorFirstInstanceJudgmentIndex } from './art172AppealStay';
import { readAppellantPartyIds } from './judgmentStageMetadataTypes';

/** بعد نقض وإعادة: يُحفظ نطاق الأسباب وتُحيى بطاقات الشركاء على البداءة (م/210). */
export function patchDossierAfterCassationRemand(params: {
    stages: CaseStage[];
    cassationIndex: number;
    groundsScope?: CassationGroundsScope | string | null;
    parentIntegrity?: DisputeIntegrity | string | null;
}): CaseStage[] {
    const cassation = params.stages[params.cassationIndex];
    if (!cassation) return params.stages;
    const grounds = parseCassationGroundsScope(
        params.groundsScope ?? cassation.appealMetadata?.cassationGroundsScope,
    );
    const next = [...params.stages];
    next[params.cassationIndex] = {
        ...cassation,
        appealMetadata: {
            ...cassation.appealMetadata,
            cassationGroundsScope: grounds,
        },
    };
    const fiIndex = findPriorFirstInstanceJudgmentIndex(next);
    if (fiIndex < 0) return next;
    const fi = next[fiIndex];
    if (!fi) return next;
    next[fiIndex] = {
        ...fi,
        partyChallengeLanes: applyArt210CassationExtension({
            lanes: fi.partyChallengeLanes,
            integrity: fi.disputeIntegrity ?? params.parentIntegrity,
            groundsScope: grounds,
            cassatorPartyIds: readAppellantPartyIds(next[params.cassationIndex]?.appealMetadata),
            effect: 'REVERSED_REMANDED',
            dispositions: fi.partyJudgmentDispositions,
        }),
    };
    return next;
}
