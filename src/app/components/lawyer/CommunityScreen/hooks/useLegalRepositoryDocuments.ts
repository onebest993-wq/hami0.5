import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuthSafe } from '@/app/context/authHooks';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { setRepositoryDocsCache } from '@/app/services/forum/repositoryDocsWarmCache';
import { repositoryHasActiveListFilters, repositorySortLabel } from '../repositoryListFilters';
import {
    resetForumRepositoryEscape,
    setForumRepositoryEscape,
} from '../forumRepositoryEscapeBridge';
import {
    normalizeRepositoryRows,
    resolveInitialRepositoryDocuments,
} from '../legalRepositoryNormalize';
import { filterAndSortRepositoryDocuments } from '../legalRepositoryListQuery';
import type { LegalRepositoryFilters } from '../legalRepositoryTypes';
import { useLegalRepositoryBootstrap } from './useLegalRepositoryBootstrap';
import { useLegalRepositoryPreview } from './useLegalRepositoryPreview';
import { useLegalRepositoryMutations } from './useLegalRepositoryMutations';

export type { LegalRepositoryFilters, RepositoryUploadPayload } from '../legalRepositoryTypes';

export function useLegalRepositoryDocuments({
    searchTerm = '',
    selectedType = 'الكل',
    sortBy = 'newest',
    selectedTag = null,
    surfaceOpen = true,
    repositoryActive = true,
}: LegalRepositoryFilters = {}) {
    const { user, hasRole } = useAuthSafe();
    const userId = user?.id ?? null;
    const [documents, setDocuments] = useState<RepositoryDocument[]>(resolveInitialRepositoryDocuments);
    const documentsRef = useRef<RepositoryDocument[]>([]);
    documentsRef.current = documents;
    const actionInflightRef = useRef(new Set<string>());

    const canUpload = Boolean(user && hasRole('lawyer'));
    const authorName =
        (user?.user_metadata as { fullName?: string } | undefined)?.fullName ||
        user?.email ||
        'محامي';
    const hasActiveFilters =
        repositoryHasActiveListFilters(selectedType, sortBy, selectedTag) ||
        searchTerm.trim().length > 0;

    const isOwner = useCallback(
        (doc: RepositoryDocument) => userId !== null && doc.authorId === userId,
        [userId],
    );

    const applyDocuments = useCallback((docs: RepositoryDocument[]) => {
        const normalized = normalizeRepositoryRows(docs);
        setDocuments(normalized);
        setRepositoryDocsCache(normalized);
    }, []);

    const allowRemoteFetch = surfaceOpen !== false && repositoryActive !== false;
    const { syncing } = useLegalRepositoryBootstrap({
        applyDocuments,
        documentsRef,
        allowRemoteFetch,
    });
    const preview = useLegalRepositoryPreview({ actionInflightRef });
    const mutations = useLegalRepositoryMutations({
        user: user
            ? {
                  id: user.id,
                  email: user.email,
                  user_metadata: user.user_metadata as { fullName?: string } | undefined,
              }
            : null,
        userId,
        authorName,
        isOwner,
        documentsRef,
        applyDocuments,
        actionInflightRef,
    });

    const filteredDocuments = useMemo(
        () =>
            filterAndSortRepositoryDocuments(documents, {
                searchTerm,
                selectedType,
                selectedTag,
                sortBy,
            }),
        [documents, searchTerm, selectedTag, selectedType, sortBy],
    );

    useEffect(() => {
        if (surfaceOpen !== false && repositoryActive !== false) return;
        mutations.closeUploadModal({ force: true });
        preview.closePreview();
        if (!mutations.deletingId) mutations.cancelDelete();
    }, [
        surfaceOpen,
        repositoryActive,
        mutations.closeUploadModal,
        mutations.deletingId,
        mutations.cancelDelete,
        preview.closePreview,
    ]);

    const escapeLayerActive = surfaceOpen !== false && repositoryActive !== false;

    useEffect(() => {
        if (!escapeLayerActive) {
            resetForumRepositoryEscape();
            return;
        }
        setForumRepositoryEscape(
            {
                isUploadModalOpen: mutations.isUploadModalOpen,
                previewOpen: preview.previewDoc !== null,
                deleteOpen: mutations.deleteTarget !== null,
            },
            {
                closeUpload: () => mutations.closeUploadModal(),
                closePreview: preview.closePreview,
                cancelDelete: mutations.cancelDelete,
            },
        );
        return () => resetForumRepositoryEscape();
    }, [
        escapeLayerActive,
        mutations.isUploadModalOpen,
        mutations.deleteTarget,
        mutations.closeUploadModal,
        mutations.cancelDelete,
        preview.previewDoc,
        preview.closePreview,
    ]);

    return {
        canUpload,
        authorName,
        syncing,
        filteredDocuments,
        totalDocuments: documents.length,
        hasActiveFilters,
        activeSortLabel: repositorySortLabel(sortBy),
        downloadingId: preview.downloadingId,
        openingId: preview.openingId,
        deletingId: mutations.deletingId,
        isUploadModalOpen: mutations.isUploadModalOpen,
        editingDoc: mutations.editingDoc,
        isSubmitting: mutations.isSubmitting,
        previewDoc: preview.previewDoc,
        previewSignedUrl: preview.previewSignedUrl,
        previewLoading: preview.previewLoading,
        previewMode: preview.previewMode,
        deleteTarget: mutations.deleteTarget,
        isOwner,
        openUploadModal: mutations.openUploadModal,
        closeUploadModal: mutations.closeUploadModal,
        closePreview: preview.closePreview,
        handleDownload: preview.handleDownload,
        handleOpenDocument: preview.handleOpenDocument,
        handleDeleteRequest: mutations.handleDeleteRequest,
        handleConfirmDelete: mutations.handleConfirmDelete,
        handleEditDocument: mutations.handleEditDocument,
        handleReportDocument: mutations.handleReportDocument,
        handlePreview: preview.handlePreview,
        handleUploadSubmit: mutations.handleUploadSubmit,
        cancelDelete: mutations.cancelDelete,
    };
}
