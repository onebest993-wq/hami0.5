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
    mergeRicherLawsuitActive,
    parseLawsuitActiveFiles,
} from '@/app/domain/lawsuit/lawsuitActiveDurability';
import { LAWSUIT_FILES_ACTIVE_KEY } from '@/app/services/dossierPersistence/dossierStorageKeys';
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
    const active = mergeLawsuitJournalInto(mergePendingLawsuitCreatesInto(input.active));
    if (active.length > 0) {
        stageLawsuitJournalRecords(active);
    }
    const activeWritten = persistLawsuitActiveSegment(active, input.options);
    if (!activeWritten) {
        return { ok: false, active };
    }
    /*
     * اكتب الفهرس/المرآة من القائمة التي استقرّت على القرص لا من المقترح —
     * writeJsonArray قد يدمج الأغنى، والمرآة بالقائمة الأفقر كانت تسمّم lawyer_files.
     */
    const diskActive = parseLawsuitActiveFiles(
        readSecureOrDrainLegacySync(LAWSUIT_FILES_ACTIVE_KEY),
    );
    const canonical =
        diskActive.length > 0 ? mergeRicherLawsuitActive(active, diskActive) : active;
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
