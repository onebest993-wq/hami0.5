import type React from 'react';
import { Fragment } from 'react';
import type { CaseStage } from '../../LawyerShared';
import {
    X,
    Check,
    Edit2,
    Trash2,
    Lock,
} from 'lucide-react';
import { buildChromeStageStripItems } from '../smartFile/stepperPipeline';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import { CaseFlowActionsPanel } from '../parts/CaseFlowActionsPanel';

export type SmartFileChromeProps = {
    onClose: () => void;
    setShowEditInfoModal: (v: boolean) => void;
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
    onInterrupt?: () => void;
    onPause?: () => void;
    onResume?: () => void;
    onAbandon?: () => void;
    onPetitionVoid?: () => void;
    flowStage?: Pick<
        CaseStage,
        | 'stageName'
        | 'isVoided'
        | 'isPleadingsClosed'
        | 'abandonmentCount'
        | 'abandonmentDate'
        | 'petitionVoidFlow'
    >;
    isPaused?: boolean;
    isInterrupted?: boolean;
    /** إخفاء «سير الدعوى» في إضبارة الانتظار بعد قفل المرافعة */
    hideCaseFlowActions?: boolean;
};
export function SmartFileChrome({
    onClose,
    setShowEditInfoModal,
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
    onInterrupt,
    onPause,
    onResume,
    onAbandon,
    onPetitionVoid,
    flowStage,
    isPaused,
    isInterrupted,
    hideCaseFlowActions = false,
}: SmartFileChromeProps) {
    const stageStripItems = buildChromeStageStripItems(stages, activeStageIndex, viewingStageIndex);

    return (
        <>
            <div className="sticky top-0 z-50 w-full shrink-0 bg-slate-950/90 border-b border-white/10 print:hidden overflow-visible">
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

                    <div className="flex items-center justify-center flex-1 gap-2">
                        <h2 className="font-bold text-lg text-white/90 tracking-wide whitespace-nowrap">
                            اضبارة الدعوى
                        </h2>
                        {!isViewingArchived && !hideCaseFlowActions && (
                            <CaseFlowActionsPanel
                                onInterrupt={onInterrupt}
                                onPause={onPause}
                                onResume={onResume}
                                onAbandon={onAbandon}
                                onPetitionVoid={onPetitionVoid}
                                flowStage={flowStage}
                                isPaused={isPaused}
                                isInterrupted={isInterrupted}
                            />
                        )}
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

            <div className="sticky top-[72px] z-40 w-full bg-[#0A0F1C]/55 backdrop-blur-xl border-b border-[#E6C673]/10 print:hidden">
                <div className="px-3 py-2">
                    <div className="flex items-center overflow-x-auto scrollbar-hide">
                        {isEditingStageName && !isViewingArchived ? (
                            <div className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md p-1 animate-in fade-in duration-200">
                                <input
                                    type="text"
                                    value={tempStageName}
                                    onChange={(e) => setTempStageName(e.target.value)}
                                    className="bg-transparent text-white border-0 rounded-lg px-2 py-1 text-xs font-bold outline-none w-28 focus:bg-white/[0.04] transition-all"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') onSaveStageName(e);
                                        if (e.key === 'Escape') setIsEditingStageName(false);
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={onSaveStageName}
                                    className="p-1 rounded-lg hover:bg-emerald-500/15 transition-all"
                                    title="حفظ"
                                >
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingStageName(false)}
                                    className="p-1 rounded-lg hover:bg-rose-500/15 transition-all"
                                    title="إلغاء"
                                >
                                    <X className="w-3.5 h-3.5 text-rose-400" />
                                </button>
                            </div>
                        ) : (
                            <div className="inline-flex items-stretch rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                                {stageStripItems.map((item, idx) => {
                                    const isCurrentlyViewing = item.isViewing;
                                    const isActive = item.isActive;
                                    const isPast = item.isPast;
                                    const stageId = item.realIndex !== null ? `stg_${item.realIndex + 1}` : '';
                                    const canRename =
                                        item.realIndex !== null
                                        && isCurrentlyViewing
                                        && isActive
                                        && !isViewingArchived;
                                    const renameBtnClass =
                                        'hidden group-hover/stageBtn:inline-flex items-center justify-center p-0.5 rounded-md text-[#E6C673]/55 hover:text-[#E6C673] hover:bg-[#E6C673]/10 transition-colors';

                                    return (
                                        <Fragment key={item.key}>
                                            {idx > 0 ? (
                                                <span
                                                    className="w-px self-stretch my-1 bg-white/[0.08] shrink-0"
                                                    aria-hidden
                                                />
                                            ) : null}
                                            {item.isPlaceholder ? (
                                                <span
                                                    className="relative inline-flex items-center gap-1 px-2.5 py-1 rounded-[10px] text-xs font-bold whitespace-nowrap shrink-0 border border-dashed border-white/15 text-white/30"
                                                    title="تُفتح بعد تسجيل الانتقال لمحكمة التمييز عبر ختام المرافعة"
                                                >
                                                    <span className="text-[9px] opacity-70">قادمة</span>
                                                    <span>{item.displayName}</span>
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => onStageSelect(stageId)}
                                                    className={`group/stageBtn relative inline-flex items-center gap-1 px-2.5 py-1 rounded-[10px] text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                                                        isCurrentlyViewing
                                                            ? 'bg-gradient-to-br from-[#E6C673]/16 to-[#E6C673]/[0.06] text-[#E6C673] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                                                            : isPast
                                                              ? 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                                                              : item.postCassationRemand
                                                                ? 'text-violet-300/75 hover:text-violet-200 hover:bg-violet-500/[0.08]'
                                                                : isActive
                                                                  ? 'text-[#E6C673]/70 hover:text-[#E6C673] hover:bg-[#E6C673]/[0.06]'
                                                                  : 'text-white/28 hover:text-white/45 hover:bg-white/[0.03]'
                                                    }`}
                                                    title={`عرض ${item.displayName}`}
                                                >
                                                    {isPast ? (
                                                        <Lock size={11} className="shrink-0 opacity-60" />
                                                    ) : null}
                                                    <span>{item.displayName}</span>
                                                    {item.postCassationRemand ? (
                                                        <span className="text-[9px] font-bold text-violet-300/80 shrink-0">
                                                            بعد النقض
                                                        </span>
                                                    ) : null}
                                                    {canRename ? (
                                                        <span
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const stage = stages[item.realIndex!];
                                                                setTempStageName(stage?.stageName ?? '');
                                                                setIsEditingStageName(true);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    const stage = stages[item.realIndex!];
                                                                    setTempStageName(stage?.stageName ?? '');
                                                                    setIsEditingStageName(true);
                                                                }
                                                            }}
                                                            className={renameBtnClass}
                                                            title="تعديل اسم المرحلة"
                                                        >
                                                            <Edit2 size={11} />
                                                        </span>
                                                    ) : null}
                                                </button>
                                            )}
                                        </Fragment>
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
