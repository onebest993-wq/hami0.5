export type CriminalDashboardTab = 'requests' | 'statements' | 'tracking' | 'legal_codes';

export const CRIMINAL_DASHBOARD_TAB_ORDER: readonly CriminalDashboardTab[] = [
    'requests',
    'statements',
    'tracking',
    'legal_codes',
] as const;

export const CRIMINAL_DASHBOARD_TAB_LABELS: Record<CriminalDashboardTab, string> = {
    requests: 'القرارات',
    statements: 'سجل الإفادات',
    tracking: 'مسارات التتبع',
    legal_codes: 'متون القوانين',
};

/** تبويب الطلبات يصبح «المحاكمة» في مرحلة محكمة الجنح/الجنايات. */
export function resolveCriminalDashboardTabLabel(
    tab: CriminalDashboardTab,
    caseStage?: string,
): string {
    if (
        tab === 'requests' &&
        (caseStage === 'misdemeanor' || caseStage === 'felony')
    ) {
        return 'المحاكمة';
    }
    return CRIMINAL_DASHBOARD_TAB_LABELS[tab];
}

export function criminalDashboardTabClass(tab: CriminalDashboardTab, active: boolean): string {
    const base =
        'min-h-[44px] px-4 py-2 rounded-xl border font-black text-sm transition whitespace-nowrap touch-manipulation';
    const palette: Record<CriminalDashboardTab, { active: string; idle: string }> = {
        requests: {
            active: `${base} border-[#E6C673]/55 bg-[#E6C673]/12 text-[#E6C673] underline underline-offset-8 decoration-2 decoration-[#E6C673]`,
            idle: `${base} border-slate-700/80 bg-slate-900/80 text-white/70 hover:border-[#E6C673]/40 hover:text-[#E6C673]`,
        },
        statements: {
            active: `${base} border-sky-400/55 bg-sky-500/12 text-sky-100 underline underline-offset-8 decoration-2 decoration-sky-400`,
            idle: `${base} border-slate-700/80 bg-slate-900/80 text-white/70 hover:border-sky-400/40 hover:text-sky-200`,
        },
        tracking: {
            active: `${base} border-violet-400/55 bg-violet-500/12 text-violet-100 underline underline-offset-8 decoration-2 decoration-violet-400`,
            idle: `${base} border-slate-700/80 bg-slate-900/80 text-white/70 hover:border-violet-400/40 hover:text-violet-200`,
        },
        legal_codes: {
            active: `${base} border-emerald-400/55 bg-emerald-500/12 text-emerald-100 underline underline-offset-8 decoration-2 decoration-emerald-400`,
            idle: `${base} border-slate-700/80 bg-slate-900/80 text-white/70 hover:border-emerald-400/40 hover:text-emerald-200`,
        },
    };
    return active ? palette[tab].active : palette[tab].idle;
}
