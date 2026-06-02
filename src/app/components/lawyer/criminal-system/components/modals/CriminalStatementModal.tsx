import React, { useEffect, useMemo, useRef, useState } from 'react';
import { filterStatementEligibleDefendants } from '../../investigationDefendantPurge';
import type {
    CriminalComplainant,
    CriminalDefendant,
    InvestigationPapersAt,
    OurRepresentation,
    Statement,
    StatementHighlightColor,
} from '../../criminalStore';
import { isPartyDeceased } from '../../partyContextFilter';
import { StatementHighlightedContent } from '../StatementHighlightedContent';
import {
    sanitizeContentHighlights,
    STATEMENT_HIGHLIGHT_COLORS,
} from '../../statementContentHighlights';
import {
    resolveEffectiveStatementRecordingPlace,
    shouldRequireStatementRecordingPlace,
    shouldShowJudicialRatificationCheckbox,
    shouldShowStatementRecordingPlacePicker,
    STATEMENT_RECORDING_PLACE_OPTIONS,
    type StatementRecordingPlace,
} from '../../statementRecordingPlaceEngine';

type PersonOption = CriminalComplainant | CriminalDefendant;

/** صفات المُدلي — حصراً لسجل الإفادات (منفصل عن المسار الإجرائي). */
export const STATEMENT_GIVER_TYPE_OPTIONS = [
    { value: 'complainant' as const, label: 'مشتكي/مجني عليه' },
    { value: 'defendant' as const, label: 'مشكو منه/متهم' },
    { value: 'witness' as const, label: 'شاهد' },
] as const;

function resolveGiverNameLabel(giverType: Statement['giverType'] | ''): string {
    if (giverType === 'complainant') return 'الاسم الكامل (الرباعي) *';
    if (giverType === 'defendant') return 'الاسم الكامل (الرباعي) *';
    if (giverType === 'witness') return 'الاسم الكامل (الرباعي) *';
    return 'الاسم الكامل (الرباعي) *';
}

export type CriminalStatementModalProps = {
    isOpen: boolean;
    initialStatement: Statement | null;
    complainants: PersonOption[];
    defendants: PersonOption[];
    ourRepresentation: OurRepresentation;
    /**
     * ⚖️ شكوى متقابلة على مستوى الكيس — حين true يَكتسب كل مشتكٍ صفة المتهم أيضاً،
     * فيَظهر في قائمة «الإفادة بصفة متهم» جنباً إلى جنب مع المتهمين الأصليين.
     */
    isMutualComplaint?: boolean;
    /** مكان الإفادة + تصديق قضائي — مرحلة التحقيق فقط. */
    showDepositionVenuePicker?: boolean;
    investigationPapersAt?: InvestigationPapersAt | '';
    onClose: () => void;
    onCreate: (statement: Statement) => void;
    onUpdate: (statementId: string, updatedData: Partial<Statement>) => void;
    onError: () => void;
};

const createId = () => {
    return globalThis.crypto && 'randomUUID' in globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

export const CriminalStatementModal = ({
    isOpen,
    initialStatement,
    complainants,
    defendants,
    ourRepresentation,
    isMutualComplaint = false,
    showDepositionVenuePicker = false,
    investigationPapersAt = '',
    onClose,
    onCreate,
    onUpdate,
    onError,
}: CriminalStatementModalProps) => {
    const editingStatementId = initialStatement?.id ?? null;
    const showLawyerNotes = false;

    const [statementDate, setStatementDate] = useState('');
    const [statementGiverType, setStatementGiverType] = useState<Statement['giverType'] | ''>('');
    const [statementPartyId, setStatementPartyId] = useState('');
    const [statementManualName, setStatementManualName] = useState('');
    const [witnessName, setWitnessName] = useState('');
    const [witnessDetails, setWitnessDetails] = useState('');
    const [witnessPartySide, setWitnessPartySide] = useState<'complainant' | 'defendant' | ''>('');
    const [witnessPartyIds, setWitnessPartyIds] = useState<string[]>([]);
    const [statementContent, setStatementContent] = useState('');
    const [contentHighlights, setContentHighlights] = useState<Statement['contentHighlights']>([]);
    const [statementNotes, setStatementNotes] = useState('');
    const [statementIsRatified, setStatementIsRatified] = useState(false);
    const [statementRecordingPlace, setStatementRecordingPlace] = useState<StatementRecordingPlace | ''>('');
    const [highlightHint, setHighlightHint] = useState('');
    const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

    const contentRef = useRef<HTMLTextAreaElement>(null);
    const prevInvestigationPapersAtRef = useRef(investigationPapersAt);

    const showStatementPlacePicker = shouldShowStatementRecordingPlacePicker(
        showDepositionVenuePicker,
        investigationPapersAt,
    );
    const showRatificationCheckbox = shouldShowJudicialRatificationCheckbox(
        showDepositionVenuePicker,
        investigationPapersAt,
        statementRecordingPlace,
    );
    const requireStatementPlace = shouldRequireStatementRecordingPlace(
        showDepositionVenuePicker,
        investigationPapersAt,
    );

    const eligibleDefendants = useMemo(
        () => filterStatementEligibleDefendants(defendants as CriminalDefendant[]),
        [defendants],
    );

    const aliveComplainants = useMemo(
        () => complainants.filter((c) => !isPartyDeceased(c)),
        [complainants],
    );
    const aliveDefendants = useMemo(
        () => eligibleDefendants.filter((d) => !isPartyDeceased(d)),
        [eligibleDefendants],
    );
    const witnessSideParties = useMemo(() => {
        if (witnessPartySide === 'complainant') return aliveComplainants;
        if (witnessPartySide === 'defendant') return aliveDefendants;
        return [];
    }, [aliveComplainants, aliveDefendants, witnessPartySide]);

    const selectWitnessPartySide = (side: 'complainant' | 'defendant') => {
        setWitnessPartySide(side);
        const parties = side === 'complainant' ? aliveComplainants : aliveDefendants;
        setWitnessPartyIds(parties.length === 1 ? [parties[0]!.id] : []);
    };

    const toggleWitnessPartyId = (partyId: string) => {
        setWitnessPartyIds((prev) =>
            prev.includes(partyId) ? prev.filter((id) => id !== partyId) : [...prev, partyId],
        );
    };

    const partyOptionsForGiver = useMemo(() => {
        if (statementGiverType === 'complainant') {
            // ⚖️ شكوى متقابلة: عند الإفادة بصفة «مشتكي/مجنى عليه» يَنضمّ المتهمون أيضاً،
            //    لأنّ في الشكوى المتقابلة كلا الطرفين مجنيٌّ عليه بدوره. الشمول حصري عندما
            //    يكون الكيس متقابلاً (case-level) أو يحوي مشتكياً متقابلاً واحداً على الأقل.
            const hasCrossInCase =
                isMutualComplaint ||
                complainants.some(
                    (c) => (c as { isCrossComplaint?: boolean }).isCrossComplaint === true,
                );
            const aliveComplainants = complainants.filter((c) => !isPartyDeceased(c));
            if (!hasCrossInCase) return aliveComplainants;
            return [...aliveComplainants, ...eligibleDefendants.filter((d) => !isPartyDeceased(d))];
        }
        if (statementGiverType === 'defendant') {
            // ⚖️ شكوى متقابلة: يُضاف المشتكون المتقابلون كأهداف صالحة لإفادة بصفة «متهم»
            //    بدون نقلهم من مصفوفة complainants — مجرد عرض موحّد في القائمة.
            const accusedComplainants = complainants.filter((c) => {
                if (isPartyDeceased(c)) return false;
                const flag = (c as { isCrossComplaint?: boolean }).isCrossComplaint === true;
                return isMutualComplaint || flag;
            });
            return [...eligibleDefendants.filter((d) => !isPartyDeceased(d)), ...accusedComplainants];
        }
        return [];
    }, [complainants, eligibleDefendants, statementGiverType, isMutualComplaint]);

    const giverNameLabel = resolveGiverNameLabel(statementGiverType);
    const isWitnessGiver = statementGiverType === 'witness';
    const isPartyPickerGiver = statementGiverType === 'complainant' || statementGiverType === 'defendant';

    /**
     * ⚖️ شَكوى متقابلة شامِلة — على مستوى الكيس (isMutualComplaint) أو على مستوى مشتكٍ واحد.
     *    في هذه الحالة يَجب أَن يَبقى اسم الطَرف ظاهراً (لِأَنّ الشخص الواحد قَد يَحمل
     *    صِفتَين متعارضتَين — لا يَجوز إخفاء الاسم لِتَفادي الالتباس).
     */
    const caseHasCrossComplaint =
        isMutualComplaint ||
        complainants.some(
            (c) => (c as { isCrossComplaint?: boolean }).isCrossComplaint === true,
        );

    /**
     * تَبسيط: إذا كان عدد الأطراف المُؤهَّلين (مشتكي/متهم بعد استثناء المتوفى) واحداً فقط،
     * نَختاره ضِمنياً — تماماً كما في باقي القَوائم في النِظام.
     */
    const singlePartyAutoOption = isPartyPickerGiver && partyOptionsForGiver.length === 1
        ? partyOptionsForGiver[0]
        : null;

    /**
     * 🧹 حاوية «اسم المشتكي/المتهم الكامل» تُخفى تَماماً حين الطَرف وَحيد وَلا يوجد سَياق
     *    شَكوى متقابلة — فلا داعي لِلابل + بطاقة قراءة فَقَط تُكرر اسماً مُختاراً ضِمنياً.
     *    أمّا في الشَكوى المتقابلة فيَجب إظهار الاسم لِتَمييز الصِفة المُختارة بِوضوح.
     */
    const hideSinglePartyNameBlock =
        singlePartyAutoOption !== null && !caseHasCrossComplaint && !editingStatementId;

    useEffect(() => {
        if (editingStatementId) return;
        if (!singlePartyAutoOption) return;
        if (statementPartyId === singlePartyAutoOption.id) return;
        setStatementPartyId(singlePartyAutoOption.id);
    }, [editingStatementId, singlePartyAutoOption, statementPartyId]);

    useEffect(() => {
        if (!statementPartyId) return;
        if (partyOptionsForGiver.some((p) => p.id === statementPartyId)) return;
        setStatementPartyId('');
    }, [partyOptionsForGiver, statementPartyId]);

    useEffect(() => {
        if (!witnessPartySide || witnessSideParties.length !== 1) return;
        const onlyId = witnessSideParties[0]!.id;
        if (witnessPartyIds.length === 1 && witnessPartyIds[0] === onlyId) return;
        setWitnessPartyIds([onlyId]);
    }, [witnessPartySide, witnessSideParties, witnessPartyIds]);

    useEffect(() => {
        if (!witnessPartySide) return;
        setWitnessPartyIds((prev) =>
            prev.filter((id) => witnessSideParties.some((p) => p.id === id)),
        );
    }, [witnessPartySide, witnessSideParties]);

    useEffect(() => {
        if (!isOpen) {
            setSaveConfirmOpen(false);
            return;
        }
        if (initialStatement) {
            const content = String(initialStatement.content ?? '').trim();
            setStatementDate(String(initialStatement.date ?? '').trim());
            setStatementGiverType(initialStatement.giverType);
            setStatementPartyId('');
            const wn = String(initialStatement.witnessName ?? '').trim();
            setWitnessName(wn || (initialStatement.giverType === 'witness' ? String(initialStatement.giverName ?? '').trim() : ''));
            setWitnessDetails(String(initialStatement.witnessDetails ?? '').trim());
            const initialSide =
                initialStatement.witnessPartySide === 'complainant' ||
                initialStatement.witnessPartySide === 'defendant'
                    ? initialStatement.witnessPartySide
                    : initialStatement.witnessKind === 'prosecution'
                      ? 'complainant'
                      : initialStatement.witnessKind === 'defense'
                        ? 'defendant'
                        : '';
            setWitnessPartySide(initialSide);
            setWitnessPartyIds(
                Array.isArray(initialStatement.witnessPartyIds)
                    ? initialStatement.witnessPartyIds.filter(Boolean)
                    : [],
            );
            setStatementManualName(
                initialStatement.giverType === 'witness'
                    ? wn || String(initialStatement.giverName ?? '').trim()
                    : String(initialStatement.giverName ?? '').trim(),
            );
            setStatementContent(content);
            setContentHighlights(
                sanitizeContentHighlights(initialStatement.contentHighlights, content.length),
            );
            setStatementNotes(String(initialStatement.notes ?? '').trim());
            setStatementIsRatified(Boolean(initialStatement.isJudiciallyRatified));
            const initialPlace = initialStatement.statementRecordingPlace;
            setStatementRecordingPlace(
                initialPlace === 'investigation_officer' || initialPlace === 'judicial_investigator'
                    ? initialPlace
                    : investigationPapersAt === 'مكتب تحقيق قضائي'
                      ? 'judicial_investigator'
                      : '',
            );
            return;
        }
        setStatementDate(new Date().toISOString().slice(0, 10));
        setStatementGiverType('');
        setStatementPartyId('');
        setStatementManualName('');
        setWitnessName('');
        setWitnessDetails('');
        setWitnessPartySide('');
        setWitnessPartyIds([]);
        setStatementContent('');
        setContentHighlights([]);
        setStatementNotes('');
        setStatementIsRatified(false);
        setStatementRecordingPlace(
            investigationPapersAt === 'مكتب تحقيق قضائي' ? 'judicial_investigator' : '',
        );
    }, [initialStatement, investigationPapersAt, isOpen]);

    useEffect(() => {
        if (!isOpen || !showDepositionVenuePicker) {
            prevInvestigationPapersAtRef.current = investigationPapersAt;
            return;
        }
        const prevPapersAt = prevInvestigationPapersAtRef.current;
        prevInvestigationPapersAtRef.current = investigationPapersAt;

        if (investigationPapersAt === 'مكتب تحقيق قضائي') {
            setStatementRecordingPlace('judicial_investigator');
            return;
        }
        if (
            prevPapersAt === 'مكتب تحقيق قضائي' &&
            investigationPapersAt !== 'مكتب تحقيق قضائي'
        ) {
            setStatementRecordingPlace('');
            setStatementIsRatified(false);
        }
    }, [investigationPapersAt, isOpen, showDepositionVenuePicker]);

    useEffect(() => {
        if (showRatificationCheckbox) return;
        setStatementIsRatified(false);
    }, [showRatificationCheckbox]);

    const applyHighlight = (color: StatementHighlightColor) => {
        const el = contentRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        if (end <= start) {
            setHighlightHint('حدّد كلمة أو سطراً في نص الإفادة أولاً.');
            return;
        }
        const next = sanitizeContentHighlights(
            [...(contentHighlights ?? []), { start, end, color }],
            statementContent.length,
        );
        setContentHighlights(next);
        setHighlightHint('✓ تم تمييز المقطع.');
        setTimeout(() => setHighlightHint(''), 2500);
    };

    const canSave = useMemo(() => {
        if (!statementDate.trim()) return false;
        if (!statementGiverType) return false;
        if (!statementContent.trim()) return false;
        if (
            requireStatementPlace &&
            statementRecordingPlace !== 'investigation_officer' &&
            statementRecordingPlace !== 'judicial_investigator'
        ) {
            return false;
        }
        if (statementGiverType === 'witness') {
            return (
                Boolean(witnessName.trim()) &&
                (witnessPartySide === 'complainant' || witnessPartySide === 'defendant') &&
                witnessPartyIds.length > 0
            );
        }
        if (editingStatementId) return Boolean(statementManualName.trim());
        if (isPartyPickerGiver) {
            if (!statementPartyId) return false;
            if (statementGiverType === 'defendant') {
                const hit =
                    eligibleDefendants.find((d) => d.id === statementPartyId) ??
                    defendants.find((d) => d.id === statementPartyId);
                if (hit?.isJuvenile && !String(hit.guardianName ?? '').trim()) return false;
            }
            return true;
        }
        return false;
    }, [
        defendants,
        editingStatementId,
        eligibleDefendants,
        isPartyPickerGiver,
        statementContent,
        statementDate,
        statementGiverType,
        statementManualName,
        statementPartyId,
        statementRecordingPlace,
        requireStatementPlace,
        witnessName,
        witnessPartySide,
        witnessPartyIds,
    ]);

    const buildStatementPayload = (): Omit<Statement, 'id'> | null => {
        const cleanDate = statementDate.trim();
        const giverType = statementGiverType;
        const cleanContent = statementContent.trim();
        const cleanNotes = showLawyerNotes
            ? statementNotes.trim()
            : String(initialStatement?.notes ?? '').trim();
        if (!cleanDate || !giverType || !cleanContent) return null;

        const recordingPlace = resolveEffectiveStatementRecordingPlace(
            investigationPapersAt,
            statementRecordingPlace,
        );
        const recordingPlaceField = recordingPlace ? recordingPlace : undefined;
        const ratifiedFlag =
            showRatificationCheckbox && statementIsRatified ? true : undefined;
        const highlights = sanitizeContentHighlights(contentHighlights, cleanContent.length);
        const highlightsField = highlights.length ? highlights : undefined;

        if (giverType === 'witness') {
            const wn = witnessName.trim();
            if (!wn) return null;
            if (witnessPartySide !== 'complainant' && witnessPartySide !== 'defendant') return null;
            if (!witnessPartyIds.length) return null;
            return {
                date: cleanDate,
                giverType,
                giverName: wn,
                witnessName: wn,
                witnessDetails: witnessDetails.trim() ? witnessDetails.trim() : undefined,
                witnessPartySide,
                witnessPartyIds,
                witnessKind: witnessPartySide === 'complainant' ? 'prosecution' : 'defense',
                content: cleanContent,
                contentHighlights: highlightsField,
                notes: cleanNotes ? cleanNotes : undefined,
                statementRecordingPlace: recordingPlaceField,
                isJudiciallyRatified: ratifiedFlag,
            };
        }

        const giverName = editingStatementId
            ? statementManualName.trim()
            : isPartyPickerGiver
              ? (
                    partyOptionsForGiver.find((p) => p.id === statementPartyId)?.fullName ??
                    complainants.find((c) => c.id === statementPartyId)?.fullName ??
                    eligibleDefendants.find((d) => d.id === statementPartyId)?.fullName ??
                    ''
                ).trim()
              : statementManualName.trim();

        if (!giverName) return null;

        return {
            date: cleanDate,
            giverType,
            giverName,
            content: cleanContent,
            contentHighlights: highlightsField,
            notes: cleanNotes ? cleanNotes : undefined,
            statementRecordingPlace: recordingPlaceField,
            isJudiciallyRatified: ratifiedFlag,
        };
    };

    const submit = () => {
        const payload = buildStatementPayload();
        if (!payload) return;

        try {
            onCreate({ id: createId(), ...payload });
        } catch {
            onError();
            return;
        }

        setSaveConfirmOpen(false);
        onClose();
    };

    const requestSave = () => {
        if (!canSave) return;
        setSaveConfirmOpen(true);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[221] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden" dir="rtl">
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden max-h-[min(94vh,800px)] flex flex-col relative">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3 shrink-0">
                    <div className="text-white font-black text-sm whitespace-normal break-words">
                        سجل الإفادات
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words"
                    >
                        إغلاق
                    </button>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">تاريخ الإفادة</label>
                        <input
                            type="date"
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={statementDate}
                            onChange={(e) => setStatementDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">صفة المُدلي بالإفادة</label>
                        <select
                            disabled={Boolean(editingStatementId)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 disabled:opacity-60"
                            value={statementGiverType}
                            onChange={(e) => {
                                const next = e.target.value as Statement['giverType'] | '';
                                setStatementGiverType(next);
                                setStatementPartyId('');
                                setStatementManualName('');
                                setWitnessName('');
                                setWitnessDetails('');
                                setWitnessPartySide('');
                                setWitnessPartyIds([]);
                            }}
                        >
                            <option value="" className="bg-slate-900 text-white">
                                اختر...
                            </option>
                            {STATEMENT_GIVER_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {statementGiverType ? (
                        <>
                            {isWitnessGiver || editingStatementId ? (
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words text-right">
                                        {giverNameLabel}
                                    </label>
                                    <input
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-black outline-none focus:border-[#E6C673]/60"
                                        value={isWitnessGiver ? witnessName : statementManualName}
                                        onChange={(e) => {
                                            if (isWitnessGiver) setWitnessName(e.target.value);
                                            else setStatementManualName(e.target.value);
                                        }}
                                        placeholder="الاسم الرباعي الكامل..."
                                    />
                                </div>
                            ) : isPartyPickerGiver ? (
                                singlePartyAutoOption ? (
                                    hideSinglePartyNameBlock ? null : (
                                        <div>
                                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words text-right">
                                                {giverNameLabel}
                                            </label>
                                            <div className="w-full bg-slate-900/60 border border-slate-700/70 rounded-xl px-3 py-2 text-sm text-white font-black whitespace-normal break-words">
                                                {singlePartyAutoOption.fullName.trim() || '—'}
                                            </div>
                                        </div>
                                    )
                                ) : partyOptionsForGiver.length === 0 ? (
                                    <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 px-3 py-2 text-[11px] font-black text-amber-100 whitespace-normal break-words">
                                        لا يوجد {statementGiverType === 'complainant' ? 'مشتكون' : 'متهمون'} مُؤهَّلون لتَسجيل إفادة.
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words text-right">
                                            {giverNameLabel}
                                        </label>
                                        <select
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                            value={statementPartyId}
                                            onChange={(e) => setStatementPartyId(e.target.value)}
                                        >
                                            <option value="" className="bg-slate-900 text-white">
                                                اختر...
                                            </option>
                                            {partyOptionsForGiver.map((p) => (
                                                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                                                    {p.fullName.trim() || '—'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )
                            ) : null}

                            {isWitnessGiver ? (
                                <>
                                    <div>
                                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words text-right">
                                            جهة الشهادة *
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => selectWitnessPartySide('complainant')}
                                                aria-pressed={witnessPartySide === 'complainant'}
                                                className={`rounded-xl border px-3 py-2 text-[12px] font-black transition whitespace-normal break-words ${
                                                    witnessPartySide === 'complainant'
                                                        ? 'border-sky-400/60 bg-sky-500/12 text-sky-100'
                                                        : 'border-slate-600/60 bg-slate-900/40 text-white/70 hover:text-white hover:border-slate-500'
                                                }`}
                                            >
                                                المشتكي / المجني عليه
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => selectWitnessPartySide('defendant')}
                                                aria-pressed={witnessPartySide === 'defendant'}
                                                className={`rounded-xl border px-3 py-2 text-[12px] font-black transition whitespace-normal break-words ${
                                                    witnessPartySide === 'defendant'
                                                        ? 'border-red-400/60 bg-red-500/12 text-red-100'
                                                        : 'border-slate-600/60 bg-slate-900/40 text-white/70 hover:text-white hover:border-slate-500'
                                                }`}
                                            >
                                                المشكو منه / المتهم
                                            </button>
                                        </div>
                                    </div>
                                    {witnessPartySide ? (
                                        witnessSideParties.length === 0 ? (
                                            <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 px-3 py-2 text-[11px] font-black text-amber-100 whitespace-normal break-words">
                                                لا يوجد {witnessPartySide === 'complainant' ? 'مشتكون' : 'متهمون'} مُؤهَّلون لربط الشهادة.
                                            </div>
                                        ) : witnessSideParties.length > 1 ? (
                                            <div>
                                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words text-right">
                                                    يخص *
                                                </label>
                                                <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-2 space-y-1.5">
                                                    {witnessSideParties.map((p) => {
                                                        const checked = witnessPartyIds.includes(p.id);
                                                        return (
                                                            <label
                                                                key={p.id}
                                                                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm cursor-pointer transition ${
                                                                    checked
                                                                        ? 'border-[#E6C673]/40 bg-[#E6C673]/10 text-white'
                                                                        : 'border-slate-700/70 bg-slate-900/40 text-white/80 hover:border-slate-600'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-4 w-4 accent-[#E6C673]"
                                                                    checked={checked}
                                                                    onChange={() => toggleWitnessPartyId(p.id)}
                                                                />
                                                                <span className="font-bold whitespace-normal break-words">
                                                                    {p.fullName.trim() || '—'}
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : null
                                    ) : null}
                                    <div>
                                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words text-right">
                                            تفاصيل الشاهد (العمر / السكن / صلة القرابة)
                                        </label>
                                        <input
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                            value={witnessDetails}
                                            onChange={(e) => setWitnessDetails(e.target.value)}
                                            placeholder="اختياري"
                                        />
                                    </div>
                                </>
                            ) : null}

                            {showStatementPlacePicker ? (
                                <div>
                                    <label className="block text-white/70 text-xs mb-2 whitespace-normal break-words">
                                        مكان الإفادة
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {STATEMENT_RECORDING_PLACE_OPTIONS.map((opt) => {
                                            const active = statementRecordingPlace === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => {
                                                        setStatementRecordingPlace(opt.value);
                                                        if (opt.value === 'investigation_officer') {
                                                            setStatementIsRatified(false);
                                                        }
                                                    }}
                                                    className={`rounded-xl border px-2.5 py-2 text-[11px] font-black transition whitespace-normal break-words ${
                                                        active
                                                            ? 'border-[#E6C673]/70 bg-[#E6C673]/15 text-[#E6C673]'
                                                            : 'border-slate-600/60 bg-slate-900/40 text-white/75 hover:text-white hover:border-slate-500'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : null}

                            {showRatificationCheckbox ? (
                                <div className="rounded-xl border border-[#E6C673]/30 bg-[#E6C673]/5 p-3">
                                    <label className="flex items-center gap-2 text-white/90 text-sm font-black whitespace-normal break-words">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 accent-[#E6C673]"
                                            checked={statementIsRatified}
                                            onChange={(e) => setStatementIsRatified(e.target.checked)}
                                        />
                                        تم تصديق أقواله قضائياً
                                    </label>
                                </div>
                            ) : null}
                        </>
                    ) : null}

                    <div>
                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">ملخص الإفادة / الأقوال</label>
                        <textarea
                            ref={contentRef}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[140px] resize-none disabled:opacity-60"
                            value={statementContent}
                            onChange={(e) => {
                                const v = e.target.value;
                                setStatementContent(v);
                                setContentHighlights((prev) =>
                                    sanitizeContentHighlights(prev, v.length),
                                );
                            }}
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-white/55 text-[10px] font-black">توضيح:</span>
                            {STATEMENT_HIGHLIGHT_COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => applyHighlight(c.value)}
                                    className="rounded-lg border border-slate-600/70 bg-slate-800/80 px-2.5 py-1 text-[10px] font-black text-white/85 hover:bg-slate-700/80 transition"
                                    title={c.label}
                                >
                                    {c.label}
                                </button>
                            ))}
                            {(contentHighlights?.length ?? 0) > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => setContentHighlights([])}
                                    className="rounded-lg border border-slate-600/50 px-2 py-1 text-[10px] font-bold text-white/50 hover:text-white/70"
                                >
                                    مسح التمييز
                                </button>
                            ) : null}
                        </div>
                        {highlightHint ? (
                            <p className="mt-1 text-[10px] font-bold text-[#E6C673]/90">{highlightHint}</p>
                        ) : (
                            <p className="mt-1 text-[10px] font-bold text-white/40">
                                حدّد مقطعاً في النص ثم اضغط لون التمييز.
                            </p>
                        )}
                        {statementContent.trim() && (contentHighlights?.length ?? 0) > 0 ? (
                            <div className="mt-2 rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 text-sm text-white/90 whitespace-pre-wrap break-words leading-relaxed">
                                <StatementHighlightedContent
                                    content={statementContent}
                                    highlights={contentHighlights}
                                />
                            </div>
                        ) : null}
                    </div>

                    {showLawyerNotes ? (
                        <div>
                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                ملاحظات المحامي
                            </label>
                            <textarea
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[90px] resize-none"
                                value={statementNotes}
                                onChange={(e) => setStatementNotes(e.target.value)}
                                placeholder="ملاحظات داخلية على الإفادة"
                            />
                        </div>
                    ) : null}

                    <div className="flex items-center justify-end gap-2 pt-2 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={requestSave}
                            disabled={!canSave}
                            className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words"
                        >
                            حفظ في السجل
                        </button>
                    </div>
                </div>

                {saveConfirmOpen ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
                        <div className="w-full max-w-sm rounded-2xl border border-amber-500/40 bg-slate-900 p-4 space-y-3">
                            <div className="text-amber-100 font-black text-sm whitespace-normal break-words">
                                تأكيد حفظ الإفادة
                            </div>
                            <p className="text-white/80 text-xs font-bold whitespace-normal break-words leading-relaxed">
                                تأكد من صحة الأسماء والبيانات — لا يمكن تعديل الإفادة بعد التسجيل.
                            </p>
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSaveConfirmOpen(false)}
                                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-white/80"
                                >
                                    مراجعة
                                </button>
                                <button
                                    type="button"
                                    onClick={submit}
                                    className="rounded-xl bg-[#E6C673] text-[#0B1021] px-3 py-2 text-xs font-black"
                                >
                                    تأكيد الحفظ
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};
