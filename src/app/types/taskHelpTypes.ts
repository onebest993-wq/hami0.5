/**
 * Task Help & Delegation — حالات التعاون ونطاق المشاركة.
 */

export type CollaborationStatus =
    | 'NONE'
    | 'PENDING'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'COMPLETED'
    | 'AWAITING_OWNER_REVIEW';

export type ShareScope = 'PRIVATE_DIRECT' | 'PUBLIC_FORUM';

export type SharedTaskNote = {
    id: string;
    authorId: string;
    authorName?: string;
    text: string;
    timestamp: string;
};

/** سجل طلب مساعدة مشترك (KV / محلي) */
export type TaskHelpRequest = {
    id: string;
    sourceTaskId: string;
    requesterId: string;
    requesterName?: string;
    assigneeId?: string;
    assigneeName?: string;
    /** للمستلم الخاص فقط */
    targetColleagueId?: string;
    targetColleagueName?: string;
    shareScope: ShareScope;
    collaborationStatus: CollaborationStatus;
    isSanitised: boolean;
    title: string;
    location?: string | null;
    dueDate?: string | null;
    instructions?: string;
    forumPostId?: string | null;
    sharedNotes: SharedTaskNote[];
    createdAt: string;
    updatedAt: string;
};

export type SanitizeTaskForPublicResult = {
    title: string;
    rawText: string;
    location: string | null;
    dueDate: string | null;
    instructions: string;
    isSanitised: true;
};
