import { isIqrarRequest } from '@/app/components/lawyer/Form_Urgent_Actions/constants';
import type { UrgentCase } from './types';
import type { UrgentCaseStorageRow } from './types';

/** ترحيل إقرارات صادرت حجتها قبل تفعيل الأرشفة التلقائية */
export function applyIqrarArchiveMigration(c: UrgentCase): UrgentCase {
    if (c.archived) return c;
    const row = c as UrgentCaseStorageRow;
    const legalState = String(row.legalState ?? '');
    const authenticated = row.iqrarDeedAuthenticated === true || legalState === 'Iqrar_Authenticated';
    if (!authenticated) return c;
    const label = String(c.specificActionType ?? c.actionType ?? '').trim();
    if (!isIqrarRequest(label)) return c;
    const now = new Date().toISOString();
    return {
        ...c,
        archived: true,
        archivedAt: c.archivedAt ?? now,
        archivedReason: typeof row.archivedReason === 'string' ? row.archivedReason : 'iqrar_authenticated',
        phase: 'completed',
        status: 'completed',
        finalityReason: typeof row.finalityReason === 'string' ? row.finalityReason : 'iqrar_authenticated',
    } as UrgentCase;
}
