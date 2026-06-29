import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { SmartVaultDB, type SmartVaultDoc } from '@/app/services/lawyer-cloud';
import { saveFileToVault } from '@/app/services/vaultUploadService';
import type { DossierPickerOption } from '@/app/services/repository/repositoryDossierRegistry';
import {
    appendNoteToExecutionFile,
    appendNoteToLawsuitFile,
    globalNoteToDossierPayload,
} from '@/app/services/repository/repositoryDossierNoteSync';
import { saveVoiceNoteToNotepad } from '@/app/components/lawyer/dashboard/notepadVoiceSave';
import type { DossierLawArticleRichEditorHandle } from '@/app/components/lawyer/dossier-notes/DossierLawArticleRichEditor';
import { extractQuickTaskLines, sanitizeRichNoteHtml } from '../legalRichTextEditorUtils';
import type { useSmartVault } from '@/app/components/lawyer/hooks/useSmartVault';

function stripHtml(text: string): string {
    return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

type VaultApi = Pick<
    ReturnType<typeof useSmartVault>,
    'currentUserId' | 'activeFilter' | 'refreshDocs'
>;

type UseRepositoryComposeParams = {
    startMode: 'list' | 'create';
    vaultOpenScanner?: boolean;
    currentUserId?: string;
    lawsuitFiles: FileData[];
    executionFiles: ExecutionFile[];
    onSaveNote: (note: GlobalNote) => void | Promise<void>;
    onUpdateLawsuitFile: (file: FileData) => void;
    onUpdateExecutionFile: (file: ExecutionFile) => void;
    vault: VaultApi;
};

export function useRepositoryCompose({
    startMode,
    vaultOpenScanner = false,
    currentUserId,
    lawsuitFiles,
    executionFiles,
    onSaveNote,
    onUpdateLawsuitFile,
    onUpdateExecutionFile,
    vault,
}: UseRepositoryComposeParams) {
    const [composing, setComposing] = useState(startMode === 'create');
    const [title, setTitle] = useState('');
    const [bodyHtml, setBodyHtml] = useState('');
    const [isPinned, setIsPinned] = useState(false);
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [scannerOpen, setScannerOpen] = useState(vaultOpenScanner);
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
    const [voiceRecorderKey, setVoiceRecorderKey] = useState(0);
    const [saving, setSaving] = useState(false);
    const editorRef = useRef<DossierLawArticleRichEditorHandle>(null);
    const attachInputRef = useRef<HTMLInputElement>(null);

    const resetComposer = useCallback(() => {
        setTitle('');
        setBodyHtml('');
        setIsPinned(false);
        setAttachmentFile(null);
        setComposing(false);
    }, []);

    const handleComposeSave = useCallback(async () => {
        const latestHtml = editorRef.current?.getHtml() ?? bodyHtml;
        const safeBody = sanitizeRichNoteHtml(latestHtml);
        const plain = stripHtml(safeBody);
        if (!title.trim() && !plain && !attachmentFile) {
            SmartToast.error('أضف عنواناً أو نصاً أو مرفقاً');
            return;
        }

        setSaving(true);
        try {
            let attachmentDocId: string | undefined;
            const uid = vault.currentUserId || currentUserId || '';
            if (attachmentFile && uid) {
                const saved = await saveFileToVault(uid, attachmentFile, {
                    title: title.trim() || attachmentFile.name,
                    lawyerNote: plain || null,
                });
                attachmentDocId = saved.doc.id;
                await vault.refreshDocs();
            }

            const note: GlobalNote = {
                id: `note_${Date.now()}`,
                title: title.trim() || 'ملاحظة بدون عنوان',
                body: safeBody || plain,
                isPinned,
                date: new Date().toLocaleDateString('ar-EG'),
                createdAtIso: new Date().toISOString(),
                type: attachmentDocId ? 'media' : 'rich',
                attachmentDocId,
                quickTaskLines: extractQuickTaskLines(safeBody),
                tags:
                    vault.activeFilter !== 'الكل'
                        ? Array.from(new Set([...(vault.activeFilter ? [vault.activeFilter] : [])]))
                        : undefined,
            };

            await onSaveNote(note);
            SmartToast.success('تم حفظ البطاقة في المستودع');
            resetComposer();
        } catch {
            SmartToast.error('تعذّر حفظ البطاقة');
        } finally {
            setSaving(false);
        }
    }, [
        attachmentFile,
        bodyHtml,
        currentUserId,
        isPinned,
        onSaveNote,
        resetComposer,
        title,
        vault,
    ]);

    const handleLinkGlobalToDossier = useCallback(
        async (note: GlobalNote, dossier: DossierPickerOption) => {
            const payload = globalNoteToDossierPayload(note);
            if (dossier.kind === 'lawsuit') {
                const file = lawsuitFiles.find((f) => String(f.id) === dossier.id);
                if (!file) return;
                onUpdateLawsuitFile(appendNoteToLawsuitFile(file, payload));
            } else {
                const file = executionFiles.find((f) => String(f.id) === dossier.id);
                if (!file) return;
                onUpdateExecutionFile(appendNoteToExecutionFile(file, payload));
            }

            await onSaveNote({
                ...note,
                repositoryInboxHidden: true,
                linkedFileId: Number.isFinite(Number(dossier.id)) ? Number(dossier.id) : note.linkedFileId,
            });
            SmartToast.success('تم ربط البطاقة بالإضبارة — Inbox Zero ✓');
        },
        [executionFiles, lawsuitFiles, onSaveNote, onUpdateExecutionFile, onUpdateLawsuitFile],
    );

    const handleBindVaultDoc = useCallback(
        async (doc: SmartVaultDoc, dossier: DossierPickerOption) => {
            const uid = vault.currentUserId || currentUserId || '';
            if (!uid) throw new Error('user required');
            await SmartVaultDB.bindToDossier(doc.id, uid, dossier.id);
            await vault.refreshDocs();
            SmartToast.success('تم ربط الملف بالإضبارة');
        },
        [currentUserId, vault],
    );

    const handleSaveVoice = useCallback(
        async (payload: Parameters<typeof saveVoiceNoteToNotepad>[0]) => {
            await saveVoiceNoteToNotepad(payload, {
                userId: currentUserId,
                saveNote: onSaveNote,
            });
            setShowVoiceRecorder(false);
        },
        [currentUserId, onSaveNote],
    );

    const openVoiceRecorder = useCallback(() => {
        setVoiceRecorderKey((k) => k + 1);
        setShowVoiceRecorder(true);
    }, []);

    return {
        composing,
        setComposing,
        title,
        setTitle,
        bodyHtml,
        setBodyHtml,
        isPinned,
        setIsPinned,
        attachmentFile,
        setAttachmentFile,
        scannerOpen,
        setScannerOpen,
        showVoiceRecorder,
        setShowVoiceRecorder,
        voiceRecorderKey,
        saving,
        editorRef,
        attachInputRef,
        resetComposer,
        handleComposeSave,
        handleLinkGlobalToDossier,
        handleBindVaultDoc,
        handleSaveVoice,
        openVoiceRecorder,
    };
}

export function useRepositoryVaultDocHandlers(
    vaultRef: RefObject<ReturnType<typeof useSmartVault>>,
) {
    const handleEditVaultDoc = useCallback((doc: SmartVaultDoc) => {
        vaultRef.current?.handleEdit(doc);
    }, [vaultRef]);

    const handleViewVaultDoc = useCallback((doc: SmartVaultDoc) => {
        void vaultRef.current?.handleViewFile(doc);
    }, [vaultRef]);

    const handleDeleteVaultDoc = useCallback((doc: SmartVaultDoc) => {
        void vaultRef.current?.handleDelete(doc);
    }, [vaultRef]);

    return { handleEditVaultDoc, handleViewVaultDoc, handleDeleteVaultDoc };
}
