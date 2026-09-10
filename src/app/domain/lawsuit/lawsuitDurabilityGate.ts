import type { FileData } from './lawsuitFileTypes';
import {
    rebuildActiveSegmentInIndex,
    type LawsuitLifecycleIndex,
} from '@/app/domain/lawsuit/lawsuitLifecycleIndex';
import {
    mirrorLawsuitSegmentsSafe,
    persistLawsuitActiveSegment,
    persistLawsuitLifecycleIndex,
} from '@/app/domain/lawsuit/lawsuitSegmentPersist';
import { stageLawsuitJournalRecords, mergeLawsuitJournalInto } from '@/app/domain/lawsuit/lawsuitWriteJournal';
import { mergePendingLawsuitCreatesInto } from '@/app/domain/lawsuit/lawsuitPendingCreateStore';
import {
    excludeLawsuitIdsBySet,
    lawsuitActiveIdSet,
    mergeRicherLawsuitActive,
    parseLawsuitActiveFiles,
} from '@/app/domain/lawsuit/lawsuitActiveDurability';
import { collectHeldOutOfActiveIds } from '@/app/domain/lawsuit/lawsuitFilesStatePolicy';
import { readLawsuitLifecycleHeldFenceIds } from '@/app/domain/lawsuit/lawsuitLifecycleMutationFence';
import { LAWSUIT_FILES_ACTIVE_KEY } from '@/app/domain/dossier/dossierStorageKeys';
import { readSecureOrDrainLegacySync } from '@/app/services/storage/readSecureOrDrainLegacySync';

export type LawsuitActivePersistOptions = {
    allowVerifiedEmpty?: boolean;
    allowShrink?: boolean;
};

export type LawsuitActivePersistResult = {
    /** نجحت كتابة المقطع النشط — يُسمح بعدها بالفهرس والمرآة */
    ok: boolean;
    active: FileData[];
};

/**
 * اثبات تقلّص نشط: كل معرّف أُزيل من القرص يجب أن يكون في سلة/أرشيف/tombstone
 * وليس في المقترح النشط. بدون ذلك لا يُسمح بـ allowShrink.
 */
function proveLawsuitActiveShrink(
    proposed: FileData[],
    diskActive: FileData[],
    trash: FileData[] | null | undefined,
    archived: FileData[] | null | undefined,
): { ok: boolean; recovered: FileData[] } {
    const proposedIds = lawsuitActiveIdSet(proposed);
    const held = collectHeldOutOfActiveIds({
        trash,
        archived,
        includeTombstones: true,
        preferActiveIds: proposed,
    });
    const illicit: FileData[] = [];
    for (const row of diskActive) {
        const id = String(row.id ?? '').trim();
        if (!id || proposedIds.has(id)) continue;
        if (held.has(id)) continue;
        illicit.push(row);
    }
    if (illicit.length === 0) {
        return { ok: true, recovered: proposed };
    }
    return {
        ok: false,
        recovered: mergeRicherLawsuitActive(proposed, illicit),
    };
}

/**
 * بوابة الكتابة الموحّدة للمقطع النشط + الفهرس + المرآة.
 * كل مسارات الحفظ (إنشاء، autosave، تعديل إضبارة) تمر من هنا.
 */
export function persistLawsuitActiveBundle(input: {
    active: FileData[];
    index: LawsuitLifecycleIndex;
    archived?: FileData[] | null;
    trash?: FileData[] | null;
    options?: LawsuitActivePersistOptions;
}): LawsuitActivePersistResult {
    /*
     * ادمج المعلّق/السجل دائماً — حتى مع allowShrink (أرشفة/سلة).
     * المسارات تلك تُزيل المعرّف من overlay قبل الكتابة؛ بدون الدمج
     * تُفقد إضبارة منشأة ما زالت في pending بينما المدنية تُكتب وحدها.
     */
    /*
     * لا تمنح pending/WAL القديم حق إعادة ملف خرج من النشط. النشط الذي مرره
     * المستدعي وحده يملك أولوية active؛ أما overlay لم يُنظَّف بسبب مفتاح بارد
     * فيُحجب بحالة السلة/الأرشيف/الفهرس.
     */
    const fencedOutOfActive = readLawsuitLifecycleHeldFenceIds();
    const baseActive = excludeLawsuitIdsBySet(input.active, fencedOutOfActive);
    const heldAgainstOverlays = collectHeldOutOfActiveIds({
        trash: input.trash,
        archived: input.archived,
        index: input.index,
        includeTombstones: true,
        preferActiveIds: baseActive,
    });
    for (const id of fencedOutOfActive) heldAgainstOverlays.add(id);
    let active = excludeLawsuitIdsBySet(
        mergeLawsuitJournalInto(mergePendingLawsuitCreatesInto(baseActive)),
        heldAgainstOverlays,
    );
    if (active.length > 0) {
        stageLawsuitJournalRecords(active);
    }

    const diskActive = parseLawsuitActiveFiles(
        readSecureOrDrainLegacySync(LAWSUIT_FILES_ACTIVE_KEY),
    );
    const preferActive = lawsuitActiveIdSet(active);
    const heldOutOfActive = collectHeldOutOfActiveIds({
        trash: input.trash,
        archived: input.archived,
        includeTombstones: true,
        preferActiveIds: preferActive,
    });

    let writeOptions = input.options;
    if (writeOptions?.allowShrink || writeOptions?.allowVerifiedEmpty) {
        const proof = proveLawsuitActiveShrink(
            active,
            diskActive,
            input.trash,
            input.archived,
        );
        if (!proof.ok) {
            /*
             * تقلّص بلا إثبات نقل — ادمج المفقود وارفض التفريغ.
             * يمنع allowShrink الأعمى من مسار الدمج/الإقلاع.
             */
            active = proof.recovered;
            writeOptions = {
                ...writeOptions,
                allowShrink: false,
                allowVerifiedEmpty: false,
            };
        } else if (active.length === 0 && diskActive.length > 0) {
            /*
             * تفريغ كامل: فقط إن كل معرّفات القرص held (سلة/أرشيف/tombstone).
             */
            let allHeld = true;
            for (const row of diskActive) {
                const id = String(row.id ?? '').trim();
                if (id && !heldOutOfActive.has(id)) {
                    allHeld = false;
                    break;
                }
            }
            if (!allHeld || !writeOptions.allowVerifiedEmpty) {
                active = excludeLawsuitIdsBySet(diskActive, heldOutOfActive);
                writeOptions = {
                    ...writeOptions,
                    allowShrink: active.length < diskActive.length,
                    allowVerifiedEmpty: active.length === 0,
                };
                if (active.length === 0 && !input.options?.allowVerifiedEmpty) {
                    return { ok: false, active: diskActive };
                }
            }
        }
    }

    const activeWritten = persistLawsuitActiveSegment(active, writeOptions);
    if (!activeWritten) {
        return { ok: false, active };
    }
    /*
     * اكتب الفهرس/المرآة من القائمة التي استقرّت على القرص لا من المقترح —
     * writeJsonArray قد يدمج الأغنى، والمرآة بالقائمة الأفقر كانت تسمّم lawyer_files.
     *
     * عند النقل العمدي (allowShrink): لا تُعد إحياء معرّفات خارج المقترح النشط
     * (سلة/أرشيف/tombstone) — لكن تكرار سلة∩نشط لا يُخرج النشط.
     */
    const diskAfter = parseLawsuitActiveFiles(
        readSecureOrDrainLegacySync(LAWSUIT_FILES_ACTIVE_KEY),
    );
    const heldAfter = collectHeldOutOfActiveIds({
        trash: input.trash,
        archived: input.archived,
        includeTombstones: true,
        preferActiveIds: lawsuitActiveIdSet(active),
    });
    const diskSansHeld = excludeLawsuitIdsBySet(diskAfter, heldAfter);
    const canonical =
        writeOptions?.allowShrink || writeOptions?.allowVerifiedEmpty
            ? excludeLawsuitIdsBySet(
                  diskSansHeld.length > 0 ? diskSansHeld : active,
                  heldAfter,
              )
            : diskSansHeld.length > 0
              ? mergeRicherLawsuitActive(active, diskSansHeld)
              : active;
    /*
     * حارس أخير: لا تسمح لمرآة/فهرس فارغين إذا كان المقترح أو القرص يحمل بيانات
     * ولم يُطلب تفريغ موثّق صراحةً.
     */
    if (
        canonical.length === 0 &&
        (active.length > 0 || diskActive.length > 0) &&
        !writeOptions?.allowVerifiedEmpty
    ) {
        const fallback =
            active.length > 0 ? active : excludeLawsuitIdsBySet(diskActive, heldAfter);
        if (fallback.length > 0) {
            const index = rebuildActiveSegmentInIndex(input.index, fallback);
            persistLawsuitLifecycleIndex(index);
            mirrorLawsuitSegmentsSafe(fallback, input.archived ?? null, input.trash ?? null);
            return { ok: true, active: fallback };
        }
    }
    const index =
        canonical.length === input.active.length
            ? input.index
            : rebuildActiveSegmentInIndex(input.index, canonical);
    persistLawsuitLifecycleIndex(index);
    mirrorLawsuitSegmentsSafe(canonical, input.archived ?? null, input.trash ?? null);
    return { ok: true, active: canonical };
}

/**
 * تحديث الفهرس + المرآة دون إعادة كتابة المقطع النشط
 * (حذف نهائي من السلة، تحميل مقاطع كسولة).
 */
export function persistLawsuitLifecycleMirrorBundle(input: {
    active: FileData[];
    index: LawsuitLifecycleIndex;
    archived?: FileData[] | null;
    trash?: FileData[] | null;
}): void {
    persistLawsuitLifecycleIndex(input.index);
    mirrorLawsuitSegmentsSafe(input.active, input.archived ?? null, input.trash ?? null);
}
