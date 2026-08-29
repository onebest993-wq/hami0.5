import type { CaseStage, FileData, IncidentalCase, IncidentalFileLink, IncidentalType, Party, TimelineEvent } from '../../LawyerShared';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import {
    classifyPartySideBucket,
    isDefendantSideRole,
    isPlaintiffSideRole,
    isThirdPartyRole,
    partitionPartiesBySide,
    partitionPartiesForHeader,
} from './partyRoleClassification';

export type {
    IncidentalSpawnContext,
    IncidentalSpawnStageOverride,
} from '@/app/domain/lawsuit/incidentalSpawnPrefill';

type IncidentalLinkedFileCreateStub = {
    type: 'joined' | 'counter';
    details?: string;
    date?: string;
    partyName?: string;
};

type FileWithStages = FileData & {
    stages?: CaseStage[];
    activeStageIndex?: number;
};

export function isPlaintiffParty(party: Party): boolean {
    return classifyPartySideBucket(party) === 'plaintiff';
}

export function isDefendantParty(party: Party): boolean {
    return classifyPartySideBucket(party) === 'defendant';
}

export function groupPartiesBySide(parties: Party[]): { plaintiffs: Party[]; defendants: Party[] } {
    return partitionPartiesBySide(parties);
}

export function groupPartiesForHeader(parties: Party[]): {
    plaintiffs: Party[];
    defendants: Party[];
    interpleaders: Party[];
} {
    return partitionPartiesForHeader(parties);
}

export { isDefendantSideRole, isPlaintiffSideRole, isThirdPartyRole };

export function affiliationSideLabel(side: 'plaintiff' | 'defendant', count: number): string {
    if (side === 'plaintiff') return count > 1 ? 'للمدعين' : 'للمدعي';
    return count > 1 ? 'للمدعى عليهم' : 'للمدعى عليه';
}

function upsertIncidentalCases(
    cases: IncidentalCase[] | undefined,
    incidentalId: string,
    patch: Partial<IncidentalCase>,
    createIfMissing?: IncidentalLinkedFileCreateStub,
): IncidentalCase[] {
    const list = Array.isArray(cases) ? cases : [];
    const existingIdx = list.findIndex((c) => c.id === incidentalId);
    if (existingIdx >= 0) {
        return list.map((c) => (c.id === incidentalId ? { ...c, ...patch } : c));
    }
    if (!createIfMissing) return list;

    const stubParty =
        String(patch.partyName ?? '').trim() ||
        String(createIfMissing.partyName ?? '').trim() ||
        (createIfMissing.type === 'joined' ? 'دعوى منضمة' : 'دعوى متقابلة');

    const created: IncidentalCase = {
        id: incidentalId,
        type: createIfMissing.type,
        partyName: stubParty,
        details: createIfMissing.details || '',
        date: createIfMissing.date || getLocalTodayYmd(),
        status: 'active',
        linkedFileId: patch.linkedFileId,
        linkedCaseNo: patch.linkedCaseNo,
    };
    return [...list, created];
}

export function patchIncidentalLinkedFile(
    file: FileWithStages,
    incidentalId: string,
    linkedFileId: number,
    linkedCaseNo: string,
    partyName?: string,
    createIfMissing?: IncidentalLinkedFileCreateStub,
): FileWithStages {
    const patch: Partial<IncidentalCase> = { linkedFileId, linkedCaseNo };
    const resolvedPartyName = String(partyName ?? '').trim();
    if (resolvedPartyName) patch.partyName = resolvedPartyName;

    const stages = Array.isArray(file.stages) ? [...file.stages] : [];
    const stageIdx = typeof file.activeStageIndex === 'number' ? file.activeStageIndex : 0;

    if (stages.length > 0) {
        return {
            ...file,
            stages: stages.map((stage, idx) => {
                if (idx !== stageIdx) return stage;
                return {
                    ...stage,
                    incidentalCases: upsertIncidentalCases(
                        stage.incidentalCases,
                        incidentalId,
                        patch,
                        createIfMissing,
                    ),
                };
            }),
        };
    }

    return {
        ...file,
        incidentalCases: upsertIncidentalCases(
            file.incidentalCases,
            incidentalId,
            patch,
            createIfMissing,
        ),
    };
}

export function normalizeFileId(id: unknown): number | null {
    if (typeof id === 'number' && Number.isFinite(id)) return id;
    if (typeof id === 'string') {
        const trimmed = id.trim();
        if (/^\d+$/.test(trimmed)) return Number(trimmed);
    }
    return null;
}

export function findFileById<T extends { id: unknown }>(files: T[], fileId: unknown): T | undefined {
    const targetId = normalizeFileId(fileId);
    if (targetId === null) return undefined;
    return files.find((f) => normalizeFileId(f.id) === targetId);
}

export function readIncidentalLink(file: Record<string, unknown>): IncidentalFileLink | null {
    const raw = file.incidentalLink;
    if (!raw || typeof raw !== 'object') return null;
    const link = raw as IncidentalFileLink;
    const parentFileId = normalizeFileId(link.parentFileId);
    if (parentFileId === null || !link.incidentalId) return null;
    return { ...link, parentFileId };
}

export function readLinkedChildIncidentalCases(cases: IncidentalCase[] | undefined): IncidentalCase[] {
    return (Array.isArray(cases) ? cases : []).filter(
        (c) =>
            c.status === 'active' &&
            isLinkedSpawnIncidentalType(c.type) &&
            normalizeFileId(c.linkedFileId) !== null &&
            Boolean(String(c.linkedCaseNo ?? '').trim()),
    );
}

function incidentalTypeLabel(type: IncidentalType): string {
    if (type === 'joined') return 'دعوى منضمة';
    if (type === 'counter') return 'دعوى متقابلة';
    if (type === 'joinder_appeal') return 'دخول اختصامي';
    return 'دخول شخص ثالث';
}

export function buildIncidentalTimelineEvent(
    c: Pick<
        IncidentalCase,
        'type' | 'partyName' | 'details' | 'thirdPartyEntryMode' | 'affiliationPartyName' | 'partyRole'
    >,
    eventId?: string,
): TimelineEvent {
    const tags = ['#دعوى_حادثة'];
    if (c.type === 'joined') tags.push('#دعوى_منضمة');
    if (c.type === 'counter') tags.push('#دعوى_متقابلة');
    if (c.type === 'thirdParty') tags.push('#شخص_ثالث');

    const detailLines: string[] = [];
    const baseDetails = String(c.details || '').trim();
    if (baseDetails) detailLines.push(baseDetails);
    if (c.type === 'thirdParty') {
        if (c.thirdPartyEntryMode === 'affiliative' && c.affiliationPartyName) {
            detailLines.push(`نوع الدخول: انضمامي — الانضمام إلى ${c.affiliationPartyName}`);
        } else if (c.thirdPartyEntryMode === 'selfClaim') {
            detailLines.push('نوع الدخول: طالب الحكم لنفسه');
        }
    }

    return {
        id: eventId || `incidental_${Date.now()}`,
        type: 'decision',
        date: getLocalTodayYmd(),
        title: `⚖️ ${incidentalTypeLabel(c.type)} — ${c.partyName}`,
        details: detailLines.join('\n'),
        isNew: true,
        tags,
    };
}

export function buildIncidentalEntryDecisionEvent(
    c: IncidentalCase,
    entryDecision: 'accepted' | 'rejected',
): TimelineEvent {
    const accepted = entryDecision === 'accepted';
    const detailLines: string[] = [];
    if (c.affiliationPartyName) detailLines.push(`الطرف المنضم إليه: ${c.affiliationPartyName}`);
    if (c.thirdPartyEntryMode === 'selfClaim') detailLines.push('طالب الحكم لنفسه');

    return {
        id: `incidental_decision_${Date.now()}`,
        type: 'decision',
        date: getLocalTodayYmd(),
        title: accepted
            ? `✅ قبول دخول الشخص الثالث — ${c.partyName}`
            : `❌ رفض دخول الشخص الثالث — ${c.partyName}`,
        details: detailLines.join('\n'),
        isNew: true,
        tags: ['#دعوى_حادثة', '#شخص_ثالث', accepted ? '#قبول_الدخول' : '#رفض_الدخول'],
    };
}

export function buildIncidentalResolveEvent(c: IncidentalCase, status: 'resolved' | 'rejected'): TimelineEvent {
    const resolved = status === 'resolved';
    return {
        id: `incidental_resolve_${Date.now()}`,
        type: 'decision',
        date: getLocalTodayYmd(),
        title: resolved
            ? `✅ حسم ${incidentalTypeLabel(c.type)} — ${c.partyName}`
            : `❌ رد ${incidentalTypeLabel(c.type)} — ${c.partyName}`,
        details: String(c.details || '').trim(),
        isNew: true,
        tags: ['#دعوى_حادثة', resolved ? '#محسومة' : '#مردودة'],
    };
}

/** Third-party rows with a final reject decision are removed from the header (may linger in persisted data). */
export function filterHeaderIncidentalCases(cases: IncidentalCase[] | undefined): IncidentalCase[] {
    return (Array.isArray(cases) ? cases : []).filter(
        (c) => !(c.type === 'thirdParty' && c.entryDecision === 'rejected'),
    );
}

export function isLinkedSpawnIncidentalType(type: IncidentalCase['type']): boolean {
    return type === 'joined' || type === 'counter';
}

type LinkedStageJudgment = {
    isClosed: boolean;
    finalDecision?: string;
    decisionDate?: string;
};

export function readActiveStageJudgment(file: FileWithStages): LinkedStageJudgment | null {
    const stages = Array.isArray(file.stages) ? file.stages : [];
    const stageIdx = typeof file.activeStageIndex === 'number' ? file.activeStageIndex : 0;
    const stage = stages[stageIdx];
    if (!stage) return null;
    const finalDecision = String(stage.finalDecision || '').trim();
    const isClosed = Boolean(stage.isPleadingsClosed && finalDecision);
    return {
        isClosed,
        finalDecision: finalDecision || undefined,
        decisionDate: typeof stage.decisionDate === 'string' ? stage.decisionDate : undefined,
    };
}

function buildIncidentalLinkedJudgmentEvent(
    c: IncidentalCase,
    payload: { finalDecision: string; linkedCaseNo: string; judgmentDate?: string },
): TimelineEvent {
    const detailLines = [
        `الإضبارة المرتبطة: ${payload.linkedCaseNo}`,
        `نتيجة الحكم: ${payload.finalDecision}`,
    ];
    return {
        id: `incidental_linked_judgment_${Date.now()}`,
        type: 'decision',
        date: payload.judgmentDate || getLocalTodayYmd(),
        title: `✅ حسم ${incidentalTypeLabel(c.type)} — نتيجة الإضبارة المرتبطة`,
        details: detailLines.join('\n'),
        isNew: true,
        tags: ['#دعوى_حادثة', c.type === 'joined' ? '#دعوى_منضمة' : '#دعوى_متقابلة', '#نتيجة_مرتبطة'],
    };
}

export function patchParentIncidentalFromChildJudgment(
    parentFile: FileWithStages,
    incidentalId: string,
    payload: { finalDecision: string; linkedCaseNo: string; judgmentDate?: string },
): FileWithStages | null {
    const stages = Array.isArray(parentFile.stages) ? [...parentFile.stages] : [];
    const stageIdx = typeof parentFile.activeStageIndex === 'number' ? parentFile.activeStageIndex : 0;
    const stage = stages[stageIdx];
    if (!stage) return null;

    const cases = Array.isArray(stage.incidentalCases) ? stage.incidentalCases : [];
    const target = cases.find((c) => c.id === incidentalId);
    if (!target || target.status !== 'active' || !isLinkedSpawnIncidentalType(target.type)) {
        return null;
    }

    const updatedCase: IncidentalCase = {
        ...target,
        status: 'resolved',
        linkedJudgmentOutcome: payload.finalDecision,
        details: payload.finalDecision,
        linkedCaseNo: payload.linkedCaseNo || target.linkedCaseNo,
    };

    const timelineEvent = buildIncidentalLinkedJudgmentEvent(updatedCase, payload);
    stages[stageIdx] = {
        ...stage,
        incidentalCases: cases.map((c) => (c.id === incidentalId ? updatedCase : c)),
        timeline: [timelineEvent, ...(Array.isArray(stage.timeline) ? stage.timeline : [])],
    };

    return { ...parentFile, stages };
}
