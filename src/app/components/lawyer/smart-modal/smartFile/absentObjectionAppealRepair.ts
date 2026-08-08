/**
 * إصلاح إضابارات الاستئناف بعد اعتراض غيابي — سياق قانوني:
 *
 * 1) مرحلة الاعتراض على الحكم الغيابي:
 *    - المعترض = المدعى عليه الأصلي (عادة) — عمود «المعترض على الحكم الغيابي»
 *    - المعترض عليه = المدعي الأصلي (عادة) — عمود «المعترض عليه بالحكم الغيابي»
 *
 * 2) نتيجة الاعتراض:
 *    - تأييد الغيابي (إجابة الدعوى بالكامل): المدعي الأصلي يربح — الخاسر المعترض فقط يحق له الطعن
 *    - تعديل الحكم (رد كلياً): المدعي الأصلي يخسر — الخاسر المعترض عليه فقط يحق له الطعن
 *    - تعديل جزئي: يحق للطرفين الطعن فيما حُسم
 *
 * 3) انقلاب المراكز (عند فتح مرحلة الطعن فقط — لا عند wait_opponent):
 *    - مقدم الطعن → المستأنف / المميز (عمود الطاعن)
 *    - المخاصَم → المستأنف عليه / المميز عليه
 *    - الانقلاب يُبنى من الجانب الأصلي (المدعي/المدعى عليه) داخل القوسين، وليس من عمود الاعتراض
 *
 * 4) خطأ الإصدارات القديمة: عند تسجيل طعن الخصم بعد التأييد، كان يُعامل موكلك المعترض عليه
 *    كمدعى عليه في سياق الاعتراض → يُقلب خطأً إلى المستأنف. الإصلاح يعيد الانقلاب من
 *    الجانب الأصلي لمقدم الطعن (المعترض الخاسر = المدعى عليه الأصلي).
 */
import type { CaseStage, Party } from '../../LawyerShared';
import { isAbsentObjectionStageName } from './absentJudgmentFlow';
import {
    buildAppealStageParties,
    normalizePartyIdKey,
    partyIdInList,
} from './appealPartyEngine';
import { isAppealStageName } from './judgmentTypes';
import {
    extractParentheticalUnderlyingSide,
    isAbsentObjectedRole,
    isAbsentObjectorRole,
    isAppellantAppealRole,
    isDefendantSideRole,
    isPlaintiffSideRole,
    isThirdPartyRole,
    resolveAbsentObjectionOriginalSide,
} from './partyRoleClassification';

function stageLabel(stage: CaseStage | undefined): string {
    return String(stage?.stageName ?? stage?.name ?? '').trim();
}

function stageNameMatches(stage: CaseStage | undefined, target: string): boolean {
    const a = stageLabel(stage);
    const b = String(target ?? '').trim();
    if (!a || !b) return false;
    return a === b || a.includes(b) || b.includes(a);
}

/** من خسر الاعتراض — وهو مقدم الطعن المتوقع عند الطعن الأحادي */
export function inferAbsentObjectionOutcomeLoser(
    objectionStage: Pick<CaseStage, 'finalDecision' | 'lastJudgmentType'>,
): 'objector' | 'objected' | null {
    const fd = String(objectionStage.finalDecision ?? '').trim();
    const last = String(objectionStage.lastJudgmentType ?? '').trim();
    const combined = `${fd} ${last}`;

    const isPartial =
        combined.includes('رد الدعوى جزئياً')
        || combined.includes('تعديل جزئي')
        || combined.includes('جزئياً');

    if (isPartial) return null;

    const isFullModify =
        combined.includes('رد الدعوى كلياً')
        || combined.includes('تعديل الحكم الغيابي')
        || (combined.includes('تعديل') && combined.includes('الحكم'));

    if (isFullModify) return 'objected';

    const isUphold =
        combined.includes('إجابة الدعوى بالكامل')
        || combined.includes('تأييد الحكم الغيابي')
        || (combined.includes('إجابة الدعوى') && !combined.includes('رد الدعوى'))
        || (combined.includes('تأييد') && combined.includes('غيابي'));

    if (isUphold) return 'objector';

    return null;
}

function resolveOriginalSideFromPartyIds(
    parties: Party[],
    ids: Array<number | string>,
): 'المدعي' | 'المدعى عليه' | null {
    if (!ids.length) return null;
    const matched = parties.filter((p) => partyIdInList(ids, p.id));
    const mainLitigants = matched.filter((p) => !isThirdPartyRole(String(p.role ?? '')));
    const pool = mainLitigants.length > 0 ? mainLitigants : matched;

    for (const party of pool) {
        const fromObjection = resolveAbsentObjectionOriginalSide(party);
        if (fromObjection) return fromObjection;

        const fromParens = extractParentheticalUnderlyingSide(String(party.role ?? ''));
        if (fromParens) return fromParens;

        const role = String(party.role ?? '');
        if (isAppellantAppealRole(role)) {
            const underlying = extractParentheticalUnderlyingSide(role);
            if (underlying) return underlying;
        }
        if (isPlaintiffSideRole(role) && !isAbsentObjectedRole(role)) return 'المدعي';
        if (isDefendantSideRole(role)) return 'المدعى عليه';
    }

    return null;
}

/** الجانب الأصلي (مدعي/مدعى عليه) الذي يجب أن يُمرَّر لمقدم الطعن عند الانقلاب */
export function resolveCorrectAppellantLegalSideForAbsentObjectionAppeal(
    priorObjectionStage: CaseStage,
    appealStage: CaseStage,
): 'المدعي' | 'المدعى عليه' | null {
    const priorParties = priorObjectionStage.parties ?? [];
    const meta = appealStage.appealMetadata;
    const appellantIds = meta?.initialAppellantPartyIds ?? [];

    if (appellantIds.length > 0) {
        const fromPrior = resolveOriginalSideFromPartyIds(priorParties, appellantIds);
        if (fromPrior) return fromPrior;
        const fromAppeal = resolveOriginalSideFromPartyIds(appealStage.parties ?? [], appellantIds);
        if (fromAppeal) return fromAppeal;
    }

    const loser = inferAbsentObjectionOutcomeLoser(priorObjectionStage);
    if (loser) {
        const loserParty = priorParties.find((p) =>
            loser === 'objector'
                ? isAbsentObjectorRole(String(p.role ?? ''))
                : isAbsentObjectedRole(String(p.role ?? '')),
        );
        if (loserParty) {
            const side = resolveAbsentObjectionOriginalSide(loserParty);
            if (side) return side;
        }
    }

    const stored = meta?.appellant;
    if (stored === 'المدعي' || stored === 'المدعى عليه') return stored;

    return null;
}

export function isAbsentObjectionAppealFlipCorrupted(
    priorObjectionStage: CaseStage,
    appealStage: CaseStage,
): boolean {
    if (!isAbsentObjectionStageName(priorObjectionStage.stageName)) return false;
    if (!isAppealStageName(appealStage.stageName)) return false;

    const appealParties = appealStage.parties ?? [];
    if (
        appealParties.some(
            (p) =>
                isAbsentObjectorRole(String(p.role ?? ''))
                || isAbsentObjectedRole(String(p.role ?? '')),
        )
    ) {
        return true;
    }

    const correctSide = resolveCorrectAppellantLegalSideForAbsentObjectionAppeal(
        priorObjectionStage,
        appealStage,
    );
    if (!correctSide) return false;

    const stored = appealStage.appealMetadata?.appellant;
    if (
        stored
        && stored !== correctSide
        && stored !== 'الشخص الثالث الاختصامي'
        && !String(stored).includes('اختصامي')
    ) {
        return true;
    }

    const appellantIds = appealStage.appealMetadata?.initialAppellantPartyIds ?? [];
    for (const id of appellantIds) {
        const party = appealParties.find(
            (p) => normalizePartyIdKey(p.id) === normalizePartyIdKey(id),
        );
        if (party && !isAppellantAppealRole(String(party.role ?? ''))) return true;
    }

    const loser = inferAbsentObjectionOutcomeLoser(priorObjectionStage);
    if (!loser) return false;

    const priorParties = priorObjectionStage.parties ?? [];
    const winnerParty = priorParties.find((p) =>
        loser === 'objector'
            ? isAbsentObjectedRole(String(p.role ?? ''))
            : isAbsentObjectorRole(String(p.role ?? '')),
    );
    if (!winnerParty?.id) return false;

    const winnerOnAppeal = appealParties.find(
        (p) => normalizePartyIdKey(p.id) === normalizePartyIdKey(winnerParty.id),
    );
    if (winnerOnAppeal && isAppellantAppealRole(String(winnerOnAppeal.role ?? ''))) {
        return true;
    }

    return false;
}

function mergePartyClientMarkers(repaired: Party[], existing: Party[]): Party[] {
    const byId = new Map<string, Party>();
    for (const party of existing) {
        const key = normalizePartyIdKey(party.id);
        if (key) byId.set(key, party);
    }
    return repaired.map((party) => {
        const key = normalizePartyIdKey(party.id);
        const prev = key ? byId.get(key) : undefined;
        if (!prev) return party;
        return {
            ...party,
            isClient: prev.isClient ?? party.isClient,
            isMyOffice: prev.isMyOffice ?? party.isMyOffice,
            lawyer: prev.lawyer ?? party.lawyer,
            phone: prev.phone ?? party.phone,
            address: prev.address ?? party.address,
        };
    });
}

function findPriorObjectionStageIndex(stages: CaseStage[], appealIndex: number): number {
    const appealStage = stages[appealIndex];
    const metaName = appealStage?.appealMetadata?.previousStage;
    if (metaName && isAbsentObjectionStageName(metaName)) {
        for (let i = appealIndex - 1; i >= 0; i--) {
            if (stageNameMatches(stages[i], metaName)) return i;
        }
    }
    for (let j = appealIndex - 1; j >= 0; j--) {
        const name = stages[j]?.stageName;
        if (isAbsentObjectionStageName(name)) return j;
        if (isAppealStageName(name)) break;
    }
    return -1;
}

export function repairSingleAbsentObjectionAppealStage(
    priorObjectionStage: CaseStage,
    appealStage: CaseStage,
): CaseStage {
    const correctAppellantSide = resolveCorrectAppellantLegalSideForAbsentObjectionAppeal(
        priorObjectionStage,
        appealStage,
    );
    if (!correctAppellantSide) return appealStage;

    const appealType = appealStage.appealMetadata?.appealType ?? 'استئناف';
    const appellantIds = appealStage.appealMetadata?.initialAppellantPartyIds ?? [];
    const priorParties = priorObjectionStage.parties ?? [];

    const opponentIds = priorParties
        .filter(
            (p) =>
                p.id != null
                && !appellantIds.some(
                    (id) => normalizePartyIdKey(id) === normalizePartyIdKey(p.id),
                ),
        )
        .map((p) => p.id)
        .filter((id): id is number | string => id != null);

    const flipped = buildAppealStageParties(
        priorParties,
        correctAppellantSide,
        appealType,
        priorObjectionStage.incidentalCases,
        opponentIds,
        appellantIds,
    );

    const mergedParties = mergePartyClientMarkers(flipped, appealStage.parties ?? []);
    const repairedAppellantIds = mergedParties
        .filter((p) => isAppellantAppealRole(String(p.role ?? '')))
        .map((p) => p.id)
        .filter((id): id is number | string => id != null);

    return {
        ...appealStage,
        parties: mergedParties,
        appealMetadata: {
            ...appealStage.appealMetadata,
            appellant: correctAppellantSide,
            initialAppellantPartyIds:
                repairedAppellantIds.length > 0 ? repairedAppellantIds : appellantIds,
        },
    };
}

/** إصلاح مراحل الاستئناف/التمييز المفتوحة بعد اعتراض غيابي بانقلاب خاطئ */
export function repairAbsentObjectionAppealStages(stages: CaseStage[]): CaseStage[] {
    if (!Array.isArray(stages) || stages.length === 0) return stages;

    const result = [...stages];
    for (let i = 0; i < result.length; i++) {
        const appealStage = result[i];
        if (!isAppealStageName(appealStage?.stageName)) continue;

        const priorIdx = findPriorObjectionStageIndex(result, i);
        if (priorIdx < 0) continue;

        const priorObjectionStage = result[priorIdx]!;
        if (!isAbsentObjectionAppealFlipCorrupted(priorObjectionStage, appealStage)) continue;

        result[i] = repairSingleAbsentObjectionAppealStage(priorObjectionStage, appealStage);
    }

    return result;
}
