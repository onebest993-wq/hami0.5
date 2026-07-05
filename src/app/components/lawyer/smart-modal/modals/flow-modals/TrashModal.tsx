import React, { useState } from 'react';
import {
    AlertTriangle,
    Check,
    Gavel,
    Lock,
    PauseCircle,
    RotateCcw,
    Trash2,
    X,
} from 'lucide-react';
import type { AffiliationSide, Party, ThirdPartyEntryMode } from '../../../LawyerShared';
import { TimelineEvent } from '../../../LawyerShared';
import {
    affiliationSideLabel,
    groupPartiesBySide,
} from '../../smartFile/incidentalCaseLinking';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    GLASS_BTN,
    GLASS_CHIP,
    GLASS_CHIP_ACTIVE,
    GLASS_CLOSE,
    GLASS_FIELD,
    GLASS_MODAL_HEADER,
    GLASS_MODAL_OVERLAY,
    GLASS_MODAL_SHELL,
    GLASS_SELECT,
    MoroccanCloseButton,
    MoroccanGlassShell,
    MoroccanHeaderDivider,
} from '../../smartFile/moroccanGlassShell';

export const TrashModal = ({ isOpen, onClose, deletedItems, onRestore, onPermanentDelete, onEmptyTrash }: { 
    isOpen: boolean; 
    onClose: () => void; 
    deletedItems: TimelineEvent[]; 
    onRestore: (id: string) => void; 
    onPermanentDelete: (id: string) => void;
    onEmptyTrash: () => void;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-red-500/20 border-b border-red-500/30 p-4 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2 text-white">
                        <Trash2 size={18} className="text-red-400" /> 
                        سلة المهملات (المحذوفات)
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-white/10 rounded-full p-1 text-white/60 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto scrollbar-hide max-h-[60vh]">
                    {deletedItems.length === 0 ? (
                        <div className="text-center py-12">
                            <Trash2 size={48} className="mx-auto text-white/20 mb-3" />
                            <p className="text-white/40 text-sm">سلة المهملات فارغة</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {deletedItems.map(item => (
                                <div 
                                    key={item.id} 
                                    className="bg-[#0F172A] opacity-70 border border-white/5 rounded-xl p-4 hover:opacity-100 transition-opacity"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs text-white/40">{item.date}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded ${
                                                    item.type === 'appointment' ? 'bg-blue-500/20 text-blue-400' :
                                                    item.type === 'document' ? 'bg-purple-500/20 text-purple-400' :
                                                    item.type === 'note' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-green-500/20 text-green-400'
                                                }`}>
                                                    {item.type === 'appointment' ? 'موعد' :
                                                     item.type === 'document' ? 'مستند' :
                                                     item.type === 'note' ? 'ملاحظة' : 'قرار'}
                                                </span>
                                            </div>
                                            <h4 className="text-white font-bold text-sm mb-1">{item.title}</h4>
                                            {item.details && <p className="text-white/60 text-xs">{item.details}</p>}
                                        </div>

                                        <div className="flex gap-2">
                                            <button type="button"
                                                onClick={() => onRestore(item.id)}
                                                className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
                                                title="استعادة"
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                            <button type="button"
                                                onClick={() => onPermanentDelete(item.id)}
                                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                                title="حذف نهائي"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {deletedItems.length > 0 && (
                    <div className="border-t border-white/5 p-4">
                        <button type="button"
                            onClick={onEmptyTrash}
                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 py-3 rounded-lg font-bold text-sm transition-all border border-red-500/20"
                        >
                            إفراغ سلة المهملات (حذف نهائي للكل)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


