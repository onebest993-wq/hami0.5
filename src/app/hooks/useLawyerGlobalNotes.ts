import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from '@supabase/supabase-js';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import { STORAGE_KEYS, PERSIST_DEBOUNCE_MS } from '@/app/utils/constants';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import SecureStoreService from '@/app/services/SecureStoreService';
import { readLatestDossierBackup } from '@/app/services/dossierPersistence/dossierBackupStore';
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
import { LAWYER_NOTES_EXTERNAL_UPDATE } from '@/app/services/forum/forumPostPersistActions';
import { parseVoiceNoteRef } from '@/app/services/voice/voiceNoteCodec';
import { deleteVoiceBlob } from '@/app/services/voice/voiceNoteStorage';

export type UseLawyerGlobalNotesParams = {
    localAutoSave: boolean;
    user: User | null;
    authUserId?: string | null;
    refreshAppAlerts: () => void;
    bumpSearchIndex: () => void;
    setFiles: Dispatch<SetStateAction<FileData[]>>;
    openNormalNewCaseModal: () => void;
    closeNotepad: () => void;
};

export function useLawyerGlobalNotes({
    localAutoSave,
    user,
    authUserId,
    refreshAppAlerts,
    bumpSearchIndex,
    setFiles,
    openNormalNewCaseModal,
    closeNotepad,
}: UseLawyerGlobalNotesParams) {
    const [globalNotes, setGlobalNotes] = useState<GlobalNote[]>([]);
    const [notesHydrated, setNotesHydrated] = useState(false);
    useAutoSave(
        STORAGE_KEYS.LAWYER_NOTES,
        globalNotes,
        PERSIST_DEBOUNCE_MS.HEAVY,
        localAutoSave,
        notesHydrated,
    );

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            await SecureStoreService.ensurePersistedReady();
            let loaded = persistenceRepository.load<GlobalNote[]>(STORAGE_KEYS.LAWYER_NOTES);
            if (!loaded?.length) {
                const backup = await readLatestDossierBackup('notes');
                if (backup?.payload.length) {
                    loaded = normalizeNotesList(backup.payload);
                    persistenceRepository.save(STORAGE_KEYS.LAWYER_NOTES, loaded);
                }
            }
            if (cancelled) return;
            setGlobalNotes(loaded ?? []);
            setNotesHydrated(true);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

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
        if (!uid || !notesHydrated) return;
        mergeNotesStores();
    }, [resolveNotesUserId, mergeNotesStores, notesHydrated]);

    useEffect(() => {
        const onExternalNotes = () => {
            const next = persistenceRepository.load<GlobalNote[]>(STORAGE_KEYS.LAWYER_NOTES) || [];
            setGlobalNotes(next);
        };
        window.addEventListener(LAWYER_NOTES_EXTERNAL_UPDATE, onExternalNotes);
        return () => window.removeEventListener(LAWYER_NOTES_EXTERNAL_UPDATE, onExternalNotes);
    }, []);

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
            const exists = globalNotes.some((n) => String(n.id) === String(note.id));

            let nextNotes: GlobalNote[] = [];
            setGlobalNotes((prev) => {
                const found = prev.find((n) => String(n.id) === String(note.id));
                const enriched: GlobalNote = {
                    ...note,
                    createdAtIso: note.createdAtIso ?? (found ? found.createdAtIso : new Date().toISOString()),
                };
                nextNotes = found
                    ? prev.map((n) => (String(n.id) === String(note.id) ? enriched : n))
                    : [...prev, enriched];
                if (localAutoSave && notesHydrated) {
                    persistenceRepository.save(STORAGE_KEYS.LAWYER_NOTES, nextNotes);
                }
                return nextNotes;
            });

            const bodyPlain = (note.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (uid && bodyPlain) {
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
        [globalNotes, localAutoSave, notesHydrated, refreshAppAlerts, resolveNotesUserId, setFiles, user],
    );

    const handleDeleteNote = useCallback(
        async (id: string | number) => {
            const idStr = String(id);
            const uid = resolveNotesUserId();
            const note = globalNotes.find((n) => String(n.id) === idStr);
            const voiceRef = parseVoiceNoteRef(note?.body);
            if (voiceRef) await deleteVoiceBlob(voiceRef);

            if (uid) {
                const vaultId = vaultIdForGlobal(uid, idStr);
                if (vaultId) notesVault.deleteNote(vaultId);
                unlinkGlobal(uid, idStr);
            }
            setGlobalNotes((prev) => {
                const next = prev.filter((n) => String(n.id) !== idStr);
                if (localAutoSave && notesHydrated) {
                    persistenceRepository.save(STORAGE_KEYS.LAWYER_NOTES, next);
                }
                return next;
            });
            unpinWorkspaceItem(idStr, 'notepad');

            if (user) {
                try {
                    await SupabaseService.deleteGlobalNote(idStr);
                } catch (error) {
                    debug.error('[LawyerDashboard] ⚠️ Cloud note delete failed:', error);
                }
            }
            void refreshAppAlerts();
        },
        [globalNotes, localAutoSave, notesHydrated, refreshAppAlerts, resolveNotesUserId, user],
    );

    const handleConvertNote = useCallback(() => {
        closeNotepad();
        openNormalNewCaseModal();
    }, [closeNotepad, openNormalNewCaseModal]);

    const handleNotepadConvert = useCallback(
        (_note: { text: string }) => {
            handleConvertNote();
        },
        [handleConvertNote],
    );

    return {
        globalNotes,
        setGlobalNotes,
        mergeNotesStores,
        resolveNotesUserId,
        handleSaveNote,
        handleDeleteNote,
        handleConvertNote,
        handleNotepadConvert,
    };
}
