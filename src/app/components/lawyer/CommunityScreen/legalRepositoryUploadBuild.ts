import { uuidv4, type RepositoryDocument } from '@/app/services/lawyer-cloud';
import { resolveRepositoryDocTags } from './repositoryTagUtils';

type BuildRepositoryDocumentParams = {
    editingDoc: RepositoryDocument | null;
    title: string;
    description: string;
    type: RepositoryDocument['type'];
    tags: string[];
    authorId: string;
    authorName: string;
    fileName: string;
    mimeType: string;
    storagePath: string;
    fileSize: number;
};

export function buildRepositoryDocumentFromUpload({
    editingDoc,
    title,
    description,
    type,
    tags,
    authorId,
    authorName,
    fileName,
    mimeType,
    storagePath,
    fileSize,
}: BuildRepositoryDocumentParams): RepositoryDocument {
    const resolvedTags = resolveRepositoryDocTags(title, description, tags);
    if (editingDoc) {
        return {
            ...editingDoc,
            title,
            description,
            type,
            tags: resolvedTags,
            fileName,
            mimeType,
            storagePath,
            fileSize,
        };
    }
    return {
        id: uuidv4(),
        title,
        description,
        type,
        tags: resolvedTags,
        authorId,
        authorName,
        uploadDate: new Date().toISOString().split('T')[0],
        fileName,
        mimeType,
        storagePath,
        fileSize,
    };
}
