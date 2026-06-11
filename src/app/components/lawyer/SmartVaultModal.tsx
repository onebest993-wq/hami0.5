import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
    FileText, Search, Grid3X3, List,
    ChevronLeft, Loader2, Sparkles, Scan, ImageIcon,
} from 'lucide-react';
import {
    useSmartVault,
    type ViewMode,
} from './hooks/useSmartVault';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';
import { SmartFileCard } from './SmartVaultModal/SmartFileCard';
import { FilterChips } from './SmartVaultModal/FilterChips';
import { SmartVaultScannerPanel } from './SmartVaultModal/SmartVaultScannerPanel';
import { VaultDocViewer } from './SmartVaultModal/VaultDocViewer';
import { VaultUploadMetaSheet } from './SmartVaultModal/VaultUploadMetaSheet';
import { VaultDocEditSheet } from './SmartVaultModal/VaultDocEditSheet';
import { VaultModalRootContext } from './SmartVaultModal/VaultModalRootContext';

interface SmartVaultModalProps {
    onClose: () => void;
    currentUserId?: string;
    /** فتح الماسح الضوئي مباشرة عند الدخول */
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
        setSearchQuery, setActiveFilter, addVaultCategory, setViewMode, setOpenDropdownId,
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
        if (fileViewer) {
            closeFileViewer();
            return;
        }
        if (editDoc) {
            closeEditDoc();
            return;
        }
        if (pendingUpload) {
            cancelPendingUpload();
            return;
        }
        if (scannerOpen) {
            setScannerOpen(false);
            return;
        }
        onClose();
    }, [
        isSavingMeta,
        isSavingEdit,
        fileViewer,
        editDoc,
        pendingUpload,
        scannerOpen,
        closeFileViewer,
        closeEditDoc,
        cancelPendingUpload,
        onClose,
    ]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') requestClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [requestClose]);

    const handleScannerViewDoc = useCallback(
        async (doc: SmartVaultDoc) => {
            setScannerOpen(false);
            await refreshDocs();
            await handleViewFile(doc);
        },
        [refreshDocs, handleViewFile],
    );

    const canManageDoc = (doc: { authorId?: string }) => !doc.authorId || doc.authorId === uid;
    const totalCount = docs.length;

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[99999] flex items-start justify-center bg-black/85 backdrop-blur-md overflow-hidden isolate"
                dir="rtl"
                onClick={requestClose}
            >
                <motion.div
                    ref={(el) => {
                        modalPanelRef.current = el;
                        setModalRoot(el);
                    }}
                    initial={{ opacity: 0, scale: 0.97, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="w-full max-w-4xl h-full mx-auto flex flex-col relative bg-[#0A0F1C] overflow-hidden shadow-2xl border-x border-white/5"
                    onClick={(e) => e.stopPropagation()}
                >
                    <VaultModalRootContext.Provider value={modalRoot}>
                    <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#0A0F1C]">
                        <div className="flex items-center gap-3 min-w-0">
                            <button type="button" onClick={requestClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0">
                                <ChevronLeft size={20} className="text-white/60" />
                            </button>
                            <h2 className="text-white font-bold text-base truncate">المخزن الذكي</h2>
                            <span className="bg-amber-500/10 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                                {totalCount} ملف
                            </span>
                        </div>
                        <button type="button"
                            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                            title={viewMode === 'grid' ? 'عرض قائمة' : 'عرض شبكة'}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                            {viewMode === 'grid' ? <List size={18} className="text-[#D4AF37]" /> : <Grid3X3 size={18} className="text-[#D4AF37]" />}
                            <span className="text-[11px] text-white/70 font-bold">{viewMode === 'grid' ? 'قائمة' : 'شبكة'}</span>
                        </button>
                    </div>

                    <div className="shrink-0 px-5 py-3 border-b border-white/5 bg-[#0A0F1C]">
                        <div className="grid grid-cols-3 gap-2">
                            <button type="button"
                                onClick={() => setScannerOpen(true)}
                                disabled={isSavingMeta || scannerOpen || !!pendingUpload}
                                className="flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-[#D4AF37]/15 border-2 border-[#D4AF37]/35 text-[#D4AF37] text-xs sm:text-sm font-bold hover:bg-[#D4AF37]/25 transition-all disabled:opacity-50 active:scale-[0.98]"
                            >
                                <Scan size={18} className="shrink-0" />
                                <span className="truncate">مسح ضوئي</span>
                            </button>
                            <label
                                className={`flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-[#D4AF37] border-2 border-[#D4AF37] text-black text-xs sm:text-sm font-bold hover:bg-[#C4A030] transition-all active:scale-[0.98] cursor-pointer ${
                                    isSavingMeta || !!pendingUpload ? 'opacity-50 pointer-events-none' : ''
                                }`}
                            >
                                {isSavingMeta && pendingUpload?.kind === 'image' ? (
                                    <Loader2 size={18} className="animate-spin shrink-0" />
                                ) : (
                                    <ImageIcon size={18} className="shrink-0" />
                                )}
                                <span className="truncate">رفع صورة</span>
                                <input
                                    ref={imageInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(e) => void handleImageUploadSelect(e)}
                                />
                            </label>
                            <label
                                className={`flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-[#D4AF37]/15 border-2 border-[#D4AF37]/35 text-[#D4AF37] text-xs sm:text-sm font-bold hover:bg-[#D4AF37]/25 transition-all active:scale-[0.98] cursor-pointer ${
                                    isSavingMeta || !!pendingUpload ? 'opacity-50 pointer-events-none' : ''
                                }`}
                            >
                                {isSavingMeta && pendingUpload?.kind === 'pdf' ? (
                                    <Loader2 size={18} className="animate-spin shrink-0" />
                                ) : (
                                    <FileText size={18} className="shrink-0" />
                                )}
                                <span className="truncate">رفع PDF</span>
                                <input
                                    ref={pdfInputRef}
                                    type="file"
                                    multiple
                                    accept="application/pdf,.pdf"
                                    className="sr-only"
                                    onChange={(e) => void handlePdfUploadSelect(e)}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="shrink-0 px-5 py-3 border-b border-white/5 flex flex-col gap-2 bg-[#0A0F1C]">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                            <Search size={16} className="text-white/30 shrink-0" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchSubmit}
                                placeholder="ابحث في الملفات..."
                                className="w-full bg-transparent text-white text-sm placeholder:text-white/20 outline-none border-none"
                            />
                            {isSearching ? (
                                <Loader2 size={14} className="text-amber-400 animate-spin shrink-0" />
                            ) : searchQuery.trim() ? (
                                <button type="button" onClick={handleAISearch} className="flex items-center gap-1 text-amber-400 text-[10px] font-bold shrink-0 hover:text-amber-300">
                                    <Sparkles size={12} />
                                    بحث
                                </button>
                            ) : null}
                        </div>
                        <FilterChips
                            activeFilter={activeFilter}
                            onChange={setActiveFilter}
                            customCategories={customCategories}
                            onAddCategory={addVaultCategory}
                            docs={docs}
                        />
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 custom-scrollbar bg-[#0A0F1C]">
                        {isLoading ? (
                            <div className={`grid ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 gap-3' : 'gap-2'}`}>
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className={`bg-white/5 rounded-2xl shimmer ${viewMode === 'grid' ? 'h-48' : 'h-14'}`} />
                                ))}
                            </div>
                        ) : filteredDocs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 gap-2">
                                <FileText size={40} className="text-white/20" />
                                <p className="text-white/40 text-sm font-medium">
                                    {searchQuery.trim() ? 'لا توجد نتائج للبحث' : 'لا توجد ملفات مرفوعة بعد'}
                                </p>
                                {!searchQuery.trim() && (
                                    <p className="text-white/25 text-xs mt-1">استخدم «مسح ضوئي» أو «رفع صورة» أو «رفع PDF»</p>
                                )}
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
                        <SmartVaultScannerPanel
                            userId={uid}
                            onClose={() => setScannerOpen(false)}
                            onSaved={() => void refreshDocs()}
                            onViewDoc={(doc) => void handleScannerViewDoc(doc)}
                            onCategoryUsed={addVaultCategory}
                            categorySuggestions={customCategories}
                        />
                    )}

                    {pendingUpload && (
                        <VaultUploadMetaSheet
                            file={pendingUpload.file}
                            uploadKind={pendingUpload.kind}
                            previewUrl={pendingUpload.previewUrl}
                            queueRemaining={uploadQueueCount}
                            isSaving={isSavingMeta}
                            categorySuggestions={customCategories}
                            onAddCategory={addVaultCategory}
                            onConfirm={(meta) => void confirmPendingUpload(meta)}
                            onCancel={cancelPendingUpload}
                        />
                    )}

                    {editDoc && (
                        <VaultDocEditSheet
                            doc={editDoc}
                            isSaving={isSavingEdit}
                            categorySuggestions={customCategories}
                            onAddCategory={addVaultCategory}
                            onSave={(values) => void saveDocEdit(values)}
                            onClose={closeEditDoc}
                        />
                    )}

                    {fileViewer && (
                        <VaultDocViewer
                            doc={fileViewer.doc}
                            fileUrl={fileViewer.url}
                            kind={fileViewer.kind}
                            onClose={closeFileViewer}
                        />
                    )}
                    </VaultModalRootContext.Provider>
                </motion.div>

            </motion.div>
        </AnimatePresence>,
        document.body
    );
};
