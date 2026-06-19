import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from '@supabase/supabase-js';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import { STORAGE_KEYS } from '@/app/utils/constants';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { useAutoSave } from '@/app/hooks/useAutoSave';
import { notesVault } from '@/app/data/NotesVault';
import {
    bidirectionalMerge,
    NOTES_VAULT_CHANGED,
    linkGlobalToVault,
    vaultIdForGlobal,
    unlinkGlobal,
} from '@/app/services/notesSyncBridge';
import { normalizeNotesList, dashboardNoteToCloudPayload } from '@/app/services/notesCloudAdapter';
import { SupabaseService } from '@/app/services/SupabaseService';
import { unpinWorkspaceItem } from '@/app/workspace/unpinWorkspaceEntity';
import { invalidateGlobalSearchExtrasCache } from '@/app/services/globalSearchLoad';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';

export type UseLawyerGlobalNotesParams = {
    localAutoSave: boolean;
    user: User | null;
    authUserId?: string | null;
    refreshAppAlerts: () => void;
    bumpSearchIndex: () => void;
    setFiles: Dispatch<SetStateAction<FileData[]>>;
    openNormalNewCaseModal: () => void;
};

export function useLawyerGlobalNotes({
    localAutoSave,
    user,
    authUserId,
    refreshAppAlerts,
    bumpSearchIndex,
    setFiles,
    openNormalNewCaseModal,
}: UseLawyerGlobalNotesParams) {
    const [globalNotes, setGlobalNotes] = useState<GlobalNote[]>(
        () => persistenceRepository.load<GlobalNote[]>(STORAGE_KEYS.LAWYER_NOTES) || [],
    );
    useAutoSave(STORAGE_KEYS.LAWYER_NOTES, globalNotes, 2_000, localAutoSave);

    const [isNotepadOpen, setIsNotepadOpen] = useState(false);
    const [notepadMode, setNotepadMode] = useState<'list' | 'create'>('list');
    const [notepadFocusNoteId, setNotepadFocusNoteId] = useState<string | undefined>();

    const resolveNotesUserId = useCallback(
        () => user?.id ?? authUserId ?? null,
        [user?.id, authUserId],
    );

    const mergeNotesStores = useCallback(
        (rawNotes?: unknown) => {
            const uid = resolveNotesUserId();
            if (!uid) return;
            notesVault.setUserScope(uid);
            setGlobalNotes((prev) => {
                const base = rawNotes !== undefined ? normalizeNotesList(rawNotes) : prev;
                const { mergedGlobal, mergedVault } = bidirectionalMerge(uid, base, notesVault.getNotes());
                notesVault.replaceAll(mergedVault);
                return mergedGlobal;
            });
        },
        [resolveNotesUserId],
    );

    useEffect(() => {
        notesVault.setUserScope(resolveNotesUserId());
    }, [resolveNotesUserId]);

    useEffect(() => {
        const uid = resolveNotesUserId();
        if (!uid) return;
        mergeNotesStores();
    }, [resolveNotesUserId, mergeNotesStores]);

    useEffect(() => {
        const onVaultChanged = () => {
            mergeNotesStores();
            invalidateGlobalSearchExtrasCache(resolveNotesUserId());
            bumpSearchIndex();
        };
        window.addEventListener(NOTES_VAULT_CHANGED, onVaultChanged);
        return () => window.removeEventListener(NOTES_VAULT_CHANGED, onVaultChanged);
    }, [bumpSearchIndex, mergeNotesStores, resolveNotesUserId]);

    const handleSaveNote = useCallback(
        async (note: GlobalNote) => {
            const uid = resolveNotesUserId();
            const exists = globalNotes.some((n) => n.id === note.id);

            setGlobalNotes((prev) => {
                const found = prev.find((n) => n.id === note.id);
                if (found) return prev.map((n) => (n.id === note.id ? note : n));
                return [...prev, note];
            });

            if (uid && (note.body || '').trim()) {
                const mappedId = vaultIdForGlobal(uid, note.id);
                const vaultId = notesVault.syncFromGlobal(
                    uid,
                    { id: note.id, body: note.body, type: note.type },
                    !exists,
                    mappedId,
                );
                if (vaultId) linkGlobalToVault(uid, note.id, vaultId);
            }

            if (user) {
                try {
                    await SupabaseService.saveGlobalNote(
                        dashboardNoteToCloudPayload(note),
                        exists ? { id: String(note.id) } : undefined,
                    );
                } catch (error) {
                    debug.error('[LawyerDashboard] ⚠️ Cloud note save failed:', error);
                }
            }

            void refreshAppAlerts();

            if (note.apptDate || note.reminder_at) {
                SmartToast.success('تم ربط الموعد بالتقويم');
            }

            if (note.linkedFileId) {
                setFiles((prevFiles) =>
                    prevFiles.map((f) => {
                        if (f.id !== note.linkedFileId) return f;
                        const newFileNote = {
                            id: Date.now() + Math.random(),
                            text: note.body,
                            meta: note.title,
                            stageCtx: f.currentStage || 'عام',
                            date: new Date().toLocaleDateString('ar-EG'),
                            apptDate: note.apptDate || note.reminder_at,
                            isPinned: note.isPinned,
                        };
                        return { ...f, notes: [newFileNote, ...f.notes] };
                    }),
                );
            }
        },
        [globalNotes, refreshAppAlerts, resolveNotesUserId, setFiles, user],
    );

    const handleDeleteNote = useCallback(
        async (id: string) => {
            const uid = resolveNotesUserId();
            if (uid) {
                const vaultId = vaultIdForGlobal(uid, id);
                if (vaultId) notesVault.deleteNote(vaultId);
                unlinkGlobal(uid, id);
            }
            setGlobalNotes((prev) => prev.filter((n) => String(n.id) !== id));
            unpinWorkspaceItem(id, 'notepad');

            if (user) {
                try {
                    await SupabaseService.deleteGlobalNote(String(id));
                } catch (error) {
                    debug.error('[LawyerDashboard] ⚠️ Cloud note delete failed:', error);
                }
            }
            void refreshAppAlerts();
        },
        [refreshAppAlerts, resolveNotesUserId, user],
    );

    const handleConvertNote = useCallback(() => {
        setIsNotepadOpen(false);
        openNormalNewCaseModal();
    }, [openNormalNewCaseModal]);

    const handleNotepadConvert = useCallback(
        (_note: { text: string }) => {
            handleConvertNote();
        },
        [handleConvertNote],
    );

    return {
        globalNotes,
        setGlobalNotes,
        isNotepadOpen,
        setIsNotepadOpen,
        notepadMode,
        setNotepadMode,
        notepadFocusNoteId,
        setNotepadFocusNoteId,
        mergeNotesStores,
        resolveNotesUserId,
        handleSaveNote,
        handleDeleteNote,
        handleConvertNote,
        handleNotepadConvert,
    };
}
