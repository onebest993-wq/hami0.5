/** حدود اليوم المحلي — بلا محرّك NLP */
export function addDays(base: Date, days: number): Date {
    const d = new Date(base);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d;
}

export function startOfLocalDay(d: Date = new Date()): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
