import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { motion, AnimatePresence } from 'motion/react';
import { X, Scale, ArrowRightLeft, Check, CalendarDays, Hash, Gavel } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { IncidentalCase, Party } from '../LawyerShared';
import { resolveOpponentAsAppellant } from './smartFile/appealStageTransition';
import {
    inferAppellantSideFromLawyer,
    resolveAppealDossierLayout,
    resolveAppellantLegalSideFromSelection,
    resolveOpponentRegistrationAppealLayout,
    filterVisibleAppellantParties,
    filterVisibleOpponentParties,
    isInterpleaderAppealParty,
    resolveAppealPartyPickerVisibility,
} from './smartFile/appealPartyEngine';
import {
    filterMethodsForAppealRoute,
    isAppellateAppealAllowed,
    resolveCassationOnlyHint,
    type AppealRouteContext,
} from './smartFile/appealRouteEligibility';
import { resolveAllowedOpponentAppealMethods, resolveFirstInstanceHadoriAppealRights } from './smartFile/judgmentTypes';
import { isAbsentJudgmentForm } from './smartFile/absentJudgmentFlow';
import {
    filterPersonalStatusAppealMethods,
    isPersonalStatusStageName,
} from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import { useJudgmentModalStyles } from './smartFile/smartModalChrome';

export type AppealTransitionMode = 'postJudgment' | 'opponentRegistration';

interface AppealTransitionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: {
        appealType: string;
        appellant: string;
        filingDate: string;
        newCaseNumber: string;
        notes: string;
        includedOpponentPartyIds?: Array<number | string>;
        includedAppellantPartyIds?: Array<number | string>;
        appealDossierMode?: 'standard' | 'interpleader_appellant' | 'against_interpleader';
    }) => void;
    currentParties: Array<{ id: number | string; name: string; role?: string; isClient?: boolean }>;
    representedParty: string;
    judgmentType?: string;
    judgmentForm?: string;
    lastJudgmentType?: string | null;
    stageName?: string | null;
    incidentalCases?: IncidentalCase[];
    appealRoute?: AppealRouteContext;
    mode?: AppealTransitionMode;
}

const GLASS_CARD =
    'rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-4 space-y-3';

function normalizeAppealMethodValue(method: string): string {
    if (method === 'اعتراض غيابي') return 'اعتراض على الحكم الغيابي';
    return method;
}

function appealMethodLabel(method: string): string {
    if (method === 'اعتراض غيابي') return 'اعتراض على الحكم الغيابي';
    return method;
}

function defaultAppealType(
    judgmentForm?: string,
    appealRoute?: AppealRouteContext,
    allowedMethods?: string[],
    stageName?: string | null,
): string {
    if (allowedMethods && allowedMethods.length > 0) {
        return normalizeAppealMethodValue(allowedMethods[0]);
    }
    if (String(judgmentForm ?? '').includes('غيابي')) {
        return 'اعتراض على الحكم الغيابي';
    }
    if (appealRoute && !isAppellateAppealAllowed(appealRoute)) {
        return 'تمييز';
    }
    if (stageName && isPersonalStatusStageName(stageName)) {
        return 'تمييز';
    }
    return 'استئناف';
}

export const AppealTransitionModal: React.FC<AppealTransitionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    currentParties,
    representedParty,
    judgmentType,
    judgmentForm,
    lastJudgmentType,
    stageName,
    incidentalCases,
    appealRoute,
    mode = 'postJudgment',
}) => {
    const s = useJudgmentModalStyles();
    const isOpponentRegistration = mode === 'opponentRegistration';
    const isGhayabi = isAbsentJudgmentForm(judgmentForm, lastJudgmentType);
    const showJudgmentFormMeta =
        Boolean(judgmentForm) &&
        !String(stageName ?? '').includes('استئناف') &&
        !String(stageName ?? '').includes('تمييز');
    useEffect(() => {
        if (!isOpen) return;
        // #region debug-point B:appeal-transition-modal-open
        fetch('http://127.0.0.1:7777/event', {
            method: 'POST',
            body: JSON.stringify({
                sessionId: 'opponent-appeal-crash',
                runId: 'pre-fix',
                hypothesisId: 'B',
                location: 'AppealTransitionModal.tsx:useEffect:isOpen',
                msg: '[DEBUG] AppealTransitionModal opened',
                data: {
                    mode,
                    stageName: stageName ?? null,
                    judgmentType: judgmentType ?? null,
                    judgmentForm: judgmentForm ?? null,
                    lastJudgmentType: lastJudgmentType ?? null,
                    representedParty: representedParty ?? null,
                    partyCount: Array.isArray(currentParties) ? currentParties.length : 0,
                    incidentalCount: Array.isArray(incidentalCases) ? incidentalCases.length : 0,
                    appealRouteStage: appealRoute?.stageName ?? appealRoute?.currentStage ?? null,
                },
                ts: Date.now(),
            }),
        }).catch(() => {});
        // #endregion
    }, [
        isOpen,
        mode,
        stageName,
        judgmentType,
        judgmentForm,
        lastJudgmentType,
        representedParty,
        currentParties,
        incidentalCases,
        appealRoute,
    ]);

    const allowedOpponentMethods = useMemo(
        () =>
            isOpponentRegistration
                ? resolveAllowedOpponentAppealMethods({
                      judgmentForm,
                      lastJudgmentType,
                      stageName,
                      appealRoute,
                  })
                : [],
        [isOpponentRegistration, judgmentForm, lastJudgmentType, stageName, appealRoute],
    );

    const standardAppellantSide = useMemo(() => {
        if (isOpponentRegistration) {
            return resolveOpponentAsAppellant(representedParty, currentParties);
        }
        return inferAppellantSideFromLawyer(representedParty, currentParties);
    }, [isOpponentRegistration, representedParty, currentParties]);

    const dossierLayout = useMemo(
        () =>
            isOpponentRegistration
                ? resolveOpponentRegistrationAppealLayout(
                      currentParties as Party[],
                      representedParty,
                      incidentalCases,
                  )
                : resolveAppealDossierLayout(currentParties as Party[], {
                      judgmentType,
                      representedParty,
                      incidentalCases,
                      standardAppellantSide,
                  }),
        [
            isOpponentRegistration,
            currentParties,
            judgmentType,
            representedParty,
            incidentalCases,
            standardAppellantSide,
        ],
    );

    const appellantParties = dossierLayout.appellantParties;
    const opponentParties = dossierLayout.opponentParties;

    const [selectedAppellantIds, setSelectedAppellantIds] = useState<Array<number | string>>(
        () => dossierLayout.defaultAppellantIds,
    );

    const [selectedOpponentIds, setSelectedOpponentIds] = useState<Array<number | string>>(
        () => dossierLayout.defaultOpponentIds,
    );

    const visibleAppellantParties = useMemo(
        () => filterVisibleAppellantParties(appellantParties, selectedOpponentIds),
        [appellantParties, selectedOpponentIds],
    );
    const visibleOpponentParties = useMemo(
        () => filterVisibleOpponentParties(opponentParties, selectedAppellantIds),
        [opponentParties, selectedAppellantIds],
    );

    const { showAppellantPicker, showOpponentPicker } = useMemo(
        () =>
            resolveAppealPartyPickerVisibility({
                dossierLayout,
                visibleAppellantParties,
                visibleOpponentParties,
                parties: currentParties as Party[],
                incidentalCases,
            }),
        [dossierLayout, visibleAppellantParties, visibleOpponentParties, currentParties, incidentalCases],
    );

    const [appealType, setAppealType] = useState<string>(() =>
        defaultAppealType(judgmentForm, appealRoute, allowedOpponentMethods, stageName),
    );
    const [filingDate, setFilingDate] = useState<string>(getLocalTodayYmd());
    const [newCaseNumber, setNewCaseNumber] = useState<string>('');
    const wasOpenRef = useRef(false);

    const appealRights = useMemo(
        () =>
            judgmentType
                ? resolveFirstInstanceHadoriAppealRights(judgmentType, null, {
                      parties: currentParties as Party[],
                      representedParty,
                  })
                : null,
        [judgmentType, currentParties, representedParty],
    );

    useEffect(() => {
        if (!isOpen) {
            wasOpenRef.current = false;
            return;
        }

        if (!wasOpenRef.current) {
            setAppealType(defaultAppealType(judgmentForm, appealRoute, allowedOpponentMethods, stageName));
            setFilingDate(getLocalTodayYmd());
            setNewCaseNumber('');
            setSelectedAppellantIds(dossierLayout.defaultAppellantIds);
            setSelectedOpponentIds(dossierLayout.defaultOpponentIds);
            wasOpenRef.current = true;
        }
    }, [isOpen, judgmentForm, appealRoute, allowedOpponentMethods, dossierLayout, stageName]);

    const isPersonalAppeal = isPersonalStatusStageName(stageName);
    const isFromAppealStage = !isPersonalAppeal && String(stageName ?? '').includes('استئناف');

    const appealTypeOptions = useMemo(() => {
        if (isFromAppealStage && !isOpponentRegistration) {
            return [{ value: 'تمييز', label: 'تمييز' }];
        }
        if (isOpponentRegistration) {
            return allowedOpponentMethods.map((method) => ({
                value: normalizeAppealMethodValue(method),
                label: appealMethodLabel(method),
            }));
        }
        const base = isGhayabi
            ? [
                  { value: 'اعتراض على الحكم الغيابي', label: 'اعتراض غيابي' },
                  ...(isPersonalAppeal ? [] : [{ value: 'استئناف', label: 'استئناف' }]),
                  { value: 'تمييز', label: 'تمييز' },
              ]
            : [
                  ...(isPersonalAppeal ? [] : [{ value: 'استئناف', label: 'استئناف' }]),
                  { value: 'تمييز', label: 'تمييز' },
              ];
        if (!appealRoute) return base;
        const allowedValues = filterMethodsForAppealRoute(
            base.map((o) => o.value),
            appealRoute,
        );
        return base.filter((o) => allowedValues.includes(o.value));
    }, [isFromAppealStage, isOpponentRegistration, allowedOpponentMethods, isGhayabi, appealRoute, isPersonalAppeal]);

    const cassationOnlyHint =
        appealRoute && !isAppellateAppealAllowed(appealRoute)
            ? resolveCassationOnlyHint(appealRoute)
            : null;

    useEffect(() => {
        if (!appealTypeOptions.some((o) => o.value === appealType)) {
            setAppealType(appealTypeOptions[0]?.value ?? 'تمييز');
        }
    }, [appealTypeOptions, appealType]);

    const toggleOpponent = (id: number | string) => {
        const party = opponentParties.find((p) => String(p.id) === String(id));
        const interpleader = party && isInterpleaderAppealParty(party as Party);

        setSelectedOpponentIds((prev) => {
            const adding = !prev.some((x) => String(x) === String(id));
            if (adding && interpleader) {
                setSelectedAppellantIds((app) => app.filter((x) => String(x) !== String(id)));
                return [...prev, id];
            }
            return adding ? [...prev, id] : prev.filter((x) => String(x) !== String(id));
        });
    };

    const toggleAppellant = (id: number | string) => {
        const party = appellantParties.find((p) => String(p.id) === String(id));
        const interpleader = party && isInterpleaderAppealParty(party as Party);

        setSelectedAppellantIds((prev) => {
            const adding = !prev.some((x) => String(x) === String(id));
            if (adding && interpleader) {
                setSelectedOpponentIds((opp) => opp.filter((x) => String(x) !== String(id)));
                return [...prev, id];
            }
            return adding ? [...prev, id] : prev.filter((x) => String(x) !== String(id));
        });
    };

    const appellantLabel = dossierLayout.appellantSideLabel;
    const opponentLabel = dossierLayout.opponentSideLabel;

    const caseNumberLabel = appealType.includes('تمييز')
        ? 'رقم دعوى التمييز'
        : appealType.includes('اعتراض')
          ? 'رقم دعوى الاعتراض'
          : isPersonalAppeal
            ? 'رقم دعوى الطعن'
            : 'رقم دعوى الاستئناف';

    const hintShell = s.isPearl
        ? 'rounded-xl border border-[#F0A8B4]/18 bg-gradient-to-br from-[#F5C6D0]/[0.08] to-white/[0.03] px-3.5 py-2.5 space-y-1'
        : 'rounded-xl border border-[#E6C673]/15 bg-[#E6C673]/[0.05] px-3.5 py-2.5 space-y-1';

    const appellantPickerCard = s.isPearl
        ? `${s.section} border-[#F0A8B4]/22 bg-gradient-to-br from-[#F5C6D0]/[0.08] to-white/[0.03]`
        : `${GLASS_CARD} border-emerald-500/15 bg-emerald-500/[0.03]`;

    const opponentPickerCard = s.isPearl
        ? `${s.section} border-white/[0.14] bg-white/[0.03]`
        : `${GLASS_CARD} border-indigo-500/15 bg-indigo-500/[0.03]`;

    const appellantPickerTitle = s.isPearl ? 'text-[#FFD4DC]/95' : 'text-emerald-200/90';
    const opponentPickerTitle = s.isPearl ? 'text-[#ECE8E2]/90' : 'text-indigo-200/90';

    const appellantRowSelected = s.isPearl
        ? 'border-[#F0A8B4]/32 bg-[#F5C6D0]/10 text-[#FFFEF9]'
        : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-50';

    const appellantRowIdle = s.isPearl
        ? 'border-white/[0.08] bg-transparent text-[#9894A0] hover:bg-white/[0.04]'
        : 'border-white/[0.06] bg-transparent text-white/45 hover:bg-white/[0.03]';

    const appellantCheckSelected = s.isPearl
        ? 'border-[#F0A8B4]/40 bg-[#F5C6D0]/20 text-[#FFD4DC]'
        : 'border-emerald-300/40 bg-emerald-400/20 text-emerald-100';

    const opponentRowSelected = s.isPearl
        ? 'border-white/[0.22] bg-white/[0.08] text-[#FFFEF9]'
        : 'border-indigo-400/30 bg-indigo-500/10 text-indigo-50';

    const opponentRowIdle = s.isPearl
        ? 'border-white/[0.08] bg-transparent text-[#9894A0] hover:bg-white/[0.04]'
        : 'border-white/[0.06] bg-transparent text-white/45 hover:bg-white/[0.03]';

    const opponentCheckSelected = s.isPearl
        ? 'border-white/[0.28] bg-white/[0.12] text-[#ECE8E2]'
        : 'border-indigo-300/40 bg-indigo-400/20 text-indigo-100';

    const handleSubmit = () => {
        if (showAppellantPicker && selectedAppellantIds.length === 0) {
            SmartToast.error('⚠️ اختر طرفاً واحداً على الأقل من الطاعنين');
            return;
        }
        if (showOpponentPicker && selectedOpponentIds.length === 0) {
            SmartToast.error('⚠️ اختر طرفاً واحداً على الأقل للمخاصمة في الطعن');
            return;
        }
        const appellantLegalSide = resolveAppellantLegalSideFromSelection(
            showAppellantPicker ? selectedAppellantIds : dossierLayout.defaultAppellantIds,
            appellantParties,
            dossierLayout.appellantLegalSide,
        );

        onConfirm({
            appealType,
            appellant: appellantLegalSide,
            filingDate,
            newCaseNumber: newCaseNumber.trim(),
            notes: '',
            includedOpponentPartyIds: showOpponentPicker ? selectedOpponentIds : undefined,
            includedAppellantPartyIds: showAppellantPicker ? selectedAppellantIds : undefined,
            appealDossierMode: dossierLayout.mode,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className={s.overlay} dir="rtl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        className={s.shell}
                    >
                        <div className={s.header}>
                            <div className="flex items-center gap-3 min-w-0">
                                <span className={s.headerIconWrap}>
                                    <ArrowRightLeft size={18} className={s.headerIcon} />
                                </span>
                                <div className="min-w-0">
                                    <h2 className={s.headerTitle}>
                                        {isOpponentRegistration
                                            ? isGhayabi
                                                ? 'تسجيل طعن الحكم الغيابي'
                                                : 'تسجيل طعن الخصم'
                                            : 'بوابة الطعن'}
                                    </h2>
                                    <p className={`text-[11px] truncate ${s.isPearl ? 'text-[#9894A0]' : 'text-white/40'}`}>
                                        انقلاب المراكز وإنشاء إضبارة الطعن
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className={s.closeBtn}
                                aria-label="إغلاق"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className={s.body}>
                            {(judgmentType || cassationOnlyHint || appealRights?.hint) && (
                                <div className={hintShell}>
                                    {judgmentType ? (
                                        <p className={`text-xs leading-relaxed ${s.isPearl ? 'text-[#ECE8E2]/85' : 'text-white/75'}`}>
                                            <Gavel size={12} className={`inline ml-1 ${s.labelIcon}`} />
                                            <span className={s.isPearl ? 'text-[#9894A0]' : 'text-white/45'}> المنطوق: </span>
                                            <span className={`font-bold ${s.isPearl ? 'text-[#FFFEF9]' : 'text-[#E6C673]/90'}`}>{judgmentType}</span>
                                            {showJudgmentFormMeta ? (
                                                <span className={s.isPearl ? 'text-[#9894A0]/80' : 'text-white/35'}> · {judgmentForm}</span>
                                            ) : null}
                                        </p>
                                    ) : null}
                                    {appealRights?.hint ? (
                                        <p className={`text-[11px] leading-relaxed ${s.isPearl ? 'text-[#9894A0]' : 'text-white/50'}`}>{appealRights.hint}</p>
                                    ) : null}
                                    {cassationOnlyHint ? (
                                        <p className={`text-[11px] leading-relaxed ${s.isPearl ? 'text-[#FFD4DC]/85' : 'text-amber-200/80'}`}>{cassationOnlyHint}</p>
                                    ) : null}
                                </div>
                            )}

                            <div className={s.section}>
                                <p className={s.label}>
                                    <Scale size={12} className={s.labelIcon} />
                                    نوع الطعن
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {appealTypeOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => setAppealType(opt.value)}
                                            className={`flex-1 min-w-[5.5rem] py-2.5 px-3 rounded-xl border text-sm transition-all ${
                                                appealType === opt.value ? s.toggleActive : s.toggleIdle
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {(showAppellantPicker || showOpponentPicker) && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {showAppellantPicker ? (
                                        <div className={appellantPickerCard}>
                                            <p className={`text-xs font-bold ${appellantPickerTitle}`}>
                                                {isOpponentRegistration
                                                    ? `الطرف الذي قام بالطعن · ${appellantLabel}`
                                                    : `الطاعنون · ${appellantLabel}`}
                                            </p>
                                            <div className="space-y-1.5 mt-3">
                                                {visibleAppellantParties.map((party) => {
                                                    const selected = selectedAppellantIds.includes(party.id);
                                                    return (
                                                        <button
                                                            key={String(party.id)}
                                                            type="button"
                                                            onClick={() => toggleAppellant(party.id)}
                                                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-right text-sm transition-all ${
                                                                selected ? appellantRowSelected : appellantRowIdle
                                                            }`}
                                                        >
                                                            <span className="min-w-0 flex-1 text-right">
                                                                <span className="block truncate font-medium">{party.name}</span>
                                                                {party.role ? (
                                                                    <span className={`block text-[9px] truncate mt-0.5 ${s.isPearl ? 'text-[#9894A0]/70' : 'text-white/35'}`}>
                                                                        {party.role}
                                                                    </span>
                                                                ) : null}
                                                            </span>
                                                            <span
                                                                className={`shrink-0 w-6 h-6 rounded-md border flex items-center justify-center ${
                                                                    selected
                                                                        ? appellantCheckSelected
                                                                        : 'border-white/10 text-transparent'
                                                                }`}
                                                            >
                                                                <Check size={12} strokeWidth={3} />
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : null}

                                    {showOpponentPicker ? (
                                        <div className={opponentPickerCard}>
                                            <p className={`text-xs font-bold ${opponentPickerTitle}`}>
                                                المخاصَمون · {opponentLabel}
                                            </p>
                                            <div className="space-y-1.5 mt-3">
                                                {visibleOpponentParties.map((party) => {
                                                    const selected = selectedOpponentIds.includes(party.id);
                                                    return (
                                                        <button
                                                            key={String(party.id)}
                                                            type="button"
                                                            onClick={() => toggleOpponent(party.id)}
                                                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-right text-sm transition-all ${
                                                                selected ? opponentRowSelected : opponentRowIdle
                                                            }`}
                                                        >
                                                            <span className="min-w-0 flex-1 text-right">
                                                                <span className="block truncate font-medium">{party.name}</span>
                                                                {party.role ? (
                                                                    <span className={`block text-[9px] truncate mt-0.5 ${s.isPearl ? 'text-[#9894A0]/70' : 'text-white/35'}`}>
                                                                        {party.role}
                                                                    </span>
                                                                ) : null}
                                                            </span>
                                                            <span
                                                                className={`shrink-0 w-6 h-6 rounded-md border flex items-center justify-center ${
                                                                    selected
                                                                        ? opponentCheckSelected
                                                                        : 'border-white/10 text-transparent'
                                                                }`}
                                                            >
                                                                <Check size={12} strokeWidth={3} />
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={s.label}>
                                        <CalendarDays size={12} className={s.labelIcon} />
                                        تاريخ لائحة الطعن
                                    </label>
                                    <input
                                        type="date"
                                        value={filingDate}
                                        onChange={(e) => setFilingDate(e.target.value)}
                                        className={s.field}
                                    />
                                </div>
                                <div>
                                    <label className={s.label}>
                                        <Hash size={12} className={s.labelIcon} />
                                        {caseNumberLabel} (اختياري)
                                    </label>
                                    <input
                                        type="text"
                                        value={newCaseNumber}
                                        onChange={(e) => setNewCaseNumber(e.target.value)}
                                        placeholder="اتركه فارغاً إذا لم يتوفر بعد"
                                        className={s.field}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={`shrink-0 px-5 sm:px-6 py-4 border-t ${s.isPearl ? 'border-white/[0.10] bg-[#101018]/40' : 'border-white/[0.08] bg-[#0A0F1C]/50'}`}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    className={`min-h-[50px] w-full rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${s.btnPrimary}`}
                                >
                                    <Scale size={16} />
                                    {isOpponentRegistration ? 'تسجيل الطعن' : 'تأكيد الانتقال'}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className={`min-h-[50px] w-full rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${s.btnNeutral}`}
                                >
                                    <X size={16} />
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
