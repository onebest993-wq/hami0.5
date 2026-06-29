export function addUtcDays(ymd: string, days: number): string | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd ?? '').trim());
    if (!m) return null;
    const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    dt.setUTCDate(dt.getUTCDate() + Math.floor(days));
    return dt.toISOString().slice(0, 10);
}

export function addUtcMonths(ymd: string, months: number): string | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd ?? '').trim());
    if (!m) return null;
    const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    dt.setUTCMonth(dt.getUTCMonth() + Math.floor(months));
    return dt.toISOString().slice(0, 10);
}

/** مهلة الاعتراض على الحكم الغيابي من تاريخ التبليغ. */
export function computeObjectionDeadlineFromNotifiedDate(
    notifiedDate: string,
    crimeType: string,
): string | null {
    const base = addUtcDays(notifiedDate, 1);
    if (!base) return null;
    const ct = String(crimeType ?? '').trim();
    if (ct === 'مخالفة') return addUtcDays(base, 30);
    if (ct === 'جنحة') return addUtcMonths(base, 3);
    if (ct === 'جناية') return addUtcMonths(base, 6);
    return addUtcMonths(base, 3);
}
