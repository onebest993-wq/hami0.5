import React from 'react';
import { FileText, FileImage, Loader2, MoreVertical, Edit3, Link2, Trash2, ExternalLink, Cpu } from 'lucide-react';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';
import type { ViewMode, DropdownAction } from '@/app/components/lawyer/hooks/useSmartVault';
import { formatFileSize, formatDate } from '@/app/components/lawyer/hooks/useSmartVault';

interface SmartFileCardProps {
    doc: SmartVaultDoc;
    viewMode: ViewMode;
    openDropdownId: string | null;
    setOpenDropdownId: React.Dispatch<React.SetStateAction<string | null>>;
    onView: (doc: SmartVaultDoc) => void;
    onAction: (doc: SmartVaultDoc, action: DropdownAction) => void;
    isOwner: boolean;
}

const tagColor = (tag: string) => {
    if (/عقد/.test(tag)) return 'bg-blue-500/20 text-blue-300';
    if (/طابو|تمليك/.test(tag)) return 'bg-emerald-500/20 text-emerald-300';
    if (/عريضة/.test(tag)) return 'bg-purple-500/20 text-purple-300';
    if (/بحث/.test(tag)) return 'bg-cyan-500/20 text-cyan-300';
    if (/قرار|حكم/.test(tag)) return 'bg-rose-500/20 text-rose-300';
    return 'bg-slate-500/20 text-slate-300';
};

export const SmartFileCard: React.FC<SmartFileCardProps> = ({
    doc, viewMode, openDropdownId, setOpenDropdownId, onView, onAction, isOwner,
}) => {
    const isGrid = viewMode === 'grid';
    const isImage = doc.type === 'image' || doc.mimeType?.startsWith('image/');

    return (
        <div
            className={`group cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                isGrid
                    ? 'bg-[#0F172A]/60 backdrop-blur-[30px] border border-[#D4AF37]/30 rounded-2xl p-3 flex flex-col gap-2 shadow-xl relative overflow-hidden'
                    : 'bg-[#0F172A]/60 backdrop-blur-[30px] border border-[#D4AF37]/30 rounded-xl p-3 flex items-center gap-3 shadow-lg relative overflow-hidden'
            }`}
            onClick={() => onView(doc)}
        >
            {isGrid && <div className="absolute -top-8 -right-8 w-16 h-16 rounded-full blur-[40px] opacity-15 bg-amber-500" />}

            <div className="absolute top-2 left-2 z-20">
                <button type="button"
                    onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === doc.id ? null : doc.id); }}
                    className="p-1.5 rounded-lg bg-black/20 hover:bg-black/40 transition-colors opacity-0 group-hover:opacity-100"
                >
                    <MoreVertical size={14} className="text-white/70" />
                </button>
                {openDropdownId === doc.id && (
                    <div className="absolute left-0 top-full mt-1 w-36 bg-slate-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-30" onClick={(e) => e.stopPropagation()}>
                        {[
                            { action: 'edit' as const, icon: Edit3, label: 'تعديل' },
                            { action: 'link' as const, icon: Link2, label: 'ربط بإضبارة' },
                            ...(isOwner ? [{ action: 'delete' as const, icon: Trash2, label: 'حذف' }] : []),
                        ].map(({ action, icon: Icon, label }) => (
                            <button type="button"
                                key={action}
                                onClick={() => onAction(doc, action)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:bg-white/5 transition-colors"
                            >
                                <Icon size={12} className="text-white/50" />
                                {label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {!isGrid ? (
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                        {isImage ? <FileImage size={16} className="text-amber-300" /> : <FileText size={16} className="text-amber-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm truncate">{doc.title}</h3>
                        <p className="text-white/40 text-[10px]">{formatDate(doc.createdAt)} — {formatFileSize(doc.fileSize || 0)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {doc.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${tagColor(tag)}`}>{tag}</span>
                        ))}
                    </div>
                    <ExternalLink size={14} className="text-white/20 shrink-0" />
                </div>
            ) : (
                <>
                    <div className="w-full h-28 rounded-xl overflow-hidden bg-slate-800/50 flex items-center justify-center relative">
                        {isImage ? (
                            doc.signedUrl ? (
                                <img src={doc.signedUrl} alt={doc.title} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                                <div className="flex flex-col items-center gap-1">
                                    <FileImage size={28} className="text-white/20" />
                                    <span className="text-white/20 text-[9px]">معاينة غير متاحة</span>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center gap-1">
                                <FileText size={28} className="text-white/20" />
                                <span className="text-white/20 text-[9px]">PDF</span>
                            </div>
                        )}
                        {doc.isProcessing && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                                <div className="flex flex-col items-center gap-1">
                                    <Loader2 size={20} className="text-amber-400 animate-spin" />
                                    <span className="text-amber-400/80 text-[9px]">جارِ المعالجة...</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-white font-semibold text-sm leading-tight line-clamp-1">{doc.title}</h3>
                        <p className="text-white/40 text-[10px]">{formatDate(doc.createdAt)} — {formatFileSize(doc.fileSize || 0)}</p>
                        <div className="flex flex-wrap gap-1">
                            {doc.tags.map((tag) => (
                                <span key={tag} className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${tagColor(tag)}`}>{tag}</span>
                            ))}
                        </div>
                    </div>
                    {doc.aiSummary && (
                        <div className="bg-amber-500/5 border border-purple-500/20 rounded-lg p-2">
                            <div className="flex items-center gap-1 mb-0.5">
                                <Cpu size={10} className="text-purple-400" />
                                <span className="text-purple-400 text-[9px] font-medium">ملخص ذكي</span>
                            </div>
                            <p className="text-white/60 text-[10px] leading-relaxed line-clamp-2">{doc.aiSummary}</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
