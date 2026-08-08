import React from 'react';
import { Trash2, RotateCcw, X } from '@/app/components/ui/lucideIcons';

interface TrashEvent {
    id: string;
    title: string;
    isDeleted?: boolean;
}

interface LocalTrashViewProps {
    events: TrashEvent[];
    onRestore: (id: string) => void;
    onHardDelete: (id: string) => void;
    onEmptyTrash: () => void;
}

export const LocalTrashView = ({ events, onRestore, onHardDelete, onEmptyTrash }: LocalTrashViewProps) => {
    const deletedEvents = events.filter((e: TrashEvent) => e.isDeleted);

    if (deletedEvents.length === 0) return <div className="text-center py-12 text-white/20">سلة المهملات فارغة</div>;

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center mb-4" dir="rtl">
                <h3 className="text-white text-xs font-bold">العناصر المحذوفة ({deletedEvents.length})</h3>
                <button type="button" onClick={onEmptyTrash} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                    إفراغ السلة
                    <Trash2 size={12} />
                </button>
             </div>
             {deletedEvents.map((e: TrashEvent) => (
                 <div key={e.id} className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 flex justify-between items-center">
                     <div>
                         <p className="text-white text-xs font-bold">{e.title}</p>
                         <p className="text-[10px] text-white/40">حذف مؤخراً</p>
                     </div>
                     <div className="flex gap-2">
                         <button type="button" onClick={() => onRestore(e.id)} className="text-green-400 hover:text-green-300"><RotateCcw size={14}/></button>
                         <button type="button" onClick={() => onHardDelete(e.id)} className="text-red-400 hover:text-red-300"><X size={14}/></button>
                     </div>
                 </div>
             ))}
        </div>
    );
};
