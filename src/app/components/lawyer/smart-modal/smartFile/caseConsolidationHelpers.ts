import type {
    CaseStage,
    ConsolidationSecondaryRef,
    FileData,
    Party,
    TimelineEvent,
} from '../../LawyerShared';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
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

export function resolveStages(file: FileData): CaseStage[] {
    if (Array.isArray(file.stages) && file.stages.length > 0) return file.stages;
    return buildInitialStagesFromFile(file as unknown as Record<string, unknown>);
}

export function resolveActiveStageIndex(file: FileData, stages: CaseStage[]): number {
    const idx = file.activeStageIndex;
    if (typeof idx === 'number' && idx >= 0 && idx < stages.length) return idx;
    return stages.length - 1;
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

export function isConsolidationEligibleFile(f: FileData): boolean {
    if (f.status === 'deleted') return false;
    if (f.consolidationMergedInto) return false;
    if (f.type === 'execution') return false;
    if (f.type === 'lawsuit' || f.type === 'transaction' || !f.type) return true;
    return false;
}

export function sortTimeline(events: TimelineEvent[]): TimelineEvent[] {
    return [...events].sort((a, b) => {
        const da = String(a.date ?? '');
        const db = String(b.date ?? '');
        if (da !== db) return da.localeCompare(db);
        return String(a.id).localeCompare(String(b.id));
    });
}

export function mergeParties(primary: Party[], secondary: Party[]): Party[] {
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

export function mergeById<T extends { id: string }>(primary: T[], secondary: T[]): T[] {
    const map = new Map<string, T>();
    for (const item of [...primary, ...secondary]) {
        if (!item?.id) continue;
        map.set(item.id, item);
    }
    return [...map.values()];
}

type FileNote = FileData['notes'][number];

export function mergeNotes(primary: FileNote[], secondary: FileNote[]): FileNote[] {
    const seen = new Set<number>();
    const out: FileNote[] = [];
    for (const note of [...primary, ...secondary]) {
        if (!note || typeof note.id !== 'number' || seen.has(note.id)) continue;
        seen.add(note.id);
        out.push(note);
    }
    return out.sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
}

export function mergeImages(
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

export function mergeHistory(
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

export function sumOptionalAmount(
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

export function buildConsolidationEvent(
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

export function appendSecondaryRef(
    existing: ConsolidationSecondaryRef[] | undefined,
    ref: ConsolidationSecondaryRef,
): ConsolidationSecondaryRef[] {
    return [...(Array.isArray(existing) ? existing : []), ref];
}

export function preservePrimaryFileFields(
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
