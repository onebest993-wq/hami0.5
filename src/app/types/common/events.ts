/**
 * Click / upload / search event payload types.
 */

export interface ClickEventData {
    id: string;
    action: ClickAction;
    metadata?: Record<string, unknown>;
}

export type ClickAction = 'edit' | 'delete' | 'view' | 'archive' | 'restore' | 'download';

export interface FileUploadData {
    file: File;
    type: string;
    category?: string;
}

export interface SearchEventData {
    query: string;
    filters?: Record<string, unknown>;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
