export type SeizureRequestSubjectModalTone = 'amber' | 'sky';

export type SeizureRequestSubjectModalProps = {
    open: boolean;
    title: string;
    placeholder: string;
    subjectDraft: string;
    tone?: SeizureRequestSubjectModalTone;
    onClose: () => void;
    onSubjectDraftChange: (value: string) => void;
    onSubmit: () => void;
};
