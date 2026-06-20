// @ts-nocheck
import React, { useState } from 'react';
import { Briefcase } from 'lucide-react';
import type { AffiliationSide, Party, ThirdPartyEntryMode } from '../../../LawyerShared';
import { groupPartiesBySide, affiliationSideLabel } from '../../smartFile/incidentalCaseLinking';
import { MoroccanGlassShell } from '../../smartFile/moroccanGlassShell';
import { SmartModalHeader, useSmartModalAccent } from '../../smartFile/smartModalChrome';
import type { AddIncidentalCaseModalProps } from '../../smartFile/modalFormTypes';

export const AddIncidentalCaseModal = ({
    isOpen,
    onClose,
    onAdd,
    onSpawnLinkedCase,
    currentStage,
    editMode = false,
    editData,
}: AddIncidentalCaseModalProps) => {
    const { T, highlight, highlightMuted, optionClass, spawnBox, cancelBtn } = useSmartModalAccent();
    const [type, setType] = useState<string>('');
    const [partyName, setPartyName] = useState('');
    const [details, setDetails] = useState('');
    const [thirdPartyEntryMode, setThirdPartyEntryMode] = useState<ThirdPartyEntryMode | ''>('');
    const [affiliationSide, setAffiliationSide] = useState<AffiliationSide | ''>('');
    const [spawnConfirm, setSpawnConfirm] = useState<null | { type: 'joined' | 'counter'; incidentalId: string }>(null);

    const stageLabel =
        typeof currentStage === 'string'
            ? currentStage
            : (currentStage?.stageName || currentStage?.name || '');
    const isAppeal = stageLabel.includes('استئناف') || stageLabel.includes('Appeal');
    const isThirdParty = type === 'thirdParty';
    const isSpawnType = type === 'joined' || type === 'counter';

    const stageParties: Party[] =
        currentStage && typeof currentStage !== 'string' && Array.isArray(currentStage.parties)
            ? (currentStage.parties as Party[])
            : [];
    const { plaintiffs, defendants } = groupPartiesBySide(stageParties);
    const affiliationParties = affiliationSide === 'plaintiff' ? plaintiffs : affiliationSide === 'defendant' ? defendants : [];

    React.useEffect(() => {
        if (isOpen) {
            setSpawnConfirm(null);
            if (editMode && editData) {
                setType(editData.type || (isAppeal ? 'joinder_appeal' : 'joined'));
                setPartyName(editData.partyName || '');
                setDetails(editData.details || '');
                setThirdPartyEntryMode(editData.thirdPartyEntryMode || '');
                setAffiliationSide(editData.affiliationSide || '');
            } else {
                setType(isAppeal ? 'joinder_appeal' : '');
                setPartyName('');
                setDetails('');
                setThirdPartyEntryMode('');
                setAffiliationSide('');
            }
        }
    }, [isOpen, isAppeal, editMode, editData]);

    React.useEffect(() => {
        if (!isThirdParty) {
            setThirdPartyEntryMode('');
            setAffiliationSide('');
        }
    }, [isThirdParty]);

    React.useEffect(() => {
        if (thirdPartyEntryMode !== 'affiliative') {
            setAffiliationSide('');
        }
    }, [thirdPartyEntryMode]);

    const canSubmitThirdParty =
        Boolean(partyName.trim()) &&
        Boolean(thirdPartyEntryMode) &&
        (thirdPartyEntryMode !== 'affiliative' || Boolean(affiliationSide));

    const canSubmitDefault = !isThirdParty && !isSpawnType && Boolean(partyName.trim());
    const canSubmit = isThirdParty ? canSubmitThirdParty : canSubmitDefault;

    const handleTypeChange = (next: string) => {
        if (!editMode && (next === 'joined' || next === 'counter')) {
            const incidentalId = `inc_${Date.now()}`;
            setType(next);
            setSpawnConfirm({
                type: next,
                incidentalId,
            });
            return;
        }
        setSpawnConfirm(null);
        setType(next);
    };

    const handleSubmit = () => {
        if (isThirdParty) {
            if (!canSubmitThirdParty) return;
            const primaryAffiliation = affiliationParties[0];
            onAdd({
                type,
                partyName: partyName.trim(),
                details,
                thirdPartyEntryMode,
                affiliationSide: thirdPartyEntryMode === 'affiliative' ? affiliationSide : undefined,
                affiliationPartyId: primaryAffiliation?.id,
                affiliationPartyName: primaryAffiliation?.name,
                entryDecision: 'pending',
                partyRole:
                    thirdPartyEntryMode === 'affiliative' && affiliationSide
                        ? affiliationSideLabel(affiliationSide, affiliationParties.length)
                        : 'طالب الحكم لنفسه',
                ...(editMode && editData ? { id: editData.id } : {}),
            });
            onClose();
            return;
        }

        if (!partyName.trim()) return;
        onAdd({ type, partyName, details, ...(editMode && editData ? { id: editData.id } : {}) });
        onClose();
    };

    if (!isOpen) return null;

    const title = editMode
        ? (isAppeal ? 'تحديث شخص ثالث' : 'تحديث دعوى حادثة')
        : (isAppeal ? 'إضافة شخص ثالث (استئناف)' : 'إجراء دعوى حادثة');

    return (
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth={isThirdParty ? 'max-w-md' : 'max-w-sm'}>
            <SmartModalHeader icon={Briefcase} title={title} onClose={onClose} />
            <div className={`${T.body} max-h-[80vh]`}>
                <div>
                    <label className={T.label}>نوع الإجراء</label>
                    <select value={type} onChange={(e) => handleTypeChange(e.target.value)} className={T.select}>
                        {isAppeal ? (
                            <option value="joinder_appeal" className={optionClass}>
                                دخول اختصامي
                            </option>
                        ) : (
                            <>
                                <option value="" disabled className={optionClass}>
                                    اختر نوع الإجراء...
                                </option>
                                <option value="joined" className={optionClass}>
                                    دعوى منضمة
                                </option>
                                <option value="counter" className={optionClass}>
                                    دعوى متقابلة
                                </option>
                                <option value="thirdParty" className={optionClass}>
                                    دخول شخص ثالث
                                </option>
                            </>
                        )}
                    </select>
                </div>

                {spawnConfirm && !editMode ? (
                    <div className={spawnBox}>
                        <h4 className="text-sm font-bold text-white/90 mb-2">تأكيد إنشاء الإضبارة وربطها</h4>
                        <p className="text-[11px] text-white/45 leading-relaxed">
                            هل تريد متابعة إنشاء{' '}
                            <span className={`${highlight} font-bold`}>
                                {spawnConfirm.type === 'joined' ? 'دعوى منضمة' : 'دعوى متقابلة'}
                            </span>
                            ؟
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    onSpawnLinkedCase?.({
                                        type: spawnConfirm.type,
                                        incidentalId: spawnConfirm.incidentalId,
                                    });
                                    onClose();
                                }}
                                className={`${T.btn} flex-1`}
                            >
                                تأكيد
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSpawnConfirm(null);
                                    setType('');
                                }}
                                className={cancelBtn}
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                ) : null}

                    {isThirdParty ? (
                        <>
                            <div>
                                <label className={T.label}>اسم الشخص الثالث</label>
                                <input
                                    type="text"
                                    value={partyName}
                                    onChange={(e) => setPartyName(e.target.value)}
                                    className={T.field}
                                />
                            </div>

                            <div>
                                <label className={T.label}>نوع الدخول</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setThirdPartyEntryMode('affiliative')}
                                        className={thirdPartyEntryMode === 'affiliative' ? T.chipActive : T.chip}
                                    >
                                        انضمامي
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setThirdPartyEntryMode('selfClaim')}
                                        className={thirdPartyEntryMode === 'selfClaim' ? T.chipActive : T.chip}
                                    >
                                        طالب الحكم لنفسه
                                    </button>
                                </div>
                            </div>

                            {thirdPartyEntryMode === 'affiliative' ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className={T.label}>ينضم إلى</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                disabled={plaintiffs.length === 0}
                                                onClick={() => setAffiliationSide('plaintiff')}
                                                className={affiliationSide === 'plaintiff' ? T.chipActive : T.chip}
                                            >
                                                {affiliationSideLabel('plaintiff', plaintiffs.length || 1)}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={defendants.length === 0}
                                                onClick={() => setAffiliationSide('defendant')}
                                                className={affiliationSide === 'defendant' ? T.chipActive : T.chip}
                                            >
                                                {affiliationSideLabel('defendant', defendants.length || 1)}
                                            </button>
                                        </div>
                                    </div>

                                    {affiliationSide && affiliationParties.length > 0 ? (
                                        <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3 space-y-2">
                                            <p className={`text-[10px] font-bold ${highlightMuted}`}>
                                                {affiliationSide === 'plaintiff' ? 'جانب المدعي' : 'جانب المدعى عليه'}
                                            </p>
                                            {affiliationParties.map((party) => (
                                                <div
                                                    key={party.id}
                                                    className="rounded-lg border border-white/[0.06] bg-black/25 p-3"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{party.name}</p>
                                                            <p className="text-[10px] text-white/45">{party.role}</p>
                                                        </div>
                                                        <span className="text-[10px] text-white/35">↔</span>
                                                        <div className="text-left">
                                                            <p className={`text-sm font-bold ${highlight}`}>{partyName || 'الشخص الثالث'}</p>
                                                            <p className="text-[10px] text-white/45">طالب الانضمام</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : affiliationSide ? (
                                        <p className="text-[11px] text-white/45">لا يوجد أطراف مسجّلة في هذا الجانب.</p>
                                    ) : null}
                                </div>
                            ) : null}
                        </>
                    ) : !isSpawnType && type ? (
                        <div>
                            <label className={T.label}>اسم الخصم / الطرف الثالث</label>
                            <input type="text" value={partyName} onChange={(e) => setPartyName(e.target.value)} className={T.field} />
                        </div>
                    ) : null}

                    {type && !isSpawnType ? (
                        <div>
                            <label className={T.label}>التفاصيل</label>
                            <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className={`${T.field} resize-none`} />
                        </div>
                    ) : null}

                    {type && !isSpawnType ? (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                            className={`${T.btn} ${T.btnDisabled} flex items-center justify-center`}
                        >
                            {editMode ? 'تحديث البيانات' : 'إضافة'}
                        </button>
                    ) : null}
                </div>
        </MoroccanGlassShell>
    );
};


