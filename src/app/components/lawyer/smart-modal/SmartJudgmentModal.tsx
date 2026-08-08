import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    isNonMeritTerminationType,
    isSulhJudgmentType,
    isFirstInstanceStageName,
    isCassationStageName,
    isAppealStageName,
    resolveLawyerSide,
    resolveFirstInstanceHadoriAppealRights,
    isSubjectMatterJudgmentType,
} from './smartFile/judgmentTypes';
import {
    absentObjectionJudgmentOptionsForClient,
    canOfferAbsentObjectionToDefendant,
    hasAbsentObjectionStageInDossier,
} from './smartFile/absentJudgmentFlow';
import { isAbsentObjectionStageName } from './smartFile/absentJudgmentStageNames';
import { resolveAbsentObjectionAppealRights } from './smartFile/absentJudgmentAppealRights';
import {
    hasInterpleaderParties,
    interpleaderFirstInstanceJudgmentOptions,
    interpleaderTerminationJudgmentOptions,
    isInterpleaderJudgmentType,
    type JudgmentOptionWithHint,
} from './smartFile/interpleaderJudgmentEngine';
import { filterPetitionVoidFromJudgmentOptions } from './smartFile/petitionVoidFlow';
import {
    canRequestCassationCorrection,
    findCassationStageIndex,
    isCassationCorrectionStageName,
} from './smartFile/extraordinaryAppealGateway';
import { isPersonalStatusCoreStage } from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import {
    resolveAppealStageClientOutcome,
    resolveCassationClientOutcome,
    resolveClientAppealRole,
    resolveCorrectionAcceptedClientOutcome,
    resolveCorrectionRejectedClientOutcome,
    resolvePriorAppealJudgmentForCassation,
} from './smartFile/appealStageJudgmentEngine';
import type { CaseStage } from '../LawyerShared';
import {
    useJudgmentModalStyles,
    type JudgmentModalStyles,
} from './smartFile/smartModalChrome';
import {
    X,
    Gavel,
    Scale,
    CalendarDays,
    Users,
    UserX,
    Info,
    ShieldAlert,
    Trophy,
    ArrowLeftRight,
    Stamp,
    ChevronDown,
    Check,
    Clock,
} from '@/app/components/ui/lucideIcons';

interface SmartJudgmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: any) => boolean | void;
    currentParties: any[];
    currentStage: string;
    representedParty?: string;
    stages?: CaseStage[];
    caseStatus?: string;
    activeStageIndex?: number;
}

const GLASS_BTN =
    'w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border';
const GLASS_BTN_GOLD = `${GLASS_BTN} bg-[#E6C673]/12 border-[#E6C673]/30 text-[#E6C673] hover:bg-[#E6C673]/22`;
const GLASS_BTN_NEUTRAL = `${GLASS_BTN} bg-white/[0.04] border-white/[0.1] text-white/80 hover:bg-white/[0.08] hover:text-white`;
const GLASS_BTN_INDIGO = `${GLASS_BTN} bg-indigo-500/10 border-indigo-400/25 text-indigo-200 hover:bg-indigo-500/18`;
const GLASS_BTN_ROSE = `${GLASS_BTN} bg-rose-500/10 border-rose-400/25 text-rose-200 hover:bg-rose-500/18`;
const GLASS_BTN_EMERALD = `${GLASS_BTN} bg-emerald-500/10 border-emerald-400/25 text-emerald-200 hover:bg-emerald-500/18`;

type JudgmentOption = JudgmentOptionWithHint;

function judgmentOptionsForStage(currentStage: string, parties?: any[]): JudgmentOption[] {
    if (isAbsentObjectionStageName(currentStage)) {
        return absentObjectionJudgmentOptionsForClient(parties);
    }
    if (isCassationCorrectionStageName(currentStage)) {
        return [
            { value: 'قبول طلب التصحيح', label: 'قبول طلب التصحيح' },
            { value: 'رد طلب التصحيح', label: 'رد طلب التصحيح' },
        ];
    }
    if (isCassationStageName(currentStage)) {
        return [
            { value: 'تصديق الحكم', label: 'تصديق الحكم' },
            { value: 'نقض الحكم وإعادة الإضبارة', label: 'نقض الحكم وإعادة الإضبارة' },
            { value: 'رد الطعن التمييزي شكلاً', label: 'رد الطعن التمييزي شكلاً' },
        ];
    }
    if (isAppealStageName(currentStage)) {
        return [
            { value: 'تأييد الحكم البدائي ورد الاستئناف', label: 'تأييد الحكم البدائي ورد الاستئناف' },
            { value: 'فسخ الحكم البدائي كلياً', label: 'فسخ الحكم البدائي كلياً' },
            { value: 'فسخ الحكم البدائي جزئياً', label: 'فسخ الحكم البدائي جزئياً' },
            { value: 'رد الاستئناف شكلاً', label: 'رد الاستئناف شكلاً' },
        ];
    }
    if (hasInterpleaderParties(parties)) {
        return [
            ...interpleaderFirstInstanceJudgmentOptions(),
            ...interpleaderTerminationJudgmentOptions(),
        ];
    }
    return [
        { value: 'إجابة الدعوى بالكامل', label: 'إجابة الدعوى بالكامل (كسب الدعوى)' },
        { value: 'رد الدعوى كلياً', label: 'رد الدعوى كلياً (خسارة الدعوى)' },
        { value: 'رد الدعوى جزئياً', label: 'رد الدعوى جزئياً (كسب/خسارة جزئية)' },
    ];
}

function DiamondJudgmentPicker({
    value,
    onChange,
    options,
    styles: s,
}: {
    value: string;
    onChange: (value: string) => void;
    options: JudgmentOption[];
    styles: JudgmentModalStyles;
}) {
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<{
        top: number;
        left: number;
        width: number;
        maxHeight: number;
    } | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const selected = options.find((o) => o.value === value);

    const updateMenuPosition = useCallback(() => {
        const trigger = triggerRef.current;
        if (!trigger) return;

        const rect = trigger.getBoundingClientRect();
        const gap = 8;
        const padding = 12;
        const preferredMax = 240;
        const spaceBelow = window.innerHeight - rect.bottom - gap - padding;
        const spaceAbove = rect.top - gap - padding;

        let maxHeight = Math.min(preferredMax, Math.max(spaceBelow, 0));
        let top = rect.bottom + gap;

        if (maxHeight < 120 && spaceAbove > spaceBelow) {
            maxHeight = Math.min(preferredMax, spaceAbove);
            top = Math.max(padding, rect.top - gap - maxHeight);
        }

        setMenuStyle({
            top,
            left: rect.left,
            width: rect.width,
            maxHeight: Math.max(maxHeight, 120),
        });
    }, []);

    useEffect(() => {
        if (!open) {
            setMenuStyle(null);
            return;
        }
        updateMenuPosition();
        const onReposition = () => updateMenuPosition();
        window.addEventListener('resize', onReposition);
        window.addEventListener('scroll', onReposition, true);
        return () => {
            window.removeEventListener('resize', onReposition);
            window.removeEventListener('scroll', onReposition, true);
        };
    }, [open, updateMenuPosition]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (triggerRef.current?.contains(target)) return;
            if (menuRef.current?.contains(target)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open]);

    const menuPortal = open && menuStyle && typeof document !== 'undefined'
        ? createPortal(
            <div
                ref={menuRef}
                role="listbox"
                dir="rtl"
                style={{
                    position: 'fixed',
                    top: menuStyle.top,
                    left: menuStyle.left,
                    width: menuStyle.width,
                    maxHeight: menuStyle.maxHeight,
                    zIndex: 260,
                }}
                className={s.diamondMenu}
            >
                <button
                    type="button"
                    role="option"
                    aria-selected={!value}
                    onClick={() => {
                        onChange('');
                        setOpen(false);
                    }}
                    className={!value ? s.diamondOptionActive : s.diamondOptionIdle}
                >
                    <span className="truncate">اختر النتيجة...</span>
                    {!value ? <Check size={14} className={`shrink-0 ${s.accentCheck}`} /> : null}
                </button>
                {options.map((option) => {
                    const isActive = value === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                            }}
                            className={isActive ? s.diamondOptionActive : s.diamondOptionIdle}
                        >
                            <span className="min-w-0 flex-1 text-right">
                                <span className="block truncate">{option.label}</span>
                                {option.hint ? (
                                    <span className="block text-[10px] font-normal text-white/35 truncate mt-0.5">
                                        {option.hint}
                                    </span>
                                ) : null}
                            </span>
                            {isActive ? <Check size={14} className={`shrink-0 ${s.accentCheck}`} /> : null}
                        </button>
                    );
                })}
            </div>,
            document.body,
        )
        : null;

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                aria-expanded={open}
                aria-haspopup="listbox"
                onClick={() => {
                    if (open) {
                        setOpen(false);
                        return;
                    }
                    updateMenuPosition();
                    setOpen(true);
                }}
                className={s.diamondTrigger}
            >
                <span className={`min-w-0 flex-1 truncate ${value ? 'text-white' : 'text-white/40'}`}>
                    {selected ? (
                        <>
                            <span className="block truncate">{selected.label}</span>
                            {selected.hint ? (
                                <span className="block text-[10px] font-normal text-white/35 truncate mt-0.5">
                                    {selected.hint}
                                </span>
                            ) : null}
                        </>
                    ) : (
                        'اختر النتيجة...'
                    )}
                </span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 ${s.accentChevron} transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {menuPortal}
        </>
    );
}

export const SmartJudgmentModal: React.FC<SmartJudgmentModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    currentParties,
    currentStage,
    representedParty,
    stages = [],
    caseStatus,
    activeStageIndex = -1,
}) => {
    const s = useJudgmentModalStyles();
    const [judgmentType, setJudgmentType] = useState<string>('');
    const [judgmentForm, setJudgmentForm] = useState<string>('حضوري');
    const [nextStage, setNextStage] = useState<string>('');
    const [judgmentDate, setJudgmentDate] = useState<string>(getLocalTodayYmd());

    const lawyerSide = useMemo(
        () => resolveLawyerSide(representedParty, currentParties),
        [representedParty, currentParties],
    );
    const isPlaintiffLawyer = lawyerSide === 'المدعي';
    const isDefendantLawyer = lawyerSide === 'المدعى عليه';

    const clientAppealRole = useMemo(
        () => resolveClientAppealRole(currentParties),
        [currentParties],
    );

    const priorAppealJudgment = useMemo(() => {
        if (!isCassationStageName(currentStage)) return null;
        const idx =
            activeStageIndex >= 0 ? activeStageIndex : findCassationStageIndex(stages);
        if (idx < 0) return null;
        return resolvePriorAppealJudgmentForCassation(stages, idx);
    }, [currentStage, stages, activeStageIndex]);

    const appealStageOutcome = useMemo(() => {
        if (!isAppealStageName(currentStage) || !judgmentType) return null;
        return resolveAppealStageClientOutcome(judgmentType, clientAppealRole);
    }, [currentStage, judgmentType, clientAppealRole]);

    const cassationOutcome = useMemo(() => {
        if (!isCassationStageName(currentStage) || !judgmentType) return null;
        return resolveCassationClientOutcome(
            judgmentType,
            clientAppealRole,
            priorAppealJudgment,
        );
    }, [currentStage, judgmentType, clientAppealRole, priorAppealJudgment]);

    const judgmentOptions = useMemo(
        () =>
            filterPetitionVoidFromJudgmentOptions(
                judgmentOptionsForStage(currentStage, currentParties),
            ),
        [currentStage, currentParties],
    );
    const hasInterpleaderCase = useMemo(
        () => hasInterpleaderParties(currentParties),
        [currentParties],
    );
    const isAbsentObjectionStage = isAbsentObjectionStageName(currentStage);
    const isFirstInstance = isFirstInstanceStageName(currentStage);
    const isSubjectMatterJudgmentStage = useMemo(() => {
        if (!currentStage) return false;
        if (isAppealStageName(currentStage) || isCassationStageName(currentStage)) return false;
        if (isFirstInstance) return true;
        return isPersonalStatusCoreStage(currentStage);
    }, [currentStage, isFirstInstance]);
    const canOfferAbsentObjection = useMemo(
        () =>
            canOfferAbsentObjectionToDefendant({
                currentStage,
                stages,
                judgmentForm,
                finalDecision:
                    judgmentType ??
                    stages?.[activeStageIndex >= 0 ? activeStageIndex : stages.length - 1]
                        ?.finalDecision,
            }),
        [currentStage, stages, judgmentForm, judgmentType, activeStageIndex],
    );
    const isCorrectionStage = isCassationCorrectionStageName(currentStage);
    const correctionRejectedOutcome = useMemo(() => {
        if (!isCorrectionStage || judgmentType !== 'رد طلب التصحيح') return null;
        const correctionIdx =
            activeStageIndex >= 0 ? activeStageIndex : stages.length - 1;
        return resolveCorrectionRejectedClientOutcome(
            stages,
            correctionIdx,
            clientAppealRole,
        );
    }, [isCorrectionStage, judgmentType, stages, activeStageIndex, clientAppealRole]);
    const correctionAcceptedOutcome = useMemo(() => {
        if (!isCorrectionStage || judgmentType !== 'قبول طلب التصحيح') return null;
        const correctionIdx =
            activeStageIndex >= 0 ? activeStageIndex : stages.length - 1;
        return resolveCorrectionAcceptedClientOutcome(
            stages,
            correctionIdx,
            clientAppealRole,
        );
    }, [isCorrectionStage, judgmentType, stages, activeStageIndex, clientAppealRole]);
    const correctionAvailable = useMemo(() => {
        const cassationIdx =
            isCassationStageName(currentStage)
                ? activeStageIndex >= 0
                    ? activeStageIndex
                    : findCassationStageIndex(stages)
                : findCassationStageIndex(stages);
        return canRequestCassationCorrection(stages, cassationIdx, caseStatus);
    }, [stages, caseStatus, currentStage, activeStageIndex]);

    useEffect(() => {
        if (!isOpen) return;
        setJudgmentType('');
        setNextStage('');
        setJudgmentDate(getLocalTodayYmd());
        if (isAbsentObjectionStageName(currentStage)) {
            setJudgmentForm('حضوري');
        }
    }, [isOpen, currentStage]);
    const absentObjectionAlreadyFiled = hasAbsentObjectionStageInDossier(stages);
    const showJudgmentFormToggle =
        isSubjectMatterJudgmentStage &&
        !isAbsentObjectionStage &&
        !absentObjectionAlreadyFiled;

    const handleJudgmentChange = (value: string) => {
        setJudgmentType(value);
        setNextStage('');
    };

    const handleSaveJudgment = (actionType: string) => {
        let finalAction = 'waiting_for_appeal';
        let calculatedNextStage = nextStage;
        let openObjectionModal = false;
        let openAppealTransitionModal = false;
        let openRegisterOpponentAppealModal = false;

        if (actionType === 'appeal') {
            openAppealTransitionModal = true;
            finalAction = 'waiting_for_appeal';
        } else if (actionType === 'objection') {
            finalAction = 'waiting_for_appeal';
            openObjectionModal = true;
        } else if (actionType === 'wait' || actionType === 'wait_objection') {
            finalAction = 'waiting_for_appeal';
        } else if (actionType === 'register_opponent_appeal') {
            finalAction = 'waiting_for_appeal';
            openRegisterOpponentAppealModal = true;
        } else if (actionType === 'wait_cassation') {
            finalAction = 'waiting_for_cassation';
        } else if (actionType === 'finalize_non_merit') {
            finalAction = 'finalize_non_merit';
        } else if (
            actionType === 'final_ratification'
            || actionType === 'remand_to_lower'
            || actionType === 'correction_request'
            || actionType === 'correction_complete'
            || actionType === 'correction_rejected'
        ) {
            finalAction = actionType;
        }

        const saved = onConfirm({
            action: finalAction,
            judgmentType,
            judgmentForm: showJudgmentFormToggle ? judgmentForm : (judgmentForm || 'حضوري'),
            judgmentDate,
            notes: '',
            nextStage: calculatedNextStage,
            stageName: currentStage,
            openObjectionModal,
            openAppealTransitionModal,
            openRegisterOpponentAppealModal,
            isPleadingsClosed: true,
            lastJudgmentType: judgmentForm,
        });
        if (saved !== false) onClose();
    };

    const handleArchiveAnnulled = () => {
        onConfirm({
            action: 'archive_annulled',
            judgmentType,
            judgmentForm: showJudgmentFormToggle ? judgmentForm : undefined,
            judgmentDate,
            notes: '',
        });
        onClose();
    };

    const appealRights = useMemo(() => {
        if (isAbsentObjectionStage) {
            return resolveAbsentObjectionAppealRights(judgmentType, currentParties);
        }
        return resolveFirstInstanceHadoriAppealRights(judgmentType, lawyerSide, {
            parties: currentParties,
            representedParty,
        });
    }, [
        isAbsentObjectionStage,
        judgmentType,
        lawyerSide,
        currentParties,
        representedParty,
    ]);

    const handleWaitForOpponent = () => {
        const confirmed = window.confirm(
            `سيتم قفل مرحلة المرافعة وحفظ الحكم.\n\n${appealRights.hint}\n\nتبقى الملاحظات والمستندات والسجل الزمني ظاهرة حتى تسجّل طعن الخصم.\n\nهل تريد المتابعة؟`,
        );
        if (!confirmed) return;
        handleSaveJudgment('wait');
    };

    const hadoriAppealRights = appealRights;

    const showFirstInstanceHadoriAppealActions = useMemo(() => {
        if (!judgmentType) return false;
        if (isAbsentObjectionStage) return false;
        if (judgmentType === 'إبطال' || judgmentType === 'إبطال عريضة الدعوى وعريضة التدخل') {
            return false;
        }
        if (
            isAppealStageName(currentStage)
            || isCassationStageName(currentStage)
            || isCorrectionStage
        ) {
            return false;
        }
        if (isNonMeritTerminationType(judgmentType)) return false;
        if (isInterpleaderJudgmentType(judgmentType)) return false;
        if (!isSubjectMatterJudgmentType(judgmentType)) return false;

        return judgmentForm === 'حضوري' || judgmentForm === 'غيابي';
    }, [
        judgmentType,
        judgmentForm,
        currentStage,
        isAbsentObjectionStage,
        isCorrectionStage,
    ]);

    const showAbsentObjectionAppealActions = Boolean(
        isAbsentObjectionStage && judgmentType && !isNonMeritTerminationType(judgmentType),
    );

    const showAbsentJudgmentRoleActions =
        judgmentForm === 'غيابي' &&
        canOfferAbsentObjection &&
        !isAbsentObjectionStage &&
        judgmentType !== 'إبطال' &&
        judgmentType !== 'إبطال عريضة الدعوى وعريضة التدخل' &&
        currentStage !== 'الاستئناف' &&
        !isNonMeritTerminationType(judgmentType) &&
        !showFirstInstanceHadoriAppealActions;

    const btnGold = s.isPearl ? s.btnPrimary : GLASS_BTN_GOLD;
    const btnNeutral = s.isPearl ? s.btnNeutral : GLASS_BTN_NEUTRAL;
    const btnWait = s.isPearl ? s.btnWait : GLASS_BTN_INDIGO;
    const waitHintFallback = s.isPearl
        ? 'سيُقفل الملف بانتظار انتهاء المدة القانونية لطعن الخصم.'
        : 'سيُقفل ملف البداءة بانتظار انتهاء المدة القانونية لطعن الخصم.';
    const selfAppealHintFallback = s.isPearl
        ? 'يحق لموكلك الطعن — سجّل نوع الطعن في بوابة الانتقال'
        : 'يحق لموكلك الطعن — اختر الاستئناف أو التمييز في بوابة الانتقال';
    const appealTransitionLabel = s.isPearl
        ? 'حفظ والانتقال لمرحلة الطعن'
        : 'حفظ والانتقال لمرحلة الطعن (استئناف/تمييز)';

    const plaintiffWaitAppealBlock = (
        <div className={s.waitBox}>
            <p className={`${s.hint} border-0 bg-transparent p-0 ${s.waitHintText} justify-center`}>
                <Clock size={14} className={`shrink-0 ${s.waitHintIcon}`} />
                {hadoriAppealRights.hint || waitHintFallback}
            </p>
            <button type="button" onClick={handleWaitForOpponent} className={btnWait}>
                <Clock size={16} />
                حفظ الحكم وانتظار طعن الخصم
            </button>
        </div>
    );

    const plaintiffNonMeritFinalizeBlock = (
        <div className="flex flex-col gap-2">
            <p className={`${s.hint} text-emerald-300/85 border-emerald-500/15 justify-center`}>
                <Trophy size={14} className="shrink-0 text-emerald-400/80" />
                إنهاء نهائي — مكتسبة الدرجة القطعية
            </p>
            <button type="button" onClick={() => handleSaveJudgment('finalize_non_merit')} className={GLASS_BTN_EMERALD}>
                <Stamp size={16} />
                ختم الإضبارة (مكتسبة الدرجة القطعية)
            </button>
        </div>
    );

    const defendantAppealBlock = (
        <div className="flex flex-col gap-2">
            <p className={`${s.hint} text-rose-300/85 border-rose-500/15 justify-center`}>
                <ShieldAlert size={14} className="shrink-0 text-rose-400/80" />
                {hadoriAppealRights.hint || selfAppealHintFallback}
            </p>
            <button
                type="button"
                onClick={() => handleSaveJudgment('appeal')}
                className={btnGold}
            >
                {appealTransitionLabel}
            </button>
        </div>
    );

    const renderFirstInstanceHadoriAppealActions = () => {
        switch (hadoriAppealRights.action) {
            case 'wait_opponent':
                return plaintiffWaitAppealBlock;
            case 'self_appeal':
                return defendantAppealBlock;
            case 'finalize_non_merit':
                return plaintiffNonMeritFinalizeBlock;
            case 'both_paths':
                return (
                    <div className="flex flex-col gap-2">
                        <p className={`${s.hint} border-0 bg-transparent p-0 ${s.waitHintText} justify-center`}>
                            <Info size={14} className={`shrink-0 ${s.waitHintIcon}`} />
                            {hadoriAppealRights.hint ||
                                'حدّد موقف موكلك: إن كنت الكاسب انتظر طعن الخصم، وإن كنت الخاسر انتقل للطعن.'}
                        </p>
                        <button type="button" onClick={handleWaitForOpponent} className={btnWait}>
                            <Clock size={16} />
                            حفظ الحكم وانتظار طعن الخصم (الكاسب)
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSaveJudgment('appeal')}
                            className={btnGold}
                        >
                            {appealTransitionLabel} (الخاسر)
                        </button>
                    </div>
                );
            case 'none':
                if (!isSubjectMatterJudgmentType(judgmentType)) return null;
                return (
                    <div className="flex flex-col gap-2">
                        <p className={`${s.hint} border-0 bg-transparent p-0 ${s.waitHintText} justify-center`}>
                            <Info size={14} className={`shrink-0 ${s.waitHintIcon}`} />
                            {hadoriAppealRights.hint ||
                                'حدّد موقف موكلك: إن كنت الكاسب انتظر طعن الخصم، وإن كنت الخاسر انتقل للطعن.'}
                        </p>
                        <button type="button" onClick={handleWaitForOpponent} className={btnWait}>
                            <Clock size={16} />
                            حفظ الحكم وانتظار طعن الخصم
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSaveJudgment('appeal')}
                            className={btnGold}
                        >
                            {appealTransitionLabel}
                        </button>
                    </div>
                );
            default:
                if (!isSubjectMatterJudgmentType(judgmentType)) return null;
                return (
                    <div className="flex flex-col gap-2">
                        <p className={`${s.hint} border-0 bg-transparent p-0 ${s.waitHintText} justify-center`}>
                            <Info size={14} className={`shrink-0 ${s.waitHintIcon}`} />
                            {hadoriAppealRights.hint ||
                                'حدّد موقف موكلك: إن كنت الكاسب انتظر طعن الخصم، وإن كنت الخاسر انتقل للطعن.'}
                        </p>
                        <button type="button" onClick={handleWaitForOpponent} className={btnWait}>
                            <Clock size={16} />
                            حفظ الحكم وانتظار طعن الخصم
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSaveJudgment('appeal')}
                            className={btnGold}
                        >
                            {appealTransitionLabel}
                        </button>
                    </div>
                );
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={s.overlay}
            dir="rtl"
            data-testid="smart-judgment-modal"
            hidden={!isOpen}
            aria-hidden={!isOpen}
            style={isOpen ? undefined : { display: 'none' }}
        >
            {isOpen ? (
            <div className={s.shell}>
                        <div className={s.header}>
                            <div className="flex items-center gap-3 min-w-0">
                                <h2 className={s.headerTitle}>
                                    {isAbsentObjectionStage
                                        ? 'ختام المرافعة وقرار الاعتراض'
                                        : isCorrectionStage
                                          ? 'قرار طلب تصحيح القرار التمييزي'
                                          : 'ختم المرافعة وقرار الحكم'}
                                </h2>
                            </div>
                            <button type="button" onClick={onClose} className={s.closeBtn} aria-label="إغلاق">
                                <X size={18} />
                            </button>
                        </div>

                        <div className={s.body}>
                            {showJudgmentFormToggle && (
                                <div className={s.section}>
                                    <label className={s.label}>
                                        <Scale size={13} className={s.labelIcon} />
                                        شكل الحكم
                                    </label>
                                    <div className="flex gap-2 w-full">
                                        <button
                                            type="button"
                                            onClick={() => setJudgmentForm('حضوري')}
                                            className={`${s.toggle} ${
                                                judgmentForm === 'حضوري' ? s.toggleActive : s.toggleIdle
                                            }`}
                                        >
                                            <Users size={14} />
                                            حكم حضوري
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setJudgmentForm('غيابي')}
                                            className={`${s.toggle} ${
                                                judgmentForm === 'غيابي' ? s.toggleActive : s.toggleIdle
                                            }`}
                                        >
                                            <UserX size={14} />
                                            حكم غيابي
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className={s.diamondSection}>
                                <label className={s.label}>
                                    <Scale size={13} className={s.labelIcon} />
                                    {isAbsentObjectionStage
                                        ? 'قرار الحكم في الاعتراض على الحكم الغيابي'
                                        : 'قرار الحكم (نتيجة الدعوى)'}
                                </label>
                                <DiamondJudgmentPicker
                                    value={judgmentType}
                                    onChange={handleJudgmentChange}
                                    options={judgmentOptions}
                                    styles={s}
                                />
                            </div>

                            <div className={s.section}>
                                <label className={s.label}>
                                    <CalendarDays size={13} className={s.labelIcon} />
                                    تاريخ الحكم
                                </label>
                                <input
                                    type="date"
                                    value={judgmentDate}
                                    onChange={(e) => setJudgmentDate(e.target.value)}
                                    className={s.field}
                                />
                            </div>

                            {isSulhJudgmentType(judgmentType) && (
                                <div className={`${s.hint} text-emerald-300/90 border-emerald-500/15 bg-emerald-500/[0.04]`}>
                                    <Info size={14} className="shrink-0 mt-0.5 text-emerald-400/80" />
                                    <span>يعتبر الصلح بمثابة حكم مكتسب الدرجة القطعية.</span>
                                </div>
                            )}

                            {judgmentType ? (
                                <div className={`flex flex-col gap-3 w-full ${s.divider}`}>
                                    {(showAbsentObjectionAppealActions || showFirstInstanceHadoriAppealActions)
                                        ? renderFirstInstanceHadoriAppealActions()
                                        : null}

                                    {showAbsentJudgmentRoleActions ? (
                                        <>
                                            {isPlaintiffLawyer &&
                                                (judgmentType === 'إجابة الدعوى بالكامل' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSaveJudgment('wait_objection')}
                                                        className={btnWait}
                                                    >
                                                        حفظ الحكم وانتظار اعتراض الخصم
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSaveJudgment('appeal')}
                                                        className={btnGold}
                                                    >
                                                        {appealTransitionLabel}
                                                    </button>
                                                ))}
                                            {isDefendantLawyer &&
                                                (judgmentType === 'رد الدعوى كلياً' ? (
                                                    <button
                                                        type="button"
                                                        onClick={handleWaitForOpponent}
                                                        className={btnWait}
                                                    >
                                                        حفظ الحكم وانتظار طعن الخصم
                                                    </button>
                                                ) : (
                                                    <div className="flex flex-col gap-2 w-full">
                                                        <p
                                                            className={`${s.hint} text-rose-300/85 border-rose-500/15 justify-center`}
                                                        >
                                                            <ShieldAlert
                                                                size={14}
                                                                className="shrink-0 text-rose-400/80"
                                                            />
                                                            صدر حكم غيابي ضد موكلك
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveJudgment('objection')}
                                                            className={GLASS_BTN_ROSE}
                                                        >
                                                            حفظ وتقديم اعتراض غيابي
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveJudgment('appeal')}
                                                            className={btnNeutral}
                                                        >
                                                            حفظ وترك الحكم غيابياً (انتقال للطعن)
                                                        </button>
                                                    </div>
                                                ))}
                                        </>
                                    ) : null}

                                    {isAppealStageName(currentStage) && judgmentType && (
                                        <div className="flex flex-col gap-3 w-full">
                                            {appealStageOutcome === 'win' ? (
                                                <div className="flex flex-col gap-2">
                                                    <p className={`${s.hint} text-emerald-300/85 border-emerald-500/15 justify-center`}>
                                                        <Trophy size={14} className="shrink-0 text-emerald-400/80" />
                                                        موكلك ربح مرحلة الاستئناف — بانتظار تمييز الخصم
                                                    </p>
                                                    <button type="button" onClick={() => handleSaveJudgment('wait_cassation')} className={btnWait}>
                                                        حفظ القرار وانتظار طعن الخصم (تمييزاً)
                                                    </button>
                                                </div>
                                            ) : appealStageOutcome === 'loss' ? (
                                                <div className="flex flex-col gap-2">
                                                    <p className={`${s.hint} text-rose-300/85 border-rose-500/15 justify-center`}>
                                                        <ShieldAlert size={14} className="shrink-0 text-rose-400/80" />
                                                        موكلك خسر مرحلة الاستئناف — يحق له الطعن تمييزاً
                                                    </p>
                                                    <button type="button" onClick={() => handleSaveJudgment('appeal')} className={btnGold}>
                                                        حفظ والانتقال لمحكمة التمييز
                                                    </button>
                                                </div>
                                            ) : appealStageOutcome === 'partial' ? (
                                                <div className="flex flex-col gap-2">
                                                    <p className={`${s.hint} text-[#E6C673]/85 border-[#E6C673]/15 justify-center`}>
                                                        <Info size={14} className={`shrink-0 ${s.isPearl ? 'text-[#F0A8B4]/80' : 'text-[#E6C673]/80'}`} />
                                                        حكم جزئي — يحق للطرفين الطعن تمييزاً فيما حُسم عليه
                                                    </p>
                                                    <button type="button" onClick={() => handleSaveJudgment('wait_cassation')} className={btnWait}>
                                                        حفظ وانتظار تمييز الخصم
                                                    </button>
                                                    <button type="button" onClick={() => handleSaveJudgment('appeal')} className={btnGold}>
                                                        حفظ والانتقال للتمييز
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    <p className={`${s.hint} border-0 bg-transparent p-0 ${s.waitHintText} justify-center`}>
                                                        <Info size={14} className={`shrink-0 ${s.waitHintIcon}`} />
                                                        حدّد موقف موكلك: الكاسب ينتظر تمييز الخصم، والخاسر يطعن تمييزاً.
                                                    </p>
                                                    <button type="button" onClick={() => handleSaveJudgment('wait_cassation')} className={btnWait}>
                                                        حفظ وانتظار تمييز الخصم (الكاسب)
                                                    </button>
                                                    <button type="button" onClick={() => handleSaveJudgment('appeal')} className={btnGold}>
                                                        حفظ والانتقال للتمييز (الخاسر)
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {isCassationStageName(currentStage) && judgmentType && (
                                        <div className="flex flex-col gap-3 w-full">
                                            {judgmentType === 'تصديق الحكم' || judgmentType === 'رد الطعن التمييزي شكلاً' ? (
                                                cassationOutcome === 'loss' ? (
                                                    <div className="flex flex-col gap-2">
                                                        <p className={`${s.hint} text-rose-300/85 border-rose-500/15 justify-center`}>
                                                            <ShieldAlert size={14} className="shrink-0 text-rose-400/80" />
                                                            تصديق الحكم — اكتسب الدرجة القطعية (حكم نهائي ضد موكلك)
                                                        </p>
                                                        <button type="button" onClick={() => handleSaveJudgment('final_ratification')} className={GLASS_BTN_NEUTRAL}>
                                                            <Stamp size={16} />
                                                            ختم الإضبارة (مكتسبة الدرجة القطعية)
                                                        </button>
                                                        {!correctionAvailable ? null : (
                                                            <button type="button" onClick={() => handleSaveJudgment('correction_request')} className={`${btnNeutral} text-xs py-2.5`}>
                                                                تقديم طلب تصحيح قرار تمييزي
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col gap-2">
                                                        <p className={`${s.hint} text-emerald-300/85 border-emerald-500/15 justify-center`}>
                                                            <Trophy size={14} className="shrink-0 text-emerald-400/80" />
                                                            {cassationOutcome === 'win'
                                                                ? 'موكلك ربح — اكتسب الحكم الدرجة القطعية'
                                                                : 'اكتسب الحكم الدرجة القطعية (نهاية المطاف)'}
                                                        </p>
                                                        <button type="button" onClick={() => handleSaveJudgment('final_ratification')} className={GLASS_BTN_EMERALD}>
                                                            ختم الإضبارة (مكتسبة الدرجة القطعية)
                                                        </button>
                                                        {!correctionAvailable ? null : (
                                                            <button type="button" onClick={() => handleSaveJudgment('correction_request')} className={`${btnNeutral} text-xs py-2.5`}>
                                                                تقديم طلب تصحيح قرار تمييزي
                                                            </button>
                                                        )}
                                                    </div>
                                                )
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    <p className={`${s.hint} ${cassationOutcome === 'remand_favorable' ? 'text-emerald-300/85 border-emerald-500/15' : s.isPearl ? 'text-[#FFD4DC]/85 border-[#F0A8B4]/15' : 'text-[#E6C673]/85 border-[#E6C673]/15'} justify-center`}>
                                                        <ArrowLeftRight size={14} className={`shrink-0 ${s.isPearl ? 'text-[#F0A8B4]/80' : 'text-[#E6C673]/80'}`} />
                                                        {cassationOutcome === 'remand_favorable'
                                                            ? 'نقض الحكم — قد يُعاد لصالح موكلك بعد إعادة الإضبارة'
                                                            : 'تم نقض الحكم — يجب إعادة الدعوى للمحكمة السابقة'}
                                                    </p>
                                                    <button type="button" onClick={() => handleSaveJudgment('remand_to_lower')} className={btnGold}>
                                                        إعادة الإضبارة (لاتباع القرار التمييزي)
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {isCorrectionStage && judgmentType === 'رد طلب التصحيح' ? (
                                        correctionRejectedOutcome === 'loss' ? (
                                            <div className="flex flex-col gap-2 w-full">
                                                <p className={`${s.hint} text-rose-300/85 border-rose-500/15 justify-center`}>
                                                    <ShieldAlert size={14} className="shrink-0 text-rose-400/80" />
                                                    رد طلب التصحيح — يُؤيد القرار التمييزي ويكتسب الدرجة القطعية (حكم نهائي ضد موكلك)
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveJudgment('correction_rejected')}
                                                    className={GLASS_BTN_NEUTRAL}
                                                >
                                                    <Stamp size={16} />
                                                    ختم الإضبارة (مكتسبة الدرجة القطعية)
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2 w-full">
                                                <p
                                                    className={`${s.hint} ${
                                                        correctionRejectedOutcome === 'win'
                                                            ? 'text-emerald-300/85 border-emerald-500/15'
                                                            : 'text-[#E6C673]/85 border-[#E6C673]/15'
                                                    } justify-center`}
                                                >
                                                    {correctionRejectedOutcome === 'win' ? (
                                                        <Trophy size={14} className="shrink-0 text-emerald-400/80" />
                                                    ) : (
                                                        <Info size={14} className="shrink-0 text-[#E6C673]/80" />
                                                    )}
                                                    {correctionRejectedOutcome === 'win'
                                                        ? 'رد طلب التصحيح — يُؤيد القرار التمييزي لصالح موكلك ويكتسب الدرجة القطعية'
                                                        : 'رد طلب التصحيح — يُؤيد القرار التمييزي ويكتسب الدرجة القطعية'}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveJudgment('correction_rejected')}
                                                    className={
                                                        correctionRejectedOutcome === 'win'
                                                            ? GLASS_BTN_EMERALD
                                                            : GLASS_BTN_NEUTRAL
                                                    }
                                                >
                                                    <Stamp size={16} />
                                                    ختم الإضبارة (مكتسبة الدرجة القطعية)
                                                </button>
                                            </div>
                                        )
                                    ) : null}

                                    {isCorrectionStage && judgmentType === 'قبول طلب التصحيح' ? (
                                        correctionAcceptedOutcome === 'win' ? (
                                            <div className="flex flex-col gap-2 w-full">
                                                <p className={`${s.hint} text-emerald-300/85 border-emerald-500/15 justify-center`}>
                                                    <Trophy size={14} className="shrink-0 text-emerald-400/80" />
                                                    قبول التصحيح — يُعاد النظر لصالح موكلك بعد إلغاء القفل القطعي
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveJudgment('correction_complete')}
                                                    className={GLASS_BTN_EMERALD}
                                                >
                                                    إتمام التصحيح والعودة لمرحلة الترافع
                                                </button>
                                            </div>
                                        ) : correctionAcceptedOutcome === 'loss' ? (
                                            <div className="flex flex-col gap-2 w-full">
                                                <p className={`${s.hint} text-rose-300/85 border-rose-500/15 justify-center`}>
                                                    <ShieldAlert size={14} className="shrink-0 text-rose-400/80" />
                                                    قبول التصحيح — يُعاد النظر ضد موكلك بعد إلغاء القفل القطعي
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveJudgment('correction_complete')}
                                                    className={GLASS_BTN_NEUTRAL}
                                                >
                                                    إتمام التصحيح والعودة لمرحلة الترافع
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2 w-full">
                                                <p className={`${s.hint} text-[#E6C673]/85 border-[#E6C673]/15 justify-center`}>
                                                    <ArrowLeftRight size={14} className={`shrink-0 ${s.isPearl ? 'text-[#F0A8B4]/80' : 'text-[#E6C673]/80'}`} />
                                                    قبول التصحيح — تُعاد الإضبارة لآخر مرحلة ترافع نشطة (استئناف أو تمييز).
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveJudgment('correction_complete')}
                                                    className={btnGold}
                                                >
                                                    إتمام التصحيح والعودة لمرحلة الترافع
                                                </button>
                                            </div>
                                        )
                                    ) : null}

                                    <button type="button" onClick={onClose} className={`${btnNeutral} text-white/50 hover:text-white/75 mt-1`}>
                                        إلغاء
                                    </button>
                                </div>
                            ) : (
                                <div className="mt-4 flex flex-col items-center opacity-45 py-4">
                                    <p className="text-white/35 text-sm">اختر قرار الحكم أولاً لإظهار الخيارات المتاحة</p>
                                </div>
                            )}
                        </div>
            </div>
            ) : null}
        </div>,
        document.body,
    );
};
