import type { IncidentalCase, Party } from '../../LawyerShared';
import {
    isInterpleaderThirdPartyRole,
    partitionPartiesForHeader,
} from './partyRoleClassification';
import {
    INTERPLEADER_JUDGMENT_THIRD_FULL,
    INTERPLEADER_JUDGMENT_THIRD_PARTIAL,
    isInterpleaderJudgmentType,
    resolveClientPartyBucket,
    resolveLawyerJudgmentBucket,
    type LawyerJudgmentBucket,
} from './interpleaderJudgmentEngine';
import {
    defaultIncludedAppellantIds,
    defaultIncludedOpponentIds,
    listAppellantPartiesForAppeal,
    listOpponentPartiesForAppeal,
    normalizePartyIdKey,
    type AppealSide,
} from './appealPartyListHelpers';

import { INTERPLEADER_APPELLANT_SIDE } from './appealInterpleaderConstants';
export { INTERPLEADER_APPELLANT_SIDE } from './appealInterpleaderConstants';

type AppealDossierMode = 'standard' | 'interpleader_appellant' | 'against_interpleader';

export type AppealDossierLayout = {
    mode: AppealDossierMode;
    appellantParties: Party[];
    opponentParties: Party[];
    defaultAppellantIds: Array<number | string>;
    defaultOpponentIds: Array<number | string>;
    appellantSideLabel: string;
    opponentSideLabel: string;
    /** قيمة مقدم الطعن المُمرَّرة لانقلاب المراكز */
    appellantLegalSide: string;
    lawyerBucket: LawyerJudgmentBucket | null;
};

/** إجابة طلب الشخص الثالث (كاملاً أو جزئياً) — لا طعن لوكلائه */
export function isInterpleaderRequestAnswered(judgmentType: string): boolean {
    return (
        judgmentType === INTERPLEADER_JUDGMENT_THIRD_FULL
        || judgmentType === INTERPLEADER_JUDGMENT_THIRD_PARTIAL
    );
}

/** رد طلب الشخص الثالث — يحق لموكله الاختصامي الطعن */
export function isInterpleaderRequestDismissed(judgmentType: string): boolean {
    if (!isInterpleaderJudgmentType(judgmentType)) return false;
    if (isInterpleaderRequestAnswered(judgmentType)) return false;
    if (judgmentType === 'إبطال' || judgmentType === 'إبطال عريضة الدعوى وعريضة التدخل') return false;
    if (judgmentType === 'الصلح' || judgmentType === 'التنازل عن الدعوى') return false;
    return true;
}

function listInterpleaderParties(parties: Party[]): Party[] {
    return partitionPartiesForHeader(parties).interpleaders;
}

/** المدعون والمدعى عليهم (بدون الاختصاميين) + الانضماميون */
function listMainLitigantParties(
    parties: Party[],
    incidentalCases?: IncidentalCase[],
): Party[] {
    const plaintiffs = listAppellantPartiesForAppeal(parties, 'المدعي', incidentalCases);
    const defendants = listAppellantPartiesForAppeal(parties, 'المدعى عليه', incidentalCases);
    const seen = new Set<number | string>();
    const out: Party[] = [];
    for (const party of [...plaintiffs, ...defendants]) {
        if (seen.has(party.id)) continue;
        seen.add(party.id);
        out.push(party);
    }
    return out;
}

/** يُفعَّل وضع الاختصام من علامة الموكل ونوع الحكم — لا يشترط كون الموكل اختصامياً */
export function resolveAppealDossierMode(
    judgmentType: string | undefined,
    parties: Party[],
    representedParty?: string | null,
): AppealDossierMode {
    if (!judgmentType || !isInterpleaderJudgmentType(judgmentType)) return 'standard';
    if (listInterpleaderParties(parties).length === 0) return 'standard';

    const clientBucket =
        resolveClientPartyBucket(parties)
        ?? resolveLawyerJudgmentBucket(representedParty, parties);
    if (!clientBucket) return 'standard';

    if (clientBucket === 'interpleader' && isInterpleaderRequestDismissed(judgmentType)) {
        return 'interpleader_appellant';
    }

    if (
        (clientBucket === 'plaintiff' || clientBucket === 'defendant')
        && isInterpleaderRequestAnswered(judgmentType)
    ) {
        return 'against_interpleader';
    }

    return 'standard';
}

export function resolveAppealDossierLayout(
    parties: Party[],
    options: {
        judgmentType?: string;
        representedParty?: string | null;
        incidentalCases?: IncidentalCase[];
        standardAppellantSide: AppealSide;
    },
): AppealDossierLayout {
    const clientBucket =
        resolveClientPartyBucket(parties)
        ?? resolveLawyerJudgmentBucket(options.representedParty, parties);
    const mode = resolveAppealDossierMode(
        options.judgmentType,
        parties,
        options.representedParty,
    );
    const interpleaders = listInterpleaderParties(parties);

    if (mode === 'interpleader_appellant') {
        const mainLitigants = listMainLitigantParties(parties, options.incidentalCases);
        return {
            mode,
            appellantParties: interpleaders,
            opponentParties: mainLitigants,
            defaultAppellantIds: interpleaders.map((p) => p.id),
            defaultOpponentIds: mainLitigants.map((p) => p.id),
            appellantSideLabel: 'الشخص الثالث الاختصامي',
            opponentSideLabel: 'المدعون والمدعى عليهم',
            appellantLegalSide: INTERPLEADER_APPELLANT_SIDE,
            lawyerBucket: clientBucket,
        };
    }

    if (mode === 'against_interpleader') {
        const ourSide = clientBucket === 'defendant' ? 'المدعى عليه' : 'المدعي';
        const ourParties = listAppellantPartiesForAppeal(
            parties,
            ourSide as AppealSide,
            options.incidentalCases,
        );
        return {
            mode,
            appellantParties: ourParties,
            opponentParties: interpleaders,
            defaultAppellantIds: ourParties.map((p) => p.id),
            defaultOpponentIds: interpleaders.map((p) => p.id),
            appellantSideLabel: ourSide === 'المدعي' ? 'المدعي' : 'المدعى عليه',
            opponentSideLabel: 'الشخص الثالث الاختصامي',
            appellantLegalSide: ourSide,
            lawyerBucket: clientBucket,
        };
    }

    const appellantSide = options.standardAppellantSide;
    const appellantParties = listAppellantPartiesForAppeal(
        parties,
        appellantSide,
        options.incidentalCases,
    );
    const opponentParties = listOpponentPartiesForAppeal(
        parties,
        appellantSide,
        options.incidentalCases,
    );

    return {
        mode: 'standard',
        appellantParties,
        opponentParties,
        defaultAppellantIds: defaultIncludedAppellantIds(parties, appellantSide, options.incidentalCases),
        defaultOpponentIds: defaultIncludedOpponentIds(parties, appellantSide, options.incidentalCases),
        appellantSideLabel: appellantSide === 'المدعي' ? 'المدعي' : 'المدعى عليه',
        opponentSideLabel: appellantSide === 'المدعي' ? 'المدعى عليه' : 'المدعي',
        appellantLegalSide: appellantSide,
        lawyerBucket: clientBucket,
    };
}

export function filterPartiesForAppealDossier(
    parties: Party[],
    layout: Pick<AppealDossierLayout, 'mode' | 'appellantLegalSide'>,
    incidentalCases: IncidentalCase[] | undefined,
    includedAppellantPartyIds: Array<number | string> | undefined,
    includedOpponentPartyIds: Array<number | string> | undefined,
    dossierLayout: AppealDossierLayout,
): Party[] {
    const appellantIds = new Set(
        (includedAppellantPartyIds ?? dossierLayout.defaultAppellantIds).map(normalizePartyIdKey),
    );
    const opponentIds = new Set(
        (includedOpponentPartyIds ?? dossierLayout.defaultOpponentIds).map(normalizePartyIdKey),
    );

    if (layout.mode === 'interpleader_appellant') {
        return parties.filter((party) => {
            if (isInterpleaderThirdPartyRole(String(party.role ?? ''))) {
                return appellantIds.has(normalizePartyIdKey(party.id));
            }
            return opponentIds.has(normalizePartyIdKey(party.id));
        });
    }

    if (layout.mode === 'against_interpleader') {
        return parties.filter((party) => {
            if (isInterpleaderThirdPartyRole(String(party.role ?? ''))) {
                return opponentIds.has(normalizePartyIdKey(party.id));
            }
            return appellantIds.has(normalizePartyIdKey(party.id));
        });
    }

    const appellantSide = layout.appellantLegalSide as AppealSide;
    return parties.filter((party) => {
        const onAppellantSide =
            listAppellantPartiesForAppeal([party], appellantSide, incidentalCases).length > 0;
        if (onAppellantSide) return appellantIds.has(normalizePartyIdKey(party.id));
        return opponentIds.has(normalizePartyIdKey(party.id));
    });
}
