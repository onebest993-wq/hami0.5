export type LawsuitLifecycleE2eProbe = {
    t: number;
    step: string;
    kind?: string;
    reason?: string;
    ids?: string;
    extra?: string;
};

function isHamiE2eRuntime(): boolean {
    return (
        import.meta.env.VITE_SHELL_AUTH_OPEN === 'true' || import.meta.env.VITE_E2E === '1'
    );
}

type E2eProbeHost = Window & {
    __hamiLawsuitLifecycleLast?: LawsuitLifecycleE2eProbe;
    __hamiLawsuitLifecycleLog?: LawsuitLifecycleE2eProbe[];
};

/** مسار الاختبار فقط — البناء يحذف console.warn */
export function recordLawsuitLifecycleE2e(
    step: string,
    detail?: Omit<LawsuitLifecycleE2eProbe, 't' | 'step'>,
): void {
    if (typeof window === 'undefined' || !isHamiE2eRuntime()) return;
    const payload: LawsuitLifecycleE2eProbe = {
        t: Date.now(),
        step,
        ...detail,
    };
    const host = window as E2eProbeHost;
    host.__hamiLawsuitLifecycleLast = payload;
    const log = host.__hamiLawsuitLifecycleLog ?? [];
    log.push(payload);
    host.__hamiLawsuitLifecycleLog = log.length > 24 ? log.slice(-24) : log;
}
