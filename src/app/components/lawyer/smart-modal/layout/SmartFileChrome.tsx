import type React from 'react';
import { Fragment } from 'react';
import type { CaseStage } from '../../LawyerShared';
import {
    X,
    Edit2,
    Trash2,
    Lock,
} from 'lucide-react';
import { buildChromeStageStripItems } from '../smartFile/stepperPipeline';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import { CaseFlowActionsPanel } from '../parts/CaseFlowActionsPanel';
import { ColleagueConsultationHeaderButton } from '@/app/components/lawyer/caseShare/ColleagueConsultationHeaderButton';

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
                        <ColleagueConsultationHeaderButton />
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
                            <div className="inline-flex items-stretch rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                                {stageStripItems.map((item, idx) => {
                                    const isCurrentlyViewing = item.isViewing;
                                    const isPast = item.isPast;
                                    const stageId = item.realIndex !== null ? `stg_${item.realIndex + 1}` : '';

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
                                                    className={`relative inline-flex items-center gap-1 px-2.5 py-1 rounded-[10px] text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                                                        isCurrentlyViewing
                                                            ? 'bg-gradient-to-br from-[#E6C673]/16 to-[#E6C673]/[0.06] text-[#E6C673] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                                                            : isPast
                                                              ? 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                                                              : item.postCassationRemand
                                                                ? 'text-violet-300/75 hover:text-violet-200 hover:bg-violet-500/[0.08]'
                                                                : item.isActive
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
                                                </button>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </div>
                    </div>
                </div>
            </div>
        </>
    );
}
