import { useCallback, useRef } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { SmartVaultDB } from '@/app/services/vault/smartVaultRuntime';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { DossierPickerOption } from '@/app/services/repository/repositoryDossierRegistry';
import {
    appendNoteToExecutionFile,
    appendNoteToLawsuitFile,
    deleteExecutionDossierNote,
    deleteLawsuitDossierNote,
    encodeBoundDossierId,
    globalNoteToDossierPayload,
    vaultDocToDossierPayload,
} from '@/app/services/repository/repositoryDossierNoteSync';

type UseRepositoryComposeDossierParams = {
    currentUserId?: string;
    lawsuitFiles: FileData[];
    executionFiles: ExecutionFile[];
    onSaveNote: (note: GlobalNote) => void | Promise<void>;
    onUpdateLawsuitFile: (file: FileData) => void;
    onUpdateExecutionFile: (file: ExecutionFile) => void;
    vault: {
        currentUserId?: string;
        refreshDocs: () => Promise<void>;
    };
};

export function useRepositoryComposeDossier({
    currentUserId,
    lawsuitFiles,
    executionFiles,
    onSaveNote,
    onUpdateLawsuitFile,
    onUpdateExecutionFile,
    vault,
}: UseRepositoryComposeDossierParams) {
    const linkingRef = useRef(false);

    const handleLinkGlobalToDossier = useCallback(
        async (note: GlobalNote, dossier: DossierPickerOption) => {
            if (linkingRef.current) return;
            const payload = globalNoteToDossierPayload(note);
            linkingRef.current = true;
            try {
                if (dossier.kind === 'lawsuit') {
                    const file = lawsuitFiles.find((f) => String(f.id) === dossier.id);
                    if (!file) {
                        SmartToast.error('تعذّر العثور على إضبارة الدعوى');
                        return;
                    }
                    const appended = appendNoteToLawsuitFile(file, payload);
                    onUpdateLawsuitFile(appended.file);
                    try {
                        await onSaveNote({ ...note, repositoryInboxHidden: true });
                    } catch (err) {
                        onUpdateLawsuitFile(deleteLawsuitDossierNote(appended.file, appended.noteId));
                        throw err;
                    }
                } else {
                    const file = executionFiles.find((f) => String(f.id) === dossier.id);
                    if (!file) {
                        SmartToast.error('تعذّر العثور على إضبارة التنفيذ');
                        return;
                    }
                    const appended = appendNoteToExecutionFile(file, payload);
                    onUpdateExecutionFile(appended.file);
                    try {
                        await onSaveNote({ ...note, repositoryInboxHidden: true });
                    } catch (err) {
                        onUpdateExecutionFile(deleteExecutionDossierNote(appended.file, appended.noteId));
                        throw err;
                    }
                }
                SmartToast.success('تم ربط المسودة بالإضبارة — Inbox Zero ✓');
            } catch {
                SmartToast.error('تعذّر ربط المسودة بالإضبارة');
            } finally {
                linkingRef.current = false;
            }
        },
        [executionFiles, lawsuitFiles, onSaveNote, onUpdateExecutionFile, onUpdateLawsuitFile],
    );

    const handleBindVaultDoc = useCallback(
        async (doc: SmartVaultDoc, dossier: DossierPickerOption) => {
            if (linkingRef.current) return;
            const uid = vault.currentUserId || currentUserId || '';
            if (!uid) {
                SmartToast.error('يرجى تسجيل الدخول أولاً');
                return;
            }
            if (doc.authorId !== uid) {
                SmartToast.error('ليس لديك صلاحية لربط هذا الملف');
                return;
            }

            const payload = vaultDocToDossierPayload(doc);
            linkingRef.current = true;
            try {
                if (dossier.kind === 'lawsuit') {
                    const file = lawsuitFiles.find((f) => String(f.id) === dossier.id);
                    if (!file) {
                        SmartToast.error('تعذّر العثور على إضبارة الدعوى');
                        return;
                    }
                    const appended = appendNoteToLawsuitFile(file, payload);
                    onUpdateLawsuitFile(appended.file);
                    try {
                        await SmartVaultDB.bindToDossier(
                            doc.id,
                            uid,
                            encodeBoundDossierId(dossier.kind, dossier.id),
                        );
                    } catch (err) {
                        onUpdateLawsuitFile(deleteLawsuitDossierNote(appended.file, appended.noteId));
                        throw err;
                    }
                } else {
                    const file = executionFiles.find((f) => String(f.id) === dossier.id);
                    if (!file) {
                        SmartToast.error('تعذّر العثور على إضبارة التنفيذ');
                        return;
                    }
                    const appended = appendNoteToExecutionFile(file, payload);
                    onUpdateExecutionFile(appended.file);
                    try {
                        await SmartVaultDB.bindToDossier(
                            doc.id,
                            uid,
                            encodeBoundDossierId(dossier.kind, dossier.id),
                        );
                    } catch (err) {
                        onUpdateExecutionFile(deleteExecutionDossierNote(appended.file, appended.noteId));
                        throw err;
                    }
                }

                await vault.refreshDocs().catch(() => undefined);
                SmartToast.success(
                    dossier.kind === 'lawsuit'
                        ? 'تم ربط الملف بإضبارة الدعوى'
                        : 'تم ربط الملف بإضبارة التنفيذ',
                );
            } catch {
                SmartToast.error('تعذّر ربط الملف بالإضبارة');
            } finally {
                linkingRef.current = false;
            }
        },
        [
            currentUserId,
            executionFiles,
            lawsuitFiles,
            onUpdateExecutionFile,
            onUpdateLawsuitFile,
            vault,
        ],
    );

    return { handleLinkGlobalToDossier, handleBindVaultDoc };
}
