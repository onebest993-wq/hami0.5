import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import type { RepositorySortKey } from './repositoryListFilters';
import {
    repositoryDocMatchesSearch,
    repositoryDocMatchesTag,
    resolveRepositoryDocTags,
} from './repositoryTagUtils';

export type LegalRepositoryListQuery = {
    searchTerm: string;
    selectedType: string;
    selectedTag: string | null;
    sortBy: RepositorySortKey;
};

export function filterAndSortRepositoryDocuments(
    documents: RepositoryDocument[],
    query: LegalRepositoryListQuery,
): RepositoryDocument[] {
    const { searchTerm, selectedType, selectedTag, sortBy } = query;
    const filtered = documents.filter((doc) => {
        const matchesType = selectedType === 'الكل' || doc.type === selectedType;
        const matchesSearch = repositoryDocMatchesSearch(doc, searchTerm);
        const docTags = resolveRepositoryDocTags(doc.title, doc.description, doc.tags);
        const matchesTag = repositoryDocMatchesTag(docTags, selectedTag);
        return matchesType && matchesSearch && matchesTag;
    });
    return [...filtered].sort((a, b) => {
        switch (sortBy) {
            case 'oldest':
                return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
            case 'name':
                return a.title.localeCompare(b.title);
            case 'newest':
            default:
                return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
        }
    });
}
