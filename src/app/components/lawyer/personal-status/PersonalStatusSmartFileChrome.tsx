import { Edit2, Lock, Trash2, X } from 'lucide-react';
import { buildPersonalStatusChromeStageStripItems } from './personalStatusStageDisplay';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smart-modal/smartFile/civilLawsuitTestIds';
import type { SmartFileChromeProps } from '../smart-modal/layout/SmartFileChrome';
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

export function PersonalStatusSmartFileChrome(props: SmartFileChromeProps) {
    const {
        onClose,
        setShowEditInfoModal,
        isTrashOpen,
        setIsTrashOpen,
        stages,
        viewingStageIndex,
        activeStageIndex,
        onStageSelect,
    } = props;

    const stageStripItems = buildPersonalStatusChromeStageStripItems(stages, activeStageIndex, viewingStageIndex);

    return (
        <>
            <div className={PS_CHROME_BAR}>
                <div className="relative z-[1] flex items-center justify-between px-3 py-2.5 gap-2">
                    <button
                        type="button"
                        data-testid={CIVIL_LAWSUIT_TEST_IDS.dossierBack}
                        onClick={onClose}
                        className={PS_CHROME_BTN}
                    >
                        <X size={14} />
                        رجوع
                    </button>

                    <h2 className={`flex-1 text-center text-xs font-bold ${PS_TEXT} truncate px-2`}>
                        إضبارة الأحوال الشخصية
                    </h2>

                    <div className="flex items-center gap-1.5 shrink-0">
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
