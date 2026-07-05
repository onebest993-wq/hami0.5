import { FolderOpen, Upload } from 'lucide-react';
import { RepositoryCard } from './RepositoryCard';
import { UploadDocumentModal } from './UploadDocumentModal';
import { ForumDeleteConfirmModal } from './ForumDeleteConfirmModal';
import { RepositoryPreviewModal } from './RepositoryPreviewModal';
import { useLegalRepositoryDocuments, type LegalRepositoryFilters } from '../hooks/useLegalRepositoryDocuments';
import {
    FORUM_PUBLISH_BTN,
    FORUM_TEXT_PRIMARY,
    FORUM_TEXT_MUTED,
} from '../forumPlumTheme';

export const LegalRepository = ({
    searchTerm = '',
    selectedType = 'الكل',
    sortBy = 'newest',
    selectedTag = null,
}: LegalRepositoryFilters = {}) => {
    const repo = useLegalRepositoryDocuments({ searchTerm, selectedType, sortBy, selectedTag });

    return (
        <div className="px-4 pb-28 space-y-4 relative" data-testid="forum-legal-repository">
            {repo.canUpload ? (
                <div className="fixed bottom-6 left-6 z-20">
                    <button
                        type="button"
                        onClick={repo.openUploadModal}
                        className={`flex items-center gap-2 font-bold py-3 px-5 rounded-2xl shadow-lg shadow-black/25 transition-transform active:scale-95 ${FORUM_PUBLISH_BTN}`}
                    >
                        <Upload size={18} />
                        <span>رفع مستند للمستودع</span>
                    </button>
                </div>
            ) : null}

            <div className="flex items-center justify-between">
                <p className={`${FORUM_TEXT_MUTED} text-xs`}>
                    {repo.syncing && repo.filteredDocuments.length === 0
                        ? 'جاري المزامنة...'
                        : repo.filteredDocuments.length === 0
                          ? 'لا توجد نتائج'
                          : `${repo.filteredDocuments.length} مستند${repo.filteredDocuments.length !== 1 ? 'ات' : ''}`}
                </p>
                <p className="text-[#7A747C] text-[10px]">الترتيب: {repo.activeSortLabel}</p>
            </div>

            {repo.filteredDocuments.length === 0 ? (
                <div className="py-14 text-center">
                    <div className="w-20 h-20 rounded-full bg-[#342C3A] border border-[#4A3D52]/40 flex items-center justify-center mx-auto mb-4">
                        <FolderOpen size={36} className="text-[#F0B896]/30" />
                    </div>
                    <h3 className={`${FORUM_TEXT_PRIMARY} font-bold text-lg mb-2`}>
                        {repo.hasActiveFilters
                            ? 'لا توجد مستندات تطابق بحثك'
                            : repo.totalDocuments === 0
                              ? 'المستودع فارغ حالياً'
                              : 'لا توجد مستندات في هذا التصنيف'}
                    </h3>
                    <p className={`${FORUM_TEXT_MUTED} text-sm`}>
                        {repo.hasActiveFilters
                            ? 'حاول تغيير كلمة البحث أو اختيار نوع/وسم آخر.'
                            : repo.canUpload
                              ? 'ارفع أول مستند قانوني ليستفيد منه زملاؤك.'
                              : 'ستظهر المستندات هنا عند رفعها من المحامين.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {repo.filteredDocuments.map((doc) => (
                        <RepositoryCard
                            key={doc.id}
                            doc={doc}
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
