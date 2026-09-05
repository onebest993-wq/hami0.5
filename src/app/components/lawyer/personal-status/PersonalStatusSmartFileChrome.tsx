import { Edit2 } from '@/app/components/ui/icons/Edit2';
import { Lock } from '@/app/components/ui/icons/Lock';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { buildPersonalStatusChromeStageStripItems } from './personalStatusStageDisplay';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smart-modal/smartFile/civilLawsuitTestIds';
import type { SmartFileChromeProps } from '../smart-modal/layout/SmartFileChrome';
import { DossierHeaderNavButtons } from '@/app/components/lawyer/dashboard/DossierHeaderNavButtons';
import { resolveDossierHeaderNavVisibility } from '@/app/components/lawyer/dashboard/resolveDossierHeaderNavVisibility';
import {
    PS_CHROME_BAR,
    PS_CHROME_ICON_BTN,
    PS_CHROME_TRASH_BTN_ACTIVE,
    PS_CHROME_TRASH_BTN_IDLE,
    PS_STAGE_PILL_ACTIVE,
    PS_STAGE_PILL_IDLE,
    PS_STAGE_PILL_PAST,
    PS_STAGE_RAIL,
    PS_TEXT,
} from './personalStatusDossierTheme';
import { ColleagueConsultationHeaderButton } from '@/app/components/lawyer/caseShare/ColleagueConsultationHeaderButton';

const PS_CHALLENGE_CHIP =
    'min-h-[44px] shrink-0 whitespace-nowrap rounded-md border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-white/75 hover:border-white/[0.16] hover:bg-white/[0.07] hover:text-white/90 transition-colors touch-manipulation';

export function PersonalStatusSmartFileChrome(props: SmartFileChromeProps) {
    const {
        onClose,
        onDossierBack,
        onDossierExit,
        setShowEditInfoModal,
        isTrashOpen,
        setIsTrashOpen,
        isViewingArchived,
        stages,
        viewingStageIndex,
        activeStageIndex,
        onStageSelect,
        showRemainingOpponentChallenge = false,
        remainingOpponentChallengeLabel = 'قام الخصم بالطعن',
        onRemainingOpponentChallenge,
        showIndependentClientChallenge = false,
        onIndependentClientChallenge,
        namedChallengeActions = [],
        onNamedChallengeAction,
    } = props;

    const stageStripItems = buildPersonalStatusChromeStageStripItems(stages, activeStageIndex, viewingStageIndex);
    const dossierBack = onDossierBack ?? onClose;
    const dossierExit = onDossierExit ?? onClose;
    const navVisibility = resolveDossierHeaderNavVisibility(isTrashOpen);
    const showStageRail = stageStripItems.length > 0;
    const hasNamedChallenges = namedChallengeActions.length > 0 && Boolean(onNamedChallengeAction);
    /** الأحوال: لا استئناف — الزر المستقل الاستئنافي لا يُعرض؛ المسمّى مسموح (تمييز/اعتراض) */
    const showPostHopChallenge =
        !isViewingArchived
        && (showRemainingOpponentChallenge
            || hasNamedChallenges
            || (showIndependentClientChallenge && Boolean(onIndependentClientChallenge)));

    return (
        <div className="sticky top-0 z-50 w-full shrink-0 print:hidden bg-[#0B1021]">
            <div className={PS_CHROME_BAR}>
                <div className="flex h-11 items-center gap-1 px-2">
                    <DossierHeaderNavButtons
                        onBack={dossierBack}
                        onExit={dossierExit}
                        showBack={navVisibility.showBack}
                        showExit={navVisibility.showExit}
                        backTestId={CIVIL_LAWSUIT_TEST_IDS.dossierBack}
                        exitTestId={CIVIL_LAWSUIT_TEST_IDS.dossierExit}
                        compact
                    />

                    <h2 className={`min-w-0 flex-1 truncate text-center text-[12px] font-bold ${PS_TEXT}`}>
                        إضبارة الأحوال الشخصية
                    </h2>

                    <div className="flex shrink-0 items-center gap-0.5">
                        <ColleagueConsultationHeaderButton
                            iconOnly
                            iconSize={13}
                            className={PS_CHROME_ICON_BTN}
                        />
                        {!isViewingArchived ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setShowEditInfoModal(true)}
                                    className={PS_CHROME_ICON_BTN}
                                    title="تعديل بيانات الدعوى"
                                    aria-label="تعديل بيانات الدعوى"
                                >
                                    <Edit2 size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsTrashOpen(!isTrashOpen)}
                                    className={isTrashOpen ? PS_CHROME_TRASH_BTN_ACTIVE : PS_CHROME_TRASH_BTN_IDLE}
                                    title="سلة المهملات"
                                    aria-label="سلة المهملات"
                                >
                                    <Trash2 size={15} strokeWidth={1.75} />
                                </button>
                            </>
                        ) : (
                            <span
                                className={`inline-flex items-center gap-1 px-1.5 text-[10px] font-bold ${PS_TEXT} opacity-70`}
                                title="مرحلة مؤرشفة — للقراءة فقط"
                            >
                                <Lock size={11} aria-hidden />
                                أرشيف
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {showStageRail || showPostHopChallenge ? (
                <div className={PS_STAGE_RAIL} aria-label="مراحل الدعوى">
                    <div className="px-2 py-1">
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide snap-x">
                            {stageStripItems.map((item) => {
                                if (item.isPlaceholder) {
                                    return (
                                        <span
                                            key={item.key}
                                            className="snap-start shrink-0 inline-flex px-2 py-1 rounded-md border border-dashed border-white/[0.08] text-[10px] font-bold text-white/35"
                                        >
                                            {item.displayName}
                                        </span>
                                    );
                                }
                                const stageId = item.realIndex !== null ? `stg_${item.realIndex + 1}` : '';

                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => onStageSelect(stageId)}
                                        className={`snap-start shrink-0 inline-flex items-center gap-1 min-h-[44px] px-2.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-colors touch-manipulation ${
                                            item.isViewing
                                                ? PS_STAGE_PILL_ACTIVE
                                                : item.isPast
                                                  ? PS_STAGE_PILL_PAST
                                                  : PS_STAGE_PILL_IDLE
                                        }`}
                                    >
                                        {item.isPast ? <Lock size={9} className="opacity-50" /> : null}
                                        <span>{item.displayName}</span>
                                    </button>
                                );
                            })}
                            {showPostHopChallenge ? (
                                <div
                                    className="flex items-center gap-1 shrink-0 snap-start"
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
                                                      void import(
                                                          '../smart-modal/AppealTransitionModal',
                                                      ).catch(() => undefined);
                                                  }}
                                                  className={PS_CHALLENGE_CHIP}
                                                  title={action.label}
                                              >
                                                  {action.label}
                                              </button>
                                          ))
                                        : null}
                                    {showRemainingOpponentChallenge && onRemainingOpponentChallenge ? (
                                        <button
                                            type="button"
                                            data-testid={CIVIL_LAWSUIT_TEST_IDS.remainingOpponentChallenge}
                                            onClick={onRemainingOpponentChallenge}
                                            onPointerEnter={() => {
                                                void import('../smart-modal/AppealTransitionModal').catch(
                                                    () => undefined,
                                                );
                                            }}
                                            className={PS_CHALLENGE_CHIP}
                                        >
                                            {remainingOpponentChallengeLabel}
                                        </button>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
