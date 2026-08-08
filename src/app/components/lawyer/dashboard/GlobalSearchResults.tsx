import React from 'react';
import { motion } from 'motion/react';
import { X, Sparkles, Scale, FileText, Hammer, Notebook, Phone, Book, Search } from '@/app/components/ui/lucideIcons';
import { HighlightedText } from '../LawyerShared';

const getResultIcon = (item: any, matches: any[]) => {
    // Priority 1: Phone Match
    if (matches?.some((m: any) => m.key === '_phoneNumbers')) return { icon: Phone, color: '#10B981', label: 'هاتف' };
    
    // Priority 2: Note Match
    if (matches?.some((m: any) => m.key === '_notesText')) return { icon: Book, color: '#F59E0B', label: 'ملاحظة' };

    // Priority 3: File Type
    if (item.type === 'lawsuit') return { icon: Scale, color: '#E6C673', label: 'دعوى' };
    if (item.type === 'transaction') return { icon: FileText, color: '#38BDF8', label: 'معاملة' };
    if (item.type === 'execution') return { icon: Hammer, color: '#EF4444', label: 'تنفيذ' };
    
    return { icon: FileText, color: '#9CA3AF', label: 'ملف' };
};

export const GlobalSearchResults = ({ results, ragResults, isRagSearching, query, onSelect, onClose }: any) => {
    if (!query && results.length === 0 && !isRagSearching && (!ragResults || ragResults.length === 0)) return null;

    // GROUP RESULTS
    const groups = {
        lawsuit: results.filter((r:any) => r.item.type === 'lawsuit' && r.item.itemType !== 'note'),
        transaction: results.filter((r:any) => r.item.type === 'transaction' && r.item.itemType !== 'note'),
        execution: results.filter((r:any) => r.item.type === 'execution' && r.item.itemType !== 'note'),
        note: results.filter((r:any) => r.item.itemType === 'note')
    };

    const hasResults = results.length > 0 || (ragResults && ragResults.length > 0);

    return (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex justify-center pt-24 items-start animate-in fade-in duration-200" onClick={onClose}>
            <motion.div 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-2xl bg-[#1A1E2E] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Clean Header */}
                <div className="p-4 border-b border-white/10 bg-[#0B1021] flex justify-between items-center">
                    <span className="text-white/50 text-xs font-bold uppercase tracking-wider">نتائج البحث الفوري</span>
                    <div className="flex items-center gap-2">
                         <span className="text-[#E6C673] text-xs font-mono">{results.length + (ragResults?.length || 0)} نتيجة</span>
                         <button type="button" onClick={onClose}><X size={16} className="text-white/50 hover:text-white" /></button>
                    </div>
                </div>

                {/* Results List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* RAG / DEEP MEMORY SECTION */}
                    {(isRagSearching || (ragResults && ragResults.length > 0)) && (
                        <div className="space-y-3">
                            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400 border-b border-white/5 pb-2">
                                <Sparkles size={14} className="text-emerald-400" />
                                الذاكرة القانونية العميقة (Pinecone)
                            </h4>
                            
                            {isRagSearching ? (
                                 <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5 animate-pulse">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/20" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-emerald-500/10 rounded w-1/3" />
                                        <div className="h-3 bg-emerald-500/10 rounded w-2/3" />
                                    </div>
                                 </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {ragResults.map((item: any) => (
                                         <div key={item.id} className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 hover:bg-emerald-950/40 cursor-pointer transition-all">
                                            <p className="text-sm text-emerald-100 font-medium line-clamp-2 leading-relaxed">
                                                <HighlightedText text={item.metadata.text} query={query} className="" />
                                            </p>
                                            <div className="flex items-center gap-2 mt-2 text-[10px] text-emerald-400/60 font-mono uppercase">
                                                 <span>SCORE: {(item.score * 100).toFixed(0)}%</span>
                                                 <span>•</span>
                                                 <span>{item.metadata.source || 'Law Library'}</span>
                                            </div>
                                         </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {!hasResults && !isRagSearching ? (
                        <div className="text-center py-10 text-white/30">
                            <Search size={48} className="mx-auto mb-4 opacity-20" />
                            <p>لا توجد نتائج مطابقة لـ "{query}"</p>
                        </div>
                    ) : (
                        Object.entries(groups).map(([key, groupItems]: any) => {
                            if (groupItems.length === 0) return null;
                            
                            let sectionTitle = '';
                            let SectionIcon = FileText;
                            let sectionColor = '';

                            switch(key) {
                                case 'lawsuit': sectionTitle = 'الدعاوى القضائية'; SectionIcon = Scale; sectionColor = '#E6C673'; break;
                                case 'transaction': sectionTitle = 'المعاملات'; SectionIcon = FileText; sectionColor = '#60A5FA'; break;
                                case 'execution': sectionTitle = 'الإضابير التنفيذية'; SectionIcon = Hammer; sectionColor = '#EF4444'; break;
                                case 'note': sectionTitle = 'المفكرة والملاحظات'; SectionIcon = Notebook; sectionColor = '#A855F7'; break;
                            }

                            return (
                                <div key={key} className="space-y-3">
                                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 border-b border-white/5 pb-2">
                                        <SectionIcon size={14} style={{ color: sectionColor }} />
                                        {sectionTitle} ({groupItems.length})
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 gap-2">
                                        {groupItems.map((item: any) => {
                                            const { icon: Icon, color, label } = getResultIcon(item.item, item.matches);
                                            const data = item.item;
                                            
                                            // Determine Main Title & Subtitle based on Type
                                            let mainTitle = data.itemType === 'note' ? data.title : (
                                                data.type === 'transaction' ? (data.parties[0]?.name || 'معاملة') : 
                                                (data.parties?.find((p:any)=>p.isClient)?.name || data.parties[0]?.name)
                                            );
                                            
                                            let subTitle = data.itemType === 'note' ? 'ملاحظة شخصية' : (
                                                data.type === 'transaction' ? data.caseNo : 
                                                `${data.court} • ${data.caseNo}`
                                            );

                                            return (
                                                <div 
                                                    key={data.id} 
                                                    onClick={() => onSelect(data)}
                                                    className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-[#E6C673]/30 cursor-pointer transition-all group flex items-start gap-3"
                                                >
                                                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ backgroundColor: `${sectionColor}20`, color: sectionColor }}>
                                                        <Icon size={18} />
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="text-white font-bold truncate text-sm">
                                                                <HighlightedText text={mainTitle} query={query} className="" />
                                                            </h4>
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/20 text-white/50 font-mono">{label}</span>
                                                        </div>
                                                        <p className="text-xs text-white/50 mt-1 flex items-center gap-2">
                                                            <span className="truncate max-w-[200px]"><HighlightedText text={subTitle} query={query} className="" /></span>
                                                        </p>

                                                        {/* Context Snippet (Why did this appear?) */}
                                                        {item.matches?.some((m:any) => m.key === '_notesText' || m.key === '_searchStr') && (
                                                            <div className="mt-2 p-2 bg-[#0B1021] rounded border border-white/5 text-xs text-white/70">
                                                                <div className="flex items-center gap-1 mb-1 text-[#E6C673] opacity-70"><Search size={10} /> <span>نص مطابق:</span></div>
                                                                <div className="line-clamp-2 italic opacity-80">
                                                                    "...<HighlightedText text={item.matches.find((m:any) => m.key === '_notesText')?.value || item.matches[0]?.value} query={query} className="" />..."
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </motion.div>
        </div>
    );
};
