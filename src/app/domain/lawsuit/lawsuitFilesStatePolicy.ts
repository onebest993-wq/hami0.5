import SecureStoreService from '@/app/services/SecureStoreService';
import {
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_STORAGE_KEY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import {
    excludeLawsuitIdsBySet,
    lawsuitActiveIdSet,
    mergeRicherLawsuitActive,
    mergeRicherLawsuitActiveRespectingHeldIds,
} from './lawsuitActiveDurability';
import { mergeLawsuitDurabilityOverlaysInto } from './lawsuitDurabilityOverlay';
import type { FileData } from './lawsuitFileTypes';
import type { LawsuitFileSegments } from './lawsuitFileSegments';
import {
    rebuildActiveSegmentInIndex,
    type LawsuitLifecycleIndex,
} from './lawsuitLifecycleIndex';
import { lawsuitSegmentsNeedWarm } from './lawsuitSegmentStorage';
import { readLawsuitDossierTombstoneIds } from '@/app/utils/lawsuitDossierTombstones';

function lifecycleIndexHoldsOutOfActive(
    index: LawsuitLifecycleIndex | null | undefined,
    id: string,
): boolean {
    const status = index?.entries?.[id]?.status;
    return status === 'deleted' || status === 'archived';
}

export function bootHasLawsuitRecords(boot: LawsuitFileSegments): boolean {
    return (
        boot.active.length > 0 ||
        boot.index.counts.active > 0 ||
        boot.index.counts.archived > 0 ||
        boot.index.counts.trash > 0
    );
}

/** لا تُكتب مصفوفة نشطة فارغة فوق قرص قد يحمل بيانات باردة أو فهرساً غير صفري */
export function shouldBlockEmptyLawsuitPersist(next: LawsuitFileSegments): boolean {
    if (next.active.length > 0) return false;
    if (lawsuitSegmentsNeedWarm()) return true;
    if (SecureStoreService.isUnreadSync(LAWSUIT_FILES_ACTIVE_KEY)) return true;
    if (SecureStoreService.isUnreadSync(LAWSUIT_FILES_INDEX_KEY)) return true;
    if (SecureStoreService.isUnreadSync(LAWSUIT_FILES_STORAGE_KEY)) return true;
    const counts = next.index.counts;
    return counts.active > 0 || counts.archived > 0 || counts.trash > 0;
}

function toIdSet(
    preferActiveIds?: ReadonlySet<string> | readonly FileData[] | null,
): Set<string> {
    if (!preferActiveIds) return new Set();
    if (Array.isArray(preferActiveIds)) {
        return lawsuitActiveIdSet(preferActiveIds as readonly FileData[]);
    }
    return new Set(preferActiveIds as ReadonlySet<string>);
}

/**
 * معرّفات خارج النشط عمداً.
 *
 * قواعد صارمة (منع المسح الذاتي):
 * - tombstone فقط (ليس في النشط) → يُمسك دائماً (حذف نهائي)
 * - tombstone ∩ نشط → **لا يُمسك** (شاهد فاسد؛ فضّل النشط)
 * - أرشيف فقط → يُمسك (النقل للأرشيف مقصود)
 * - أرشيف ∩ نشط → **لا يُمسك** (تكرار فاشل؛ فضّل النشط)
 * - سلة ∩ نشط → **لا يُمسك** (تكرار فاشل؛ فضّل النشط)
 * - سلة فقط → يُمسك
 * - فهرس status وحده + ليس في النشط المرشّح → يُمسك (مهم عند المقاطع الكسولة)
 * - فهرس قديم ∩ نشط مرشّح → النشط يفوز، فلا يسبب مسحاً
 */
export function collectHeldOutOfActiveIds(input: {
    archived?: FileData[] | null;
    trash?: FileData[] | null;
    index?: LawsuitLifecycleIndex | null;
    includeTombstones?: boolean;
    /** إضابير ما زالت في المرشّح النشط — لا تُخرجها بسبب صف مكرّر في السلة/الأرشيف */
    preferActiveIds?: ReadonlySet<string> | readonly FileData[] | null;
}): Set<string> {
    const preferActive = toIdSet(input.preferActiveIds);
    const held = new Set<string>();

    for (const row of input.trash ?? []) {
        const id = String(row.id ?? '').trim();
        if (!id) continue;
        if (preferActive.has(id)) continue;
        held.add(id);
    }
    for (const row of input.archived ?? []) {
        const id = String(row.id ?? '').trim();
        if (!id) continue;
        if (preferActive.has(id)) continue;
        held.add(id);
    }
    for (const entry of Object.values(input.index?.entries ?? {})) {
        if (entry.status !== 'archived' && entry.status !== 'deleted') continue;
        const id = String(entry.id ?? '').trim();
        if (!id || preferActive.has(id)) continue;
        held.add(id);
    }

    if (input.includeTombstones !== false) {
        try {
            for (const id of readLawsuitDossierTombstoneIds()) {
                /*
                 * tombstone ∩ نشط حي = شاهد قديم/فاسد. فضّل النشط حتى لا
                 * يُفرَّغ المخزن عند كل reload. الحذف النهائي يزيل من النشط أولاً.
                 */
                if (preferActive.has(id)) continue;
                held.add(id);
            }
        } catch {
            /* ignore */
        }
    }
    return held;
}

/** أزل من السلة أي معرّف ما زال في النشط — شفاء تكرار فاشل */
export function healLawsuitTrashAgainstActive(
    active: readonly FileData[],
    trash: readonly FileData[] | null | undefined,
): FileData[] | null {
    if (trash == null) return trash ?? null;
    if (trash.length === 0) return trash as FileData[];
    const activeIds = lawsuitActiveIdSet(active);
    if (activeIds.size === 0) return [...trash];
    const next = trash.filter((row) => !activeIds.has(String(row.id ?? '').trim()));
    return next.length === trash.length ? [...trash] : next;
}

/** أزل من الأرشيف أي معرّف ما زال في النشط — شفاء تكرار فاشل */
export function healLawsuitArchivedAgainstActive(
    active: readonly FileData[],
    archived: readonly FileData[] | null | undefined,
): FileData[] | null {
    if (archived == null) return archived ?? null;
    if (archived.length === 0) return archived as FileData[];
    const activeIds = lawsuitActiveIdSet(active);
    if (activeIds.size === 0) return [...archived];
    const next = archived.filter((row) => !activeIds.has(String(row.id ?? '').trim()));
    return next.length === archived.length ? [...archived] : next;
}

/**
 * دمج مقطع سلة/أرشيف: لا تُعد إحياء صفوف أُزيلت عمداً (حذف نهائي / تقلّص prev).
 */
export function mergeLawsuitLifecycleSegmentLists(
    boot: FileData[] | null,
    prev: FileData[] | null,
    permanentlyRemovedIds: ReadonlySet<string>,
): FileData[] | null {
    if (boot === null && prev === null) return null;
    if (boot === null) return excludeLawsuitIdsBySet(prev ?? [], permanentlyRemovedIds);
    if (prev === null) return excludeLawsuitIdsBySet(boot, permanentlyRemovedIds);

    const prevIds = lawsuitActiveIdSet(prev);
    const bootIds = lawsuitActiveIdSet(boot);
    let prevSubsetOfBoot = true;
    for (const id of prevIds) {
        if (!bootIds.has(id)) {
            prevSubsetOfBoot = false;
            break;
        }
    }
    if (prev.length < boot.length && prevSubsetOfBoot) {
        return excludeLawsuitIdsBySet(prev, permanentlyRemovedIds);
    }

    return excludeLawsuitIdsBySet(mergeRicherLawsuitActive(boot, prev), permanentlyRemovedIds);
}

/**
 * لا تُعد إحياء معرّف نُقل للسلة/الأرشيف أو حُذف نهائياً عند دمج boot مع الحالة الحالية.
 */
export function pickRicherLawsuitSegments(
    prev: LawsuitFileSegments,
    boot: LawsuitFileSegments,
): LawsuitFileSegments {
    const tombstoned = (() => {
        try {
            return readLawsuitDossierTombstoneIds();
        } catch {
            return new Set<string>();
        }
    })();

    /*
     * فضّل النشط فقط إن:
     * - الجلسة (prev) تعتبره نشطاً، و
     * - الفهرس لا يقول إنه في السلة/الأرشيف.
     * overlay/hydrate قد يضعان الملف في prev.active بينما القرص في السلة —
     * تفضيل prev كان يعيد البطاقة بعد Reload مع بقاء القرص صحيحاً.
     */
    const preferActive = new Set<string>();
    for (const id of lawsuitActiveIdSet(prev.active)) {
        if (lifecycleIndexHoldsOutOfActive(boot.index, id)) continue;
        if (lifecycleIndexHoldsOutOfActive(prev.index, id)) continue;
        preferActive.add(id);
    }
    const bootTrashIds = lawsuitActiveIdSet(boot.trash ?? []);
    for (const row of boot.active) {
        const id = String(row.id ?? '').trim();
        if (id && bootTrashIds.has(id) && !lifecycleIndexHoldsOutOfActive(boot.index, id)) {
            preferActive.add(id);
        }
    }

    const held = collectHeldOutOfActiveIds({
        archived: boot.archived ?? prev.archived,
        trash: boot.trash ?? prev.trash,
        index: boot.index ?? prev.index,
        includeTombstones: true,
        preferActiveIds: preferActive,
    });
    for (const id of collectHeldOutOfActiveIds({
        archived: prev.archived,
        trash: prev.trash,
        index: prev.index,
        includeTombstones: true,
        preferActiveIds: preferActive,
    })) {
        held.add(id);
    }

    const active = excludeLawsuitIdsBySet(
        mergeRicherLawsuitActiveRespectingHeldIds(boot.active, prev.active, held),
        held,
    );

    let archived = mergeLawsuitLifecycleSegmentLists(boot.archived, prev.archived, tombstoned);
    let trash = mergeLawsuitLifecycleSegmentLists(boot.trash, prev.trash, tombstoned);
    trash = healLawsuitTrashAgainstActive(active, trash);
    archived = healLawsuitArchivedAgainstActive(active, archived);

    if (
        active.length === boot.active.length &&
        active.every((row, i) => String(row.id) === String(boot.active[i]?.id)) &&
        archived === boot.archived &&
        trash === boot.trash
    ) {
        return boot;
    }

    return {
        active,
        archived,
        trash,
        index: rebuildActiveSegmentInIndex(boot.index, active),
    };
}

/**
 * قائمة eager-hydrate ليست مصدر حقيقة للنشط.
 * تُدمج فقط بعد إخراج معرّفات السلة/الأرشيف/الشواهد حتى لا تُبعث إضبارة
 * من lawyer_files / المرآة بينما القرص يحملها في المهملات.
 */
export function adoptHydratedLawsuitActive(
    boot: LawsuitFileSegments,
    hydrated: readonly FileData[],
): LawsuitFileSegments {
    const held = collectHeldOutOfActiveIds({
        archived: boot.archived,
        trash: boot.trash,
        index: boot.index,
        includeTombstones: true,
        preferActiveIds: boot.active,
    });
    const hydratedActive = excludeLawsuitIdsBySet(
        hydrated.length > 0 ? mergeLawsuitDurabilityOverlaysInto([...hydrated]) : [],
        held,
    );
    const active = excludeLawsuitIdsBySet(
        mergeRicherLawsuitActiveRespectingHeldIds(boot.active, hydratedActive, held),
        held,
    );
    return {
        ...boot,
        active,
        trash: healLawsuitTrashAgainstActive(active, boot.trash),
        archived: healLawsuitArchivedAgainstActive(active, boot.archived),
        index: rebuildActiveSegmentInIndex(boot.index, active),
    };
}

/** pending + WAL فوق مقاطع الإقلاع دون كتابة */
export function applyLawsuitDurabilityOverlaysToSegments(
    boot: LawsuitFileSegments,
): LawsuitFileSegments {
    const mergedSeed = mergeLawsuitDurabilityOverlaysInto(boot.active);
    const held = collectHeldOutOfActiveIds({
        archived: boot.archived,
        trash: boot.trash,
        index: boot.index,
        includeTombstones: true,
        /*
         * النشط المثبت فقط يملك حق كسر حالة السلة/الأرشيف. WAL قديم ليس
         * دليلاً على الاستعادة؛ اعتباره preferActive كان يبعث المحذوف.
         */
        preferActiveIds: boot.active,
    });
    const active = excludeLawsuitIdsBySet(mergedSeed, held);
    if (active.length === boot.active.length) return boot;
    return {
        ...boot,
        active,
        trash: healLawsuitTrashAgainstActive(active, boot.trash),
        index: rebuildActiveSegmentInIndex(boot.index, active),
    };
}
