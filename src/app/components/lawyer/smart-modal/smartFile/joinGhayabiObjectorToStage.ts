import type { CaseStage, Party } from '../../LawyerShared';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import {
    LANE_STATE_OBJECTION,
    markLanesState,
} from '@/app/domain/lawsuit/partyChallengeLanes';
import {
    canJoinGhayabiObjector,
    formatUnifiedObjectionBanner,
    listEligibleJoinableGhayabiObjectors,
    type JoinableGhayabiObjector,
} from '@/app/domain/lawsuit/joinGhayabiObjector';
import { findPriorFirstInstanceJudgmentIndex } from './art172AppealStay';
import { isAbsentObjectionStageName } from './absentJudgmentStageNames';
import { isAbsentObjectorRole } from './partyRoleClassification';
import { resolveAppealRoleTitles } from './appealPartyFlip';
import {
    mergeAppealStageMetadata,
    normalizePartyId,
    readAppellantPartyIds,
    readAppelleePartyIds,
} from './judgmentStageMetadataTypes';

export function findOpenAbsentObjectionStageIndex(stages?: CaseStage[] | null): number {
    if (!Array.isArray(stages)) return -1;
    return stages.findIndex((stage) => {
        const name = String(stage.stageName ?? stage.name ?? '');
        if (!isAbsentObjectionStageName(name)) return false;
        if (stage.status === 'locked' || stage.status === 'completed') return false;
        if (String(stage.finalDecision ?? '').trim()) return false;
        return true;
    });
}

export function listUnifiedObjectionObjectorNames(parties?: Party[] | null): string[] {
    if (!Array.isArray(parties)) return [];
    return parties
        .filter((party) => isAbsentObjectorRole(String(party.role ?? '')))
        .map((party) => String(party.name ?? '').trim())
        .filter(Boolean);
}

export function resolveUnifiedObjectionBanner(parties?: Party[] | null): string {
    const names = listUnifiedObjectionObjectorNames(parties);
    if (names.length < 2) return '';
    return formatUnifiedObjectionBanner(names);
}

export function resolveJoinableCoObjectors(params: {
    stages?: CaseStage[] | null;
    today?: string;
}): JoinableGhayabiObjector[] {
    const fiIndex = findPriorFirstInstanceJudgmentIndex(params.stages);
    const fi = fiIndex >= 0 ? params.stages?.[fiIndex] : undefined;
    if (!fi) return [];
    return listEligibleJoinableGhayabiObjectors({
        lanes: fi.partyChallengeLanes,
        parties: fi.parties,
        today: params.today ?? getLocalTodayYmd(),
    });
}

export function canOfferJoinCoObjector(_params: {
    currentStage?: CaseStage | null;
    stages?: CaseStage[] | null;
    viewingStageIndex?: number;
    today?: string;
}): boolean {
    /** أُلغي الضم — المعترض اللاحق بإضبارة مستقلة يختار المستخدم أطرافها */
    return false;
}

function toAbsentObjectorParty(party: Party): Party {
    const { appellantTitle } = resolveAppealRoleTitles('اعتراض على الحكم الغيابي');
    if (isAbsentObjectorRole(String(party.role ?? ''))) return party;
    return {
        ...party,
        role: `${appellantTitle} (المدعى عليه)`,
        side: 'right',
        originalRole: (party as Party & { originalRole?: string }).originalRole ?? party.role,
    } as Party;
}

function uniquePartyIds(ids: Array<string | number | null | undefined>): string[] {
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

export function applyJoinGhayabiObjectorToObjectionStage(params: {
    stages: CaseStage[];
    objectorPartyId: string;
    today?: string;
}): { stages: CaseStage[]; objectorName: string; banner: string } | { error: string } {
    const today = params.today ?? getLocalTodayYmd();
    const objectorId = String(params.objectorPartyId ?? '').trim();
    if (!objectorId) return { error: 'حدّد المعترض الغائب' };

    const objectionIndex = findOpenAbsentObjectionStageIndex(params.stages);
    if (objectionIndex < 0) return { error: 'لا توجد مرحلة اعتراض قائمة لضم المعترض' };

    const fiIndex = findPriorFirstInstanceJudgmentIndex(params.stages);
    if (fiIndex < 0) return { error: 'لا يوجد حكم بدائي لبطاقات الطعن' };

    const fi = params.stages[fiIndex]!;
    const objection = params.stages[objectionIndex]!;
    const existingParty = (objection.parties ?? []).find(
        (party) => normalizePartyId(party.id) === objectorId,
    );
    if (existingParty && isAbsentObjectorRole(String(existingParty.role ?? ''))) {
        return { error: 'هذا الطرف معترض في المرحلة القائمة' };
    }
    if (!canJoinGhayabiObjector({
        lanes: fi.partyChallengeLanes,
        partyId: objectorId,
        today,
    })) {
        return { error: 'لا يمكن ضم هذا الطرف — ليس غائباً مؤهلاً ضمن مهلة العشرة أيام' };
    }

    const sourceParty =
        (fi.parties ?? []).find((party) => normalizePartyId(party.id) === objectorId)
        ?? existingParty;
    if (!sourceParty) return { error: 'الطرف غير موجود في الإضبارة' };

    const next = [...params.stages];
    next[fiIndex] = {
        ...fi,
        partyChallengeLanes: markLanesState(fi.partyChallengeLanes, [objectorId], LANE_STATE_OBJECTION),
    };

    const existingIds = new Set(
        (objection.parties ?? []).map((party) => normalizePartyId(party.id)).filter(Boolean),
    );
    const parties = existingIds.has(objectorId)
        ? (objection.parties ?? []).map((party) =>
            normalizePartyId(party.id) === objectorId ? toAbsentObjectorParty(party) : party,
        )
        : [...(objection.parties ?? []), toAbsentObjectorParty(sourceParty)];

    const appellantPartyIds = uniquePartyIds([
        ...readAppellantPartyIds(objection.appealMetadata),
        objectorId,
    ]);
    const appelleePartyIds = readAppelleePartyIds(objection.appealMetadata).filter(
        (id) => id !== objectorId,
    );

    const objectorName = String(sourceParty.name ?? '').trim() || `طرف ${objectorId}`;
    const event = {
        id: `join_obj_${objectorId}_${today}_${Date.now()}`,
        type: 'decision' as const,
        date: today,
        title: 'ضم معترض غائب',
        details: `أُضيف ${objectorName} إلى مرحلة الاعتراض القائمة دون فتح إضبارة جديدة.`,
        isSystemLog: true,
        isNew: true,
    };

    next[objectionIndex] = {
        ...objection,
        parties,
        appealMetadata: mergeAppealStageMetadata(objection.appealMetadata, {
            appellantPartyIds,
            appelleePartyIds,
        }),
        timeline: [event, ...(objection.timeline ?? [])],
    };

    return {
        stages: next,
        objectorName,
        banner: resolveUnifiedObjectionBanner(parties),
    };
}

export function tryJoinExistingGhayabiObjector(_params: {
    stages: CaseStage[];
    objectorPartyId: string;
    today?: string;
}):
    | { kind: 'none' }
    | { kind: 'joined'; stages: CaseStage[]; objectorName: string; banner: string }
    | { kind: 'error'; error: string } {
    /** أُلغي الضم إلى مرحلة قائمة — المسار الصحيح: إضبارة مستقلة */
    return { kind: 'none' };
}
