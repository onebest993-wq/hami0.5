import { Upload } from '@/app/components/ui/icons/Upload';
import { RepositoryCard } from './RepositoryCard';
import { useLegalRepositoryDocuments, type LegalRepositoryFilters } from '../hooks/useLegalRepositoryDocuments';
import { useExpandingVisibleCount } from '../hooks/useExpandingVisibleCount';
import { prefetchLegalRepositoryModals } from '../legalRepositoryLazyModals';
import { ForumPublishFab } from './ForumPublishFab';
import { LegalRepositoryModals } from './LegalRepositoryModals';
import {
    FORUM_CONTENT_COLUMN,
    FORUM_META_BAR,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';
import { FORUM_LAZY_SECTION_MIN_HEIGHT_CLASS } from '../forumLazySectionMount';
import { ForumLazySectionInstantSlots } from './ForumLazySectionInstantSlots';

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
        <div
            className={`${FORUM_CONTENT_COLUMN} pb-24 space-y-3`}
            data-testid="forum-legal-repository"
            aria-busy={repo.syncing}
        >
            {repo.canUpload ? (
                <ForumPublishFab
                    label="رفع مستند"
                    testId="forum-repo-upload-fab"
                    onClick={repo.openUploadModal}
                    onPointerEnter={prefetchLegalRepositoryModals}
                    icon={<Upload size={18} />}
                />
            ) : null}

            {filteredCount > 0 || repo.hasActiveFilters ? (
                <div className={FORUM_META_BAR} data-testid="forum-repo-meta-bar">
                    <p className={`${FORUM_TEXT_MUTED} text-[10px] shrink-0`}>
                        الترتيب: <span className={FORUM_TEXT_PRIMARY}>{repo.activeSortLabel}</span>
                    </p>
                    <div className="flex-1 min-w-2" aria-hidden />
                    <p className={`${FORUM_TEXT_MUTED} text-xs shrink-0 tabular-nums`}>
                        {filteredCount === 0
                            ? 'لا نتائج مطابقة'
                            : `${filteredCount} مستند${filteredCount !== 1 ? 'ات' : ''}`}
                    </p>
                </div>
            ) : null}

            {filteredCount === 0 ? (
                repo.syncing && !repo.hasActiveFilters ? (
                    <ForumLazySectionInstantSlots framed={false} />
                ) : (
                <div className={`${FORUM_LAZY_SECTION_MIN_HEIGHT_CLASS} flex flex-col items-center justify-center text-center px-3 pb-6`}>
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
                )
            ) : (
                <div className="grid grid-cols-1 gap-3">
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

            <LegalRepositoryModals
                isUploadModalOpen={repo.isUploadModalOpen}
                closeUploadModal={repo.closeUploadModal}
                handleUploadSubmit={repo.handleUploadSubmit}
                editingDoc={repo.editingDoc}
                authorName={repo.authorName}
                isSubmitting={repo.isSubmitting}
                previewDoc={repo.previewDoc}
                previewSignedUrl={repo.previewSignedUrl}
                previewLoading={repo.previewLoading}
                previewMode={repo.previewMode}
                closePreview={repo.closePreview}
                handleDownload={repo.handleDownload}
                handleOpenDocument={repo.handleOpenDocument}
                deleteTarget={repo.deleteTarget}
                deletingId={repo.deletingId}
                handleConfirmDelete={repo.handleConfirmDelete}
                cancelDelete={repo.cancelDelete}
            />
        </div>
    );
};
