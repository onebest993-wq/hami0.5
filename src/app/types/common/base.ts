/**
 * Base entity / file types shared across case & execution archives.
 */

export interface BaseEntity {
    id: string;
    createdAt: string;
    updatedAt?: string;
}

export interface BaseFile extends BaseEntity {
    title: string;
    description?: string;
    status: FileStatus;
    tags?: string[];
}

export type FileStatus = 'active' | 'archived' | 'completed' | 'deleted' | 'pending';
