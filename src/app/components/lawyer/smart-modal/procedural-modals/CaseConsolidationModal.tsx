// @ts-nocheck
import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { MoroccanGlassShell } from '../smartFile/moroccanGlassShell';
import { SmartModalHeader, useSmartModalAccent } from '../smartFile/smartModalChrome';

type ConsolidationCandidate = {
    id: number;
    caseNo: string;
    status: string;
    court?: string;
    clientName?: string;
    stageLabel?: string;
};

type CaseConsolidationModalProps = {
    isOpen: boolean;
    onClose: () => void;
    currentFileId: number;
    currentCaseNo: string;
    currentClientName?: string;
    currentCourt?: string;
    currentStageLabel?: string;
    candidates: ConsolidationCandidate[];
    onCreateNew: (data: { consolidationDate: string; notes?: string }) => void;
    onMergeExisting: (data: {
        secondaryFileId: number;
        consolidationDate: string;
        notes?: string;
    }) => void;
    onExternalRef: (data: {
        peerCaseNo: string;
        consolidationDate: string;
        notes?: string;
    }) => void;
};

export const CaseConsolidationModal = ({
    isOpen,
    onClose,
    currentFileId,
    candidates,
    onCreateNew,
    onMergeExisting,
    onExternalRef,
}: CaseConsolidationModalProps) => {
    const {
        T,
        required,
        highlightMuted,
        cardSecondary,
        optionBtn,
        optionBtnPrimary,
        listItemActive,
        listItemIdle,
    } = useSmartModalAccent();

    const [step, setStep] = useState<'choose' | 'existing' | 'create' | 'external'>('choose');
    const [consolidationDate, setConsolidationDate] = useState(getLocalTodayYmd());
    const [notes, setNotes] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [peerCaseNo, setPeerCaseNo] = useState('');

    const normalizedCurrentId = typeof currentFileId === 'number' && Number.isFinite(currentFileId) ? currentFileId : null;

    React.useEffect(() => {
        if (!isOpen) return;
        setStep('choose');
        setConsolidationDate(getLocalTodayYmd());
        setNotes('');
        setSelectedId(null);
        setSearch('');
        setPeerCaseNo('');
    }, [isOpen, currentFileId]);

    if (!isOpen) return null;

    const statusLabel = (status: string) => {
        if (status === 'archived' || status === 'archived_stage') return 'مؤرشفة';
        if (status === 'paused') return 'موقوفة';
        return 'نشطة';
    };

    const filteredCandidates = candidates.filter((candidate) => {
        if (normalizedCurrentId !== null && candidate.id === normalizedCurrentId) return false;
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const haystack = [candidate.caseNo, candidate.court ?? '', candidate.clientName ?? '', String(candidate.id)]
            .join(' ')
            .toLowerCase();
        return haystack.includes(q);
    });

    const selectedCandidate = selectedId ? candidates.find((c) => c.id === selectedId) ?? null : null;

    const handleCreateNew = () => {
        onCreateNew({ consolidationDate, notes: notes.trim() || undefined });
        onClose();
    };

    const handleMergeExisting = () => {
        if (!selectedId || normalizedCurrentId === null) return;
        if (selectedId === normalizedCurrentId) return;
        onMergeExisting({
            secondaryFileId: selectedId,
            consolidationDate,
            notes: notes.trim() || undefined,
        });
        onClose();
    };

    const handleExternalRef = () => {
        if (!peerCaseNo.trim()) return;
        onExternalRef({
            peerCaseNo: peerCaseNo.trim(),
            consolidationDate,
            notes: notes.trim() || undefined,
        });
        onClose();
    };

    const secondaryPreview =
        step === 'existing' && selectedCandidate
            ? selectedCandidate.caseNo
            : step === 'external' && peerCaseNo.trim()
              ? peerCaseNo.trim()
              : step === 'create'
                ? 'سيتم إنشاء إضبارة جديدة'
                : 'غير موجودة في المخزن';

    return (
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-xl">
            <SmartModalHeader icon={Layers} title="توحيد الدعاوى" onClose={onClose} />
            <div className={T.body}>
                <div className={cardSecondary}>
                    <p className="text-[10px] text-white/50 mb-0.5">الدعوى الثانية</p>
                    <p
                        className={`text-sm font-bold ${
                            secondaryPreview === 'غير موجودة في المخزن' ? 'text-white/45' : 'text-white/80'
                        }`}
                    >
                        {secondaryPreview}
                    </p>
                    {selectedCandidate?.clientName ? (
                        <p className="text-[10px] text-white/45 mt-0.5">الموكل: {selectedCandidate.clientName}</p>
                    ) : null}
                </div>

                {step === 'choose' ? (
                    <>
                        <div className="grid grid-cols-1 gap-2">
                            <button type="button" onClick={() => setStep('existing')} className={optionBtn}>
                                إضبارة موجودة في المخزن ({candidates.length})
                            </button>
                            <button type="button" onClick={() => setStep('external')} className={optionBtn}>
                                تسجيل رقم دعوى مرجعي (بدون إضبارة)
                            </button>
                            <button type="button" onClick={() => setStep('create')} className={optionBtnPrimary}>
                                إنشاء إضبارة جديدة للدعوى الثانية
                            </button>
                        </div>
                    </>
                ) : step === 'existing' ? (
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setStep('choose');
                                setSelectedId(null);
                                setSearch('');
                            }}
                            className="text-[11px] text-white/50 hover:text-white/75"
                        >
                            ← رجوع لخيارات التوحيد
                        </button>
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="بحث برقم الدعوى، المحكمة، أو اسم الموكل..."
                            className={T.field}
                        />
                        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                            {candidates.length === 0 ? (
                                <p className="text-xs text-white/50 py-4 text-center">لا توجد إضابير أخرى في المخزن للتوحيد</p>
                            ) : filteredCandidates.length === 0 ? (
                                <p className="text-xs text-white/50 py-4 text-center">لا توجد نتائج مطابقة للبحث</p>
                            ) : (
                                filteredCandidates.map((candidate) => {
                                    const active = selectedId === candidate.id;
                                    return (
                                        <button
                                            key={candidate.id}
                                            type="button"
                                            onClick={() => setSelectedId(candidate.id)}
                                            className={`w-full text-right rounded-xl border px-3 py-2.5 transition-colors ${
                                                active ? listItemActive : listItemIdle
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-bold text-white/90">{candidate.caseNo}</span>
                                                <span className="text-[10px] text-white/45">{statusLabel(candidate.status)}</span>
                                            </div>
                                            {candidate.clientName ? (
                                                <p className="text-[10px] text-white/50 mt-0.5">الموكل: {candidate.clientName}</p>
                                            ) : null}
                                            {candidate.court ? (
                                                <p className="text-[10px] text-white/40 mt-0.5">{candidate.court}</p>
                                            ) : null}
                                            {candidate.stageLabel ? (
                                                <p className={`text-[10px] ${highlightMuted} mt-0.5`}>{candidate.stageLabel}</p>
                                            ) : null}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </>
                ) : step === 'external' ? (
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setStep('choose');
                                setPeerCaseNo('');
                            }}
                            className="text-[11px] text-white/50 hover:text-white/75"
                        >
                            ← رجوع لخيارات التوحيد
                        </button>
                        <p className="text-xs text-white/60 leading-relaxed">
                            تُسجَّل الدعوى الثانية كمرجع فقط (رقم وتاريخ وسبب) دون إنشاء إضبارة في المخزن.
                        </p>
                        <div>
                            <label className={T.label}>
                                رقم الدعوى الثانية <span className={required}>*</span>
                            </label>
                            <input
                                type="text"
                                value={peerCaseNo}
                                onChange={(e) => setPeerCaseNo(e.target.value)}
                                className={T.field}
                                placeholder="رقم الدعوى المرجعية"
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <button type="button" onClick={() => setStep('choose')} className="text-[11px] text-white/50 hover:text-white/75">
                            ← رجوع لخيارات التوحيد
                        </button>
                        <p className="text-xs text-white/60 leading-relaxed">
                            بعد التأكيد ستُفتح شاشة إنشاء إضبارة مدنية للدعوى الثانية مع شريط تنقل بين الدعويين.
                        </p>
                    </>
                )}

                {step !== 'choose' ? (
                    <>
                        <div>
                            <label className={T.label}>تاريخ التوحيد</label>
                            <input
                                type="date"
                                value={consolidationDate}
                                onChange={(e) => setConsolidationDate(e.target.value)}
                                className={T.field}
                            />
                        </div>
                        <div>
                            <label className={T.label}>سبب التوحيد (اختياري)</label>
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${T.field} min-h-[70px]`} />
                        </div>
                        {step === 'existing' ? (
                            <button
                                type="button"
                                onClick={handleMergeExisting}
                                disabled={!selectedId || normalizedCurrentId === null || selectedId === normalizedCurrentId}
                                className={`${T.btn} ${T.btnDisabled}`}
                            >
                                توحيد الدعاوى
                            </button>
                        ) : step === 'external' ? (
                            <button
                                type="button"
                                onClick={handleExternalRef}
                                disabled={!peerCaseNo.trim()}
                                className={`${T.btn} ${T.btnDisabled}`}
                            >
                                حفظ المرجع
                            </button>
                        ) : (
                            <button type="button" onClick={handleCreateNew} className={T.btn}>
                                متابعة إنشاء الإضبارة الثانية
                            </button>
                        )}
                    </>
                ) : null}
            </div>
        </MoroccanGlassShell>
    );
};
