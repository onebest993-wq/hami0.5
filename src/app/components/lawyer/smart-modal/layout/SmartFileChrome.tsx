import type React from 'react';
import type { CaseStage } from '../../LawyerShared';
import { printDossier } from '../smartFile/printDossier';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import {
    X,
    Check,
    Edit2,
    Printer,
    Share2,
    Trash2,
    Lock,
    ChevronLeft,
} from 'lucide-react';

export type SmartFileChromeProps = {
    onClose: () => void;
    setShowEditInfoModal: (v: boolean) => void;
    showExportMenu: boolean;
    setShowExportMenu: (v: boolean) => void;
    onShare: () => void;
    isTrashOpen: boolean;
    setIsTrashOpen: (v: boolean) => void;
    isEditingStageName: boolean;
    setIsEditingStageName: (v: boolean) => void;
    tempStageName: string;
    setTempStageName: (v: string) => void;
    onSaveStageName: (e: React.MouseEvent | React.KeyboardEvent) => void;
    stages: CaseStage[];
    viewingStageIndex: number;
    activeStageIndex: number;
    isViewingArchived: boolean;
    onStageSelect: (stageId: string) => void;
};

export function SmartFileChrome({
    onClose,
    setShowEditInfoModal,
    showExportMenu,
    setShowExportMenu,
    onShare,
    isTrashOpen,
    setIsTrashOpen,
    isEditingStageName,
    setIsEditingStageName,
    tempStageName,
    setTempStageName,
    onSaveStageName,
    stages,
    viewingStageIndex,
    activeStageIndex,
    isViewingArchived,
    onStageSelect,
}: SmartFileChromeProps) {
    return (
        <>
            <div className="sticky top-0 z-50 w-full bg-slate-950/90 border-b border-white/10 print:hidden overflow-visible">
                <div className="flex items-center justify-between px-3 py-3.5 overflow-visible">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.dossierBack}
                            onClick={onClose}
                            className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all"
                            aria-label="إغلاق"
                        >
                            <X size={18} />
                            <span className="text-sm font-semibold">رجوع</span>
                        </button>
                    </div>

                    <div className="flex items-center justify-center flex-1">
                        <h2 className="font-bold text-lg text-white/90 tracking-wide whitespace-nowrap ml-2">
                            اضبارة الدعوى
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowEditInfoModal(true)}
                            className="p-2 rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all hover:text-[#E6C673] hover:bg-[#E6C673]/10"
                            title="تعديل بيانات الدعوى"
                        >
                            <Edit2 size={20} />
                        </button>

                        <div className="relative" style={{ overflow: 'visible' }}>
                            <button
                                type="button"
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className="p-2 rounded-full bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all hover:bg-indigo-500/20 hover:text-indigo-400"
                                title="تصدير ومشاركة"
                            >
                                <Share2 size={20} />
                            </button>

                            {showExportMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-[60]"
                                        onClick={() => setShowExportMenu(false)}
                                    />
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#0f172a] border border-slate-700 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[9999] overflow-visible animate-in fade-in zoom-in-95 duration-200">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                printDossier();
                                                setShowExportMenu(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors rounded-t-lg"
                                        >
                                            <Printer size={16} className="text-indigo-400" />
                                            <span>طباعة / PDF</span>
                                        </button>
                                        <div className="h-px bg-slate-700/50" />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onShare();
                                                setShowExportMenu(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors rounded-b-lg"
                                        >
                                            <Share2 size={16} className="text-blue-400" />
                                            <span>مشاركة عبر...</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsTrashOpen(!isTrashOpen)}
                            className={`p-2 rounded-full transition-all ${
                                isTrashOpen
                                    ? 'bg-rose-500/20 text-rose-400 shadow-lg shadow-rose-500/20'
                                    : 'text-slate-400/70 hover:text-rose-400 hover:bg-rose-500/10'
                            }`}
                            title="سلة المهملات"
                            aria-label="سلة المهملات"
                        >
                            <Trash2 size={20} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="sticky top-[72px] z-40 w-full bg-[#0F121E] border-b border-white/5 print:hidden">
                <div className="px-3 py-2.5">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                        {isEditingStageName && !isViewingArchived ? (
                            <div className="flex items-center gap-2 animate-in fade-in duration-200">
                                <input
                                    type="text"
                                    value={tempStageName}
                                    onChange={(e) => setTempStageName(e.target.value)}
                                    className="bg-indigo-950 text-indigo-200 border border-indigo-500 rounded px-2 py-0.5 text-sm outline-none w-32 focus:ring-1 focus:ring-indigo-400"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') onSaveStageName(e);
                                        if (e.key === 'Escape') setIsEditingStageName(false);
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={onSaveStageName}
                                    className="p-1 hover:bg-green-500/20 rounded-full transition-all group"
                                    title="حفظ"
                                >
                                    <Check className="w-4 h-4 text-green-400 group-hover:scale-110 transition-transform" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingStageName(false)}
                                    className="p-1 hover:bg-rose-500/20 rounded-full transition-all group"
                                    title="إلغاء"
                                >
                                    <X className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                {stages.map((stage, idx) => {
                                    const isCurrentlyViewing = idx === viewingStageIndex;
                                    const isActive = idx === activeStageIndex;
                                    const isPast =
                                        stage.status === 'completed' || stage.status === 'locked';
                                    const stageId = `stg_${idx + 1}`;

                                    return (
                                        <div
                                            key={`${String(stage.id ?? 'stage')}-${idx}`}
                                            className="flex items-center gap-2 shrink-0"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => onStageSelect(stageId)}
                                                className={`group/stageBtn px-3 py-1.5 rounded-lg flex items-center gap-2 border transition-all cursor-pointer shrink-0 ${
                                                    isCurrentlyViewing
                                                        ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20'
                                                        : isPast
                                                          ? 'bg-transparent text-slate-400 border-slate-700 hover:bg-slate-800/50 hover:border-slate-600'
                                                          : isActive
                                                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20'
                                                            : 'bg-transparent text-slate-500 border-slate-800 opacity-50'
                                                }`}
                                                title={`عرض ${stage.stageName}`}
                                            >
                                                {isPast && <Lock size={12} />}
                                                <span className="text-sm font-bold whitespace-nowrap">
                                                    {stage.stageName}
                                                </span>

                                                {isCurrentlyViewing &&
                                                    isActive &&
                                                    !isViewingArchived && (
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setTempStageName(stage.stageName ?? '');
                                                                setIsEditingStageName(true);
                                                            }}
                                                            className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-all opacity-0 group-hover/stageBtn:opacity-100"
                                                            title="تعديل اسم المرحلة"
                                                        >
                                                            <Edit2 size={12} />
                                                        </div>
                                                    )}
                                            </button>

                                            {idx < stages.length - 1 && (
                                                <ChevronLeft
                                                    size={16}
                                                    className="text-slate-600 shrink-0"
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
