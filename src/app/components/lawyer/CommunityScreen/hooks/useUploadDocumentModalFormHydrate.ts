import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { getRepositoryMediaKind } from '../components/repositoryMedia';
import { REPOSITORY_SUGGESTED_TAGS, formatRepositoryTag } from '../repositoryTagUtils';
import type { RepositoryUploadKind } from '../repositoryUploadValidation';

type UseUploadDocumentModalFormHydrateParams = {
    isOpen: boolean;
    editDoc?: RepositoryDocument | null;
    setTitle: Dispatch<SetStateAction<string>>;
    setType: Dispatch<SetStateAction<string>>;
    setDescription: Dispatch<SetStateAction<string>>;
    setPickedTags: Dispatch<SetStateAction<string[]>>;
    setUploadKind: Dispatch<SetStateAction<RepositoryUploadKind>>;
    setFile: Dispatch<SetStateAction<File | null>>;
    setFileError: Dispatch<SetStateAction<string | null>>;
    setIsTypeMenuOpen: Dispatch<SetStateAction<boolean>>;
};

export function useUploadDocumentModalFormHydrate({
    isOpen,
    editDoc,
    setTitle,
    setType,
    setDescription,
    setPickedTags,
    setUploadKind,
    setFile,
    setFileError,
    setIsTypeMenuOpen,
}: UseUploadDocumentModalFormHydrateParams) {
    useEffect(() => {
        if (!isOpen) return;
        if (editDoc) {
            setTitle(editDoc.title);
            setType(editDoc.type);
            setDescription(editDoc.description);
            setPickedTags(
                REPOSITORY_SUGGESTED_TAGS.filter((label) =>
                    (editDoc.tags ?? []).some((t) => formatRepositoryTag(t) === formatRepositoryTag(label)),
                ),
            );
            setUploadKind(getRepositoryMediaKind(editDoc.mimeType, editDoc.fileName) === 'image' ? 'image' : 'document');
            setFile(null);
            setFileError(null);
            setIsTypeMenuOpen(false);
            return;
        }
        setTitle('');
        setType('عقد');
        setDescription('');
        setPickedTags([]);
        setUploadKind('document');
        setFile(null);
        setFileError(null);
        setIsTypeMenuOpen(false);
    }, [
        isOpen,
        editDoc,
        setTitle,
        setType,
        setDescription,
        setPickedTags,
        setUploadKind,
        setFile,
        setFileError,
        setIsTypeMenuOpen,
    ]);
}
