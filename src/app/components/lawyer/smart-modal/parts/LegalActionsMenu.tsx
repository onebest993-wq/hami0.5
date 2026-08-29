import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useSheetSwipeDismiss } from '@/app/hooks/useSheetSwipeDismiss';
import type { SmartFileParentData } from '../smartFile/parentDataInit';
import { useSmartFileModalTheme } from '../smartFile/smartFileModalTheme';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import type { CaseStage } from '../../LawyerShared';
import {
    canRequestCassationCorrection,
    findCassationStageIndex,
} from '../smartFile/extraordinaryAppealGateway';
import { isCassationStageName } from '../smartFile/judgmentTypes';
import { AlertTriangle } from '@/app/components/ui/icons/AlertTriangle';
import { ArrowLeftRight } from '@/app/components/ui/icons/ArrowLeftRight';
import { GitMerge } from '@/app/components/ui/icons/GitMerge';
import { Link2 } from '@/app/components/ui/icons/Link2';
import { Mail } from '@/app/components/ui/icons/Mail';
import { Megaphone } from '@/app/components/ui/icons/Megaphone';
import { RotateCcw } from '@/app/components/ui/icons/RotateCcw';
import { Scale } from '@/app/components/ui/icons/Scale';
import { ScrollText } from '@/app/components/ui/icons/ScrollText';
import { Users } from '@/app/components/ui/icons/Users';
import type { LucideIcon } from '@/app/components/ui/lucideIcons';
import { HUB_DOSSIER_ACTIONS_MENU_Z_CLASS } from '@/app/components/lawyer/dashboard/hubOverlayStack';
import { LV_OVERLAY_SCRIM } from '@/app/components/lawyer/lawyerShared/lawsuitVisualLite';
import { prefetchLegalActionsModalChunks } from '../prefetchLegalActionsModalChunks';

const EXTRAORDINARY_APPEAL_TYPES = {
    retrial: 'إعادة المحاكمة',
    cassation_correction: 'تصحيح القرار التمييزي',
} as const;

interface LegalActionsMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onNotification?: () => void;
    onAction: (action: string) => void;
    currentStageName?: string;
    displayStage?: CaseStage;
    parentData?: SmartFileParentData;
    setShowExtraordinaryAppealModal?: (v: boolean | string) => void;
    setShowTransferJurisdictionModal?: (v: boolean) => void;
    setShowCaseConsolidationModal?: (v: boolean) => void;
    setShowCaseLinkModal?: (v: boolean) => void;
    setShowCorrespondenceModal?: (v: boolean) => void;
    stages?: CaseStage[];
    viewingStageIndex?: number;
}

type ActionItem = {
    key: string;
    label: string;
    icon: LucideIcon;
    onClick: () => void;
    danger?: boolean;
};

const SectionBlock = ({
    title,
    children,
    sectionTitleClass,
}: {
    title: string;
    children: React.ReactNode;
    sectionTitleClass: string;
}) => (
    <section className="mb-2.5 last:mb-0">
        <h4 className={sectionTitleClass}>{title}</h4>
        <div className="space-y-1">{children}</div>
    </section>
);

const ActionRow = ({
    label,
    icon: Icon,
    onClick,
    danger,
    actionRowClass,
    actionRowIconClass,
    labelClass,
    isPearl,
}: Omit<ActionItem, 'key'> & {
    actionRowClass: string;
    actionRowIconClass: string;
    labelClass: string;
    isPearl: boolean;
}) => (
    <button type="button" onClick={onClick} className={actionRowClass}>
        {isPearl ? (
            <div className={actionRowIconClass}>
                <Icon size={15} strokeWidth={1.75} aria-hidden />
            </div>
        ) : (
            <Icon size={16} className={actionRowIconClass} strokeWidth={1.9} aria-hidden />
        )}
        <span className={labelClass}>{label}</span>
    </button>
);

const CLICK_SUPPRESS_AFTER_DRAG_PX = 12;

function LegalActionsSwipeHandle({
    enabled,
    barClassName,
    onClose,
    onOffsetChange,
}: {
    enabled: boolean;
    barClassName: string;
    onClose: () => void;
    onOffsetChange: (px: number) => void;
}) {
    const reduceMotion = useReduceMotion();
    const skipClickRef = useRef(false);

    const handleOffsetChange = useCallback(
        (px: number) => {
            if (px > CLICK_SUPPRESS_AFTER_DRAG_PX) skipClickRef.current = true;
            onOffsetChange(px);
        },
        [onOffsetChange],
    );

    const swipe = useSheetSwipeDismiss(
        () => {
            skipClickRef.current = true;
            onClose();
        },
        {
            enabled,
            follow: enabled && !reduceMotion,
            onOffsetChange: handleOffsetChange,
        },
    );

    return (
        <div
            className="shrink-0 flex flex-col items-center justify-center min-h-[44px] min-w-[44px] w-full touch-none touch-manipulation"
            data-testid={CIVIL_LAWSUIT_TEST_IDS.legalActionsSwipeHandle}
            role="button"
            tabIndex={enabled ? 0 : -1}
            aria-label="اسحب للأسفل لإغلاق القائمة"
            onKeyDown={(event) => {
                if (!enabled) return;
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onClose();
            }}
            onClick={() => {
                if (!enabled) return;
                if (skipClickRef.current) {
                    skipClickRef.current = false;
                    return;
                }
                onClose();
            }}
            {...swipe}
        >
            <div className={barClassName} aria-hidden />
        </div>
    );
}

export const LegalActionsMenu = ({
    isOpen,
    onClose,
    onNotification,
    onAction,
    currentStageName = '',
    displayStage,
    parentData,
    setShowExtraordinaryAppealModal,
    setShowTransferJurisdictionModal,
    setShowCaseConsolidationModal,
    setShowCaseLinkModal,
    setShowCorrespondenceModal,
    stages = [],
    viewingStageIndex = -1,
}: LegalActionsMenuProps) => {
    const T = useSmartFileModalTheme();
    const isPearl = T.variant === 'personal-pearl';
    const reduceMotion = useReduceMotion();
    const [dragY, setDragY] = useState(0);

    useEffect(() => {
        if (!isOpen) setDragY(0);
    }, [isOpen]);

    const handleSwipeOffset = useCallback((px: number) => {
        setDragY(px);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        prefetchLegalActionsModalChunks();
    }, [isOpen]);

    const actionRowProps = {
        actionRowClass: T.actionRow,
        actionRowIconClass: T.actionRowIcon,
        labelClass: `flex-1 text-[13px] font-bold ${
            isPearl ? 'text-[#FFFEF9]/90' : 'text-white/80'
        }`,
        isPearl,
    };
    const actionRowDangerProps = {
        actionRowClass: T.actionRowDanger,
        actionRowIconClass: T.actionRowIconDanger,
        labelClass: 'flex-1 text-[13px] font-bold text-rose-200/90',
        isPearl,
    };

    const isAppeal = currentStageName.includes('استئناف') || currentStageName.includes('Appeal');
    const incidentalLabel = isAppeal ? 'شخص ثالث' : 'دعوى حادثة';

    const wrap = (fn: () => void) => () => {
        fn();
        onClose();
    };
    const hasJudgment =
        displayStage?.finalDecision ||
        displayStage?.status === 'completed' ||
        displayStage?.timeline?.some((e) => e.type === 'decision');
    const caseStatus = parentData?.status ?? '';
    const isFinal = caseStatus === 'مكتسبة الدرجة القطعية';
    const isCassation = isCassationStageName(displayStage?.stageName ?? currentStageName);
    const cassationStageIndex =
        viewingStageIndex >= 0 && isCassationStageName(stages[viewingStageIndex]?.stageName)
            ? viewingStageIndex
            : findCassationStageIndex(stages);
    const correctionAvailable =
        isCassation &&
        canRequestCassationCorrection(stages, cassationStageIndex, caseStatus);
    const isActive = displayStage?.status === 'active' && !isFinal;

    const coreActions: ActionItem[] = [];
    if (onNotification) {
        coreActions.push({
            key: 'notification',
            label: 'حالة التبليغ القضائي',
            icon: Megaphone,
            onClick: wrap(onNotification),
        });
    }
    coreActions.push(
        {
            key: 'incidental',
            label: incidentalLabel,
            icon: Users,
            onClick: wrap(() => onAction('incidental')),
        },
        {
            key: 'interlocutory',
            label: 'تمييز القرارات',
            icon: ScrollText,
            onClick: wrap(() => onAction('interlocutory_appeal')),
        },
    );

    const extraordinaryActions: ActionItem[] = [];
    if (hasJudgment && setShowExtraordinaryAppealModal) {
        if (isFinal) {
            extraordinaryActions.push({
                key: 'retrial',
                label: EXTRAORDINARY_APPEAL_TYPES.retrial,
                icon: RotateCcw,
                onClick: wrap(() => setShowExtraordinaryAppealModal(EXTRAORDINARY_APPEAL_TYPES.retrial)),
            });
        }
        if (correctionAvailable) {
            extraordinaryActions.push({
                key: 'cassation_correction',
                label: EXTRAORDINARY_APPEAL_TYPES.cassation_correction,
                icon: AlertTriangle,
                onClick: wrap(() =>
                    setShowExtraordinaryAppealModal(EXTRAORDINARY_APPEAL_TYPES.cassation_correction),
                ),
            });
        }
    }

    const proceduralActions: ActionItem[] = [];
    if (isActive) {
        if (setShowTransferJurisdictionModal) {
            proceduralActions.push({
                key: 'transfer',
                label: 'إحالة لعدم الاختصاص',
                icon: ArrowLeftRight,
                onClick: wrap(() => setShowTransferJurisdictionModal(true)),
            });
        }
        if (setShowCaseConsolidationModal) {
            proceduralActions.push({
                key: 'consolidation',
                label: 'توحيد الدعاوى',
                icon: GitMerge,
                onClick: wrap(() => setShowCaseConsolidationModal(true)),
            });
        }
    }

    const linkAndCommsActions: ActionItem[] = [];
    if (isActive) {
        if (setShowCaseLinkModal) {
            linkAndCommsActions.push({
                key: 'case_link',
                label: 'ربط الدعوى',
                icon: Link2,
                onClick: wrap(() => setShowCaseLinkModal(true)),
            });
        }
        if (setShowCorrespondenceModal) {
            linkAndCommsActions.push({
                key: 'correspondence',
                label: 'المخاطبات',
                icon: Mail,
                onClick: wrap(() => setShowCorrespondenceModal(true)),
            });
        }
    }

    const menu = (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        key="legal-actions-backdrop"
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduceMotion ? undefined : { opacity: 0, pointerEvents: 'none' }}
                        transition={reduceMotion ? { duration: 0 } : undefined}
                        onClick={onClose}
                        className={`pointer-events-auto fixed inset-0 ${HUB_DOSSIER_ACTIONS_MENU_Z_CLASS} ${isPearl ? 'bg-[#131211]/72' : LV_OVERLAY_SCRIM}`}
                    />
                    <motion.div
                        key="legal-actions-sheet"
                        initial={reduceMotion ? false : { y: '100%' }}
                        animate={{ y: dragY }}
                        exit={reduceMotion ? undefined : { y: '100%' }}
                        transition={
                            reduceMotion || dragY > 0
                                ? { duration: 0 }
                                : { type: 'spring', damping: 28, stiffness: 320 }
                        }
                        className={T.sheet}
                        dir="rtl"
                        data-testid={CIVIL_LAWSUIT_TEST_IDS.legalActionsSheet}
                    >
                        <LegalActionsSwipeHandle
                            enabled
                            barClassName={T.sheetHandle}
                            onClose={onClose}
                            onOffsetChange={handleSwipeOffset}
                        />
                        <h3 className={T.sheetTitle}>
                            {!isPearl ? (
                                <Scale size={16} className="text-[#E6C673] shrink-0" strokeWidth={1.9} aria-hidden />
                            ) : null}
                            إجراءات الدعوى القانونية
                        </h3>

                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y scrollbar-hide">
                            <SectionBlock title="الإجراءات الأساسية" sectionTitleClass={T.sectionTitle}>
                                {coreActions.map(({ key, danger, ...item }) => (
                                    <ActionRow
                                        key={key}
                                        danger={danger}
                                        {...item}
                                        {...(danger ? actionRowDangerProps : actionRowProps)}
                                    />
                                ))}
                            </SectionBlock>

                            {extraordinaryActions.length > 0 && (
                                <SectionBlock title="الطعون الاستثنائية" sectionTitleClass={T.sectionTitle}>
                                    {extraordinaryActions.map(({ key, danger, ...item }) => (
                                        <ActionRow
                                            key={key}
                                            {...item}
                                            {...(danger ? actionRowDangerProps : actionRowProps)}
                                        />
                                    ))}
                                </SectionBlock>
                            )}

                            {proceduralActions.length > 0 && (
                                <SectionBlock title="المناورات الإجرائية" sectionTitleClass={T.sectionTitle}>
                                    {proceduralActions.map(({ key, danger, ...item }) => (
                                        <ActionRow
                                            key={key}
                                            {...item}
                                            {...(danger ? actionRowDangerProps : actionRowProps)}
                                        />
                                    ))}
                                </SectionBlock>
                            )}

                            {linkAndCommsActions.length > 0 && (
                                <SectionBlock title="الربط والمراسلات" sectionTitleClass={T.sectionTitle}>
                                    {linkAndCommsActions.map(({ key, danger, ...item }) => (
                                        <ActionRow
                                            key={key}
                                            {...item}
                                            {...(danger ? actionRowDangerProps : actionRowProps)}
                                        />
                                    ))}
                                </SectionBlock>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return typeof document !== 'undefined' ? createPortal(menu, document.body) : menu;
};
