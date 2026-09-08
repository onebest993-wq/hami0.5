import type React from 'react';
import { Fragment } from 'react';
import type { CaseStage } from '../../LawyerShared';
import { Edit2 } from '@/app/components/ui/icons/Edit2';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { Lock } from '@/app/components/ui/icons/Lock';
import { buildChromeStageStripItems } from '../smartFile/stepperPipeline';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import { CaseFlowActionsPanel } from '../parts/CaseFlowActionsPanel';
import { ColleagueConsultationHeaderButton } from '@/app/components/lawyer/caseShare/ColleagueConsultationHeaderButton';
import { DossierHeaderNavButtons } from '@/app/components/lawyer/dashboard/DossierHeaderNavButtons';
import { resolveDossierHeaderNavVisibility } from '@/app/components/lawyer/dashboard/resolveDossierHeaderNavVisibility';
import {
    SMART_FILE_FOOTER_CHIP,
    SMART_FILE_FOOTER_CHIP_ACCENT,
} from './mainPanel/smartFileFooterChip';

/* Mobile Safe-Area tokens (read-only, ZVF no visual layout change) */
const SAFE_AREA_INSET_TOP = 'env(safe-area-inset-top)';
const SAFE_AREA_INSET_RIGHT = 'env(safe-area-inset-right)';
const SAFE_AREA_INSET_BOTTOM = 'env(safe-area-inset-bottom)';
const SAFE_AREA_INSET_LEFT = 'env(safe-area-inset-left)';

/** شريحة طعن بجانب شريط المراحل — نفس هوية التذييل بلا w-full */
const CHROME_CHALLENGE_CHIP = `${SMART_FILE_FOOTER_CHIP} !w-auto shrink-0 whitespace-nowrap px-2.5`;
const CHROME_CHALLENGE_CHIP_ACCENT = `${SMART_FILE_FOOTER_CHIP_ACCENT} !w-auto shrink-0 whitespace-nowrap px-2.5`;

export type SmartFileChromeProps = {
    onClose: () => void;
    onDossierBack?: () => void;
    onDossierExit?: () => void;
    dossierNestedNav?: boolean;
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
    pauseLabel?: string;
    pauseConfirmTitle?: string;
    pauseConfirmMessage?: string;
    pauseTestId?: string;
    /** إخفاء «سير الدعوى» في إضبارة الانتظار بعد قفل المرافعة */
    hideCaseFlowActions?: boolean;
    /** طعن متبقٍ بعد hop — شريط المراحل العلوي */
    showRemainingOpponentChallenge?: boolean;
    remainingOpponentChallengeLabel?: string;
    onRemainingOpponentChallenge?: () => void;
    showIndependentClientChallenge?: boolean;
    onIndependentClientChallenge?: () => void;
    /** تعدد مستحقين — أزرار مسمّاة من محرك القرار */
    namedChallengeActions?: Array<{
        challengerId: string;
        challengerName: string;
        label: string;
    }>;
    onNamedChallengeAction?: (challengerId: string) => void;
};
export function SmartFileChrome({
    onClose,
    onDossierBack,
    onDossierExit,
    dossierNestedNav = false,
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
    pauseLabel,
    pauseConfirmTitle,
    pauseConfirmMessage,
    pauseTestId,
    hideCaseFlowActions = false,
    showRemainingOpponentChallenge = false,
    remainingOpponentChallengeLabel = 'قام الخصم بالطعن',
    onRemainingOpponentChallenge,
    showIndependentClientChallenge = false,
    onIndependentClientChallenge,
    namedChallengeActions = [],
    onNamedChallengeAction,
}: SmartFileChromeProps) {
    const stageStripItems = buildChromeStageStripItems(stages, activeStageIndex, viewingStageIndex);
    const dossierBack = onDossierBack ?? onClose;
    const dossierExit = onDossierExit ?? onClose;
    const navVisibility = resolveDossierHeaderNavVisibility(dossierNestedNav || isTrashOpen);
    const hasNamedChallenges = namedChallengeActions.length > 0 && Boolean(onNamedChallengeAction);
    const showPostHopChallenge =
        !isViewingArchived
        && (showRemainingOpponentChallenge
            || showIndependentClientChallenge
            || hasNamedChallenges);

    return (
        <>
            <div className="sticky top-0 z-50 w-full shrink-0 bg-[#0A0F1C] border-b border-white/[0.06] print:hidden">
                <div className="flex items-center justify-between gap-2 px-3 py-2 min-w-0">
                    <div className="flex items-center gap-1.5 shrink-0">
                        <DossierHeaderNavButtons
                            onBack={dossierBack}
                            onExit={dossierExit}
                            showBack={navVisibility.showBack}
                            showExit={navVisibility.showExit}
                            backTestId={CIVIL_LAWSUIT_TEST_IDS.dossierBack}
                            exitTestId={CIVIL_LAWSUIT_TEST_IDS.dossierExit}
                        />
                    </div>

                    <div className="flex items-center justify-center flex-1 gap-1.5 min-w-0 overflow-x-auto scrollbar-hide">
                        <h2 className="font-bold text-sm sm:text-base text-white/90 tracking-wide whitespace-nowrap shrink-0">
                            اضبارة الدعوى
                        </h2>
                        <ColleagueConsultationHeaderButton iconOnly />
                        {!isViewingArchived && !hideCaseFlowActions && (
                            <CaseFlowActionsPanel
                                variant="dock"
                                compactDock
                                onInterrupt={onInterrupt}
                                onPause={onPause}
                                onResume={onResume}
                                onAbandon={onAbandon}
                                onPetitionVoid={onPetitionVoid}
                                flowStage={flowStage}
                                isPaused={isPaused}
                                isInterrupted={isInterrupted}
                                pauseLabel={pauseLabel}
                                pauseConfirmTitle={pauseConfirmTitle}
                                pauseConfirmMessage={pauseConfirmMessage}
                                pauseTestId={pauseTestId}
                            />
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {!isViewingArchived ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setShowEditInfoModal(true)}
                                    className="p-2 rounded-full bg-white/[0.04] text-white/55 hover:text-white hover:bg-white/[0.08] transition-colors"
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
                            </>
                        ) : (
                            <span
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-white/60"
                                title="مرحلة أو إضبارة للقراءة فقط"
                            >
                                <Lock size={12} aria-hidden />
                                أرشيف
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="sticky top-[3.75rem] z-40 w-full bg-[#0A0F1C] border-b border-white/[0.06] print:hidden">
                <div className="px-3 py-1.5">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                            <div className="inline-flex items-stretch rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5 shrink-0">
                                {stageStripItems.map((item) => {
                                    const isCurrentlyViewing = item.isViewing;
                                    const isPast = item.isPast;
                                    const stageId = item.realIndex !== null ? `stg_${item.realIndex + 1}` : '';

                                    return (
                                        <Fragment key={item.key}>
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
                                                            ? 'bg-[#E6C673]/12 text-[#E6C673]'
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
                            {showPostHopChallenge ? (
                                <div
                                    className="flex items-center gap-1.5 shrink-0"
                                    data-testid={CIVIL_LAWSUIT_TEST_IDS.postHopChallengeChrome}
                                >
                                    {hasNamedChallenges
                                        ? namedChallengeActions.map((action) => (
                                              <button
                                                  key={action.challengerId}
                                                  type="button"
                                                  data-testid={CIVIL_LAWSUIT_TEST_IDS.namedChallengeAction(
                                                      action.challengerId,
                                                  )}
                                                  onClick={() =>
                                                      onNamedChallengeAction?.(action.challengerId)
                                                  }
                                                  onPointerEnter={() => {
                                                      void import('../AppealTransitionModal').catch(
                                                          () => undefined,
                                                      );
                                                  }}
                                                  className={CHROME_CHALLENGE_CHIP_ACCENT}
                                                  title={action.label}
                                              >
                                                  {action.label}
                                              </button>
                                          ))
                                        : null}
                                    {!hasNamedChallenges
                                    && showIndependentClientChallenge
                                    && onIndependentClientChallenge ? (
                                        <button
                                            type="button"
                                            data-testid={CIVIL_LAWSUIT_TEST_IDS.independentChallengeSpawn}
                                            onClick={onIndependentClientChallenge}
                                            onPointerEnter={() => {
                                                void import('../AppealTransitionModal').catch(() => undefined);
                                            }}
                                            className={CHROME_CHALLENGE_CHIP_ACCENT}
                                        >
                                            إنشاء طعن استئنافي مستقل
                                        </button>
                                    ) : null}
                                    {showRemainingOpponentChallenge && onRemainingOpponentChallenge ? (
                                        <button
                                            type="button"
                                            data-testid={CIVIL_LAWSUIT_TEST_IDS.remainingOpponentChallenge}
                                            onClick={onRemainingOpponentChallenge}
                                            onPointerEnter={() => {
                                                void import('../AppealTransitionModal').catch(() => undefined);
                                            }}
                                            className={CHROME_CHALLENGE_CHIP}
                                        >
                                            {remainingOpponentChallengeLabel}
                                        </button>
                                    ) : null}
                                </div>
                            ) : null}
                    </div>
                </div>
            </div>
        </>
    );
}
