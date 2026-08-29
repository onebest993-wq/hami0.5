import { Suspense } from 'react';
import { Upload } from '@/app/components/ui/icons/Upload';
import { RepositoryCard } from './RepositoryCard';
import { useLegalRepositoryDocuments, type LegalRepositoryFilters } from '../hooks/useLegalRepositoryDocuments';
import { useExpandingVisibleCount } from '../hooks/useExpandingVisibleCount';
import {
    LazyForumDeleteConfirmModal,
    LazyRepositoryPreviewModal,
    LazyUploadDocumentModal,
    prefetchLegalRepositoryModals,
} from '../legalRepositoryLazyModals';
import { ForumPublishFab } from './ForumPublishFab';
import {
    FORUM_CONTENT_COLUMN,
    FORUM_META_BAR,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';
import { FORUM_LAZY_SECTION_MIN_HEIGHT_CLASS } from '../forumLazySectionMount';

const REPO_LIST_INITIAL = 12;
const REPO_LIST_STEP = 8;

export const LegalRepository = ({
    searchTerm = '',
    selectedType = 'الكل',
    sortBy = 'newest',
    selectedTag = null,
    surfaceOpen = true,
    repositoryActive = true,
}: LegalRepositoryFilters = {}) => {
    const repo = useLegalRepositoryDocuments({
        searchTerm,
        selectedType,
        sortBy,
        selectedTag,
        surfaceOpen,
        repositoryActive,
    });
    const filteredCount = repo.filteredDocuments.length;
    const { visibleCount, sentinelRef: listSentinelRef, hasMore: hasMoreDocuments } = useExpandingVisibleCount(
        filteredCount,
        {
            initial: REPO_LIST_INITIAL,
            step: REPO_LIST_STEP,
            resetKey: `${searchTerm}\0${selectedType}\0${sortBy}\0${selectedTag ?? ''}`,
        },
    );
    const visibleDocuments = repo.filteredDocuments.slice(0, visibleCount);

    return (
        <div className={`${FORUM_CONTENT_COLUMN} pb-28 space-y-4`} data-testid="forum-legal-repository">
            {repo.canUpload ? (
                <ForumPublishFab
                    label="رفع مستند"
                    testId="forum-repo-upload-fab"
                    onClick={repo.openUploadModal}
                    onPointerEnter={prefetchLegalRepositoryModals}
                    icon={<Upload size={18} />}
                />
            ) : null}

            {filteredCount > 0 || repo.hasActiveFilters || repo.syncing ? (
                <div className={FORUM_META_BAR} data-testid="forum-repo-meta-bar">
                    <p className={`${FORUM_TEXT_MUTED} text-[10px] shrink-0`}>
                        الترتيب: <span className={FORUM_TEXT_PRIMARY}>{repo.activeSortLabel}</span>
                    </p>
                    <div className="flex-1 min-w-2" aria-hidden />
                    <p className={`${FORUM_TEXT_MUTED} text-xs shrink-0 tabular-nums`}>
                        {repo.syncing && filteredCount === 0
                            ? 'جاري المزامنة...'
                            : filteredCount === 0
                              ? 'لا نتائج مطابقة'
                              : `${filteredCount} مستند${filteredCount !== 1 ? 'ات' : ''}`}
                    </p>
                </div>
            ) : null}

            {filteredCount === 0 ? (
                <div className={`${FORUM_LAZY_SECTION_MIN_HEIGHT_CLASS} flex flex-col items-center justify-end text-center px-3 pb-6`}>
                    <p className={`${FORUM_TEXT_MUTED} text-sm max-w-xs`}>
                        {repo.hasActiveFilters
                            ? 'لا نتائج لهذا البحث — جرّب كلمة أو تصنيفاً آخر.'
                            : repo.totalDocuments === 0
                              ? repo.canUpload
                                  ? 'المستودع فارغ — ارفع مستنداً من الزر أدناه.'
                                  : 'المستودع فارغ حالياً.'
                              : 'لا مستندات في هذا التصنيف.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {visibleDocuments.map((doc, index) => (
                        <div
                            key={doc.id}
                            style={
                                index > 1
                                    ? { contentVisibility: 'auto', containIntrinsicSize: '0 280px' }
                                    : undefined
                            }
                        >
                            <RepositoryCard
                                doc={doc}
                                priorityThumb={index < 4}
                                isOwner={repo.isOwner(doc)}
                                downloadingId={repo.downloadingId}
                                deletingId={repo.deletingId}
                                onDownload={repo.handleDownload}
                                onDelete={repo.handleDeleteRequest}
                                onEdit={repo.handleEditDocument}
                                onReport={repo.handleReportDocument}
                                onPreview={repo.handlePreview}
                            />
                        </div>
                    ))}
                    {hasMoreDocuments ? (
                        <div ref={listSentinelRef} className="h-1" aria-hidden />
                    ) : null}
                </div>
            )}

            {repo.isUploadModalOpen ? (
                <Suspense fallback={null}>
                    <LazyUploadDocumentModal
                        isOpen
                        onClose={repo.closeUploadModal}
                        onSubmit={repo.handleUploadSubmit}
                        editDoc={repo.editingDoc}
                        authorName={repo.authorName}
                        isSubmitting={repo.isSubmitting}
                    />
                </Suspense>
            ) : null}

            {repo.previewDoc ? (
                <Suspense fallback={null}>
                    <LazyRepositoryPreviewModal
                        doc={repo.previewDoc}
                        signedUrl={repo.previewSignedUrl}
                        isLoading={repo.previewLoading}
                        mode={repo.previewMode}
                        onClose={repo.closePreview}
                        onDownload={repo.handleDownload}
                        onOpen={repo.handleOpenDocument}
                    />
                </Suspense>
            ) : null}

            {repo.deleteTarget ? (
                <Suspense fallback={null}>
                    <LazyForumDeleteConfirmModal
                        open
                        title="حذف المستند"
                        message={`هل تريد حذف "${repo.deleteTarget.title}" من المستودع؟ لا يمكن التراجع عن هذا الإجراء.`}
                        loading={repo.deletingId !== null}
                        onConfirm={() => void repo.handleConfirmDelete()}
                        onCancel={repo.cancelDelete}
                    />
                </Suspense>
            ) : null}
        </div>
    );
};
