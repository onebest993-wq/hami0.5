import type { CaseAttachment, CaseEvent, CaseFollowup, CaseNote } from '../types';

export type CaseEventDayGroup = {
    dayKey: string;
    dayLabel: string;
    events: CaseEvent[];
};

export type AdminWorkspacePanelProps = {
    isIqrarContext: boolean;
    isFinalized: boolean;
    newFollowupTitle: string;
    setNewFollowupTitle: (value: string) => void;
    newFollowupDate: string;
    setNewFollowupDate: (value: string) => void;
    requestDateYmd: string;
    addFollowup: () => void;
    caseFollowups: CaseFollowup[];
    todayYmdValue: string;
    toggleFollowupCompleted: (followupId: string) => void;
    deleteFollowup: (followupId: string) => void;
    caseEvents: CaseEvent[];
    newEventText: string;
    setNewEventText: (value: string) => void;
    addManualEvent: () => void;
    caseEventDayGroups: CaseEventDayGroup[];
    newNoteText: string;
    setNewNoteText: (value: string) => void;
    addCaseNote: () => void;
    caseNotes: CaseNote[];
    deleteCaseNote: (noteId: string) => void;
    attachmentsError: string | null;
    attachmentInputId: string;
    addAttachmentFile: (file: File) => void;
    caseAttachments: CaseAttachment[];
    deleteAttachment: (attachmentId: string) => void;
};
