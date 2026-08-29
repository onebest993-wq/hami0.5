import React from 'react';
import type { AdminWorkspacePanelProps } from './AdminWorkspacePanelProps';
import { AdminWorkspaceAttachmentsTab } from './adminWorkspace/AdminWorkspaceAttachmentsTab';
import { AdminWorkspaceEventsTab } from './adminWorkspace/AdminWorkspaceEventsTab';
import { AdminWorkspaceNotesTab } from './adminWorkspace/AdminWorkspaceNotesTab';
import { AdminWorkspaceTasksTab } from './adminWorkspace/AdminWorkspaceTasksTab';

export type WorkspaceTab = 'tasks' | 'events' | 'notes' | 'attachments';

export type AdminWorkspaceTabContentProps = Pick<
    AdminWorkspacePanelProps,
    | 'isIqrarContext'
    | 'isFinalized'
    | 'newFollowupTitle'
    | 'setNewFollowupTitle'
    | 'newFollowupDate'
    | 'setNewFollowupDate'
    | 'requestDateYmd'
    | 'addFollowup'
    | 'caseFollowups'
    | 'todayYmdValue'
    | 'toggleFollowupCompleted'
    | 'deleteFollowup'
    | 'newEventText'
    | 'setNewEventText'
    | 'addManualEvent'
    | 'caseEventDayGroups'
    | 'newNoteText'
    | 'setNewNoteText'
    | 'addCaseNote'
    | 'caseNotes'
    | 'deleteCaseNote'
    | 'attachmentsError'
    | 'attachmentInputId'
    | 'addAttachmentFile'
    | 'caseAttachments'
    | 'deleteAttachment'
> & {
    resolvedTab: WorkspaceTab;
};

export function AdminWorkspaceTabContent(props: AdminWorkspaceTabContentProps) {
    const { resolvedTab, isIqrarContext } = props;

    if (resolvedTab === 'tasks' && !isIqrarContext) {
        return <AdminWorkspaceTasksTab {...props} />;
    }
    if (resolvedTab === 'events' && !isIqrarContext) {
        return <AdminWorkspaceEventsTab {...props} />;
    }
    if (resolvedTab === 'notes') {
        return <AdminWorkspaceNotesTab {...props} />;
    }
    if (resolvedTab === 'attachments') {
        return <AdminWorkspaceAttachmentsTab {...props} />;
    }
    return null;
}
