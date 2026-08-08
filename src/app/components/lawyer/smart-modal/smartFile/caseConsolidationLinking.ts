import type {
    CaseStage,
    ConsolidationSecondaryRef,
    FileData,
    IncidentalCase,
    Party,
    Task,
    TimelineEvent,
} from '../../LawyerShared';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { buildInitialStagesFromFile } from './stageInit';
import { findFileById, normalizeFileId } from './incidentalCaseLinking';

export type ConsolidationSpawnContext = {
    primaryFileId: number;
    primaryCaseNo: string;
    consolidationDate: string;
    notes?: string;
};

export type ConsolidationMergeMeta = {
    consolidationDate: string;
    notes?: string;
};

export type ConsolidationExternalMeta = ConsolidationMergeMeta & {
    peerCaseNo: string;
};

export type ConsolidationCandidate = {
    id: number;
    caseNo: string;
    status: string;
    court?: string;
    clientName?: string;
    stageLabel?: string;
};

export type LitigationDegree = 'first_instance' | 'appeal' | 'cassation' | 'unknown';

export function resolveLitigationDegree(stageName?: string): LitigationDegree {
    const s = String(stageName ?? '').trim();
    if (!s) return 'first_instance';
    if (/تمييز/i.test(s)) return 'cassation';
    if (/استئناف/i.test(s)) return 'appeal';
    if (/بداء|بدئ|ابتداء|درجة\s*أول/i.test(s)) return 'first_instance';
    return 'unknown';
}

export function formatLitigationDegreeLabel(degree: LitigationDegree): string {
    if (degree === 'first_instance') return 'بداءة';
    if (degree === 'appeal') return 'استئناف';
    if (degree === 'cassation') return 'تمييز';
    return 'درجة غير محددة';
}

export function resolveActiveStageName(file: FileData): string {
    const stages = resolveStages(file);
    const idx = resolveActiveStageIndex(file, stages);
    const stage = stages[idx];
    return String(stage?.stageName ?? stage?.name ?? '').trim();
}

export function resolveLitigationDegreeKey(file: FileData): string {
    const stageName = resolveActiveStageName(file);
    const degree = resolveLitigationDegree(stageName);
    if (degree !== 'unknown') return degree;
    return `raw:${stageName.toLowerCase() || 'first_instance'}`;
}

export function assertConsolidationStageCompatibility(
    primary: FileData,
    secondary: FileData,
): { ok: true } | { ok: false; message: string } {
    const primaryKey = resolveLitigationDegreeKey(primary);
    const secondaryKey = resolveLitigationDegreeKey(secondary);
    if (primaryKey === secondaryKey) return { ok: true };
    const primaryLabel =
        resolveActiveStageName(primary) || formatLitigationDegreeLabel(resolveLitigationDegree(primaryKey));
    const secondaryLabel =
        resolveActiveStageName(secondary) || formatLitigationDegreeLabel(resolveLitigationDegree(secondaryKey));
    return {
        ok: false,
        message: `لا يجوز توحيد دعاوى بدرجات تقاضٍ مختلفة (${primaryLabel} ≠ ${secondaryLabel})`,
    };
}

export function alignSecondaryFileLitigationStage(secondary: FileData, primary: FileData): FileData {
    const primaryStageName = resolveActiveStageName(primary) || 'البداءة';
    const secondaryStages = [...resolveStages(secondary)];
    const secondaryIdx = resolveActiveStageIndex(secondary, secondaryStages);
    const secondaryStage = { ...secondaryStages[secondaryIdx] };
    secondaryStages[secondaryIdx] = {
        ...secondaryStage,
        stageName: primaryStageName,
        name: primaryStageName,
    };
    return {
        ...secondary,
        stages: secondaryStages,
        activeStageIndex: secondaryIdx,
        currentStage: primaryStageName,
    };
}

export function formatConsolidatedChipLabel(refs: ConsolidationSecondaryRef[]): string {
    return refs
        .map((r) => String(r.caseNo ?? '').trim())
        .filter(Boolean)
        .join(' · ');
}

export function readConsolidationSecondaryRefs(
    file: Record<string, unknown> | null | undefined,
    stage?: CaseStage | null,
): ConsolidationSecondaryRef[] {
    const fromStage = stage?.consolidatedSecondaryRefs;
    if (Array.isArray(fromStage) && fromStage.length > 0) return fromStage;
    const fromFile = file?.consolidationSecondaryRefs;
    if (Array.isArray(fromFile)) return fromFile as ConsolidationSecondaryRef[];
    const legacy = String(stage?.consolidatedWith ?? '').trim();
    if (!legacy) return [];
    return legacy.split('·').map((part, idx) => ({
        id: `legacy_${idx}`,
        caseNo: part.trim(),
        isExternal: true,
        consolidationDate: getLocalTodayYmd(),
    }));
}

export function resolveOpenLawsuitFileIdentity(
    file: Record<string, unknown>,
    parentData?: { id?: unknown; caseNo?: string },
    pool?: FileData[],
): { fileId: number | null; caseNo: string; clientName?: string; court?: string } {
    const fileId = normalizeFileId(parentData?.id ?? file?.id);
    const fromPool = fileId !== null && pool ? findFileById(pool, fileId) : undefined;
    const source = (fromPool as FileData | undefined) ?? (file as FileData);
    const caseNo = String(fromPool?.caseNo ?? parentData?.caseNo ?? file?.caseNo ?? '').trim();
    const clientName = source?.parties?.find((p) => p.isClient)?.name?.trim();
    const court = typeof source?.court === 'string' ? source.court : undefined;
    return { fileId, caseNo, clientName, court };
}

function isConsolidationEligibleFile(f: FileData): boolean {
    if (f.status === 'deleted') return false;
    if (f.consolidationMergedInto) return false;
    if (f.type === 'execution') return false;
    if (f.type === 'lawsuit' || f.type === 'transaction' || !f.type) return true;
    return false;
}

function resolveStages(file: FileData): CaseStage[] {
    if (Array.isArray(file.stages) && file.stages.length > 0) return file.stages;
    return buildInitialStagesFromFile(file as unknown as Record<string, unknown>);
}

function resolveActiveStageIndex(file: FileData, stages: CaseStage[]): number {
    const idx = file.activeStageIndex;
    if (typeof idx === 'number' && idx >= 0 && idx < stages.length) return idx;
    return stages.length - 1;
}

function sortTimeline(events: TimelineEvent[]): TimelineEvent[] {
    return [...events].sort((a, b) => {
        const da = String(a.date ?? '');
        const db = String(b.date ?? '');
        if (da !== db) return da.localeCompare(db);
        return String(a.id).localeCompare(String(b.id));
    });
}

function mergeParties(primary: Party[], secondary: Party[]): Party[] {
    const seen = new Set<string>();
    const out: Party[] = [];
    for (const party of [...primary, ...secondary]) {
        const key = `${String(party.name ?? '').trim().toLowerCase()}|${String(party.role ?? '').trim()}`;
        if (!party.name?.trim() || seen.has(key)) continue;
        seen.add(key);
        out.push(party);
    }
    return out;
}

function mergeById<T extends { id: string }>(primary: T[], secondary: T[]): T[] {
    const map = new Map<string, T>();
    for (const item of [...primary, ...secondary]) {
        if (!item?.id) continue;
        map.set(item.id, item);
    }
    return [...map.values()];
}

type FileNote = FileData['notes'][number];

function mergeNotes(primary: FileNote[], secondary: FileNote[]): FileNote[] {
    const seen = new Set<number>();
    const out: FileNote[] = [];
    for (const note of [...primary, ...secondary]) {
        if (!note || typeof note.id !== 'number' || seen.has(note.id)) continue;
        seen.add(note.id);
        out.push(note);
    }
    return out.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
}

function mergeImages(
    primary: FileData['images'],
    secondary: FileData['images'],
): FileData['images'] {
    const seen = new Set<string>();
    const out: FileData['images'] = [];
    for (const image of [...(primary ?? []), ...(secondary ?? [])]) {
        const key = `${String(image?.url ?? '').trim()}|${String(image?.name ?? '').trim()}`;
        if (!key.replace('|', '').trim() || seen.has(key)) continue;
        seen.add(key);
        out.push(image);
    }
    return out;
}

function mergeHistory(
    primary: FileData['history'],
    secondary: FileData['history'],
): FileData['history'] {
    const combined = [...(primary ?? []), ...(secondary ?? [])];
    return combined.sort((a, b) => {
        const da = 'date' in a ? String(a.date ?? '') : '';
        const db = 'date' in b ? String(b.date ?? '') : '';
        return da.localeCompare(db);
    });
}

function sumOptionalAmount(
    a: number | string | undefined,
    b: number | string | undefined,
): number | string | undefined {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na + nb;
    if (Number.isFinite(na)) return na;
    if (Number.isFinite(nb)) return nb;
    return a ?? b;
}

/** إذا أُدمجت الإضبارة في أخرى — افتح الإضبارة الموحّدة بدل المؤرشفة */
export function resolveConsolidationMergedOpenTarget(
    files: FileData[],
    file: FileData,
): FileData {
    const mergedInto = normalizeFileId(file.consolidationMergedInto);
    if (mergedInto === null) return file;
    const primary = findFileById(files, mergedInto);
    if (!primary) return file;
    if (normalizeFileId(primary.consolidationMergedInto) !== null) {
        return resolveConsolidationMergedOpenTarget(files, primary);
    }
    return primary;
}

function buildConsolidationEvent(
    primaryCaseNo: string,
    secondaryCaseNo: string,
    meta: ConsolidationMergeMeta,
    external = false,
): TimelineEvent {
    const detailLines = [
        external
            ? `تم تسجيل توحيد مرجعي مع الدعوى رقم ${secondaryCaseNo}`
            : `تم توحيد الدعوى رقم ${secondaryCaseNo} مع الدعوى رقم ${primaryCaseNo}`,
        meta.notes ? `السبب: ${meta.notes}` : '',
    ].filter(Boolean);
    return {
        id: `consolidation_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'milestone',
        date: meta.consolidationDate || getLocalTodayYmd(),
        title: external
            ? `🔗 توحيد مرجعي — ${secondaryCaseNo}`
            : `🔗 توحيد الدعاوى — ${secondaryCaseNo}`,
        details: detailLines.join('\n'),
        isNew: true,
        tags: ['#توحيد_دعاوى'],
    };
}

function appendSecondaryRef(
    existing: ConsolidationSecondaryRef[] | undefined,
    ref: ConsolidationSecondaryRef,
): ConsolidationSecondaryRef[] {
    return [...(Array.isArray(existing) ? existing : []), ref];
}

function preservePrimaryFileFields(
    primary: FileData,
    primaryStage: CaseStage,
    primaryCaseNo: string,
): Pick<CaseStage, 'caseNo' | 'court' | 'judge' | 'docType' | 'claimValue' | 'stageName' | 'name'> {
    const stageName = String(primaryStage.stageName ?? primaryStage.name ?? primary.currentStage ?? '').trim();
    return {
        caseNo: String(primary.caseNo ?? '').trim() || primaryCaseNo || String(primaryStage.caseNo ?? '').trim(),
        court: String(primary.court ?? primaryStage.court ?? '').trim(),
        judge: String(primary.judge ?? primaryStage.judge ?? '').trim(),
        docType: String(primary.docType ?? primaryStage.docType ?? '').trim(),
        claimValue: String(primary.claimValue ?? primaryStage.claimValue ?? '').trim(),
        stageName: stageName || undefined,
        name: stageName || undefined,
    };
}

export function listConsolidationCandidates(
    files: FileData[],
    currentFileId: unknown,
): ConsolidationCandidate[] {
    const currentId = normalizeFileId(currentFileId);
    if (currentId === null) return [];

    const currentFile = findFileById(files, currentId);
    if (!currentFile) return [];
    const currentDegreeKey = resolveLitigationDegreeKey(currentFile);

    const seenIds = new Set<number>();
    const candidates: ConsolidationCandidate[] = [];

    for (const f of files) {
        const id = normalizeFileId(f.id);
        if (id === null || id === currentId || seenIds.has(id)) continue;
        if (!isConsolidationEligibleFile(f)) continue;
        if (resolveLitigationDegreeKey(f) !== currentDegreeKey) continue;

        seenIds.add(id);
        const stageLabel = resolveActiveStageName(f) || formatLitigationDegreeLabel(resolveLitigationDegree(resolveActiveStageName(f)));
        const caseNo = String(f.caseNo ?? '').trim() || `#${id}`;
        candidates.push({
            id,
            caseNo,
            status: String(f.status ?? 'active'),
            court: typeof f.court === 'string' ? f.court : undefined,
            clientName: f.parties?.find((p) => p.isClient)?.name?.trim() || undefined,
            stageLabel,
        });
    }

    return candidates.sort((a, b) => {
        const rank = (status: string) => {
            if (status === 'archived' || status === 'archived_stage') return 1;
            if (status === 'paused') return 2;
            return 0;
        };
        const byStatus = rank(a.status) - rank(b.status);
        if (byStatus !== 0) return byStatus;
        return a.caseNo.localeCompare(b.caseNo, 'ar');
    });
}

export function assertDistinctConsolidationPair(
    primaryId: unknown,
    secondaryId: unknown,
): { primary: number; secondary: number } | null {
    const a = normalizeFileId(primaryId);
    const b = normalizeFileId(secondaryId);
    if (a === null || b === null || a === b) return null;
    return { primary: a, secondary: b };
}

export function addExternalConsolidationRef(
    file: FileData,
    meta: ConsolidationExternalMeta,
): FileData {
    const stages = [...resolveStages(file)];
    const idx = resolveActiveStageIndex(file, stages);
    const stage = { ...stages[idx] };
    const preserved = preservePrimaryFileFields(file, stage, String(file.caseNo ?? '').trim() || `#${file.id}`);

    const ref: ConsolidationSecondaryRef = {
        id: `cons_ext_${Date.now()}`,
        caseNo: meta.peerCaseNo.trim(),
        isExternal: true,
        consolidationDate: meta.consolidationDate,
        reason: meta.notes,
    };
    const refs = appendSecondaryRef(
        stage.consolidatedSecondaryRefs ?? file.consolidationSecondaryRefs,
        ref,
    );

    stages[idx] = {
        ...stage,
        ...preserved,
        consolidatedSecondaryRefs: refs,
        consolidatedWith: formatConsolidatedChipLabel(refs),
        timeline: [
            buildConsolidationEvent(preserved.caseNo ?? '', ref.caseNo, meta, true),
            ...(stage.timeline ?? []),
        ],
    };

    return {
        ...file,
        caseNo: preserved.caseNo,
        court: preserved.court || file.court,
        judge: preserved.judge || file.judge,
        docType: preserved.docType || file.docType,
        claimValue: preserved.claimValue || file.claimValue,
        stages,
        activeStageIndex: idx,
        consolidationSecondaryRefs: refs,
    };
}

export function mergeLawsuitFilesForConsolidation(
    primary: FileData,
    secondary: FileData,
    meta: ConsolidationMergeMeta,
): { mergedPrimary: FileData; archivedSecondary: FileData } | { error: string } {
    const stageCheck = assertConsolidationStageCompatibility(primary, secondary);
    if (!stageCheck.ok) return { error: stageCheck.message };

    const primaryStages = [...resolveStages(primary)];
    const secondaryStages = [...resolveStages(secondary)];
    const primaryIdx = resolveActiveStageIndex(primary, primaryStages);
    const secondaryIdx = resolveActiveStageIndex(secondary, secondaryStages);
    const primaryStage = { ...primaryStages[primaryIdx] };
    const secondaryStage = { ...secondaryStages[secondaryIdx] };

    const secondaryCaseNo =
        String(secondary.caseNo ?? secondaryStage.caseNo ?? '').trim() || `#${secondary.id}`;
    const primaryCaseNo = String(primary.caseNo ?? '').trim() || String(primaryStage.caseNo ?? '').trim() || `#${primary.id}`;
    const preserved = preservePrimaryFileFields(primary, primaryStage, primaryCaseNo);

    const ref: ConsolidationSecondaryRef = {
        id: `cons_${Date.now()}`,
        caseNo: secondaryCaseNo,
        peerFileId: Number(secondary.id),
        isExternal: false,
        consolidationDate: meta.consolidationDate,
        reason: meta.notes,
    };
    const refs = appendSecondaryRef(
        primaryStage.consolidatedSecondaryRefs ?? primary.consolidationSecondaryRefs,
        ref,
    );

    const mergedTimeline = sortTimeline([
        ...((primaryStage.timeline as TimelineEvent[] | undefined) ?? []),
        ...((secondaryStage.timeline as TimelineEvent[] | undefined) ?? []),
        buildConsolidationEvent(primaryCaseNo, secondaryCaseNo, meta, false),
    ]);

    const mergedTasks = mergeById<Task>(
        (primaryStage.tasks as Task[] | undefined) ?? [],
        (secondaryStage.tasks as Task[] | undefined) ?? [],
    );
    const mergedIncidental = mergeById<IncidentalCase>(
        (primaryStage.incidentalCases as IncidentalCase[] | undefined) ?? [],
        (secondaryStage.incidentalCases as IncidentalCase[] | undefined) ?? [],
    );
    const mergedThirdParties = mergeById(
        (primaryStage.thirdParties as { id: string }[] | undefined) ?? [],
        (secondaryStage.thirdParties as { id: string }[] | undefined) ?? [],
    );
    const mergedParties = mergeParties(
        (primaryStage.parties as Party[] | undefined) ?? primary.parties ?? [],
        (secondaryStage.parties as Party[] | undefined) ?? secondary.parties ?? [],
    );
    const mergedNotes = mergeNotes(primary.notes ?? [], secondary.notes ?? []);
    const mergedImages = mergeImages(primary.images, secondary.images);
    const mergedHistory = mergeHistory(primary.history, secondary.history);

    primaryStages[primaryIdx] = {
        ...primaryStage,
        ...preserved,
        consolidatedSecondaryRefs: refs,
        consolidatedWith: formatConsolidatedChipLabel(refs),
        timeline: mergedTimeline,
        tasks: mergedTasks,
        incidentalCases: mergedIncidental,
        parties: mergedParties,
        thirdParties: mergedThirdParties.length > 0 ? mergedThirdParties : primaryStage.thirdParties,
    };

    const mergedPrimary: FileData = {
        ...primary,
        caseNo: preserved.caseNo,
        court: preserved.court || primary.court,
        judge: preserved.judge || primary.judge,
        docType: preserved.docType || primary.docType,
        claimValue: preserved.claimValue || primary.claimValue,
        parties: mergedParties,
        stages: primaryStages,
        activeStageIndex: primaryIdx,
        tasks: mergedTasks,
        incidentalCases: mergedIncidental,
        consolidationSecondaryRefs: refs,
        notes: mergedNotes,
        images: mergedImages,
        history: mergedHistory,
        feesTotal: sumOptionalAmount(primary.feesTotal, secondary.feesTotal),
        feesPaid: sumOptionalAmount(primary.feesPaid, secondary.feesPaid),
        mergedConsolidatedFileIds: [
            ...(Array.isArray(primary.mergedConsolidatedFileIds) ? primary.mergedConsolidatedFileIds : []),
            Number(secondary.id),
        ],
    };

    const archivedSecondary: FileData = {
        ...secondary,
        status: 'archived',
        consolidationMergedInto: Number(primary.id),
    };

    return { mergedPrimary, archivedSecondary };
}
