/** حدود نص خفيفة لمسار الجزائي — تقلّل تضخّم الـ shards دون كسر الإدخال العادي */
export const CRIMINAL_TEXT_LIMITS = {
    shortLabel: 120,
    partyName: 200,
    note: 4_000,
    statementContent: 20_000,
    requestMargin: 4_000,
    customTypeName: 200,
} as const;

export function clampCriminalText(
    value: unknown,
    limit: number = CRIMINAL_TEXT_LIMITS.note,
): string {
    const raw = String(value ?? '');
    if (raw.length <= limit) return raw;
    return raw.slice(0, limit);
}
