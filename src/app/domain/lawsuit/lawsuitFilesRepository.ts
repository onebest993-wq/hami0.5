import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { loadLawsuitFilesRaw, saveLawsuitFilesRaw } from '@/app/utils/lawsuitFilesStorage';
import { loadDossierCollectionAsync } from '@/app/services/dossierPersistence/dossierPersistenceService';

const STALE_MOCK_CASE_NO = '2025/ب/522';

/** إزالة mock قديم من الجلسات السابقة */
export function stripStaleMockLawsuitFile(files: FileData[]): FileData[] {
    if (files.length === 1 && files[0]?.id === 1 && files[0]?.caseNo === STALE_MOCK_CASE_NO) {
        return [];
    }
    return files;
}

export function loadInitialLawsuitFiles(): FileData[] {
    const loaded = loadLawsuitFilesRaw() as FileData[];
    const stripped = stripStaleMockLawsuitFile(loaded);
    if (stripped.length !== loaded.length) {
        persistLawsuitFiles(stripped);
    }
    return stripped;
}

/** تحميل غير متزامn بعد جاهزية IndexedDB — يستعيد من النسخة الاحتياطية عند الحاجة */
export async function loadInitialLawsuitFilesAsync(): Promise<FileData[]> {
    const asyncLoaded = (await loadDossierCollectionAsync('lawsuit')) as FileData[];
    const syncLoaded = loadLawsuitFilesRaw() as FileData[];
    const primary =
        asyncLoaded.length > 0
            ? asyncLoaded
            : syncLoaded.length > 0
              ? syncLoaded
              : asyncLoaded;
    const stripped = stripStaleMockLawsuitFile(primary);
    if (stripped.length !== primary.length) {
        persistLawsuitFiles(stripped);
    }
    return stripped;
}

export function reloadLawsuitFilesFromStorage(): FileData[] {
    const merged = loadLawsuitFilesRaw() as FileData[];
    return Array.isArray(merged) ? merged : [];
}

/** حفظ موحّد — SecureStore + persistenceRepository */
export function persistLawsuitFiles(next: FileData[]): FileData[] {
    const payload = Array.isArray(next) ? next : [];
    saveLawsuitFilesRaw(payload as unknown[]);
    return payload;
}

export function applyLawsuitTrash(files: FileData[], fileId: string | number): FileData[] {
    const idStr = String(fileId);
    return files.map((f) =>
        String(f.id) === idStr ? { ...f, status: 'deleted' as const, deletedAt: Date.now() } : f,
    );
}

export function applyLawsuitRestoreFromTrash(files: FileData[], fileId: string | number): FileData[] {
    const idStr = String(fileId);
    return files.map((f) =>
        String(f.id) === idStr ? { ...f, status: 'active' as const, deletedAt: undefined } : f,
    );
}

export function applyLawsuitArchive(files: FileData[], fileId: string | number): FileData[] {
    const idStr = String(fileId);
    return files.map((f) => (String(f.id) === idStr ? { ...f, status: 'archived' as const } : f));
}

export function applyLawsuitRestoreFromArchive(files: FileData[], fileId: string | number): FileData[] {
    const idStr = String(fileId);
    return files.map((f) => (String(f.id) === idStr ? { ...f, status: 'active' as const } : f));
}

export function applyLawsuitPermanentDelete(
    files: FileData[],
    ids: Array<string | number>,
): FileData[] {
    const idSet = new Set(ids.map(String));
    return files.filter((f) => !idSet.has(String(f.id)));
}

export function applyLawsuitSoftDelete(file: FileData): FileData {
    return { ...file, status: 'deleted', deletedAt: Date.now() };
}

export function applyLawsuitHardDeleteFilter(files: FileData[], fileId: string | number): FileData[] {
    return files.filter((f) => f.id !== fileId);
}

export function findLawsuitFile(files: FileData[], fileId: string | number): FileData | undefined {
    const idStr = String(fileId);
    return files.find((f) => String(f.id) === idStr);
}
