import { patchExecutionDossierRecord, readExecutionDossierBlob } from '@/app/utils/executionDossierBlobPersistence';
import type { ExecutionFile } from '@/app/types/execution';

export type InabaCorrespondenceLogStatus = 'pending_executor' | 'sent' | 'rejected';

export interface InabaCorrespondenceLogEntry {
    id: string;
    subFileId: string;
    directorate: string;
    subject: string;
    requestDate: string;
    createdAt: string;
    status: InabaCorrespondenceLogStatus;
    decisionRowId?: string;
    sentAt?: string;
}

export function getInabaCorrespondenceLog(
    file: ExecutionFile | null | undefined
): InabaCorrespondenceLogEntry[] {
    const raw = (file as { inaba_correspondence_log?: unknown } | null)?.inaba_correspondence_log;
    if (!Array.isArray(raw)) return [];
    return raw.filter((e): e is InabaCorrespondenceLogEntry => {
        if (!e || typeof e !== 'object') return false;
        const row = e as InabaCorrespondenceLogEntry;
        return Boolean(String(row.id || '').trim() && String(row.subject || '').trim());
    });
}

export function createInabaCorrespondenceLogEntry(input: {
    subFileId: string;
    directorate: string;
    subject: string;
    requestDate: string;
    decisionRowId: string;
}): InabaCorrespondenceLogEntry {
    const now = new Date().toISOString();
    return {
        id: `inaba_log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        subFileId: String(input.subFileId || '').trim(),
        directorate: String(input.directorate || '').trim(),
        subject: String(input.subject || '').trim(),
        requestDate: String(input.requestDate || '').trim(),
        createdAt: now,
        status: 'pending_executor',
        decisionRowId: String(input.decisionRowId || '').trim(),
    };
}

export function patchParentInabaCorrespondenceLog(
    parentExecutionId: string,
    mutator: (entries: InabaCorrespondenceLogEntry[]) => InabaCorrespondenceLogEntry[]
): InabaCorrespondenceLogEntry[] | null {
    const parentId = String(parentExecutionId || '').trim();
    if (!parentId) return null;
    try {
        const file = readExecutionDossierBlob(parentId);
        if (!file) return null;
        const prev = getInabaCorrespondenceLog(file as unknown as ExecutionFile);
        const next = mutator(prev);
        const patch = { inaba_correspondence_log: next, updatedAt: new Date().toISOString() };
        patchExecutionDossierRecord(parentId, patch);
        return next;
    } catch {
        return null;
    }
}

export function updateInabaLogEntryByDecisionId(
    parentExecutionId: string,
    decisionRowId: string,
    patch: Partial<Pick<InabaCorrespondenceLogEntry, 'status' | 'sentAt'>>
): boolean {
    const decisionId = String(decisionRowId || '').trim();
    if (!decisionId) return false;
    const next = patchParentInabaCorrespondenceLog(parentExecutionId, (entries) =>
        entries.map((e) =>
            String(e.decisionRowId || '') === decisionId ? { ...e, ...patch } : e
        )
    );
    return next !== null;
}
