import React, { useEffect, useMemo, useRef, useState } from 'react';
import { filterStatementEligibleDefendants } from '../../investigationDefendantPurge';
import type {
    CriminalDefendant,
    InvestigationPapersAt,
    OurRepresentation,
    Statement,
    StatementHighlightColor,
} from '../../criminalStore';
import { isPartyDeceased } from '../../partyContextFilter';
import { sanitizeContentHighlights } from '../../statementContentHighlights';
import {
    shouldRequireStatementRecordingPlace,
    shouldShowJudicialRatificationCheckbox,
    shouldShowStatementRecordingPlacePicker,
    type StatementRecordingPlace,
} from '../../statementRecordingPlaceEngine';
import { CriminalStatementModalContentSection } from './CriminalStatementModalContentSection';
import { CriminalStatementModalFooter } from './CriminalStatementModalFooter';
import { CriminalStatementModalGiverSection } from './CriminalStatementModalGiverSection';
import { CriminalStatementModalShell } from './CriminalStatementModalShell';
import { CriminalStatementModalVenueSection } from './CriminalStatementModalVenueSection';
import {
    applyStatementContentHighlight,
    createId,
    resolveGiverNameLabel,
    resolveStatementPartyOptionsForGiver,
    STATEMENT_GIVER_TYPE_OPTIONS,
    type PersonOption,
} from './criminalStatementModalHelpers';
import {
    buildCriminalStatementPayload,
    computeStatementCanSave,
} from './criminalStatementModalPayload';

export { STATEMENT_GIVER_TYPE_OPTIONS };

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

export const CriminalStatementModal = ({
    isOpen,
    initialStatement,
    complainants,
    defendants,
    ourRepresentation: _ourRepresentation,
    isMutualComplaint = false,
    showDepositionVenuePicker = false,
    investigationPapersAt = '',
    onClose,
    onCreate,
    onUpdate: _onUpdate,
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

    const partyOptionsForGiver = useMemo(
        () =>
            resolveStatementPartyOptionsForGiver({
                statementGiverType,
                complainants,
                eligibleDefendants,
                isMutualComplaint,
            }),
        [complainants, eligibleDefendants, statementGiverType, isMutualComplaint],
    );

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
        const result = applyStatementContentHighlight({
            selectionStart: el.selectionStart,
            selectionEnd: el.selectionEnd,
            color,
            contentHighlights,
            contentLength: statementContent.length,
        });
        if (!result.ok) {
            setHighlightHint(result.hint);
            return;
        }
        setContentHighlights(result.next);
        setHighlightHint(result.hint);
        setTimeout(() => setHighlightHint(''), 2500);
    };

    const canSave = useMemo(
        () =>
            computeStatementCanSave({
                statementDate,
                statementGiverType,
                statementContent,
                requireStatementPlace,
                statementRecordingPlace,
                witnessName,
                witnessPartySide,
                witnessPartyIds,
                editingStatementId,
                statementManualName,
                isPartyPickerGiver,
                statementPartyId,
                eligibleDefendants,
                defendants,
            }),
        [
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
        ],
    );

    const submit = () => {
        const payload = buildCriminalStatementPayload({
            statementDate,
            statementGiverType,
            statementContent,
            showLawyerNotes,
            statementNotes,
            initialStatement,
            investigationPapersAt,
            statementRecordingPlace,
            showRatificationCheckbox,
            statementIsRatified,
            contentHighlights,
            witnessName,
            witnessDetails,
            witnessPartySide,
            witnessPartyIds,
            editingStatementId,
            statementManualName,
            isPartyPickerGiver,
            statementPartyId,
            partyOptionsForGiver,
            complainants,
            eligibleDefendants,
        });
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
        <CriminalStatementModalShell
            onClose={onClose}
            saveConfirmOpen={saveConfirmOpen}
            setSaveConfirmOpen={setSaveConfirmOpen}
            submit={submit}
        >
            <div>
                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">تاريخ الإفادة</label>
                <input
                    type="date"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                    value={statementDate}
                    onChange={(e) => setStatementDate(e.target.value)}
                />
            </div>

            <CriminalStatementModalGiverSection
                editingStatementId={editingStatementId}
                statementGiverType={statementGiverType}
                setStatementGiverType={setStatementGiverType}
                setStatementPartyId={setStatementPartyId}
                setStatementManualName={setStatementManualName}
                setWitnessName={setWitnessName}
                setWitnessDetails={setWitnessDetails}
                setWitnessPartySide={setWitnessPartySide}
                setWitnessPartyIds={setWitnessPartyIds}
                giverNameLabel={giverNameLabel}
                isWitnessGiver={isWitnessGiver}
                isPartyPickerGiver={isPartyPickerGiver}
                witnessName={witnessName}
                statementManualName={statementManualName}
                singlePartyAutoOption={singlePartyAutoOption ?? null}
                hideSinglePartyNameBlock={hideSinglePartyNameBlock}
                partyOptionsForGiver={partyOptionsForGiver}
                statementPartyId={statementPartyId}
                witnessPartySide={witnessPartySide}
                selectWitnessPartySide={selectWitnessPartySide}
                witnessSideParties={witnessSideParties}
                witnessPartyIds={witnessPartyIds}
                toggleWitnessPartyId={toggleWitnessPartyId}
                witnessDetails={witnessDetails}
            />

            {statementGiverType ? (
                <CriminalStatementModalVenueSection
                    showStatementPlacePicker={showStatementPlacePicker}
                    statementRecordingPlace={statementRecordingPlace}
                    setStatementRecordingPlace={setStatementRecordingPlace}
                    setStatementIsRatified={setStatementIsRatified}
                    showRatificationCheckbox={showRatificationCheckbox}
                    statementIsRatified={statementIsRatified}
                />
            ) : null}

            <CriminalStatementModalContentSection
                contentRef={contentRef}
                statementContent={statementContent}
                setStatementContent={setStatementContent}
                setContentHighlights={setContentHighlights}
                contentHighlights={contentHighlights}
                applyHighlight={applyHighlight}
                highlightHint={highlightHint}
                showLawyerNotes={showLawyerNotes}
                statementNotes={statementNotes}
                setStatementNotes={setStatementNotes}
            />

            <CriminalStatementModalFooter
                onClose={onClose}
                requestSave={requestSave}
                canSave={canSave}
            />
        </CriminalStatementModalShell>
    );
};
