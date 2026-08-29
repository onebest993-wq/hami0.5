/**
 * انقلاب أطراف مرحلة الطعن — بلا اعتماد على appealPartyEngine.
 * يكسر دورة appealPartyEngine ↔ appealStageTransition.
 */
import type { IncidentalCase, Party } from '../../LawyerShared';
import { resolveAbsentObjectionClientRole } from './absentJudgmentFlow';
import { resolveLawyerSide } from './judgmentTypes';
import { INTERPLEADER_APPELLANT_SIDE } from './appealInterpleaderConstants';
import {
    extractParentheticalUnderlyingSide,
    isAbsentObjectedRole,
    isAbsentObjectorRole,
    isDefendantSideRole,
    isInterpleaderThirdPartyRole,
    isPlaintiffSideRole,
    isThirdPartyRole,
    resolveAbsentObjectionOriginalSide,
} from './partyRoleClassification';

function underlyingSideLabel(role: string): 'المدعي' | 'المدعى عليه' | null {
    const fromParens = extractParentheticalUnderlyingSide(role);
    if (fromParens) return fromParens;
    if (isDefendantSideRole(role)) return 'المدعى عليه';
    if (isPlaintiffSideRole(role)) return 'المدعي';
    return null;
}

export function resolveAppealRoleTitles(appealType: string): { appellantTitle: string; appelleeTitle: string } {
    const t = String(appealType ?? '').trim();
    if (t === 'تمييز') return { appellantTitle: 'المميز', appelleeTitle: 'المميز عليه' };
    if (t.includes('إعادة محاكمة')) {
        return { appellantTitle: 'طالب إعادة المحاكمة', appelleeTitle: 'المطلوب إعادة محاكمته' };
    }
    if (t.includes('اعتراض')) {
        return {
            appellantTitle: 'المعترض على الحكم الغيابي',
            appelleeTitle: 'المعترض عليه بالحكم الغيابي',
        };
    }
    return { appellantTitle: 'المستأنف', appelleeTitle: 'المستأنف عليه' };
}

export function resolveOpponentAsAppellant(
    representedParty?: string | null,
    parties?: Array<{ role?: string; isClient?: boolean }>,
): 'المدعي' | 'المدعى عليه' {
    if (
        parties?.some(
            (p) =>
                isAbsentObjectorRole(String(p.role ?? ''))
                || isAbsentObjectedRole(String(p.role ?? '')),
        )
    ) {
        const clientRole = resolveAbsentObjectionClientRole(parties);
        if (clientRole === 'objected') return 'المدعى عليه';
        if (clientRole === 'objector') return 'المدعي';
        const objector = parties?.find((p) => isAbsentObjectorRole(String(p.role ?? '')));
        if (objector) {
            const objectorOriginal = resolveAbsentObjectionOriginalSide(objector);
            if (objectorOriginal) return objectorOriginal;
        }
    }

    const side = resolveLawyerSide(representedParty, parties);
    if (side === 'المدعي') return 'المدعى عليه';
    if (side === 'المدعى عليه') return 'المدعي';
    return 'المدعى عليه';
}

function findIncidentalForParty(party: Party, incidentalCases?: IncidentalCase[]): IncidentalCase | undefined {
    if (!Array.isArray(incidentalCases)) return undefined;
    const name = String(party.name ?? '').trim();
    return incidentalCases.find(
        (c) =>
            c.type === 'thirdParty'
            && c.status === 'active'
            && c.entryDecision !== 'rejected'
            && String(c.partyName ?? '').trim() === name,
    );
}

function normalizePartyIdKey(id: number | string | null | undefined): string {
    return String(id ?? '').trim();
}

function partyIdInSelectionList(
    ids: Array<number | string> | undefined,
    partyId: number | string | null | undefined,
): boolean {
    if (!ids?.length) return false;
    const key = normalizePartyIdKey(partyId);
    return ids.some((id) => normalizePartyIdKey(id) === key);
}

export type AppealPartyFlipSelection = {
    includedAppellantPartyIds?: Array<number | string>;
    includedOpponentPartyIds?: Array<number | string>;
};

function resolvePartyAppealSideFromSelection(
    party: Party,
    selection?: AppealPartyFlipSelection,
    appellant?: string,
): boolean | null {
    if (!selection) return null;
    const hasAppellantList = Boolean(selection.includedAppellantPartyIds?.length);
    const hasOpponentList = Boolean(selection.includedOpponentPartyIds?.length);
    if (!hasAppellantList && !hasOpponentList) return null;

    if (partyIdInSelectionList(selection.includedAppellantPartyIds, party.id)) return true;
    if (partyIdInSelectionList(selection.includedOpponentPartyIds, party.id)) return false;

    if (hasAppellantList && appellant && !String(appellant).includes('اختصام')) {
        const appellantIsPlaintiff = appellant === 'المدعي' || appellant.includes('مدعي');
        const appellantLegalSide: 'المدعي' | 'المدعى عليه' | null = appellantIsPlaintiff
            ? 'المدعي'
            : appellant.includes('مدعى')
              ? 'المدعى عليه'
              : null;
        const partyLegalSide = underlyingSideLabel(String(party.role ?? ''));
        if (appellantLegalSide && partyLegalSide === appellantLegalSide) {
            return false;
        }
    }

    return null;
}

export function flipPartiesForAppealStage(
    parties: Party[],
    appellant: string,
    appealType: string,
    incidentalCases?: IncidentalCase[],
    selection?: AppealPartyFlipSelection,
): Party[] {
    const { appellantTitle, appelleeTitle } = resolveAppealRoleTitles(appealType);
    const appellantIsPlaintiff = appellant === 'المدعي' || appellant.includes('مدعي');
    const appellantIsInterpleader =
        appellant === INTERPLEADER_APPELLANT_SIDE || appellant.includes('اختصامي');

    const seen = new Set<number | string>();
    const result: Party[] = [];

    for (const party of parties) {
        if (seen.has(party.id)) continue;
        seen.add(party.id);

        const selectedSide = resolvePartyAppealSideFromSelection(party, selection, appellant);

        if (isThirdPartyRole(party.role)) {
            const inc = findIncidentalForParty(party, incidentalCases);
            if (inc?.thirdPartyEntryMode === 'affiliative') {
                const withPlaintiff = inc.affiliationSide === 'plaintiff';
                const onAppellantSide =
                    selectedSide !== null
                        ? selectedSide
                        : appellantIsInterpleader
                          ? false
                          : appellantIsPlaintiff
                            ? withPlaintiff
                            : !withPlaintiff;
                result.push({
                    ...party,
                    role: onAppellantSide
                        ? `${appellantTitle} (شخص ثالث — انضمامي)`
                        : `${appelleeTitle} (شخص ثالث — انضمامي)`,
                    side: onAppellantSide ? 'right' : 'left',
                    originalRole: party.role,
                } as Party & { originalRole?: string });
            } else if (
                isInterpleaderThirdPartyRole(party.role) ||
                String(inc?.thirdPartyEntryMode ?? '') === 'interpleader'
            ) {
                const onAppellantSide =
                    selectedSide !== null ? selectedSide : appellantIsInterpleader;
                result.push({
                    ...party,
                    role: onAppellantSide
                        ? `${appellantTitle} (شخص ثالث اختصامي)`
                        : `${appelleeTitle} (شخص ثالث اختصامي)`,
                    side: onAppellantSide ? 'right' : 'left',
                    originalRole: party.role,
                } as Party & { originalRole?: string });
            } else {
                const onAppellantSide = selectedSide === true;
                result.push({
                    ...party,
                    role: onAppellantSide
                        ? `${appellantTitle} (شخص ثالث)`
                        : `${appelleeTitle} (شخص ثالث)`,
                    side: onAppellantSide ? 'right' : 'left',
                    originalRole: party.role,
                } as Party & { originalRole?: string });
            }
            continue;
        }

        const side = underlyingSideLabel(party.role);
        let newRole = party.role;
        let newSide = party.side;

        if (side === 'المدعي') {
            const isAppellant =
                selectedSide !== null ? selectedSide : appellantIsPlaintiff;
            newRole = isAppellant
                ? `${appellantTitle} (المدعي)`
                : `${appelleeTitle} (المدعي)`;
            newSide = isAppellant ? 'right' : 'left';
        } else if (side === 'المدعى عليه') {
            const isAppellant =
                selectedSide !== null ? selectedSide : !appellantIsPlaintiff;
            newRole = isAppellant
                ? `${appellantTitle} (المدعى عليه)`
                : `${appelleeTitle} (المدعى عليه)`;
            newSide = isAppellant ? 'right' : 'left';
        }

        result.push({
            ...party,
            role: newRole,
            side: newSide,
            originalRole: party.role,
        } as Party & { originalRole?: string });
    }

    return result;
}
