/**
 * Helpers for benign PostgREST / Supabase errors (missing tables, RLS, etc.)
 */

export function isSupabaseMissingRelationError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const e = error as {
        code?: string;
        message?: string;
        status?: number;
        statusCode?: number;
    };
    const code = String(e.code ?? '');
    const status = e.status ?? e.statusCode;
    if (status === 404) return true;
    if (code === '42P01' || code === 'PGRST205' || code === 'PGRST204') return true;
    const msg = String(e.message ?? '').toLowerCase();
    return (
        msg.includes('does not exist') ||
        msg.includes('could not find the table') ||
        msg.includes('relation') && msg.includes('not exist')
    );
}
