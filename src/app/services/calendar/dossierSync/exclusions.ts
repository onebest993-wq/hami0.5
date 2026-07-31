/**
 * مزامنة منهجية: أي موعد/تاريخ في إضبارة (دعوى، تنفيذ، مستعجل، معاملة، جزائي، Threading)
 * يُرفع إلى التقويم المركزي عبر معرّف ثابت — لا ربط عشوائي لكل زر على حدة.
 */
import { isExecutionArchived, isExecutionInTrash } from '@/app/utils/executionTrash';
import { isLawsuitArchived, isLawsuitInTrash } from '@/app/utils/lawsuitTrash';
import { loadExecutionFilesRaw } from '@/app/utils/executionFilesStorage';
import { loadLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { isRecord } from './shared';

/** لا يُرفع للتقويم: سلة المحذوفات، الأرشيف، أو مرحلة مؤرشفة */
export function shouldExcludeLawsuitFromCalendar(file: Record<string, unknown>): boolean {
    if (isLawsuitInTrash(file) || isLawsuitArchived(file)) return true;
    const status = String(file.status ?? '');
    return status === 'archived_stage' || status === 'paused';
}

/** لا يُرفع للتقويم: سلة التنفيذ أو حالة إضبارة غير نشطة */
export function shouldExcludeExecutionFromCalendar(file: Record<string, unknown>): boolean {
    if (isExecutionInTrash(file as { executionTrashDeletedAt?: string | null })) return true;
    if (isExecutionArchived(file as { executionArchivedAt?: string | null })) return true;
    const status = String(file.status ?? '');
    return status === 'archived' || status === 'archived_stage' || status === 'deleted';
}

/** لا يُرفع للتقويم: مضمومة، مؤرشفة، أو مدمجة في إضبارة أخرى */
export function shouldExcludeCriminalFromCalendar(caseRecord: Record<string, unknown>): boolean {
    if (caseRecord.isArchived === true) return true;
    if (String(caseRecord.dossierStatus ?? '') === 'merged') return true;
    if (String(caseRecord.mergedIntoCaseId ?? '').trim()) return true;
    return false;
}

function findLawsuitFile(entityId: string): Record<string, unknown> | null {
    for (const raw of loadLawsuitFilesRaw()) {
        if (!isRecord(raw)) continue;
        if (String(raw.id ?? '') === entityId) return raw;
    }
    return null;
}

function findExecutionFile(entityId: string): Record<string, unknown> | null {
    for (const raw of loadExecutionFilesRaw()) {
        if (!isRecord(raw)) continue;
        if (String(raw.id ?? '') === entityId) return raw;
    }
    return null;
}

export { findLawsuitFile, findExecutionFile };

