import type { ResumeInterruptionModalProps } from '../../smartFile/modalFormTypes';
import { NextHearingResumeModal } from './NextHearingResumeModal';

export const ResumeInterruptionModal = ({
    isOpen,
    onClose,
    onConfirm,
    interruptionReason,
    interruptionParty,
}: ResumeInterruptionModalProps) => (
    <NextHearingResumeModal
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={onConfirm}
        mode="interruption_resume"
        interruptionReason={interruptionReason}
        interruptionParty={interruptionParty}
    />
);
