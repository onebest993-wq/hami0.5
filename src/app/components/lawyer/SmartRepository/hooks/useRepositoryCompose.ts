import { useCallback, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { saveFileToVault } from '@/app/services/vaultUploadService';
import type { DossierLawArticleRichEditorHandle } from '@/app/components/lawyer/dossier-notes/DossierLawArticleRichEditor';
import { REPOSITORY_ACTION_CATEGORY } from '@/app/services/vaultCustomCategories';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import { buildNoteWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import { sanitizeRichNoteHtml } from '../legalRichTextEditorUtils';
import { stripRepositoryHtml } from '@/app/services/repository/stripRepositoryHtml';
import type { useSmartVault } from '@/app/components/lawyer/hooks/useSmartVault';
import { useRepositoryComposeDossier } from './useRepositoryComposeDossier';
import { useRepositoryComposeVoice } from './useRepositoryComposeVoice';
import { COMPOSE_SAVE_BLOCK_TOAST, resolveComposeSaveBlock } from './repositoryComposeSaveRules';
import { buildRepositoryComposeNote } from './buildRepositoryComposeNote';

type VaultApi = Pick<
    ReturnType<typeof useSmartVault>,
    | 'currentUserId'
    | 'activeFilter'
    | 'prependVaultDoc'
    | 'refreshDocs'
    | 'addVaultCategory'
    | 'setActiveFilter'
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
    activeRoomId?: string | null;
    onAfterSave?: (kind: 'note' | 'media') => void;
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
    activeRoomId = null,
    onAfterSave,
}: UseRepositoryComposeParams) {
    const [composing, setComposing] = useState(startMode === 'create');
    const [title, setTitle] = useState('');
    const [bodyHtml, setBodyHtml] = useState('');
    const [isPinned, setIsPinned] = useState(false);
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [scannerOpen, setScannerOpen] = useState(vaultOpenScanner);
    const [saving, setSaving] = useState(false);
    const editorRef = useRef<DossierLawArticleRichEditorHandle>(null);
    const attachInputRef = useRef<HTMLInputElement>(null);
    const { handleLinkGlobalToDossier, handleBindVaultDoc } = useRepositoryComposeDossier({
        currentUserId,
        lawsuitFiles,
        executionFiles,
        onSaveNote,
        onUpdateLawsuitFile,
        onUpdateExecutionFile,
        vault,
    });
    const {
        showVoiceRecorder,
        setShowVoiceRecorder,
        voiceRecorderKey,
        handleSaveVoice,
        openVoiceRecorder,
    } = useRepositoryComposeVoice({
        currentUserId,
        activeRoomId,
        onSaveNote,
        vault,
    });

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
        const plain = stripRepositoryHtml(safeBody);
        const block = resolveComposeSaveBlock({ title, plain, attachmentFile });
        if (block) {
            SmartToast.error(COMPOSE_SAVE_BLOCK_TOAST[block]);
            return;
        }

        setSaving(true);
        let attachmentDocId: string | undefined;
        const uid = vault.currentUserId || currentUserId || '';

        try {
            if (attachmentFile && uid) {
                const saved = await saveFileToVault(uid, attachmentFile, {
                    title: title.trim() || attachmentFile.name,
                    lawyerNote: plain || null,
                    roomId: activeRoomId,
                });
                attachmentDocId = saved.doc.id;
                vault.prependVaultDoc(saved.doc);
            }

            const note = buildRepositoryComposeNote({
                title,
                safeBody,
                plain,
                isPinned,
                attachmentDocId,
                activeRoomId,
                vaultActiveFilter: vault.activeFilter,
            });
            const noteCategory = REPOSITORY_ACTION_CATEGORY.note;

            await onSaveNote(note);
            if (isPinned) {
                const pin = buildNoteWorkspacePin(note);
                if (pin) useWorkspaceStore.getState().pinItem(pin);
            }
            vault.addVaultCategory(noteCategory);
            vault.setActiveFilter(noteCategory);
            onAfterSave?.(attachmentDocId ? 'media' : 'note');
            SmartToast.success(
                isPinned
                    ? 'تم حفظ المسودة وتثبيتها في الواجهة'
                    : 'تم حفظ المسودة في المستودع',
            );
            resetComposer();
        } catch {
            SmartToast.error('تعذّر حفظ المسودة');
        } finally {
            setSaving(false);
        }
    }, [
        attachmentFile,
        activeRoomId,
        bodyHtml,
        currentUserId,
        isPinned,
        onSaveNote,
        resetComposer,
        title,
        vault,
        onAfterSave,
    ]);

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
