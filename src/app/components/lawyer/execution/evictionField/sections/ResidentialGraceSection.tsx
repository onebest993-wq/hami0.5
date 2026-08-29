import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import { BTN_BASE, BTN_DISABLED, TONE_GRACE } from '../evictionFieldStyles';
import type { EvictionFieldPanelModel } from '../hooks/useEvictionFieldPanelModel';

export function ResidentialGraceSection({
    locked,
    showResidentialEvictionGraceButton,
    residentialGracePeriodSaved,
    onResidentialEvictionGraceClick,
}: Pick<
    EvictionFieldPanelModel,
    | 'locked'
    | 'showResidentialEvictionGraceButton'
    | 'residentialGracePeriodSaved'
    | 'onResidentialEvictionGraceClick'
>) {
    if (!showResidentialEvictionGraceButton || !onResidentialEvictionGraceClick) return null;

    return (
                    <motion.button
                        type="button"
                        disabled={locked}
                        title={
                            residentialGracePeriodSaved
                                ? 'تعديل مهلة التخلية — المدة وتاريخ الانتهاء'
                                : 'مهلة — المدة وتاريخ الانتهاء'
                        }
                        aria-label={residentialGracePeriodSaved ? 'تعديل المهلة' : 'مهلة'}
                        className={`${BTN_BASE} ${TONE_GRACE} ${locked ? BTN_DISABLED : ''}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (locked) return;
                            onResidentialEvictionGraceClick(
                                residentialGracePeriodSaved ? { edit: true } : undefined
                            );
                        }}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    >
                        <div className="flex items-center gap-3 flex-row-reverse min-w-0">
                            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                                <Calendar className="w-6 h-6 text-white/70" strokeWidth={2} />
                            </div>
                            <span className="truncate text-[12px] font-bold text-white">
                                {residentialGracePeriodSaved ? 'تعديل المهلة' : 'مهلة'}
                            </span>
                            <span className="sr-only">المدة وتاريخ الانتهاء</span>
                        </div>
                    </motion.button>
    );
}
