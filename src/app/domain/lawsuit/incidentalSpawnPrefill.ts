import type { FileData } from './lawsuitFileTypes';
import type { Party } from '@/app/components/lawyer/lawyerShared/fileDataTypes';
import { computeLawsuitStageOptions } from './lawsuitStageOptions';
import { partitionPartiesBySide } from '@/app/components/lawyer/smart-modal/smartFile/partyRoleClassification';

/** طرف نموذج الإنشاء — حقول النواة فقط، بلا استيراد LawyerNewCase. */
export type IncidentalSpawnFormParty = {
    id: string;
    name: string;
    status: string;
    isClient: boolean;
    phone: string;
    address: string;
};

export type IncidentalSpawnStageOverride = {
    stageIndex: number;
    stageName: string;
    court: string;
    judge: string;
    docType: string;
    retrialTargetStage?: string;
    parties: Party[];
};

export type IncidentalSpawnContext = {
    parentFileId: number;
    parentCaseNo: string;
    incidentalId: string;
    type: 'joined' | 'counter';
    details?: string;
    stageOverride?: IncidentalSpawnStageOverride;
    filingPartyId?: string;
    filingPartyName?: string;
};

type IncidentalSpawnParentSnapshot = {
    court: string;
    judge: string;
    docType: string;
    stage: string;
    retrialTargetStage?: string;
    plaintiffs: IncidentalSpawnFormParty[];
    defendants: IncidentalSpawnFormParty[];
};

export type IncidentalSpawnContextEnriched = IncidentalSpawnContext & {
    parent: IncidentalSpawnParentSnapshot;
};

export type IncidentalSpawnPartySelection = {
    filingPartyId?: string | null;
    opposingPartyId?: string | null;
};

export type IncidentalSpawnPrefill = {
    caseDetails: {
        number: string;
        court: string;
        type: string;
        judge: string;
        firstHearingDate: string;
        stage: string;
        claimValue: string;
        totalAgreedFees: string;
        retrialTargetStage: string;
    };
    parties1: IncidentalSpawnFormParty[];
    parties2: IncidentalSpawnFormParty[];
    stageOptions: string[];
    requiresFilingPartyPick: boolean;
    requiresOpposingPartyPick: boolean;
    filingPartyCandidates: IncidentalSpawnFormParty[];
    opposingPartyCandidates: IncidentalSpawnFormParty[];
    filingPartySide: 'plaintiff' | 'defendant';
    headerBadge: { label: string; tone: 'joined' | 'counter' };
};

const COUNTER_ALLOWED_STAGE_MARKERS = [
    'بداءة',
    'اعتراض على الحكم الغيابي',
    'اعتراض الغير',
] as const;

export function isCounterClaimAllowedStage(stage: string): boolean {
    const s = String(stage ?? '').trim();
    if (!s) return false;
    if (/استئناف/i.test(s)) return false;
    if (/إعادة\s*(لل)?المحاكمة/i.test(s)) return false;
    return COUNTER_ALLOWED_STAGE_MARKERS.some((marker) => s.includes(marker));
}

type IncidentalSpawnConfirmPreview = {
    court: string;
    judge: string;
    stage: string;
    plaintiffs: IncidentalSpawnFormParty[];
    defendants: IncidentalSpawnFormParty[];
};

export function buildIncidentalSpawnConfirmPreview(
    stage: {
        stageName?: string;
        court?: string;
        judge?: string;
        parties?: Party[];
    },
    spawnType: 'joined' | 'counter',
): IncidentalSpawnConfirmPreview {
    const parties = Array.isArray(stage.parties) ? stage.parties : [];
    const { plaintiffs, defendants } = partitionPartiesBySide(parties);
    const plaintiffsForm = plaintiffs.map(toFormParty);
    const defendantsForm = defendants.map(toFormParty);

    return {
        court: String(stage.court ?? '').trim(),
        judge: String(stage.judge ?? '').trim(),
        stage: String(stage.stageName ?? '').trim(),
        plaintiffs: spawnType === 'joined' ? plaintiffsForm : defendantsForm,
        defendants: spawnType === 'joined' ? defendantsForm : plaintiffsForm,
    };
}

function resolveParentActiveStageSnapshot(
    file: FileData,
    stageIndex?: number,
): {
    court: string;
    judge: string;
    docType: string;
    stage: string;
    retrialTargetStage?: string;
    parties: Party[];
} {
    const fallbackIdx =
        typeof file.activeStageIndex === 'number' && file.activeStageIndex >= 0
            ? file.activeStageIndex
            : 0;
    const idx =
        typeof stageIndex === 'number' && stageIndex >= 0
            ? stageIndex
            : fallbackIdx;
    const stage = Array.isArray(file.stages) ? file.stages[idx] : undefined;

    return {
        court: String(stage?.court ?? file.court ?? '').trim(),
        judge: String(stage?.judge ?? file.judge ?? '').trim(),
        docType: String(stage?.docType ?? file.docType ?? '').trim(),
        stage: String(stage?.stageName ?? file.currentStage ?? '').trim(),
        retrialTargetStage: String(
            stage?.retrialTargetStage ?? file.retrialTargetStage ?? '',
        ).trim() || undefined,
        parties: (stage?.parties ?? file.parties ?? []) as Party[],
    };
}

function toFormParty(party: Party, index: number): IncidentalSpawnFormParty {
    const id = String(party.id ?? `p_${index}`);
    return {
        id,
        name: String(party.name ?? '').trim(),
        status: String(party.role ?? '').trim(),
        isClient: Boolean(party.isClient),
        phone: party.phone ?? '',
        address: party.address ?? '',
    };
}

function cloneFormParties(parties: IncidentalSpawnFormParty[]): IncidentalSpawnFormParty[] {
    return parties.map((p, idx) => ({
        ...p,
        id: `${p.id}_spawn_${idx}`,
    }));
}

export function buildIncidentalSpawnParentSnapshot(
    file: FileData,
    stageIndex?: number,
): IncidentalSpawnParentSnapshot {
    const snap = resolveParentActiveStageSnapshot(file, stageIndex);
    const { plaintiffs, defendants } = partitionPartiesBySide(snap.parties);

    return {
        court: snap.court,
        judge: snap.judge,
        docType: snap.docType,
        stage: snap.stage,
        retrialTargetStage: snap.retrialTargetStage,
        plaintiffs: plaintiffs.map(toFormParty),
        defendants: defendants.map(toFormParty),
    };
}

function buildParentSnapshotFromStageOverride(
    override: NonNullable<IncidentalSpawnContext['stageOverride']>,
): IncidentalSpawnParentSnapshot {
    const { plaintiffs, defendants } = partitionPartiesBySide(override.parties);
    return {
        court: override.court,
        judge: override.judge,
        docType: override.docType,
        stage: override.stageName,
        retrialTargetStage: override.retrialTargetStage,
        plaintiffs: plaintiffs.map(toFormParty),
        defendants: defendants.map(toFormParty),
    };
}

export function enrichIncidentalSpawnContext(
    parentFile: FileData,
    ctx: IncidentalSpawnContext,
): IncidentalSpawnContextEnriched {
    const parent = ctx.stageOverride
        ? buildParentSnapshotFromStageOverride(ctx.stageOverride)
        : buildIncidentalSpawnParentSnapshot(parentFile);
    return {
        ...ctx,
        parent,
    };
}

function computeIncidentalSpawnStageOptions(
    court: string,
    spawnType: 'joined' | 'counter',
    parentStage: string,
): string[] {
    if (spawnType === 'joined') {
        const base = computeLawsuitStageOptions(court);
        return parentStage && base.includes(parentStage) ? [parentStage] : base;
    }
    const base = computeLawsuitStageOptions(court).filter(isCounterClaimAllowedStage);
    return parentStage && base.includes(parentStage) ? [parentStage] : base;
}

function resolveSelectedId(
    candidates: IncidentalSpawnFormParty[],
    selectedId: string | null | undefined,
): string | null {
    if (candidates.length <= 1) return candidates[0]?.id ?? null;
    if (selectedId && candidates.some((p) => p.id === selectedId)) return selectedId;
    return null;
}

function filterToSelected(
    list: IncidentalSpawnFormParty[],
    selectedId: string | null,
    requiresPick: boolean,
): IncidentalSpawnFormParty[] {
    if (!requiresPick || !selectedId) return list;
    const picked = list.filter((p) => p.id === selectedId);
    return picked.length > 0 ? picked : list;
}

export function buildIncidentalSpawnPrefill(
    ctx: IncidentalSpawnContextEnriched,
    selection: IncidentalSpawnPartySelection = {},
): IncidentalSpawnPrefill {
    const { parent, type } = ctx;
    const stageOptions = computeIncidentalSpawnStageOptions(parent.court, type, parent.stage);

    const parentPlaintiffs = cloneFormParties(parent.plaintiffs);
    const parentDefendants = cloneFormParties(parent.defendants);

    let filingPartyCandidates: IncidentalSpawnFormParty[];
    let opposingPartyCandidates: IncidentalSpawnFormParty[];

    if (type === 'joined') {
        filingPartyCandidates = parentPlaintiffs;
        opposingPartyCandidates = parentDefendants;
    } else {
        filingPartyCandidates = parentDefendants;
        opposingPartyCandidates = parentPlaintiffs;
    }

    const requiresFilingPartyPick = filingPartyCandidates.length > 1;
    const requiresOpposingPartyPick = opposingPartyCandidates.length > 1;

    const resolvedFilingId = resolveSelectedId(filingPartyCandidates, selection.filingPartyId);
    const resolvedOpposingId = resolveSelectedId(opposingPartyCandidates, selection.opposingPartyId);

    let parties1: IncidentalSpawnFormParty[];
    let parties2: IncidentalSpawnFormParty[];

    if (type === 'joined') {
        parties1 = filterToSelected(parentPlaintiffs, resolvedFilingId, requiresFilingPartyPick);
        parties2 = filterToSelected(parentDefendants, resolvedOpposingId, requiresOpposingPartyPick);
    } else {
        parties1 = filterToSelected(parentDefendants, resolvedFilingId, requiresFilingPartyPick);
        parties2 = filterToSelected(parentPlaintiffs, resolvedOpposingId, requiresOpposingPartyPick);
    }

    if (resolvedFilingId) {
        parties1 = parties1.map((p) => ({
            ...p,
            isClient: p.id === resolvedFilingId ? p.isClient || true : p.isClient,
        }));
    }

    return {
        caseDetails: {
            number: '',
            court: parent.court,
            type: parent.docType,
            judge: parent.judge,
            firstHearingDate: '',
            stage: parent.stage,
            claimValue: '',
            totalAgreedFees: '',
            retrialTargetStage: parent.retrialTargetStage ?? '',
        },
        parties1: parties1.length > 0 ? parties1 : [{ id: 'p1_1', name: '', status: '', isClient: false, phone: '', address: '' }],
        parties2: parties2.length > 0 ? parties2 : [{ id: 'p2_1', name: '', status: '', isClient: false, phone: '', address: '' }],
        stageOptions,
        requiresFilingPartyPick,
        requiresOpposingPartyPick,
        filingPartyCandidates,
        opposingPartyCandidates,
        filingPartySide: type === 'joined' ? 'plaintiff' : 'defendant',
        headerBadge:
            type === 'joined'
                ? { label: 'دعوى منضمة', tone: 'joined' }
                : { label: 'دعوى متقابلة', tone: 'counter' },
    };
}

export function validateIncidentalSpawnSave(
    ctx: IncidentalSpawnContextEnriched,
    selection: IncidentalSpawnPartySelection,
): string | null {
    if (ctx.type === 'counter' && !isCounterClaimAllowedStage(ctx.parent.stage)) {
        return 'لا يمكن إنشاء دعوى متقابلة في مرحلة الاستئناف أو إعادة المحاكمة';
    }
    const prefill = buildIncidentalSpawnPrefill(ctx, selection);
    if (prefill.requiresFilingPartyPick && !selection.filingPartyId) {
        return ctx.type === 'joined'
            ? 'يرجى اختيار مقدّم الدعوى المنضمة'
            : 'يرجى اختيار مقدّم الدعوى المتقابلة';
    }
    if (prefill.requiresOpposingPartyPick && !selection.opposingPartyId) {
        return ctx.type === 'joined'
            ? 'يرجى اختيار المدعى عليه في الدعوى المنضمة'
            : 'يرجى اختيار المدعي في الدعوى المتقابلة';
    }
    return null;
}
