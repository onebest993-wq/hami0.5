import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    FileText, Grid3X3, List,
    ChevronLeft, Loader2, Scan, ImageIcon, FolderOpen,
} from 'lucide-react';
import { useSmartVault } from './hooks/useSmartVault';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';
import { SmartFileCard } from './SmartVaultModal/SmartFileCard';
import { VaultSearchFilterHub } from './SmartVaultModal/VaultSearchFilterHub';
import { SmartVaultScannerPanel } from './SmartVaultModal/SmartVaultScannerPanel';
import { VaultDocViewer } from './SmartVaultModal/VaultDocViewer';
import { VaultUploadMetaSheet } from './SmartVaultModal/VaultUploadMetaSheet';
import { VaultDocEditSheet } from './SmartVaultModal/VaultDocEditSheet';
import { VaultModalRootContext } from './SmartVaultModal/VaultModalRootContext';
import {
    VAULT_OVERLAY,
    VAULT_PANEL,
    VAULT_HEADER,
    VAULT_SECTION,
    VAULT_BODY,
    VAULT_BTN_VIEW,
    VAULT_ACTION_STRIP,
    VAULT_ACTION_CELL,
    VAULT_CARD,
    VAULT_COPPER_DIVIDER,
} from './SmartVaultModal/vaultDustyRoseTheme';

interface SmartVaultModalProps {
    onClose: () => void;
    currentUserId?: string;
    initialOpenScanner?: boolean;
}

export const SmartVaultModal: React.FC<SmartVaultModalProps> = ({
    onClose,
    currentUserId,
    initialOpenScanner = false,
}) => {
    const [scannerOpen, setScannerOpen] = useState(initialOpenScanner);
    const modalPanelRef = useRef<HTMLDivElement>(null);
    const [modalRoot, setModalRoot] = useState<HTMLDivElement | null>(null);

    const {
        docs, isLoading, searchQuery, isSearching,
        activeFilter, customCategories, viewMode, openDropdownId, currentUserId: uid,
        imageInputRef, pdfInputRef, searchInputRef, mounted, filteredDocs,
        pendingUpload, uploadQueueCount, fileViewer, editDoc, isSavingMeta, isSavingEdit,
        setSearchQuery, setActiveFilter, addVaultCategory, removeVaultCategory, setViewMode, setOpenDropdownId,
        handleImageUploadSelect, handlePdfUploadSelect, confirmPendingUpload, cancelPendingUpload,
        closeFileViewer, saveDocEdit, closeEditDoc,
        handleViewFile, handleAISearch, handleSearchSubmit, handleDropdownAction,
        refreshDocs,
    } = useSmartVault(onClose, currentUserId);

    useEffect(() => {
        if (initialOpenScanner) setScannerOpen(true);
    }, [initialOpenScanner]);

    const requestClose = useCallback(() => {
        if (isSavingMeta || isSavingEdit) return;
        if (fileViewer) { closeFileViewer(); return; }
        if (editDoc) { closeEditDoc(); return; }
        if (pendingUpload) { cancelPendingUpload(); return; }
        if (scannerOpen) { setScannerOpen(false); return; }
        onClose();
    }, [isSavingMeta, isSavingEdit, fileViewer, editDoc, pendingUpload, scannerOpen, closeFileViewer, closeEditDoc, cancelPendingUpload, onClose]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose(); };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [requestClose]);

    const handleScannerViewDoc = useCallback(async (doc: SmartVaultDoc) => {
        setScannerOpen(false);
        await refreshDocs();
        await handleViewFile(doc);
    }, [refreshDocs, handleViewFile]);

    const canManageDoc = (doc: { authorId?: string }) => !doc.authorId || doc.authorId === uid;
    const totalCount = docs.length;
    const uploadDisabled = isSavingMeta || !!pendingUpload;

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={VAULT_OVERLAY} dir="rtl" onClick={requestClose}>
                <motion.div
                    ref={(el) => { modalPanelRef.current = el; setModalRoot(el); }}
                    initial={{ opacity: 0, scale: 0.97, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className={VAULT_PANEL}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                        <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-[#132238]/60 blur-3xl" />
                        <div className="absolute bottom-20 -left-16 w-56 h-56 rounded-full bg-[#B87333]/6 blur-3xl" />
                        <div className="absolute top-1/3 left-1/4 w-32 h-32 rounded-full bg-[#E6DED0]/4 blur-2xl" />
                    </div>

                    <VaultModalRootContext.Provider value={modalRoot}>
                        <div className={`${VAULT_HEADER} relative z-[1]`}>
                            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#B87333]/35 to-transparent" />
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <button type="button" onClick={requestClose} className="p-2 rounded-xl bg-[#132238]/70 border border-[#B87333]/20 hover:border-[#B87333]/38 transition-colors shrink-0">
                                        <ChevronLeft size={18} className="text-[#C9BCA8]/80" />
                                    </button>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <FolderOpen size={18} className="text-[#C4926A] shrink-0" />
                                            <h2 className="font-bold text-base truncate bg-gradient-to-l from-[#E8E4DC] to-[#C9BCA8] bg-clip-text text-transparent">
                                                المخزن الذكي
                                            </h2>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="hidden sm:inline text-[10px] font-bold px-2 py-1 rounded-full border border-[#B87333]/30 text-[#C4926A] bg-[#B87333]/10">
                                        {totalCount} ملف
                                    </span>
                                    <button type="button" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} title={viewMode === 'grid' ? 'عرض قائمة' : 'عرض شبكة'} className={VAULT_BTN_VIEW}>
                                        {viewMode === 'grid' ? <List size={16} /> : <Grid3X3 size={16} />}
                                        <span>{viewMode === 'grid' ? 'قائمة' : 'شبكة'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* بحث + تصنيفات — لوحة ترافرتين موحّدة */}
                        <div className={`${VAULT_SECTION} relative z-[1]`}>
                            <VaultSearchFilterHub
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                                onSearchKeyDown={handleSearchSubmit}
                                searchInputRef={searchInputRef}
                                isSearching={isSearching}
                                onAISearch={handleAISearch}
                                activeFilter={activeFilter}
                                onFilterChange={setActiveFilter}
                                customCategories={customCategories}
                                onAddCategory={addVaultCategory}
                                onRemoveCategory={(name) => void removeVaultCategory(name)}
                                docs={docs}
                            />
                        </div>

                        {/* شريط إضافة — خلايا بفواصل نحاسية */}
                        <div className={`${VAULT_SECTION} relative z-[1] pb-4`}>
                            <div className={VAULT_ACTION_STRIP}>
                                <div className="grid grid-cols-3 divide-x divide-[#B87333]/22 rtl:divide-x-reverse">
                                    <button
                                        type="button"
                                        onClick={() => setScannerOpen(true)}
                                        disabled={uploadDisabled || scannerOpen}
                                        className={`${VAULT_ACTION_CELL} text-[#E8E4DC] hover:bg-[#0E1B2E]/35`}
                                    >
                                        <Scan size={20} className="text-[#C4926A]" />
                                        <span className="text-[10px] sm:text-xs font-bold">مسح ضوئي</span>
                                    </button>
                                    <label className={`${VAULT_ACTION_CELL} text-[#E8E4DC] hover:bg-[#E6DED0]/8 cursor-pointer ${uploadDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {isSavingMeta && pendingUpload?.kind === 'image' ? (
                                            <Loader2 size={20} className="animate-spin text-[#B87333]" />
                                        ) : (
                                            <ImageIcon size={20} className="text-[#C4926A]" />
                                        )}
                                        <span className="text-[10px] sm:text-xs font-bold">رفع صورة</span>
                                        <input ref={imageInputRef} type="file" multiple accept="image/*" className="sr-only" onChange={(e) => void handleImageUploadSelect(e)} />
                                    </label>
                                    <label className={`${VAULT_ACTION_CELL} text-[#C9BCA8] hover:bg-[#0E1B2E]/35 cursor-pointer ${uploadDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {isSavingMeta && pendingUpload?.kind === 'pdf' ? (
                                            <Loader2 size={20} className="animate-spin text-[#B87333]" />
                                        ) : (
                                            <FileText size={20} className="text-[#C4926A]/80" />
                                        )}
                                        <span className="text-[10px] sm:text-xs font-bold">رفع PDF</span>
                                        <input ref={pdfInputRef} type="file" multiple accept="application/pdf,.pdf" className="sr-only" onChange={(e) => void handlePdfUploadSelect(e)} />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className={`${VAULT_BODY} relative z-[1]`}>
                            {isLoading ? (
                                <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 gap-3' : 'gap-2'}`}>
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className={`${VAULT_CARD} shimmer ${viewMode === 'grid' ? 'h-48' : 'h-14'}`} />
                                    ))}
                                </div>
                            ) : filteredDocs.length === 0 ? (
                                <div className={`${VAULT_CARD} relative flex flex-col items-center justify-center py-14 px-6 text-center overflow-hidden`}>
                                    <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, #E6DED0 1px, transparent 1px), radial-gradient(circle at 70% 60%, #D9CFC0 0.5px, transparent 0.5px)', backgroundSize: '24px 28px' }} />
                                    <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-[#E6DED0]/12 to-[#132238]/50 border border-[#D9CFC0]/20 flex items-center justify-center mb-5 relative">
                                        <FileText size={34} className="text-[#C4926A]/80" />
                                    </div>
                                    <h3 className="text-[#E8E4DC] font-bold text-base mb-2 relative">
                                        {searchQuery.trim() ? 'لا توجد نتائج' : 'المخزن فارغ'}
                                    </h3>
                                    <p className="text-[#C9BCA8]/55 text-sm max-w-xs leading-relaxed relative">
                                        {searchQuery.trim()
                                            ? 'عدّل البحث أو غيّر التصنيف من اللوحة أعلاه'
                                            : 'استخدم شريط الإضافة أعلاه لبدء الأرشفة'}
                                    </p>
                                    <div className={`mt-6 w-28 ${VAULT_COPPER_DIVIDER}`} />
                                </div>
                            ) : (
                                <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 gap-3' : 'flex flex-col gap-2'}>
                                    {filteredDocs.map((doc) => (
                                        <SmartFileCard
                                            key={doc.id}
                                            doc={doc}
                                            viewMode={viewMode}
                                            openDropdownId={openDropdownId}
                                            setOpenDropdownId={setOpenDropdownId}
                                            onView={handleViewFile}
                                            onAction={handleDropdownAction}
                                            canManage={canManageDoc(doc)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {scannerOpen && (
                            <SmartVaultScannerPanel userId={uid} onClose={() => setScannerOpen(false)} onSaved={() => void refreshDocs()} onViewDoc={(doc) => void handleScannerViewDoc(doc)} onCategoryUsed={addVaultCategory} categorySuggestions={customCategories} />
                        )}
                        {pendingUpload && (
                            <VaultUploadMetaSheet file={pendingUpload.file} uploadKind={pendingUpload.kind} previewUrl={pendingUpload.previewUrl} queueRemaining={uploadQueueCount} isSaving={isSavingMeta} categorySuggestions={customCategories} onAddCategory={addVaultCategory} onConfirm={(meta) => void confirmPendingUpload(meta)} onCancel={cancelPendingUpload} />
                        )}
                        {editDoc && (
                            <VaultDocEditSheet doc={editDoc} isSaving={isSavingEdit} categorySuggestions={customCategories} onAddCategory={addVaultCategory} onSave={(values) => void saveDocEdit(values)} onClose={closeEditDoc} />
                        )}
                        {fileViewer && (
                            <VaultDocViewer doc={fileViewer.doc} fileUrl={fileViewer.url} kind={fileViewer.kind} onClose={closeFileViewer} />
                        )}
                    </VaultModalRootContext.Provider>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body,
    );
};
