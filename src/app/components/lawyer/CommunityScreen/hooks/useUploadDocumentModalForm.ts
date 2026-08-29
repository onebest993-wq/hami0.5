import { useEffect, useMemo, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { getRepositoryMediaKind, inferRepositoryMimeType, repositoryMediaLabel } from '../components/repositoryMedia';
import { formatRepositoryTag } from '../repositoryTagUtils';
import {
    type RepositoryUploadKind,
    repositoryUploadAcceptValue,
    sanitizeRepositoryUploadDescription,
    sanitizeRepositoryUploadTitle,
    validateRepositoryUploadFile,
} from '../repositoryUploadValidation';
import { useUploadDocumentModalFormHydrate } from './useUploadDocumentModalFormHydrate';
import { useUploadDocumentModalTypeMenu } from './useUploadDocumentModalTypeMenu';

export const DOCUMENT_TYPES = ['عقد', 'قرار حكم', 'عريضة', 'بحث قانوني', 'أخرى'] as const;

type UploadSubmitPayload = {
    title: string;
    type: string;
    description: string;
    file: File | null;
    tags: string[];
};

type UseUploadDocumentModalFormParams = {
    isOpen: boolean;
    editDoc?: RepositoryDocument | null;
    onSubmit: (data: UploadSubmitPayload) => Promise<void>;
};

export function useUploadDocumentModalForm({
    isOpen,
    editDoc,
    onSubmit,
}: UseUploadDocumentModalFormParams) {
    const [title, setTitle] = useState('');
    const [type, setType] = useState<string>('عقد');
    const [description, setDescription] = useState('');
    const [pickedTags, setPickedTags] = useState<string[]>([]);
    const [uploadKind, setUploadKind] = useState<RepositoryUploadKind>('document');
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
    const typeMenuRef = useRef<HTMLDivElement | null>(null);

    const acceptValue = repositoryUploadAcceptValue(uploadKind);

    useEffect(() => {
        if (!file || getRepositoryMediaKind(inferRepositoryMimeType(file), file.name) !== 'image') {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    useUploadDocumentModalFormHydrate({
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
    });

    useUploadDocumentModalTypeMenu(isTypeMenuOpen, typeMenuRef, setIsTypeMenuOpen);

    const selectedKindLabel = useMemo(() => {
        if (!file) return null;
        return repositoryMediaLabel(getRepositoryMediaKind(inferRepositoryMimeType(file), file.name));
    }, [file]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        setFileError(null);
        if (f) {
            const error = validateRepositoryUploadFile(f, uploadKind);
            if (error) {
                setFileError(error);
                SmartToast.warning(error);
                e.target.value = '';
                setFile(null);
                return;
            }
        }
        setFile(f);
    };

    const switchUploadKind = (kind: RepositoryUploadKind) => {
        setUploadKind(kind);
        setFile(null);
        setFileError(null);
    };

    const togglePickedTag = (tag: string) => {
        setPickedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
    };

    const selectedTags = useMemo(
        () => Array.from(new Set(pickedTags.map(formatRepositoryTag).filter(Boolean))),
        [pickedTags],
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const safeTitle = sanitizeRepositoryUploadTitle(title);
        const safeDescription = sanitizeRepositoryUploadDescription(description);
        if (!safeTitle || !safeDescription) {
            SmartToast.warning('يرجى ملء جميع الحقول المطلوبة');
            return;
        }
        if (!editDoc && !file) {
            SmartToast.warning(uploadKind === 'image' ? 'يرجى اختيار صورة' : 'يرجى اختيار ملف');
            return;
        }

        try {
            await onSubmit({
                title: safeTitle,
                type,
                description: safeDescription,
                file,
                tags: selectedTags,
            });
        } catch {
            /* parent shows toast — keep modal open */
        }
    };

    return {
        title,
        setTitle,
        type,
        setType,
        description,
        setDescription,
        pickedTags,
        uploadKind,
        file,
        fileError,
        previewUrl,
        isTypeMenuOpen,
        setIsTypeMenuOpen,
        typeMenuRef,
        acceptValue,
        selectedKindLabel,
        selectedTags,
        handleFileChange,
        switchUploadKind,
        togglePickedTag,
        handleSubmit,
    };
}

export type UploadDocumentModalFormModel = ReturnType<typeof useUploadDocumentModalForm>;
