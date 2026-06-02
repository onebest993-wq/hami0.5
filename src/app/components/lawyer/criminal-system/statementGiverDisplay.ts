import type { Statement } from './criminalStore';

export type StatementGiverType = Statement['giverType'];

export function statementGiverRoleLabel(giverType: StatementGiverType): string {
    if (giverType === 'complainant') return 'مشتكي/مجني عليه';
    if (giverType === 'defendant') return 'مشكو منه/متهم';
    if (giverType === 'witness') return 'شاهد';
    if (giverType === 'informant') return 'مخبر';
    return '—';
}

export function statementGiverRoleStyle(giverType: StatementGiverType): string {
    if (giverType === 'complainant') return 'border-sky-500/40 bg-sky-500/15 text-sky-200';
    if (giverType === 'defendant') return 'border-red-500/40 bg-red-500/15 text-red-200';
    if (giverType === 'witness') return 'border-violet-400/50 bg-violet-500/20 text-violet-100';
    return 'border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-200';
}

/** بطاقة إفادة محكمة الموضوع — بدون شارة التصديق القضائي. */
export function trialDepositionCardShellClass(giverType: StatementGiverType = 'witness'): string {
    if (giverType === 'witness') {
        return 'rounded-2xl border border-violet-500/45 bg-violet-950/40 p-4 space-y-4';
    }
    if (giverType === 'complainant') {
        return 'rounded-2xl border border-sky-500/35 bg-slate-800/40 p-4 space-y-4';
    }
    if (giverType === 'defendant') {
        return 'rounded-2xl border border-red-500/35 bg-slate-800/40 p-4 space-y-4';
    }
    return 'rounded-2xl border border-slate-700/80 bg-slate-800/35 p-4 space-y-4';
}

export function resolveStatementPersonName(st: Statement): string {
    if (st.giverType === 'witness') {
        return String(st.witnessName ?? '').trim() || st.giverName.trim();
    }
    return st.giverName.trim();
}
