import { Edit2, Lock, Trash2 } from 'lucide-react';
import { buildPersonalStatusChromeStageStripItems } from './personalStatusStageDisplay';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smart-modal/smartFile/civilLawsuitTestIds';
import type { SmartFileChromeProps } from '../smart-modal/layout/SmartFileChrome';
import { DossierHeaderNavButtons } from '@/app/components/lawyer/dashboard/DossierHeaderNavButtons';
import {
    PS_CHROME_BAR,
    PS_CHROME_BTN,
    PS_CHROME_ICON_BTN,
    PS_CHROME_TRASH_BTN_ACTIVE,
    PS_CHROME_TRASH_BTN_IDLE,
    PS_STAGE_PILL_ACTIVE,
    PS_STAGE_PILL_IDLE,
    PS_STAGE_PILL_PAST,
    PS_STAGE_RAIL,
    PS_TEXT,
} from './personalStatusDossierTheme';
import {
    PersonalStatusMoroccanDivider,
} from './PersonalStatusMoroccanGlass';
import { ColleagueConsultationHeaderButton } from '@/app/components/lawyer/caseShare/ColleagueConsultationHeaderButton';

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
    } = props;

    const stageStripItems = buildPersonalStatusChromeStageStripItems(stages, activeStageIndex, viewingStageIndex);
    const dossierBack = onDossierBack ?? onClose;
    const dossierExit = onDossierExit ?? onClose;

    return (
        <>
            <div className={PS_CHROME_BAR}>
                <div className="relative z-[1] flex items-center justify-between px-3 py-2.5 gap-2">
                    <DossierHeaderNavButtons
                        onBack={dossierBack}
                        onExit={dossierExit}
                        backTestId={CIVIL_LAWSUIT_TEST_IDS.dossierBack}
                        exitTestId={CIVIL_LAWSUIT_TEST_IDS.dossierExit}
                    />

                    <div className="flex flex-1 items-center justify-center gap-1.5 min-w-0 px-1">
                        <h2 className={`text-center text-xs font-bold ${PS_TEXT} truncate`}>
                            إضبارة الأحوال الشخصية
                        </h2>
                        <ColleagueConsultationHeaderButton
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#E6C673]/10 border border-[#E6C673]/30 text-[#E6C673] hover:bg-[#E6C673]/16 transition-all shrink-0"
                            iconSize={12}
                        />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {!isViewingArchived ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setShowEditInfoModal(true)}
                                    className={PS_CHROME_ICON_BTN}
                                    title="تعديل بيانات الدعوى"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsTrashOpen(!isTrashOpen)}
                                    className={isTrashOpen ? PS_CHROME_TRASH_BTN_ACTIVE : PS_CHROME_TRASH_BTN_IDLE}
                                    title="سلة المهملات"
                                    aria-label="سلة المهملات"
                                >
                                    <Trash2 size={16} strokeWidth={1.75} />
                                </button>
                            </>
                        ) : (
                            <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${PS_TEXT} opacity-70`}
                                title="مرحلة مؤرشفة — للقراءة فقط"
                            >
                                <Lock size={12} aria-hidden />
                                أرشيف
                            </span>
                        )}
                    </div>
                </div>
                <PersonalStatusMoroccanDivider className="pb-1.5 opacity-80" />
            </div>

            <div className={PS_STAGE_RAIL}>
                <div className="relative z-[1] px-2 py-2">
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide snap-x pb-0.5">
                        {stageStripItems.map((item) => {
                            if (item.isPlaceholder) {
                                return (
                                    <span
                                        key={item.key}
                                        className="snap-start shrink-0 inline-flex px-2.5 py-1.5 rounded-full border border-dashed border-white/[0.10] text-[10px] font-bold text-[#9894A0]/35"
                                    >
                                        {item.displayName}
                                    </span>
                                );
                            }
                            const isCurrentlyViewing = item.isViewing;
                            const isPast = item.isPast;
                            const stageId = item.realIndex !== null ? `stg_${item.realIndex + 1}` : '';

                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => onStageSelect(stageId)}
                                    className={`snap-start shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition-all backdrop-blur-sm ${
                                        isCurrentlyViewing
                                            ? PS_STAGE_PILL_ACTIVE
                                            : isPast
                                              ? PS_STAGE_PILL_PAST
                                              : PS_STAGE_PILL_IDLE
                                    }`}
                                >
                                    {isPast ? <Lock size={9} className="opacity-50" /> : null}
                                    <span>{item.displayName}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}
