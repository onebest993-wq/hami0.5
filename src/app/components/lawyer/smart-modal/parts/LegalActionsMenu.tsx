import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';import {
    Scale,
    Megaphone,
    Users,
    ScrollText,
    RotateCcw,
    AlertTriangle,
    ArrowLeftRight,
    GitMerge,
    Link2,
    Mail,
    type LucideIcon,
} from '@/app/components/ui/lucideIcons';
import { HUB_DOSSIER_ACTIONS_MENU_Z_CLASS } from '@/app/components/lawyer/dashboard/hubOverlayStack';
import type { SmartFileParentData } from '../smartFile/parentDataInit';
import { useSmartFileModalTheme } from '../smartFile/smartFileModalTheme';
import type { CaseStage } from '../../LawyerShared';
import {
    canRequestCassationCorrection,
    findCassationStageIndex,
} from '../smartFile/extraordinaryAppealGateway';
import { isCassationStageName } from '../smartFile/judgmentTypes';
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
    iconClass: string;
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
    <section className="mb-3 last:mb-0">
        <h4 className={sectionTitleClass}>{title}</h4>
        <div className="space-y-1.5">{children}</div>
    </section>
);

const ActionRow = ({
    label,
    icon: Icon,
    iconClass,
    onClick,
    danger,
    actionRowClass,
    actionRowIconClass,
    labelClass,
}: Omit<ActionItem, 'key'> & {
    actionRowClass: string;
    actionRowIconClass: string;
    labelClass: string;
}) => (
    <button type="button" onClick={onClick} className={actionRowClass}>
        <div className={`${actionRowIconClass} ${iconClass}`}>
            <Icon size={17} strokeWidth={1.75} />
        </div>
        <span className={labelClass}>{label}</span>
    </button>
);
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

    useEffect(() => {
        if (!isOpen) return;
        prefetchLegalActionsModalChunks();
    }, [isOpen]);

    const actionRowProps = {
        actionRowClass: T.actionRow,
        actionRowIconClass: T.actionRowIcon,
        labelClass: `flex-1 text-[14px] font-semibold ${
            isPearl ? 'text-[#FFFEF9]/90 group-hover:text-[#FFFEF9]' : 'text-white/85 group-hover:text-white'
        }`,
    };
    const actionRowDangerProps = {
        actionRowClass: T.actionRowDanger,
        actionRowIconClass: T.actionRowIconDanger,
        labelClass: 'flex-1 text-[14px] font-semibold text-rose-200/90 group-hover:text-rose-100',
    };

    const isAppeal = currentStageName.includes('استئناف') || currentStageName.includes('Appeal');    const incidentalLabel = isAppeal ? 'شخص ثالث' : 'دعوى حادثة';

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
            iconClass: 'text-sky-400/90',
            onClick: wrap(onNotification),
        });
    }
    coreActions.push(
        {
            key: 'incidental',
            label: incidentalLabel,
            icon: Users,
            iconClass: 'text-purple-400/90',
            onClick: wrap(() => onAction('incidental')),
        },
        {
            key: 'interlocutory',
            label: 'تمييز القرارات',
            icon: ScrollText,
            iconClass: 'text-indigo-400/90',
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
                iconClass: 'text-blue-400/90',
                onClick: wrap(() => setShowExtraordinaryAppealModal(EXTRAORDINARY_APPEAL_TYPES.retrial)),
            });
        }
        if (correctionAvailable) {
            extraordinaryActions.push({
                key: 'cassation_correction',
                label: EXTRAORDINARY_APPEAL_TYPES.cassation_correction,
                icon: AlertTriangle,
                iconClass: 'text-orange-400/90',
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
                iconClass: 'text-violet-400/90',
                onClick: wrap(() => setShowTransferJurisdictionModal(true)),
            });
        }
        if (setShowCaseConsolidationModal) {
            proceduralActions.push({
                key: 'consolidation',
                label: 'توحيد الدعاوى',
                icon: GitMerge,
                iconClass: 'text-purple-400/90',
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
                iconClass: 'text-sky-400/90',
                onClick: wrap(() => setShowCaseLinkModal(true)),
            });
        }
        if (setShowCorrespondenceModal) {
            linkAndCommsActions.push({
                key: 'correspondence',
                label: 'المخاطبات',
                icon: Mail,
                iconClass: 'text-amber-400/90',
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
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, pointerEvents: 'none' }}
                        onClick={onClose}
                        className={`pointer-events-auto ${isPearl ? `fixed inset-0 bg-[#131211]/82 backdrop-blur-[4px] ${HUB_DOSSIER_ACTIONS_MENU_Z_CLASS}` : `fixed inset-0 bg-[#020309]/90 backdrop-blur-[7px] ${HUB_DOSSIER_ACTIONS_MENU_Z_CLASS}`}`}
                    />
                    <motion.div
                        key="legal-actions-sheet"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        className={T.sheet}
                        dir="rtl"
                    >
                        <div className={T.sheetHandle} />
                        <h3 className={T.sheetTitle}>
                            <Scale size={18} strokeWidth={1.75} className={T.headerIcon} />
                            إجراءات الدعوى القانونية
                        </h3>

                        <SectionBlock title="الإجراءات الأساسية" sectionTitleClass={T.sectionTitle}>
                            {coreActions.map(({ key, danger, ...item }) => (
                                <ActionRow
                                    key={key}
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
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return typeof document !== 'undefined' ? createPortal(menu, document.body) : menu;
};
