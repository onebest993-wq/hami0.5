import React, { useState } from 'react';
import { Briefcase } from '@/app/components/ui/icons/Briefcase';
import type { AffiliationSide, Party, ThirdPartyEntryMode } from '../../../LawyerShared';
import { groupPartiesBySide, affiliationSideLabel } from '../../smartFile/incidentalCaseLinking';
import { MoroccanGlassShell } from '../../smartFile/moroccanGlassShell';
import { SmartModalHeader, useSmartModalAccent } from '../../smartFile/smartModalChrome';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { isCounterClaimAllowedStage, buildIncidentalSpawnConfirmPreview } from '@/app/domain/lawsuit/incidentalSpawnPrefill';
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
    const counterClaimAllowed = isCounterClaimAllowedStage(stageLabel);
    const isThirdParty = type === 'thirdParty';
    const isSpawnType = type === 'joined' || type === 'counter';

    const stageParties: Party[] =
        currentStage && typeof currentStage !== 'string' && Array.isArray(currentStage.parties)
            ? (currentStage.parties as Party[])
            : [];
    const stageRecord =
        currentStage && typeof currentStage !== 'string'
            ? (currentStage as {
                  stageName?: string;
                  court?: string;
                  judge?: string;
                  parties?: Party[];
              })
            : null;
    const spawnPreview = spawnConfirm && stageRecord
        ? buildIncidentalSpawnConfirmPreview(stageRecord, spawnConfirm.type)
        : null;
    const { plaintiffs, defendants } = groupPartiesBySide(stageParties);
    const affiliationParties = affiliationSide === 'plaintiff' ? plaintiffs : affiliationSide === 'defendant' ? defendants : [];

    // إعادة تهيئة النموذج عند فتح الحافة فقط (false→true) — لا تُمسَح أثناء التحرير عند تغيّر isAppeal/editData
    const wasOpenRef = React.useRef(false);
    React.useEffect(() => {
        if (!isOpen) {
            wasOpenRef.current = false;
            return;
        }
        if (wasOpenRef.current) return;
        wasOpenRef.current = true;
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
        if (!editMode && next === 'counter' && !counterClaimAllowed) {
            SmartToast.error('لا يمكن إنشاء دعوى متقابلة في مرحلة الاستئناف أو إعادة المحاكمة');
            return;
        }
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
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth={isThirdParty ? 'max-w-2xl' : 'max-w-xl'}>
            <SmartModalHeader icon={Briefcase} title={title} onClose={onClose} />
            <div className={`${T.body} max-h-[82vh] md:min-h-[28rem] md:space-y-4`}>
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
                                <option value="counter" disabled={!counterClaimAllowed} className={optionClass}>
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
                        {spawnPreview ? (
                            <div className="mt-3 space-y-2 rounded-xl border border-white/[0.08] bg-black/20 p-3 text-[10px] text-white/55">
                                {spawnPreview.court ? (
                                    <p>
                                        <span className="text-white/35 font-bold">المحكمة: </span>
                                        {spawnPreview.court}
                                    </p>
                                ) : null}
                                {spawnPreview.judge ? (
                                    <p>
                                        <span className="text-white/35 font-bold">القاضي: </span>
                                        {spawnPreview.judge}
                                    </p>
                                ) : null}
                                {spawnPreview.stage ? (
                                    <p>
                                        <span className="text-white/35 font-bold">المرحلة: </span>
                                        {spawnPreview.stage}
                                    </p>
                                ) : null}
                                {spawnPreview.plaintiffs.length > 0 ? (
                                    <div>
                                        <p className="text-white/35 font-bold mb-1">المدعي (جانب الدعوى الجديدة)</p>
                                        {spawnPreview.plaintiffs.map((p) => (
                                            <p key={p.id} className="text-white/75">
                                                {p.name || '—'}
                                                {p.status ? (
                                                    <span className="text-white/35"> — {p.status}</span>
                                                ) : null}
                                            </p>
                                        ))}
                                    </div>
                                ) : null}
                                {spawnPreview.defendants.length > 0 ? (
                                    <div>
                                        <p className="text-white/35 font-bold mb-1">المدعى عليه</p>
                                        {spawnPreview.defendants.map((p) => (
                                            <p key={p.id} className="text-white/75">
                                                {p.name || '—'}
                                                {p.status ? (
                                                    <span className="text-white/35"> — {p.status}</span>
                                                ) : null}
                                            </p>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                        <div className="mt-3 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!onSpawnLinkedCase) {
                                        SmartToast.error('تعذّر فتح نموذج الإضبارة المرتبطة');
                                        return;
                                    }
                                    onSpawnLinkedCase({
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


