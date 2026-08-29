/** يستخرج معرّف قضية جزائية من صف الفهرس */
export function resolveCriminalCaseId(raw: unknown): string | null {
    if (!raw || typeof raw !== 'object') return null;
    const id = String((raw as Record<string, unknown>).id ?? '').trim();
    return id || null;
}

/** يتحقق أن المعرّف يخص قضية جزائية ضمن ملكية المستخدم الحالية */
export function isOwnedCriminalCaseId(criminalCases: unknown[], criminalId: string): boolean {
    const target = criminalId.trim();
    if (!target) return false;
    return criminalCases.some((row) => resolveCriminalCaseId(row) === target);
}
