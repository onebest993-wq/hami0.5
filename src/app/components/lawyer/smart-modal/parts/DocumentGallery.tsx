import React, { useState } from 'react';
import { Paperclip, FileText } from '@/app/components/ui/lucideIcons';
import type { TimelineEvent, DocumentCategory } from '../../LawyerShared';

export const DocumentGallery = ({ documents }: { documents: TimelineEvent[] }) => {
    const [filter, setFilter] = useState<'all' | DocumentCategory>('all');
    
    const filteredDocs = filter === 'all' 
        ? documents 
        : documents.filter(d => d.docCategory === filter);

    if (documents.length === 0) return null;

    const FILTERS: { id: 'all' | DocumentCategory, label: string, color: string }[] = [
        { id: 'all', label: 'الكل', color: 'gray' },
        { id: 'agency', label: 'وكالات', color: 'yellow' },
        { id: 'regulations', label: 'لوائح ومحاضر', color: 'blue' },
        { id: 'identity', label: 'مستمسكات وهويات', color: 'green' },
        { id: 'evidence', label: 'أدلة وسندات', color: 'red' },
        { id: 'decision', label: 'قرارات أحكام', color: 'purple' },
    ];

    const getBadgeColor = (cat?: DocumentCategory) => {
        switch(cat) {
            case 'agency': return 'bg-yellow-500 text-black';
            case 'regulations': return 'bg-blue-500 text-white';
            case 'identity': return 'bg-green-500 text-white';
            case 'evidence': return 'bg-red-500 text-white';
            case 'decision': return 'bg-purple-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };

    return (
        <div className="bg-[#1A1E2E] rounded-xl border border-white/5 p-4 mb-4">
            <h3 className="text-white text-xs font-bold flex items-center gap-2 mb-3" dir="rtl">
                معرض المستندات الذكي
                <Paperclip size={14} className="text-purple-400" />
            </h3>
            
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar mask-gradient-right">
                {FILTERS.map(f => (
                    <button type="button"
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${filter === f.id ? `bg-${f.color}-500/20 border-${f.color}-500 text-${f.color}-400` : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                        style={filter === f.id ? { borderColor: f.color === 'gray' ? '#fff' : undefined, color: f.color === 'gray' ? '#fff' : undefined, background: f.color === 'gray' ? 'rgba(255,255,255,0.1)' : undefined } : {}}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredDocs.length > 0 ? filteredDocs.map(doc => (
                    <div key={doc.id} className="group relative aspect-square bg-black/20 rounded-lg border border-white/10 overflow-hidden hover:border-[#E6C673]/50 transition-colors cursor-pointer">
                        <div className="absolute inset-0 flex items-center justify-center text-white/20">
                            <FileText size={24} />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-2 flex flex-col justify-end">
                            <p className="text-[10px] font-bold text-white truncate">{doc.title}</p>
                            <span className="text-[9px] text-white/50">{doc.date}</span>
                        </div>
                        {doc.docCategory && (
                            <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-bold shadow-sm ${getBadgeColor(doc.docCategory)}`}>
                                {FILTERS.find(f => f.id === doc.docCategory)?.label}
                            </div>
                        )}
                    </div>
                )) : (
                    <div className="col-span-full text-center py-8 text-white/20 text-xs">
                        لا توجد مستندات في هذا التصنيف
                    </div>
                )}
            </div>
        </div>
    );
};
