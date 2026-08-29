import type { HqVerificationQueueRecord } from '../auth/lawyer-verification/hqVerificationQueueRecord.ts';
import { isPostgresUuidSubject } from './postgresUuidSubject.ts';
import { getSupabaseAdminClient } from './supabaseAdminClient.ts';

const CHUNK = 200;

function isMissingLegalNameColumn(message: string): boolean {
    const hay = message.toLowerCase();
    return hay.includes('legal_display_name') && (hay.includes('does not exist') || hay.includes('schema cache'));
}

/**
 * يلحق الاسم الحي من profiles بطابور التوثيق — للمقارنة فقط، بلا وثائق أو دعاوى.
 */
export async function attachHqQueueLiveNames(
    records: HqVerificationQueueRecord[],
): Promise<HqVerificationQueueRecord[]> {
    if (records.length === 0) return records;
    const admin = getSupabaseAdminClient();
    if (!admin) return records;
    const ids = [...new Set(records.map((row) => row.userId).filter(isPostgresUuidSubject))];
    if (ids.length === 0) return records;
    const names = new Map<string, string>();
    try {
        for (let offset = 0; offset < ids.length; offset += CHUNK) {
            const chunk = ids.slice(offset, offset + CHUNK);
            const { data, error } = await admin
                .from('profiles')
                .select('id, legal_display_name')
                .in('id', chunk);
            if (error) {
                if (isMissingLegalNameColumn(error.message ?? '')) return records;
                return records;
            }
            for (const row of Array.isArray(data) ? data : []) {
                if (!row || typeof row !== 'object') continue;
                const id = String((row as { id?: unknown }).id ?? '').trim();
                const live = String((row as { legal_display_name?: unknown }).legal_display_name ?? '').trim();
                if (id && live) names.set(id, live.slice(0, 80));
            }
        }
    } catch {
        return records;
    }
    if (names.size === 0) return records;
    return records.map((row) => ({
        ...row,
        liveFullName: names.get(row.userId) || row.liveFullName || '',
    }));
}
