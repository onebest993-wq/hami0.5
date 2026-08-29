import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { User } from '@supabase/supabase-js';
import { SmartToast } from '@/app/components/ui/smartToastBus';
import { debug } from '@/app/utils/debug';
import { STORAGE_KEYS, PERSIST_DEBOUNCE_MS } from '@/app/utils/constants';
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
import { saveGlobalNotesRaw } from '@/app/utils/globalNotesStorage';
import { invalidateRepositoryFeedCache } from '@/app/services/repository/repositoryFeedWarmCache';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { LAWYER_NOTES_EXTERNAL_UPDATE } from '@/app/services/notes/lawyerNotesExternalUpdateEvent';
import {
    filterDeletedGlobalNotes,
    markGlobalNoteDeleted,
} from '@/app/services/notes/globalNotesTombstones';
import { isLiveCloudSyncBucketEnabled } from '@/app/services/settings/cloudSyncBucket';

async function ensureSecureStoreReady(): Promise<void> {
    const m = await import('@/app/services/SecureStoreService');
    await m.default.ensurePersistedReady();
}

async function readNotesDossierBackup(uid: string): Promise<unknown> {
    const m = await import('@/app/services/dossierPersistence/dossierBackupStore');
    return m.readLatestDossierBackup('notes');
}

async function loadPersistenceRepository() {
    const m = await import('@/app/infrastructure/persistence/LocalStorageRepository');
    return m.persistenceRepository;
}

export type UseLawyerGlobalNotesParams = {
    localAutoSave: boolean;
    backgroundRuntimeEnabled: boolean;
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
    backgroundRuntimeEnabled,
    user,
    authUserId,
    refreshAppAlerts,
    bumpSearchIndex,
    setFiles,
    openNormalNewCaseModal,
    closeNotepad,
}: UseLawyerGlobalNotesParams) {
    const [globalNotes, setGlobalNotes] = useState<GlobalNote[]>(() => {
        const loaded = persistenceRepository.load<GlobalNote[]>(STORAGE_KEYS.LAWYER_NOTES);
        const normalized = Array.isArray(loaded) ? normalizeNotesList(loaded) : [];
        return filterDeletedGlobalNotes(normalized);
    });
    const bootstrapNotesRef = useRef(globalNotes);
    const [notesHydrated, setNotesHydrated] = useState(!backgroundRuntimeEnabled);

    const resolveNotesUserId = useCallback(
        () => user?.id ?? authUserId ?? null,
        [user?.id, authUserId],
    );

    useAutoSave(
        STORAGE_KEYS.LAWYER_NOTES,
        globalNotes,
        PERSIST_DEBOUNCE_MS.HEAVY,
        localAutoSave,
        notesHydrated,
    );

    useEffect(() => {
        if (!backgroundRuntimeEnabled) {
            setNotesHydrated(true);
            return;
        }
        let cancelled = false;
        const uid = resolveNotesUserId();
        void (async () => {
            await ensureSecureStoreReady();
            const persistenceRepository = await loadPersistenceRepository();
            let loaded = persistenceRepository.load<GlobalNote[]>(STORAGE_KEYS.LAWYER_NOTES);
            if (!loaded?.length) {
                const backup = (await readNotesDossierBackup(uid ?? '')) as {
                    payload?: unknown[];
                } | null;
                if (backup?.payload?.length) {
                    loaded = filterDeletedGlobalNotes(normalizeNotesList(backup.payload), uid);
                    if (loaded.length) {
                        persistenceRepository.save(STORAGE_KEYS.LAWYER_NOTES, loaded);
                    }
                }
            }
            if (cancelled) return;
            const normalizedLoaded = Array.isArray(loaded) ? normalizeNotesList(loaded) : [];
            const filteredLoaded = filterDeletedGlobalNotes(normalizedLoaded, uid);
            setGlobalNotes((prev) =>
                prev === bootstrapNotesRef.current || prev.length === 0 ? filteredLoaded : prev,
            );
            setNotesHydrated(true);
        })();
        return () => {
            cancelled = true;
        };
    }, [backgroundRuntimeEnabled, resolveNotesUserId]);

    const mergeNotesStores = useCallback(
        (rawNotes?: unknown) => {
            const uid = resolveNotesUserId();
            if (!uid) return;
            notesVault.setUserScope(uid);
            setGlobalNotes((prev) => {
                const base = filterDeletedGlobalNotes(
                    rawNotes !== undefined ? normalizeNotesList(rawNotes) : prev,
                    uid,
                );
                const { mergedGlobal, mergedVault } = bidirectionalMerge(uid, base, notesVault.getNotes());
                const filteredGlobal = filterDeletedGlobalNotes(mergedGlobal, uid);
                notesVault.replaceAll(mergedVault);
                return filteredGlobal;
            });
        },
        [resolveNotesUserId],
    );

    useEffect(() => {
        notesVault.setUserScope(resolveNotesUserId());
    }, [resolveNotesUserId]);

    useEffect(() => {
        const uid = resolveNotesUserId();
        if (!backgroundRuntimeEnabled || !uid || !notesHydrated) {
            return;
        }
        mergeNotesStores();
    }, [backgroundRuntimeEnabled, resolveNotesUserId, mergeNotesStores, notesHydrated]);

    useEffect(() => {
        const onExternalNotes = () => {
            const uid = resolveNotesUserId();
            void loadPersistenceRepository().then((persistenceRepository) => {
                const next = persistenceRepository.load<GlobalNote[]>(STORAGE_KEYS.LAWYER_NOTES) || [];
                setGlobalNotes(filterDeletedGlobalNotes(normalizeNotesList(next), uid));
            });
        };
        window.addEventListener(LAWYER_NOTES_EXTERNAL_UPDATE, onExternalNotes);
        return () => window.removeEventListener(LAWYER_NOTES_EXTERNAL_UPDATE, onExternalNotes);
    }, [resolveNotesUserId]);

    useEffect(() => {
        const onVaultChanged = () => {
            mergeNotesStores();
            void import('@/app/services/globalSearchLoad')
                .then((m) => m.invalidateGlobalSearchExtrasCache(resolveNotesUserId()))
                .catch(() => undefined);
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
                    void loadPersistenceRepository().then((persistenceRepository) => {
                        persistenceRepository.save(STORAGE_KEYS.LAWYER_NOTES, nextNotes);
                    });
                    saveGlobalNotesRaw(nextNotes);
                }
                return nextNotes;
            });

            invalidateRepositoryFeedCache();

            const bodyPlain = (note.body || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (localAutoSave && uid && bodyPlain) {
                const mappedId = vaultIdForGlobal(uid, note.id);
                const vaultId = notesVault.syncFromGlobal(
                    uid,
                    { id: note.id, body: note.body, type: note.type },
                    !exists,
                    mappedId,
                );
                if (vaultId) linkGlobalToVault(uid, note.id, vaultId);
            }

            if (user && isLiveCloudSyncBucketEnabled('notes')) {
                try {
                    const { SupabaseService } = await import('@/app/services/SupabaseService');
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

            if (note.linkedFileId && !note.repositoryInboxHidden) {
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
            const [{ parseVoiceNoteRef }, { deleteVoiceBlob }] = await Promise.all([
                import('@/app/services/voice/voiceNoteCodec'),
                import('@/app/services/voice/voiceNoteStorage'),
            ]);
            const voiceRef = parseVoiceNoteRef(note?.body);
            if (voiceRef) await deleteVoiceBlob(voiceRef);

            markGlobalNoteDeleted(uid, idStr);

            if (uid) {
                const vaultId = vaultIdForGlobal(uid, idStr);
                if (vaultId) notesVault.deleteNote(vaultId);
                // محاولة إضافية: ملاحظات vault بصيغة g_${id}
                notesVault.deleteNote(`g_${idStr}`);
                unlinkGlobal(uid, idStr);
            }
            setGlobalNotes((prev) => {
                const next = prev.filter((n) => String(n.id) !== idStr);
                if (localAutoSave && notesHydrated) {
                    void loadPersistenceRepository().then((persistenceRepository) => {
                        persistenceRepository.save(STORAGE_KEYS.LAWYER_NOTES, next);
                    });
                }
                saveGlobalNotesRaw(next);
                return next;
            });
            invalidateRepositoryFeedCache();
            void import('@/app/workspace/unpinWorkspaceEntity')
                .then((m) => m.unpinWorkspaceItem(idStr, 'notepad'))
                .catch(() => undefined);

            if (user && isLiveCloudSyncBucketEnabled('notes')) {
                try {
                    const { SupabaseService } = await import('@/app/services/SupabaseService');
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
