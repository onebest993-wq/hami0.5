import { SupabaseService, type ExecutionFileDTO_Supabase } from '@/app/services/SupabaseService';
import { isExecutionDossierTombstoned } from '@/app/utils/executionDossierTombstones';
import { isLiveCloudSyncBucketEnabled } from '@/app/services/settings/cloudSyncBucket';
import { debug } from '@/app/utils/debug';

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function idOf(item: unknown): string | null {
    if (!isRecord(item)) return null;
    const id = item.id;
    if (typeof id === 'string' && id.trim()) return id.trim();
    if (typeof id === 'number' && Number.isFinite(id)) return String(id);
    return null;
}

function updatedAtMsOf(item: unknown): number {
    if (!isRecord(item)) return 0;
    const v = item.updatedAt;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v !== 'string') return 0;
    const t = Date.parse(v);
    return Number.isNaN(t) ? 0 : t;
}

function resolveExecutionType(raw: string): ExecutionFileDTO_Supabase['executionType'] {
    if (raw === 'مدني' || raw === 'شرعي' || raw === 'التزام بعمل/تسليم') return raw;
    if (raw.includes('شرع')) return 'شرعي';
    if (raw.includes('تسليم') || raw.includes('التزام')) return 'التزام بعمل/تسليم';
    return 'مدني';
}

function toExecutionDto(item: Record<string, unknown>): ExecutionFileDTO_Supabase | null {
    const id = idOf(item);
    if (!id) return null;
    const caseNo =
        (typeof item.caseNo === 'string' && item.caseNo.trim()) ||
        [item.fileNumber, item.fileYear]
            .filter((x) => typeof x === 'string' && String(x).trim())
            .join('/') ||
        id;
    const executionType = resolveExecutionType(String(item.executionType ?? item.docType ?? '').trim());
    const statusRaw = typeof item.status === 'string' ? item.status : 'active';
    const status: ExecutionFileDTO_Supabase['status'] =
        statusRaw === 'archived' || statusRaw === 'completed' ? statusRaw : 'active';
    return {
        id,
        caseNo,
        executionType,
        court:
            typeof item.court === 'string'
                ? item.court
                : typeof item.directorate === 'string'
                  ? item.directorate
                  : '',
        executionBasis: typeof item.executionBasis === 'string' ? item.executionBasis : '',
        creditor: isRecord(item.creditor) ? item.creditor : {},
        debtor: isRecord(item.debtor) ? item.debtor : {},
        totalAmount: Number(item.totalAmount) || 0,
        status,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : undefined,
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
    };
}

/** يختار الصفوف المحلية التي يجب دفعها (أحدث من السحابة أو غير موجودة هناك) */
export function selectExecutionRowsToPush(localRows: unknown[], cloudRows: unknown[]): unknown[] {
    const cloudMap = new Map<string, unknown>();
    for (const row of cloudRows) {
        const id = idOf(row);
        if (id) cloudMap.set(id, row);
    }
    const out: unknown[] = [];
    for (const row of localRows) {
        const id = idOf(row);
        if (!id || isExecutionDossierTombstoned(id)) continue;
        const cloud = cloudMap.get(id);
        if (!cloud || updatedAtMsOf(row) > updatedAtMsOf(cloud)) {
            out.push(row);
        }
    }
    return out;
}

const MAX_PUSH_PER_CYCLE = 25;

export async function pushDirtyExecutionFilesToCloud(
    localRows: unknown[],
    cloudRows: unknown[],
): Promise<{ attempted: number; succeeded: number }> {
    if (!isLiveCloudSyncBucketEnabled('execution')) {
        return { attempted: 0, succeeded: 0 };
    }
    const candidates = selectExecutionRowsToPush(localRows, cloudRows).slice(0, MAX_PUSH_PER_CYCLE);
    let succeeded = 0;
    for (const row of candidates) {
        if (!isRecord(row)) continue;
        const dto = toExecutionDto(row);
        if (!dto) continue;
        try {
            await SupabaseService.saveExecutionFile(dto);
            succeeded += 1;
        } catch (error) {
            debug.warn('[CloudSync] فشل دفع إضبارة تنفيذ إلى السحابة:', dto.id, error);
        }
    }
    return { attempted: candidates.length, succeeded };
}
