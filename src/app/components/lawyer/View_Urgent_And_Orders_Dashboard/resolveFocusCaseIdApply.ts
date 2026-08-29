/**
 * قرار تطبيق focusCaseId على إضبارة المستعجل.
 * يمنع قفل boolean بعد أول فتح؛ يسمح A→B دون المرور بـ undefined.
 */
export function resolveFocusCaseIdApply(
    focusCaseId: string | null | undefined,
    lastApplied: string | null,
    caseExists: boolean,
): { apply: boolean; nextLastApplied: string | null } {
    if (!focusCaseId) {
        return { apply: false, nextLastApplied: null };
    }
    if (lastApplied === focusCaseId) {
        return { apply: false, nextLastApplied: lastApplied };
    }
    if (!caseExists) {
        return { apply: false, nextLastApplied: lastApplied };
    }
    return { apply: true, nextLastApplied: focusCaseId };
}
