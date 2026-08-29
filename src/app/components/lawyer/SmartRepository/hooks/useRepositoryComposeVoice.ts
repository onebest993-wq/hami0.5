import { useCallback, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { saveVoiceNoteToNotepad } from '@/app/components/lawyer/dashboard/notepadVoiceSave';
import { REPOSITORY_ACTION_CATEGORY } from '@/app/services/vaultCustomCategories';
import {
    clearPendingMicrophoneStream,
    setPendingMicrophoneStream,
} from '@/app/services/platform/microphoneSession';
import {
    requestMicrophoneStream,
    resolveMicrophoneAccessMessage,
    type MicrophoneAccessErrorCode,
} from '@/app/services/platform/requestMicrophoneStream';

type VoiceVaultApi = {
    addVaultCategory: (name: string) => void;
    setActiveFilter: (name: string) => void;
};

type UseRepositoryComposeVoiceParams = {
    currentUserId?: string;
    activeRoomId?: string | null;
    onSaveNote: (note: GlobalNote) => void | Promise<void>;
    vault: VoiceVaultApi;
};

export function useRepositoryComposeVoice({
    currentUserId,
    activeRoomId = null,
    onSaveNote,
    vault,
}: UseRepositoryComposeVoiceParams) {
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
    const [voiceRecorderKey, setVoiceRecorderKey] = useState(0);

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
        showVoiceRecorder,
        setShowVoiceRecorder,
        voiceRecorderKey,
        handleSaveVoice,
        openVoiceRecorder,
    };
}
