import { FolderOpen, Upload } from 'lucide-react';
import { RepositoryCard } from './RepositoryCard';
import { UploadDocumentModal } from './UploadDocumentModal';
import { ForumDeleteConfirmModal } from './ForumDeleteConfirmModal';
import { RepositoryPreviewModal } from './RepositoryPreviewModal';
import { useLegalRepositoryDocuments, type LegalRepositoryFilters } from '../hooks/useLegalRepositoryDocuments';

export const LegalRepository = ({
    searchTerm = '',
    selectedType = 'الكل',
    sortBy = 'newest',
    selectedTag = null,
}: LegalRepositoryFilters = {}) => {
    const repo = useLegalRepositoryDocuments({ searchTerm, selectedType, sortBy, selectedTag });

    return (
        <div className="px-4 pb-28 space-y-4 relative" data-testid="forum-legal-repository">
            <div>
                <h2 className="text-white font-bold text-base">المستودع القانوني العام</h2>
                <p className="text-white/40 text-[11px]">مكتبة رقمية للمستندات القانونية</p>
            </div>

            {repo.canUpload ? (
                <div className="fixed bottom-6 left-6 z-20">
                    <button
                        type="button"
                        onClick={repo.openUploadModal}
                        className="flex items-center gap-2 font-bold py-3 px-5 rounded-2xl shadow-xl shadow-black/30 transition-transform active:scale-95 bg-[#E6C673] hover:bg-[#d4b560] text-black"
                    >
                        <Upload size={18} />
                        <span>رفع مستند للمستودع</span>
                    </button>
                </div>
            ) : null}

            <div className="flex items-center justify-between">
                <p className="text-white/40 text-xs">
                    {repo.loading
                        ? 'جاري التحميل...'
                        : repo.filteredDocuments.length === 0
                          ? 'لا توجد نتائج'
                          : `${repo.filteredDocuments.length} مستند${repo.filteredDocuments.length !== 1 ? 'ات' : ''}`}
                </p>
                <p className="text-white/30 text-[10px]">الترتيب: {repo.activeSortLabel}</p>
            </div>

            {repo.loading ? (
                <div className="py-14 text-center">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <svg className="animate-spin h-8 w-8 text-white/20" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">جاري تحميل المستندات...</h3>
                    <p className="text-white/40 text-sm">يرجى الانتظار</p>
                </div>
            ) : repo.filteredDocuments.length === 0 ? (
                <div className="py-14 text-center">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                        <FolderOpen size={36} className="text-white/20" />
                    </div>
                    <h3 className="text-white font-bold text-lg mb-2">لا توجد مستندات تطابق بحثك</h3>
                    <p className="text-white/40 text-sm">حاول تغيير كلمة البحث أو اختيار نوع آخر.</p>
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
                    onClose={repo.closePreview}
                    onDownload={repo.handleDownload}
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
