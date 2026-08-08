import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
    X, Upload, FileText, Search, Grid3X3, List,
    ChevronLeft, Loader2, Sparkles, 
} from '@/app/components/ui/lucideIcons';
import {
    useSmartVault,
    type FilterTag, type ViewMode, type DropdownAction,
    FILTERS, formatFileSize, formatDate,
} from './hooks/useSmartVault';
import { SmartFileCard } from './SmartVaultModal/SmartFileCard';
import { AISummarySheet } from './SmartVaultModal/AISummarySheet';
import { FilterChips } from './SmartVaultModal/FilterChips';

interface SmartVaultModalProps {
    onClose: () => void;
    currentUserId?: string;
}

export const SmartVaultModal: React.FC<SmartVaultModalProps> = ({ onClose, currentUserId }) => {
    const {
        isLoading, searchQuery, isSearching, activeSummaryDoc,
        activeFilter, viewMode, openDropdownId, isUploading, currentUserId: uid,
        fileInputRef, searchInputRef, mounted, filteredDocs,
        setSearchQuery, setActiveFilter, setViewMode, setOpenDropdownId, setActiveSummaryDoc,
        handleUpload, handleViewFile, handleAISearch, handleSearchSubmit, handleDropdownAction,
    } = useSmartVault(onClose, currentUserId);

    const isOwner = (doc: { authorId: string }) => doc.authorId === uid;
    const totalCount = filteredDocs.length + (activeFilter === 'الكل' ? 0 : 0);
    const filteredCount = filteredDocs.length;

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[99999] flex items-start justify-center bg-black/60 backdrop-blur-sm overflow-hidden"
                dir="rtl"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="w-full max-w-4xl h-full mx-auto flex flex-col"
                >
                    <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
                                <ChevronLeft size={20} className="text-white/60" />
                            </button>
                            <h2 className="text-white font-bold text-base">المخزن الذكي</h2>
                            <span className="bg-amber-500/10 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-amber-500/20">
                                {totalCount} ملف
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button type="button"
                                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                {viewMode === 'grid' ? <List size={16} className="text-white/50" /> : <Grid3X3 size={16} className="text-white/50" />}
                            </button>
                            <button type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-bold hover:bg-[#D4AF37]/30 transition-all disabled:opacity-50"
                            >
                                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                {isUploading ? 'جاري الرفع...' : 'رفع ملف'}
                            </button>
                            <input ref={fileInputRef} type="file" multiple hidden onChange={handleUpload} accept=".pdf,.jpg,.jpeg,.png,.docx,.doc" />
                        </div>
                    </div>

                    <div className="shrink-0 px-5 py-3 border-b border-white/5 flex flex-col gap-2">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                            <Search size={16} className="text-white/30 shrink-0" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchSubmit}
                                placeholder="ابحث في الملفات... (بحث ذكي بالذكاء الاصطناعي)"
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
                        <FilterChips activeFilter={activeFilter} onChange={setActiveFilter} totalCount={totalCount} filteredCount={filteredCount} />
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
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
                                    <button type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="mt-2 px-4 py-2 bg-[#D4AF37]/20 border border-[#D4AF37]/30 rounded-xl text-[#D4AF37] text-xs font-bold flex items-center gap-1.5"
                                    >
                                        <Upload size={14} />
                                        رفع أول ملف
                                    </button>
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
                                        isOwner={isOwner(doc)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>

                <AnimatePresence>
                    {activeSummaryDoc && (
                        <AISummarySheet doc={activeSummaryDoc} onClose={() => setActiveSummaryDoc(null)} />
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
};
