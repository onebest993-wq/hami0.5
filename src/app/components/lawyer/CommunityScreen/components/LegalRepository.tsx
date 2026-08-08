import { Upload } from '@/app/components/ui/lucideIcons';
import { RepositoryCard } from './RepositoryCard';
import { UploadDocumentModal } from './UploadDocumentModal';
import { ForumDeleteConfirmModal } from './ForumDeleteConfirmModal';
import { RepositoryPreviewModal } from './RepositoryPreviewModal';
import { useLegalRepositoryDocuments, type LegalRepositoryFilters } from '../hooks/useLegalRepositoryDocuments';
import {
    FORUM_FAB,
    FORUM_META_BAR,
    FORUM_PUBLISH_FAB_SLOT,
    FORUM_TEXT_MUTED,
    FORUM_TEXT_PRIMARY,
} from '../forumPlumTheme';

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

    return (
        <div className="px-4 pb-28 space-y-4" data-testid="forum-legal-repository">
            {repo.canUpload ? (
                <div className={FORUM_PUBLISH_FAB_SLOT}>
                    <button
                        type="button"
                        onClick={repo.openUploadModal}
                        data-testid="forum-repo-upload-fab"
                        className={`pointer-events-auto ${FORUM_FAB}`}
                    >
                        <Upload size={18} className="relative z-[1]" />
                        <span className="relative z-[1]">رفع مستند</span>
                    </button>
                </div>
            ) : null}

            {repo.filteredDocuments.length > 0 || repo.hasActiveFilters || repo.syncing ? (
                <div className={FORUM_META_BAR} data-testid="forum-repo-meta-bar">
                    <p className={`${FORUM_TEXT_MUTED} text-[10px] shrink-0`}>
                        الترتيب: <span className={FORUM_TEXT_PRIMARY}>{repo.activeSortLabel}</span>
                    </p>
                    <div className="flex-1 min-w-2" aria-hidden />
                    <p className={`${FORUM_TEXT_MUTED} text-xs shrink-0 tabular-nums`}>
                        {repo.syncing && repo.filteredDocuments.length === 0
                            ? 'جاري المزامنة...'
                            : repo.filteredDocuments.length === 0
                              ? 'لا نتائج مطابقة'
                              : `${repo.filteredDocuments.length} مستند${repo.filteredDocuments.length !== 1 ? 'ات' : ''}`}
                    </p>
                </div>
            ) : null}

            {repo.filteredDocuments.length === 0 ? (
                <div className="min-h-[min(40vh,22rem)] flex flex-col items-center justify-end text-center px-3 pb-6">
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
                    {repo.filteredDocuments.map((doc, index) => (
                        <RepositoryCard
                            key={doc.id}
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
                    ))}
                </div>
            )}

            <UploadDocumentModal
                isOpen={repo.isUploadModalOpen}
                onClose={repo.closeUploadModal}
                onSubmit={repo.handleUploadSubmit}
                editDoc={repo.editingDoc}
                authorName={repo.authorName}
                isSubmitting={repo.isSubmitting}
            />

            {repo.previewDoc ? (
                <RepositoryPreviewModal
                    doc={repo.previewDoc}
                    signedUrl={repo.previewSignedUrl}
                    isLoading={repo.previewLoading}
                    mode={repo.previewMode}
                    onClose={repo.closePreview}
                    onDownload={repo.handleDownload}
                    onOpen={repo.handleOpenDocument}
                />
            ) : null}

            <ForumDeleteConfirmModal
                open={repo.deleteTarget !== null}
                title="حذف المستند"
                message={
                    repo.deleteTarget
                        ? `هل تريد حذف "${repo.deleteTarget.title}" من المستودع؟ لا يمكن التراجع عن هذا الإجراء.`
                        : ''
                }
                loading={repo.deletingId !== null}
                onConfirm={() => void repo.handleConfirmDelete()}
                onCancel={repo.cancelDelete}
            />
        </div>
    );
};
