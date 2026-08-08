import type { CaseStage, IncidentalCase, Party } from '../../LawyerShared';
import { repairAppealStagePartyRoles } from './appealPartyEngine';
import { repairAbsentObjectionAppealStages } from './absentObjectionAppealRepair';
import { dedupeAppealThirdPartyShadows } from './partyRoleClassification';

function isRecord(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === 'object';
}

function coercePartyId(idRaw: unknown, fallback: number): number {
    if (typeof idRaw === 'number' && Number.isFinite(idRaw)) return idRaw;
    if (typeof idRaw === 'string' && idRaw.trim()) {
        const parsed = Number(idRaw);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
}

function coerceParty(raw: unknown, idx: number): Party | null {
    if (!isRecord(raw)) return null;
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!name) return null;

    const id = coercePartyId(raw.id, Date.now() + idx);

    const side =
        raw.side === 'right' || raw.side === 'left'
            ? raw.side
            : raw.affiliatedSide === 1
              ? 'right'
              : raw.affiliatedSide === 2
                ? 'left'
                : undefined;

    const roleRaw =
        typeof raw.role === 'string' && raw.role.trim()
            ? raw.role.trim()
            : typeof raw.status === 'string' && raw.status.trim()
              ? raw.status.trim()
              : typeof raw.roleLabel === 'string' && raw.roleLabel.trim()
                ? raw.roleLabel.trim()
                : side === 'right'
                  ? 'المدعي'
                  : side === 'left'
                    ? 'المدعى عليه'
                    : 'طرف';

    return {
        id,
        name,
        role: roleRaw,
        isClient: raw.isClient === true || raw.isMyOffice === true,
        phone: typeof raw.phone === 'string' ? raw.phone : undefined,
        address: typeof raw.address === 'string' ? raw.address : undefined,
        ...(side ? { side } : {}),
    };
}

function coercePartyList(raw: unknown): Party[] {
    if (!Array.isArray(raw)) return [];
    const out: Party[] = [];
    for (let i = 0; i < raw.length; i++) {
        const party = coerceParty(raw[i], i);
        if (party) out.push(party);
    }
    return out;
}

function partiesFromThirdPartyPayload(raw: unknown): Party[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((tp, idx) => {
            if (!isRecord(tp)) return null;
            const entryMode = typeof tp.entryMode === 'string' ? tp.entryMode : '';
            const affiliatedSide = tp.affiliatedSide === 1 || tp.affiliatedSide === 2 ? tp.affiliatedSide : null;
            const roleLabel =
                typeof tp.roleLabel === 'string' && tp.roleLabel.trim()
                    ? tp.roleLabel.trim()
                    : entryMode === 'interpleader'
                      ? 'شخص ثالث (اختصامي)'
                      : entryMode === 'affiliative'
                        ? affiliatedSide === 1
                            ? 'شخص ثالث (انضمامي — جانب المدعي)'
                            : 'شخص ثالث (انضمامي — جانب المدعى عليه)'
                        : 'شخص ثالث';
            return coerceParty(
                {
                    ...tp,
                    role: roleLabel,
                    side:
                        entryMode === 'interpleader'
                            ? undefined
                            : affiliatedSide === 1
                              ? 'right'
                              : affiliatedSide === 2
                                ? 'left'
                                : undefined,
                },
                idx + 300,
            );
        })
        .filter((p): p is Party => p !== null);
}

function partiesFromIncidentalCases(incidentalCases: IncidentalCase[] | undefined): Party[] {
    if (!Array.isArray(incidentalCases)) return [];
    const out: Party[] = [];
    for (let i = 0; i < incidentalCases.length; i++) {
        const c = incidentalCases[i];
        if (!c || c.type !== 'thirdParty' || c.status !== 'active' || c.entryDecision === 'rejected') continue;
        const name = String(c.partyName ?? '').trim();
        if (!name) continue;
        const mode = c.thirdPartyEntryMode;
        const role =
            mode === 'interpleader'
                ? 'شخص ثالث (اختصامي)'
                : mode === 'affiliative'
                  ? c.affiliationSide === 'plaintiff'
                      ? 'شخص ثالث (انضمامي — جانب المدعي)'
                      : 'شخص ثالث (انضمامي — جانب المدعى عليه)'
                  : 'شخص ثالث';
        out.push({
            id: coercePartyId(c.id, Date.now() + i + 500),
            name,
            role,
            isClient: false,
            side:
                mode === 'affiliative' && c.affiliationSide === 'plaintiff'
                    ? 'right'
                    : mode === 'affiliative' && c.affiliationSide === 'defendant'
                      ? 'left'
                      : undefined,
        });
    }
    return out;
}

function mergePartyLists(...lists: Party[][]): Party[] {
    const seen = new Set<string>();
    const out: Party[] = [];
    for (const list of lists) {
        for (const party of list) {
            const key = `${String(party.id ?? '')}|${String(party.name ?? '').trim()}|${String(party.role ?? '').trim()}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(party);
        }
    }
    return out;
}

export type ResolveDisplayPartiesInput = {
    displayStage?: CaseStage | null;
    file?: Record<string, unknown> | null;
    parentData?: { parties?: unknown[]; originalParties?: unknown[] } | null;
    allStages?: CaseStage[];
};

export function resolveDisplayParties(input: ResolveDisplayPartiesInput): Party[] {
    const allStages = Array.isArray(input.allStages) ? input.allStages : [];
    const displayStage = input.displayStage;
    const repairedStages =
        allStages.length > 0 && displayStage
            ? repairAbsentObjectionAppealStages(allStages)
            : allStages;
    const repairedDisplayStage =
        displayStage && repairedStages.length > 0
            ? repairedStages.find((s) => s.id === displayStage.id) ?? displayStage
            : displayStage;

    const stageParties = dedupeAppealThirdPartyShadows(
        repairAppealStagePartyRoles(
            coercePartyList(repairedDisplayStage?.parties),
            repairedDisplayStage,
        ),
    );
    if (stageParties.length > 0) return stageParties;

    const fileParties = coercePartyList(input.file?.parties);
    if (fileParties.length > 0) return fileParties;

    const parentParties = mergePartyLists(
        coercePartyList(input.parentData?.parties),
        coercePartyList(input.parentData?.originalParties),
    );
    if (parentParties.length > 0) return parentParties;

    const thirdPartyPayload = partiesFromThirdPartyPayload(input.file?.thirdParties);
    if (thirdPartyPayload.length > 0) return thirdPartyPayload;

    const stages = repairedStages.length > 0 ? repairedStages : allStages;
    for (let i = stages.length - 1; i >= 0; i--) {
        const recovered = coercePartyList(stages[i]?.parties);
        if (recovered.length > 0) return recovered;
    }

    const incidentalParties = partiesFromIncidentalCases(repairedDisplayStage?.incidentalCases);
    if (incidentalParties.length > 0) return incidentalParties;

    return [];
}
