import { lazy } from 'react';

const loadUploadDocumentModal = () => import('./components/UploadDocumentModal');
const loadRepositoryPreviewModal = () => import('./components/RepositoryPreviewModal');
const loadForumDeleteConfirmModal = () => import('./components/ForumDeleteConfirmModal');

export const LazyUploadDocumentModal = lazy(() =>
    loadUploadDocumentModal().then((m) => ({ default: m.UploadDocumentModal })),
);

export const LazyRepositoryPreviewModal = lazy(() =>
    loadRepositoryPreviewModal().then((m) => ({ default: m.RepositoryPreviewModal })),
);

export const LazyForumDeleteConfirmModal = lazy(() =>
    loadForumDeleteConfirmModal().then((m) => ({ default: m.ForumDeleteConfirmModal })),
);

export function prefetchLegalRepositoryModals(): void {
    void loadUploadDocumentModal();
    void loadRepositoryPreviewModal();
    void loadForumDeleteConfirmModal();
}
