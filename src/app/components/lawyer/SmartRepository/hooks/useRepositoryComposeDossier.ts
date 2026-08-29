import { useCallback } from 'react';
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
    const handleLinkGlobalToDossier = useCallback(
        async (note: GlobalNote, dossier: DossierPickerOption) => {
            const payload = globalNoteToDossierPayload(note);
            if (dossier.kind === 'lawsuit') {
                const file = lawsuitFiles.find((f) => String(f.id) === dossier.id);
                if (!file) {
                    SmartToast.error('تعذّر العثور على إضبارة الدعوى');
                    return;
                }
                onUpdateLawsuitFile(appendNoteToLawsuitFile(file, payload));
            } else {
                const file = executionFiles.find((f) => String(f.id) === dossier.id);
                if (!file) {
                    SmartToast.error('تعذّر العثور على إضبارة التنفيذ');
                    return;
                }
                onUpdateExecutionFile(appendNoteToExecutionFile(file, payload));
            }

            await onSaveNote({
                ...note,
                repositoryInboxHidden: true,
            });
            SmartToast.success('تم ربط المسودة بالإضبارة — Inbox Zero ✓');
        },
        [executionFiles, lawsuitFiles, onSaveNote, onUpdateExecutionFile, onUpdateLawsuitFile],
    );

    const handleBindVaultDoc = useCallback(
        async (doc: SmartVaultDoc, dossier: DossierPickerOption) => {
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
            if (dossier.kind === 'lawsuit') {
                const file = lawsuitFiles.find((f) => String(f.id) === dossier.id);
                if (!file) {
                    SmartToast.error('تعذّر العثور على إضبارة الدعوى');
                    return;
                }
                onUpdateLawsuitFile(appendNoteToLawsuitFile(file, payload));
            } else {
                const file = executionFiles.find((f) => String(f.id) === dossier.id);
                if (!file) {
                    SmartToast.error('تعذّر العثور على إضبارة التنفيذ');
                    return;
                }
                onUpdateExecutionFile(appendNoteToExecutionFile(file, payload));
            }

            await SmartVaultDB.bindToDossier(doc.id, uid, encodeBoundDossierId(dossier.kind, dossier.id));
            await vault.refreshDocs();
            SmartToast.success(
                dossier.kind === 'lawsuit'
                    ? 'تم ربط الملف بإضبارة الدعوى'
                    : 'تم ربط الملف بإضبارة التنفيذ',
            );
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
