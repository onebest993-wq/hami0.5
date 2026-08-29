import { readSecureJsonRawSync, writeSecureJsonValue } from '@/app/services/storage/syncSecureJson';
import { clearLegacyPlaintextMirror } from '@/app/services/storage/readSecureOrDrainLegacySync';
import SecureStoreService from '@/app/services/SecureStoreService';

const STORAGE_KEY = 'hami:forum:repo-reports:v1';
const MAX_STORED = 400;
const MAX_ID_LENGTH = 80;

export type LegalRepositoryLocalReport = {
    reporterId: string;
    documentId: string;
    documentTitle: string;
    recordedAt: string;
};

function isLocalReport(value: unknown): value is LegalRepositoryLocalReport {
    if (!value || typeof value !== 'object') return false;
    const row = value as Record<string, unknown>;
    return (
        typeof row.reporterId === 'string' &&
        row.reporterId.length > 0 &&
        typeof row.documentId === 'string' &&
        row.documentId.length > 0 &&
        typeof row.documentTitle === 'string' &&
        typeof row.recordedAt === 'string'
    );
}

function readAll(): LegalRepositoryLocalReport[] {
    try {
        const raw = readSecureJsonRawSync(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isLocalReport);
    } catch {
        return [];
    }
}

function writeAll(rows: LegalRepositoryLocalReport[]): void {
    writeSecureJsonValue(STORAGE_KEY, rows.slice(-MAX_STORED));
}

export function hasLegalRepositoryLocalReport(reporterId: string, documentId: string): boolean {
    return readAll().some((row) => row.reporterId === reporterId && row.documentId === documentId);
}

/** يُرجع false إذا كان البلاغ مكرراً أو تعذّر الحفظ */
export function recordLegalRepositoryLocalReport(
    reporterId: string,
    documentId: string,
    documentTitle: string,
): boolean {
    if (!reporterId || !documentId) return false;
    if (reporterId.length > MAX_ID_LENGTH || documentId.length > MAX_ID_LENGTH) return false;
    const existing = readAll();
    if (existing.some((row) => row.reporterId === reporterId && row.documentId === documentId)) {
        return false;
    }
    writeAll([
        ...existing,
        {
            reporterId,
            documentId,
            documentTitle: documentTitle.slice(0, 180),
            recordedAt: new Date().toISOString(),
        },
    ]);
    return true;
}

export function resetLegalRepositoryLocalReportsForTests(): void {
    clearLegacyPlaintextMirror(STORAGE_KEY);
    SecureStoreService.deleteItemSync(STORAGE_KEY);
}
