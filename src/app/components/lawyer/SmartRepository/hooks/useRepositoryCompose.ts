import { useCallback, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { SmartVaultDB } from '@/app/services/vault/smartVaultRuntime';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { saveFileToVault, isVaultImageFile, isVaultPdfFile } from '@/app/services/vaultUploadService';
import type { DossierPickerOption } from '@/app/services/repository/repositoryDossierRegistry';
import {
    appendNoteToExecutionFile,
    appendNoteToLawsuitFile,
    encodeBoundDossierId,
    globalNoteToDossierPayload,
    vaultDocToDossierPayload,
} from '@/app/services/repository/repositoryDossierNoteSync';
import { saveVoiceNoteToNotepad } from '@/app/components/lawyer/dashboard/notepadVoiceSave';
import type { DossierLawArticleRichEditorHandle } from '@/app/components/lawyer/dossier-notes/DossierLawArticleRichEditor';
import { REPOSITORY_ACTION_CATEGORY } from '@/app/services/vaultCustomCategories';
import { useWorkspaceStore } from '@/app/stores/workspaceStore';
import { buildNoteWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import { extractQuickTaskLines, sanitizeRichNoteHtml } from '../legalRichTextEditorUtils';
import type { useSmartVault } from '@/app/components/lawyer/hooks/useSmartVault';
import {
    clearPendingMicrophoneStream,
    setPendingMicrophoneStream,
} from '@/app/services/platform/microphoneSession';
import {
    requestMicrophoneStream,
    resolveMicrophoneAccessMessage,
    type MicrophoneAccessErrorCode,
} from '@/app/services/platform/requestMicrophoneStream';

function stripHtml(text: string): string {
    return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

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
        if (
            attachmentFile &&
            !isVaultImageFile(attachmentFile) &&
            !isVaultPdfFile(attachmentFile)
        ) {
            SmartToast.error('المرفق يجب أن يكون صورة أو PDF فقط');
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

            const noteCategory = REPOSITORY_ACTION_CATEGORY.note;
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
                roomId: activeRoomId,
                tags: Array.from(
                    new Set([
                        noteCategory,
                        ...(vault.activeFilter !== 'الكل' && vault.activeFilter
                            ? [vault.activeFilter]
                            : []),
                    ]),
                ),
            };

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

            // لا نضع linkedFileId هنا — يمنع إعادة إلحاق الملاحظة مرتين في handleSaveNote
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

    const handleSaveVoice = useCallback(
        async (payload: Parameters<typeof saveVoiceNoteToNotepad>[0]) => {
            const voiceCategory = REPOSITORY_ACTION_CATEGORY.voice;
            await saveVoiceNoteToNotepad(payload, {
                userId: currentUserId,
                saveNote: (note) =>
                    onSaveNote({
                        ...note,
                        roomId: activeRoomId,
                        tags: Array.from(new Set([...(note.tags ?? []), voiceCategory])),
                    }),
            });
            vault.addVaultCategory(voiceCategory);
            vault.setActiveFilter(voiceCategory);
            setShowVoiceRecorder(false);
        },
        [activeRoomId, currentUserId, onSaveNote, vault],
    );

    const openVoiceRecorder = useCallback(() => {
        void import('@/app/components/lawyer/ActionModals/VoiceRecorderModal');
        void (async () => {
            try {
                const stream = await requestMicrophoneStream();
                setPendingMicrophoneStream(stream);
            } catch (err) {
                clearPendingMicrophoneStream();
                const code = (err as { hamiCode?: MicrophoneAccessErrorCode }).hamiCode;
                SmartToast.warning(resolveMicrophoneAccessMessage(err, code));
            } finally {
                setVoiceRecorderKey((k) => k + 1);
                setShowVoiceRecorder(true);
            }
        })();
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
