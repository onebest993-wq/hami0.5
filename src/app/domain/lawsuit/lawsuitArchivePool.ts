/** إضابير الدعاوى المعروضة في بوابة الأرشيف (نشطة + مؤرشفة + سلة). */
export function allLawsuitFilesForArchive<T extends { type?: string }>(files: T[]): T[] {
    return files.filter((f) => f.type === 'lawsuit');
}
