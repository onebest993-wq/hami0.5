export function isCassationAffirmResult(result: string | undefined | null): boolean {
    const r = String(result ?? '').trim();
    return r === 'تصديق القرار' || r === 'رد اللائحة';
}
