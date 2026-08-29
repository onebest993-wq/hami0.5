import type { RepositorySortKey } from './repositoryListFilters';

export type LegalRepositoryFilters = {
    searchTerm?: string;
    selectedType?: string;
    sortBy?: RepositorySortKey;
    selectedTag?: string | null;
    surfaceOpen?: boolean;
    repositoryActive?: boolean;
};

export type RepositoryUploadPayload = {
    title: string;
    type: string;
    description: string;
    file: File | null;
    tags: string[];
};
