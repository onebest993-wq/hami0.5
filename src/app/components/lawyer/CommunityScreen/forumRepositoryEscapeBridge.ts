/** لقطة مودالات المستودع — تُحدَّث من useLegalRepositoryDocuments لدمجها في مكدس Escape */
export type ForumRepositoryEscapeSnapshot = {
    isUploadModalOpen: boolean;
    previewOpen: boolean;
    deleteOpen: boolean;
};

export type ForumRepositoryEscapeHandlers = {
    closeUpload: () => void;
    closePreview: () => void;
    cancelDelete: () => void;
};

const emptySnapshot: ForumRepositoryEscapeSnapshot = {
    isUploadModalOpen: false,
    previewOpen: false,
    deleteOpen: false,
};

const noopHandlers: ForumRepositoryEscapeHandlers = {
    closeUpload: () => {},
    closePreview: () => {},
    cancelDelete: () => {},
};

let snapshot: ForumRepositoryEscapeSnapshot = emptySnapshot;
let handlers: ForumRepositoryEscapeHandlers = noopHandlers;
const listeners = new Set<() => void>();

function emit(): void {
    listeners.forEach((listener) => listener());
}

export function getForumRepositoryEscapeSnapshot(): ForumRepositoryEscapeSnapshot {
    return snapshot;
}

export function getForumRepositoryEscapeHandlers(): ForumRepositoryEscapeHandlers {
    return handlers;
}

export function subscribeForumRepositoryEscape(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function setForumRepositoryEscape(
    next: ForumRepositoryEscapeSnapshot,
    nextHandlers: ForumRepositoryEscapeHandlers,
): void {
    snapshot = next;
    handlers = nextHandlers;
    emit();
}

export function resetForumRepositoryEscape(): void {
    snapshot = emptySnapshot;
    handlers = noopHandlers;
    emit();
}
