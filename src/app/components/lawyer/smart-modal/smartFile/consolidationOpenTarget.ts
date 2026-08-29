/**
 * هدف الفتح بعد توحيد الدعاوى — وحدة ورقيّة.
 *
 * الدالّة نقيّة ولا تحتاج إلّا معرّف الملفّ، لكنّها كانت في `caseConsolidationLinking`
 * الذي يستورد `stageInit` (٢٣١ ك.ب). فكان `useLawsuitActiveDossier` — وهو على مسار
 * تنسيق اللوحة — يجرّ كومة `smartFile` كاملةً إلى مقطع الإقلاع.
 */
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { findFileById, normalizeFileId } from './incidentalCaseLinking';

/** يتبع سلسلة التوحيد حتى الدعوى الأصل */
export function resolveConsolidationMergedOpenTarget(files: FileData[], file: FileData): FileData {
    const mergedInto = normalizeFileId(file.consolidationMergedInto);
    if (mergedInto === null) return file;
    const primary = findFileById(files, mergedInto);
    if (!primary) return file;
    if (normalizeFileId(primary.consolidationMergedInto) !== null) {
        return resolveConsolidationMergedOpenTarget(files, primary);
    }
    return primary;
}
