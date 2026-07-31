import type { LooseArchiveFile } from './types';

export function parseLooseAmount(v: unknown): number {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const n = parseFloat(String(v).replace(/,/g, '').replace(/\s/g, ''));
    return Number.isFinite(n) ? n : 0;
}

export function executionTotalDemandEstimate(file: LooseArchiveFile): number {
    const f = file as unknown as Record<string, unknown>;
    const principal = parseLooseAmount(f.totalAmount ?? f.amount ?? f.debtAmount);
    const lawyer = parseLooseAmount(f.lawyerFeesAmount);
    const court = parseLooseAmount(f.courtFees);
    const dir = parseLooseAmount(f.directorateFees);
    const evx = Array.isArray(f.eviction_case_expenses)
        ? (f.eviction_case_expenses as { amount?: unknown }[]).reduce(
              (s, x) => s + parseLooseAmount(x?.amount),
              0,
          )
        : 0;
    return principal + lawyer + court + dir + evx;
}
