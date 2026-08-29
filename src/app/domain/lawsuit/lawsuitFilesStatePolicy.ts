import SecureStoreService from '@/app/services/SecureStoreService';
import {
    LAWSUIT_FILES_ACTIVE_KEY,
    LAWSUIT_FILES_INDEX_KEY,
    LAWSUIT_FILES_STORAGE_KEY,
} from '@/app/services/dossierPersistence/dossierStorageKeys';
import { mergeRicherLawsuitActive } from './lawsuitActiveDurability';
import { mergeLawsuitDurabilityOverlaysInto } from './lawsuitDurabilityOverlay';
import type { LawsuitFileSegments } from './lawsuitFileSegments';
import { rebuildActiveSegmentInIndex } from './lawsuitLifecycleIndex';
import { lawsuitSegmentsNeedWarm } from './lawsuitSegmentStorage';

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

export function pickRicherLawsuitSegments(
    prev: LawsuitFileSegments,
    boot: LawsuitFileSegments,
): LawsuitFileSegments {
    const active = mergeRicherLawsuitActive(boot.active, prev.active);
    const archived =
        prev.archived !== null && boot.archived !== null
            ? mergeRicherLawsuitActive(boot.archived, prev.archived)
            : (prev.archived?.length ?? 0) > (boot.archived?.length ?? 0)
              ? prev.archived
              : boot.archived;
    const trash =
        prev.trash !== null && boot.trash !== null
            ? mergeRicherLawsuitActive(boot.trash, prev.trash)
            : (prev.trash?.length ?? 0) > (boot.trash?.length ?? 0)
              ? prev.trash
              : boot.trash;
    if (
        active === boot.active &&
        archived === boot.archived &&
        trash === boot.trash &&
        active.length === boot.active.length
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

/** pending + WAL فوق مقاطع الإقلاع دون كتابة */
export function applyLawsuitDurabilityOverlaysToSegments(
    boot: LawsuitFileSegments,
): LawsuitFileSegments {
    const active = mergeLawsuitDurabilityOverlaysInto(boot.active);
    if (active.length === boot.active.length) return boot;
    return {
        ...boot,
        active,
        index: rebuildActiveSegmentInIndex(boot.index, active),
    };
}
