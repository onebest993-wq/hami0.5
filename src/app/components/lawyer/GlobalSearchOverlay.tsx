import React from 'react';
import { motion } from 'motion/react';
import { Search, X, FileText, User, Scale, Clock, ChevronLeft, ArrowUpLeft, StickyNote, Paperclip } from 'lucide-react';
import { useGlobalSearch } from '@/app/components/lawyer/GlobalSearchOverlay/useGlobalSearch';

interface GlobalSearchOverlayProps {
    onClose: () => void;
    onNavigateToCase: (caseId: string) => void;
}

export const GlobalSearchOverlay = ({ onClose, onNavigateToCase }: GlobalSearchOverlayProps) => {
    const {
        query,
        setQuery,
        results,
        recentSearches,
        handleResultClick,
        clearRecent
    } = useGlobalSearch(onClose, onNavigateToCase);

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed inset-0 z-[100] bg-[#050C17]/95 backdrop-blur-xl flex flex-col"
        >
            {/* Header: Search Bar */}
            <div className="h-24 px-6 flex items-center gap-4 border-b border-white/10 bg-[#0A192F]/50">
                <Search className="text-[#E6C673]" size={28} />
                <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="ابحث عن موكل، رقم دعوى، ملاحظة، أو مستند..."
                    className="flex-1 bg-transparent text-2xl font-bold text-white placeholder-white/20 outline-none border-none h-full"
                />
                <button type="button"
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Body: Results or Recent */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-6 max-w-5xl mx-auto w-full">

                {/* Empty State: Recent Searches */}
                {!query && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-bold text-white/40 flex items-center gap-2">
                                <Clock size={16} />
                                <span>آخر عمليات البحث</span>
                            </h3>
                            {recentSearches.length > 0 && (
                                <button type="button" onClick={clearRecent} className="text-xs text-[#E6C673] hover:underline">مسح الكل</button>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {recentSearches.length > 0 ? recentSearches.map((s, idx) => (
                                <button type="button"
                                    key={idx}
                                    onClick={() => setQuery(s)}
                                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:border-[#E6C673]/30 text-white hover:text-[#E6C673] transition-all flex items-center gap-2 group"
                                >
                                    <span>{s}</span>
                                    <ArrowUpLeft size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            )) : (
                                <p className="text-white/20 text-sm">لا يوجد سجل بحث سابق.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Results View */}
                {query && results && (
                    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-2">

                        {!results.hasResults ? (
                            <div className="text-center py-20">
                                <Search size={48} className="mx-auto text-white/10 mb-4" />
                                <p className="text-white/30">لا توجد نتائج مطابقة لـ "{query}"</p>
                            </div>
                        ) : (
                            <>
                                {/* 1. Cases */}
                                {results.cases.length > 0 && (
                                    <section>
                                        <h3 className="text-[#E6C673] font-bold text-sm mb-4 flex items-center gap-2">
                                            <Scale size={18} />
                                            <span>الدعاوى والمعاملات</span>
                                            <span className="text-xs bg-[#E6C673]/20 px-2 py-0.5 rounded-full text-[#E6C673]">{results.cases.length}</span>
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {results.cases.map(c => (
                                                <button type="button"
                                                    key={c.id}
                                                    onClick={() => handleResultClick(c.id, c.title)}
                                                    className="flex items-start gap-4 p-4 rounded-xl bg-[#0A192F] border border-white/5 hover:border-[#E6C673]/50 transition-all text-right group"
                                                >
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.type === 'lawsuit' ? 'bg-blue-500/10 text-blue-500' :
                                                            c.type === 'execution' ? 'bg-red-500/10 text-red-500' : 'bg-purple-500/10 text-purple-500'
                                                        }`}>
                                                        <Scale size={20} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-white group-hover:text-[#E6C673] transition-colors">{c.title}</h4>
                                                        <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
                                                            <span>{c.caseNo}</span>
                                                            <span>•</span>
                                                            <span>{c.court}</span>
                                                        </div>
                                                    </div>
                                                    <ChevronLeft className="text-white/20 group-hover:text-[#E6C673] group-hover:-translate-x-1 transition-all" />
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* 2. Clients / Parties */}
                                {results.clients.length > 0 && (
                                    <section>
                                        <h3 className="text-blue-400 font-bold text-sm mb-4 flex items-center gap-2">
                                            <User size={18} />
                                            <span>الموكلون والخصوم</span>
                                            <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded-full text-blue-400">{results.clients.length}</span>
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {results.clients.map((c, idx) => (
                                                <button type="button"
                                                    key={`${c.caseId}-party-${idx}`}
                                                    onClick={() => handleResultClick(c.caseId, c.name)}
                                                    className="flex items-center gap-3 p-3 rounded-xl bg-[#0A192F] border border-white/5 hover:border-blue-500/50 transition-all text-right group"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50">
                                                        <User size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white group-hover:text-blue-400">{c.name}</p>
                                                        <p className="text-[10px] text-white/40">{c.role} في: {c.caseTitle}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* 3. Notes */}
                                {results.notes.length > 0 && (
                                    <section>
                                        <h3 className="text-green-400 font-bold text-sm mb-4 flex items-center gap-2">
                                            <StickyNote size={18} />
                                            <span>الملاحظات</span>
                                            <span className="text-xs bg-green-500/20 px-2 py-0.5 rounded-full text-green-400">{results.notes.length}</span>
                                        </h3>
                                        <div className="space-y-2">
                                            {results.notes.map((n, idx) => (
                                                <button type="button"
                                                    key={`${n.caseId}-note-${idx}`}
                                                    onClick={() => handleResultClick(n.caseId, n.content.substring(0, 20))}
                                                    className="w-full flex items-start gap-3 p-3 rounded-xl bg-[#0A192F] border border-white/5 hover:border-green-500/50 transition-all text-right group"
                                                >
                                                    <StickyNote size={16} className="text-green-500/50 mt-1" />
                                                    <div className="flex-1">
                                                        <p className="text-sm text-white/80 line-clamp-2">{n.content}</p>
                                                        <p className="text-[10px] text-white/40 mt-1">ملاحظة في: {n.caseTitle}</p>
                                                    </div>
                                                    <ChevronLeft className="text-white/20 group-hover:text-green-400 opacity-0 group-hover:opacity-100 transition-all" />
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* 4. Documents */}
                                {results.docs.length > 0 && (
                                    <section>
                                        <h3 className="text-purple-400 font-bold text-sm mb-4 flex items-center gap-2">
                                            <Paperclip size={18} />
                                            <span>المستندات</span>
                                            <span className="text-xs bg-purple-500/20 px-2 py-0.5 rounded-full text-purple-400">{results.docs.length}</span>
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {results.docs.map((d, idx) => (
                                                <button type="button"
                                                    key={`${d.caseId}-doc-${idx}`}
                                                    onClick={() => handleResultClick(d.caseId, d.name)}
                                                    className="flex items-center gap-3 p-3 rounded-xl bg-[#0A192F] border border-white/5 hover:border-purple-500/50 transition-all text-right group"
                                                >
                                                    <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-500">
                                                        <FileText size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white group-hover:text-purple-400">{d.name}</p>
                                                        <p className="text-[10px] text-white/40">مستند في: {d.caseTitle}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};
