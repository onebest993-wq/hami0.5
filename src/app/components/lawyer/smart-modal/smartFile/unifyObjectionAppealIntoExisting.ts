/**
 * توحيد طعن لاحق من مرحلة الاعتراض مع الاستئناف القائم — بلا مرحلة استئناف ثانية.
 * رول واحد: يُضاف الطاعن الجديد إلى الإضبارة الاستئنافية القائمة.
 */
import type { CaseStage, Party, TimelineEvent } from '../../LawyerShared';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { UNIFIED_APPEALS_TIMELINE_TITLE } from '@/app/domain/lawsuit/objectionAppealConsequence';
import { isAbsentObjectionStageName } from './absentJudgmentStageNames';
import { isAppealStageName, isCassationStageName } from './judgmentStageNames';
import {
    extractParentheticalUnderlyingSide,
    isAppellantAppealRole,
    isDefendantSideRole,
    isPlaintiffSideRole,
    resolveAbsentObjectionOriginalSide,
} from './partyRoleClassification';
import { resolveAppealRoleTitles } from './appealPartyFlip';
import {
    mergeAppealStageMetadata,
    normalizePartyId,
    readAppellantPartyIds,
    readAppelleePartyIds,
} from './judgmentStageMetadataTypes';
import type { AppealTransitionPayload } from './judgmentPayloadTypes';
import { hasMeritJudgmentRecorded } from './opponentAppealMethods';

function uniqueIds(ids: Array<string | number | null | undefined>): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of ids) {
        const id = normalizePartyId(raw);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
    }
    return out;
}

function originalSide(party: Party): 'المدعي' | 'المدعى عليه' {
    const fromObjection = resolveAbsentObjectionOriginalSide(party);
    if (fromObjection) return fromObjection;
    const fromParens = extractParentheticalUnderlyingSide(String(party.role ?? ''));
    if (fromParens) return fromParens;
    const role = String(party.role ?? '');
    if (isDefendantSideRole(role) && !isPlaintiffSideRole(role)) return 'المدعى عليه';
    return 'المدعي';
}

function toCoAppellant(party: Party, appealType: string): Party {
    if (isAppellantAppealRole(String(party.role ?? ''))) return party;
    const { appellantTitle } = resolveAppealRoleTitles(appealType);
    return {
        ...party,
        role: `${appellantTitle} (${originalSide(party)})`,
        originalRole: (party as Party & { originalRole?: string }).originalRole ?? party.role,
    } as Party;
}

export function isLiveAppealStageForUnify(stage?: CaseStage | null): boolean {
    if (!stage) return false;
    const name = String(stage.stageName ?? stage.name ?? '');
    if (!isAppealStageName(name) || isCassationStageName(name)) return false;
    if (stage.status === 'completed' || stage.status === 'locked') return false;
    if (hasMeritJudgmentRecorded(stage)) return false;
    return true;
}

export function findLiveAppealStageIndexForUnify(stages?: CaseStage[] | null): number {
    if (!Array.isArray(stages)) return -1;
    return stages.findIndex((stage) => isLiveAppealStageForUnify(stage));
}

export function canUnifyObjectionAppealIntoExisting(params: {
    stages?: CaseStage[] | null;
    sourceStage?: CaseStage | null;
    appealType?: string | null;
}): boolean {
    const appealType = String(params.appealType ?? '').trim();
    if (appealType !== 'استئناف' && !appealType.includes('استئناف')) return false;
    if (appealType.includes('تمييز') || appealType.includes('اعتراض')) return false;
    const sourceName = String(params.sourceStage?.stageName ?? params.sourceStage?.name ?? '');
    if (!isAbsentObjectionStageName(sourceName)) return false;
    return findLiveAppealStageIndexForUnify(params.stages) >= 0;
}

export function applyUnifyObjectionAppealIntoExisting(params: {
    stages: CaseStage[];
    sourceIndex: number;
    sourceStage: CaseStage;
    appealType: string;
    appellant: string;
    filingDate: string;
    newCaseNumber: string;
    notes?: string;
    archiveTimelineEvent?: TimelineEvent;
    archiveFinalDecision?: string | null;
    archiveDecisionDate?: string | null;
    includedAppellantPartyIds?: Array<number | string>;
    includedOpponentPartyIds?: Array<number | string>;
}): { updatedStages: CaseStage[]; newActiveIndex: number } | null {
    const liveIndex = findLiveAppealStageIndexForUnify(params.stages);
    if (liveIndex < 0) return null;

    const today = params.filingDate || getLocalTodayYmd();
    const appeal = params.stages[liveIndex]!;
    const source = params.sourceStage;
    const appellantIds = uniqueIds([
        ...readAppellantPartyIds(appeal.appealMetadata),
        ...(params.includedAppellantPartyIds ?? []),
    ]);
    const appelleeIds = uniqueIds(
        (params.includedOpponentPartyIds?.length
            ? params.includedOpponentPartyIds
            : readAppelleePartyIds(appeal.appealMetadata)
        ).filter((id) => !appellantIds.includes(normalizePartyId(id) ?? '')),
    );

    const existingById = new Map(
        (appeal.parties ?? []).map((party) => [normalizePartyId(party.id) ?? '', party]),
    );
    const sourceById = new Map(
        (source.parties ?? []).map((party) => [normalizePartyId(party.id) ?? '', party]),
    );

    let parties = [...(appeal.parties ?? [])];
    for (const id of appellantIds) {
        const current = existingById.get(id) ?? sourceById.get(id);
        if (!current) continue;
        const next = toCoAppellant(current, params.appealType);
        const idx = parties.findIndex((party) => normalizePartyId(party.id) === id);
        if (idx >= 0) parties[idx] = next;
        else parties = [...parties, next];
        existingById.set(id, next);
    }

    const unifyEvent: TimelineEvent = {
        id: `unify_appeals_${today}_${Date.now()}`,
        type: 'milestone',
        date: today,
        title: UNIFIED_APPEALS_TIMELINE_TITLE,
        details: `وُحّد طعن ${params.appellant} مع الاستئناف القائم رقم ${appeal.caseNo || '—'} لنظرهما في رول موحد.${params.newCaseNumber ? `\nرقم العريضة الجديدة: ${params.newCaseNumber}` : ''}${params.notes ? `\n${params.notes}` : ''}`,
        isSystemLog: true,
        isNew: true,
    };

    const archiveEvent: TimelineEvent = params.archiveTimelineEvent ?? {
        id: `objection_unify_archive_${Date.now()}`,
        type: 'milestone',
        date: today,
        title: `أُقفلت إضبارة الاعتراض — توحيد مع الاستئناف القائم`,
        details: unifyEvent.details,
        isSystemLog: true,
        isNew: true,
    };

    const updatedStages = [...params.stages];
    updatedStages[params.sourceIndex] = {
        ...source,
        status: 'locked',
        isPleadingsClosed: true,
        awaitingOpponentAppeal: false,
        finalDecision: params.archiveFinalDecision ?? source.finalDecision,
        decisionDate: params.archiveDecisionDate ?? source.decisionDate,
        timeline: [archiveEvent, ...(source.timeline ?? [])],
    };
    updatedStages[liveIndex] = {
        ...appeal,
        parties,
        appealMetadata: mergeAppealStageMetadata(appeal.appealMetadata, {
            appellantPartyIds: appellantIds,
            appelleePartyIds: appelleeIds,
        }),
        timeline: [unifyEvent, ...(appeal.timeline ?? [])],
    };

    return {
        updatedStages,
        newActiveIndex: liveIndex,
    };
}

export function tryUnifyObjectionAppealIntoExisting(
    stages: CaseStage[],
    sourceIndex: number,
    sourceStage: CaseStage,
    params: Pick<
        AppealTransitionPayload,
        'appealType' | 'appellant' | 'filingDate' | 'newCaseNumber'
    > & {
        notes?: string;
        archiveTimelineEvent?: TimelineEvent;
        archiveFinalDecision?: string | null;
        archiveDecisionDate?: string | null;
        includedAppellantPartyIds?: Array<number | string>;
        includedOpponentPartyIds?: Array<number | string>;
    },
): { updatedStages: CaseStage[]; newActiveIndex: number } | null {
    if (
        !canUnifyObjectionAppealIntoExisting({
            stages,
            sourceStage,
            appealType: params.appealType,
        })
    ) {
        return null;
    }
    return applyUnifyObjectionAppealIntoExisting({
        stages,
        sourceIndex,
        sourceStage,
        appealType: params.appealType,
        appellant: params.appellant,
        filingDate: params.filingDate,
        newCaseNumber: params.newCaseNumber,
        notes: params.notes,
        archiveTimelineEvent: params.archiveTimelineEvent,
        archiveFinalDecision: params.archiveFinalDecision,
        archiveDecisionDate: params.archiveDecisionDate,
        includedAppellantPartyIds: params.includedAppellantPartyIds,
        includedOpponentPartyIds: params.includedOpponentPartyIds,
    });
}
