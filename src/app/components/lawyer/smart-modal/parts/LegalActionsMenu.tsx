import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
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
} from 'lucide-react';
import type { CaseStage } from '../../LawyerShared';
import type { SmartFileParentData } from '../smartFile/parentDataInit';
import { useSmartFileModalTheme } from '../smartFile/smartFileModalTheme';

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
}

type ActionItem = {
    key: string;
    label: string;
    icon: LucideIcon;
    iconClass: string;
    onClick: () => void;
    danger?: boolean;
};

const SectionBlock = ({ title, children }: { title: string; children: React.ReactNode }) => {
    const T = useSmartFileModalTheme();
    return (
        <section className="mb-3 last:mb-0">
            <h4 className={T.sectionTitle}>{title}</h4>
            <div className="space-y-1.5">{children}</div>
        </section>
    );
};

const ActionRow = ({
    label,
    icon: Icon,
    iconClass,
    onClick,
    danger,
}: Omit<ActionItem, 'key'>) => {
    const T = useSmartFileModalTheme();
    return (
        <button type="button" onClick={onClick} className={danger ? T.actionRowDanger : T.actionRow}>
            <div className={`${danger ? T.actionRowIconDanger : T.actionRowIcon} ${iconClass}`}>
                <Icon size={15} strokeWidth={1.75} />
            </div>
            <span
                className={`flex-1 text-[13px] font-semibold transition-colors ${
                    danger ? 'text-rose-200/90 group-hover:text-rose-100' : T.variant === 'personal-pearl' ? 'text-[#FFFEF9]/90 group-hover:text-[#FFFEF9]' : 'text-white/85 group-hover:text-white'
                }`}
            >
                {label}
            </span>
        </button>
    );
};

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
}: LegalActionsMenuProps) => {
    const T = useSmartFileModalTheme();
    const isPearl = T.variant === 'personal-pearl';
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
    const isCassation = displayStage?.stageName === 'التمييز';
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
        if (isCassation) {
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

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className={isPearl ? 'fixed inset-0 bg-[#131211]/60 backdrop-blur-[2px] z-[100]' : 'fixed inset-0 bg-[#05060D]/60 backdrop-blur-[3px] z-[100]'}
                    />
                    <motion.div
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

                        <SectionBlock title="الإجراءات الأساسية">
                            {coreActions.map(({ key, ...item }) => (
                                <ActionRow key={key} {...item} />
                            ))}
                        </SectionBlock>

                        {extraordinaryActions.length > 0 && (
                            <SectionBlock title="الطعون الاستثنائية">
                                {extraordinaryActions.map(({ key, ...item }) => (
                                    <ActionRow key={key} {...item} />
                                ))}
                            </SectionBlock>
                        )}

                        {proceduralActions.length > 0 && (
                            <SectionBlock title="المناورات الإجرائية">
                                {proceduralActions.map(({ key, ...item }) => (
                                    <ActionRow key={key} {...item} />
                                ))}
                            </SectionBlock>
                        )}

                        {linkAndCommsActions.length > 0 && (
                            <SectionBlock title="الربط والمراسلات">
                                {linkAndCommsActions.map(({ key, ...item }) => (
                                    <ActionRow key={key} {...item} />
                                ))}
                            </SectionBlock>
                        )}

                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
