import React from 'react';
import type { VoiceNoteSavePayload } from '@/app/components/lawyer/commandCenterTypes';
import { useVoiceRecorderController } from './useVoiceRecorderController';
import { VoiceRecorderModalView } from './VoiceRecorderModalView';

interface VoiceRecorderModalProps {
    onClose: () => void;
    onSaveVoice?: (payload: VoiceNoteSavePayload) => void | Promise<void>;
}

export const VoiceRecorderModal = ({ onClose, onSaveVoice }: VoiceRecorderModalProps) => {
    const vm = useVoiceRecorderController({ onClose, onSaveVoice });
    return <VoiceRecorderModalView {...vm} />;
};
