import type { CaseStage } from '@/app/types/criminal';
import type { CriminalCase, TimelineEvent } from './criminalStore';
import { isCorruptTimelineEvent } from './criminalCaseTimelineUtils';
import { resolveMergedCaseIds } from './criminalCaseMergeUtils';
import { resolveOfficialCaseNumber } from './criminalCaseReferenceUtils';
import { resolveMergeStageBucket } from './criminalStageUtils';

/** عرض مؤقت في الذاكرة فقط — لا يُخزَّن في Zustand. */
type MergedTimelineEventView = TimelineEvent & {
    isMerged?: boolean;
    originCaseNumber?: string;
    originCaseId?: string;
};

type MergeCaseTargetOption = {
    id: string;
    selectLabel: string;
};

/** أسماء المتهمين كنص مُسطّح؛ مصفوفة فارغة لو لا يوجد. */
function collectDefendantNames(caseRecord: CriminalCase): string[] {
    const defendants = Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [];
    return defendants
        .map((d) => String(d.fullName ?? '').trim())
        .filter((name) => name.length > 0);
}

function resolveCaseRecordId(caseRecord: CriminalCase, mapKey: string): string {
    return String(caseRecord.id ?? mapKey).trim() || mapKey;
}

/** بحث إضبارة في المتجر — يدعم اختلاف مفتاح التخزين عن `id`. */
export function lookupCaseInMapForMerge(
    casesById: Record<string, CriminalCase | undefined>,
    caseId: string,
): CriminalCase | undefined {
    const direct = casesById[caseId];
    if (direct) return direct;
    const needle = String(caseId ?? '').trim();
    if (!needle) return undefined;
    for (const row of Object.values(casesById)) {
        if (!row) continue;
        if (resolveCaseRecordId(row, needle) === needle) return row;
    }
    return undefined;
}

export function findCaseInStore(
    casesById: Record<string, CriminalCase | undefined>,
    caseId: string,
): { storageKey: string; record: CriminalCase } | null {
    const needle = String(caseId ?? '').trim();
    if (!needle) return null;
    const direct = casesById[needle];
    if (direct) return { storageKey: needle, record: direct };
    for (const [key, row] of Object.entries(casesById)) {
        if (!row) continue;
        const recordId = String(row.id ?? key).trim();
        if (recordId === needle || key === needle) {
            return { storageKey: key, record: row };
        }
    }
    return null;
}

/** فلتر ضمّ — لا يُستبعد إلا الذات، المضموم سلفاً، أو المضموم فعلياً للأم الحالية. */
function passesMinimalMergeFilters(
    caseId: string,
    parentCaseId: string,
    c: CriminalCase,
    mergedChildIds: ReadonlySet<string>,
): boolean {
    const recordId = resolveCaseRecordId(c, caseId);
    if (recordId === parentCaseId || caseId === parentCaseId) return false;
    if (mergedChildIds.has(caseId) || mergedChildIds.has(recordId)) return false;
    if (c.dossierStatus === 'merged' || String(c.mergedIntoCaseId ?? '').trim()) return false;
    return true;
}

/**
 * أبناء مضمومون فعلياً فقط — لا نستبعد أضابير بسبب mergedFromCaseIds القديمة/الفاسدة.
 */
export function resolveMergedChildIdsForTargetPicker(
    parent: CriminalCase | undefined,
    parentCaseId: string,
    casesById: Record<string, CriminalCase | undefined>,
): Set<string> {
    const out = new Set<string>();
    if (!parent) return out;
    const parentKeys = new Set(
        [parentCaseId, String(parent.id ?? '').trim()].filter((k) => k.length > 0),
    );
    for (const cid of resolveMergedCaseIds(parent)) {
        const child = lookupCaseInMapForMerge(casesById, cid);
        if (!child) continue;
        const into = String(child.mergedIntoCaseId ?? '').trim();
        if (child.dossierStatus !== 'merged' || !into || !parentKeys.has(into)) continue;
        out.add(cid);
        out.add(resolveCaseRecordId(child, cid));
    }
    return out;
}

/** رسالة الرفض القانوني — الضم العابر للمراحل ممنوع. */
export const CROSS_STAGE_MERGE_ERROR_MESSAGE =
    'لا يجوز ضم إضبارات في مراحل إجرائية مختلفة (تحقيق الأحداث ومحكمة الأحداث مسار مستقل عن البالغين).';

export function areCasesSameProceduralStage(
    caseA: CriminalCase | undefined,
    caseB: CriminalCase | undefined,
): boolean {
    if (!caseA || !caseB) return false;
    return resolveMergeStageBucket(caseA) === resolveMergeStageBucket(caseB);
}

export function assertCasesMergeSameProceduralStage(
    parent: CriminalCase | undefined,
    child: CriminalCase | undefined,
): void {
    if (!parent || !child) {
        throw new Error('تعذّر تنفيذ الضم: إضبارة غير موجودة.');
    }
    if (!areCasesSameProceduralStage(parent, child)) {
        throw new Error(CROSS_STAGE_MERGE_ERROR_MESSAGE);
    }
}

/**
 * تسمية خيار الضم: عنوان نظيف للقائمة المنسدلة ولا يكشف معرّفات داخلية.
 */
export function formatMergeCaseSelectLabel(caseRecord: CriminalCase, _caseId: string): string {
    const officialNumber = resolveOfficialCaseNumber(caseRecord);
    const numberPart = officialNumber !== '—' ? officialNumber : 'بدون رقم رسمي';
    const names = collectDefendantNames(caseRecord);
    const defendantsPart = names.length > 0 ? `المتهمون: ${names.join('، ')}` : 'بدون متهمين مسجّلين';
    return `${numberPart} — ${defendantsPart}`;
}

/**
 * مرشّحات إضبارة قابلة للضم — الشرط الوحيد: نفس المرحلة (`basics.stage` / سِلّة الضم).
 */
export function buildMergeCaseTargetOptions(
    casesById: Record<string, CriminalCase | undefined>,
    parentCaseId: string,
    mergedChildIds?: ReadonlySet<string>,
): MergeCaseTargetOption[] {
    const parent = lookupCaseInMapForMerge(casesById, parentCaseId);
    if (!parent) return [];

    const effectiveMergedChildIds =
        mergedChildIds ?? resolveMergedChildIdsForTargetPicker(parent, parentCaseId, casesById);

    const parentBucket = resolveMergeStageBucket(parent);

    const matched = Object.entries(casesById).filter((entry): entry is [string, CriminalCase] => {
        const [caseId, c] = entry;
        if (!c) return false;
        if (!passesMinimalMergeFilters(caseId, parentCaseId, c, effectiveMergedChildIds)) return false;
        return resolveMergeStageBucket(c) === parentBucket;
    });

    return matched
        .map(([caseId, c]) => {
            const recordId = resolveCaseRecordId(c, caseId);
            const stored = findCaseInStore(casesById, recordId) ?? findCaseInStore(casesById, caseId);
            return {
                id: stored?.storageKey ?? recordId,
                selectLabel: formatMergeCaseSelectLabel(c, caseId),
            };
        })
        .sort((a, b) => a.selectLabel.localeCompare(b.selectLabel, 'ar'));
}

function timelineEventSortKey(ev: TimelineEvent): number {
    const parsed = Date.parse(String(ev.date ?? '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * دمج عرضي (computed) لتايم لاين الأم مع أحداث الأبناء المضمومة.
 */
export function buildParentMergedTimelineView(
    parent: CriminalCase,
    casesById: Record<string, CriminalCase | undefined>,
): MergedTimelineEventView[] {
    const parentRawEvents = Array.isArray(parent.timelineEvents) ? parent.timelineEvents : [];
    const parentEvents: MergedTimelineEventView[] = parentRawEvents
        .filter((ev) => !isCorruptTimelineEvent(ev))
        .map((ev) => {
            const mergedFromCaseId = String(ev.mergedFromCaseId ?? '').trim();
            if (mergedFromCaseId) {
                return {
                    ...ev,
                    isMerged: true,
                    originCaseId: mergedFromCaseId,
                    originCaseNumber: ev.mergedFromCaseNumber || ev.originCaseNumber || '',
                };
            }
            return { ...ev };
        });

    const alreadyMigratedIds = new Set(
        parentRawEvents
            .filter((ev) => String(ev.mergedFromCaseId ?? '').trim().length > 0)
            .map((ev) => `${String(ev.mergedFromCaseId ?? '').trim()}::${ev.id}`),
    );

    const childIds = resolveMergedCaseIds(parent);

    const injectedChildEvents: MergedTimelineEventView[] = [];
    for (const childId of childIds) {
        const child = lookupCaseInMapForMerge(casesById, childId);
        if (!child) continue;
        const originCaseNumber = resolveOfficialCaseNumber(child);
        const childList = Array.isArray(child.timelineEvents) ? child.timelineEvents : [];
        for (const ev of childList) {
            if (isCorruptTimelineEvent(ev)) continue;
            if (alreadyMigratedIds.has(`${childId}::${ev.id}`)) continue;
            injectedChildEvents.push({
                ...ev,
                isMerged: true,
                originCaseNumber,
                originCaseId: childId,
            });
        }
    }

    const combined = [...parentEvents, ...injectedChildEvents];
    return [...combined].sort((a, b) => timelineEventSortKey(b) - timelineEventSortKey(a));
}

export function filterParentOnlyTimelineEvents(events: MergedTimelineEventView[]): MergedTimelineEventView[] {
    return events.filter((ev) => ev.isMerged !== true);
}

/** بيانات شارة الإضبارة المضمومة في رأس اللوحة — معلومات سياقية كافية للقارئ. */
type MergedCaseHeaderBadge = {
    id: string;
    caseNumber: string;
    defendants: string[];
    primaryLabel: string;
    detailLabel: string;
    isResolved: boolean;
};

/** يُجهّز شارات الإضابير المضمومة لعرضها في الترويسة بمعلومات سياقية. */
export function buildMergedCaseHeaderBadges(
    parent: CriminalCase,
    casesById: Record<string, CriminalCase | undefined>,
): MergedCaseHeaderBadge[] {
    const ids = resolveMergedCaseIds(parent);
    return ids.map((childId) => {
        const child = lookupCaseInMapForMerge(casesById, childId);
        const number = child ? resolveOfficialCaseNumber(child) : '—';
        const cleanNumber = number !== '—' ? number : '';
        const names = child ? collectDefendantNames(child) : [];
        const primaryLabel = cleanNumber || (names.length > 0 ? names.join('، ') : 'إضبارة دون رقم');
        const detailParts: string[] = [];
        if (cleanNumber) detailParts.push(`رقم الإضبارة: ${cleanNumber}`);
        else detailParts.push('رقم الإضبارة: غير مسجّل');
        if (names.length > 0) detailParts.push(`المتهمون: ${names.join('، ')}`);
        return {
            id: childId,
            caseNumber: number,
            defendants: names,
            primaryLabel,
            detailLabel: detailParts.join(' • '),
            isResolved: Boolean(child),
        };
    });
}
