import React, { useEffect, useMemo, useState } from 'react';
import type { ManualAppealAppellantActor } from '../utils';
import type { AppealDeadlineWindows } from '../utils';
import type { AppealUiPerspective } from '../appealUiLabels';

type AppealStage = 'grievance' | 'cassation';

type ExecutorSideAppealEntryPanelProps = {
    windows: AppealDeadlineWindows;
    locked: boolean;
    debtorOnly: boolean;
    cassationOnly: boolean;
    appealPerspective: AppealUiPerspective;
    challengeBtnClass: string;
    primaryBtnClass: string;
    secondaryBtnClass: string;
    onCommit: (stage: AppealStage, appellants: ManualAppealAppellantActor[]) => void;
    onWaive?: () => void;
    showWaive?: boolean;
    /** بعد تظلم سابق — يُتيح تسجيل تمييز فقط */
    grievanceAlreadyFiled?: boolean;
    /** طاعن التمييز المحدد مسبقاً بعد رد التظلم */
    presetCassationAppellant?: ManualAppealAppellantActor | null;
};

const CHIP_BASE =
    'rounded-full border px-3 py-1 text-[10px] font-bold transition-colors disabled:pointer-events-none disabled:opacity-40';
const CHIP_OFF = 'border-white/10 bg-white/[0.04] text-slate-400 hover:text-slate-200';
const CHIP_ON =
    'border-[#E6C673]/35 bg-[#E6C673]/[0.12] text-[#E6C673] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';

function toggleActor(
    list: ManualAppealAppellantActor[],
    actor: ManualAppealAppellantActor,
    onChange: (next: ManualAppealAppellantActor[]) => void
) {
    onChange(list.includes(actor) ? list.filter((x) => x !== actor) : [...list, actor]);
}

export function ExecutorSideAppealEntryPanel({
    windows,
    locked,
    debtorOnly,
    cassationOnly,
    appealPerspective,
    challengeBtnClass,
    primaryBtnClass,
    secondaryBtnClass,
    onCommit,
    onWaive,
    showWaive = false,
    grievanceAlreadyFiled = false,
    presetCassationAppellant = null,
}: ExecutorSideAppealEntryPanelProps) {
    const [open, setOpen] = useState(false);
    const cassationOnlyMode = cassationOnly || grievanceAlreadyFiled;
    const [stage, setStage] = useState<AppealStage>(cassationOnlyMode ? 'cassation' : 'grievance');
    const [appellants, setAppellants] = useState<ManualAppealAppellantActor[]>([]);

    const availableAppellants = useMemo(() => {
        if (presetCassationAppellant) return [presetCassationAppellant];
        return debtorOnly ? (['debtor'] as const) : (['lawyer', 'debtor'] as const);
    }, [debtorOnly, presetCassationAppellant]);

    const showAppellantPicker = availableAppellants.length > 1 && !presetCassationAppellant;

    useEffect(() => {
        if (!open) return;
        if (!showAppellantPicker && availableAppellants.length === 1) {
            setAppellants([availableAppellants[0]!]);
        }
    }, [open, showAppellantPicker, availableAppellants]);

    const stageAllowed = stage === 'grievance' ? windows.canTadhallum : windows.canTamyeez;
    const effectiveAppellants = showAppellantPicker
        ? appellants
        : availableAppellants.length === 1
          ? [availableAppellants[0]!]
          : appellants;
    const canSubmit = effectiveAppellants.length > 0 && stageAllowed && !locked;

    const resetPanel = () => {
        setOpen(false);
        setStage(cassationOnlyMode ? 'cassation' : 'grievance');
        setAppellants([]);
    };

    if (!open) {
        return (
            <div className="flex flex-col gap-2">
                <button
                    type="button"
                    disabled={locked}
                    onClick={() => setOpen(true)}
                    className={challengeBtnClass}
                >
                    {grievanceAlreadyFiled ? 'تسجيل تمييز' : 'الطعن بالقرار'}
                </button>
                {showWaive && onWaive ? (
                    <button type="button" disabled={locked} onClick={onWaive} className={secondaryBtnClass}>
                        لا حاجة للطعن
                    </button>
                ) : null}
            </div>
        );
    }

    return (
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-[10px] leading-relaxed text-slate-400 text-right">
                {grievanceAlreadyFiled
                    ? presetCassationAppellant
                        ? 'سُجِّل تمييز الطرف الذي رُد تظلمه.'
                        : 'بعد التظلم — يمكن تسجيل تمييز على القرار.'
                    : 'قرار صادر من المنفذ دون طلب مسبق — حدّد مرحلة الطعن ومن بادر به.'}
            </p>

            {!cassationOnlyMode ? (
                <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-300 text-right">مرحلة الطعن</p>
                    <div className="flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            disabled={locked || !windows.canTadhallum}
                            onClick={() => setStage('grievance')}
                            className={`${CHIP_BASE} ${stage === 'grievance' ? CHIP_ON : CHIP_OFF}`}
                        >
                            تظلم
                        </button>
                        <button
                            type="button"
                            disabled={locked || !windows.canTamyeez}
                            onClick={() => setStage('cassation')}
                            className={`${CHIP_BASE} ${stage === 'cassation' ? CHIP_ON : CHIP_OFF}`}
                        >
                            تمييز
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-[11px] font-semibold text-slate-300 text-right">مرحلة الطعن: تمييز</p>
            )}

            {showAppellantPicker ? (
                <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-300 text-right">من قام بالطعن؟</p>
                    <div className="flex flex-wrap justify-end gap-2">
                        {!debtorOnly ? (
                            <button
                                type="button"
                                disabled={locked}
                                onClick={() => toggleActor(appellants, 'lawyer', setAppellants)}
                                className={`${CHIP_BASE} ${
                                    appellants.includes('lawyer') ? CHIP_ON : CHIP_OFF
                                }`}
                            >
                                الدائن
                            </button>
                        ) : null}
                        <button
                            type="button"
                            disabled={locked}
                            onClick={() => toggleActor(appellants, 'debtor', setAppellants)}
                            className={`${CHIP_BASE} ${
                                appellants.includes('debtor') ? CHIP_ON : CHIP_OFF
                            }`}
                        >
                            {appealPerspective === 'debtor_agent' ? 'موكّلنا' : 'المدين'}
                        </button>
                    </div>
                </div>
            ) : presetCassationAppellant ? (
                <p className="text-[11px] text-slate-400 text-right">
                    الطاعن:{' '}
                    <span className="font-semibold text-slate-200">
                        {presetCassationAppellant === 'lawyer'
                            ? 'الدائن'
                            : appealPerspective === 'debtor_agent'
                              ? 'موكّلنا'
                              : 'المدين'}
                    </span>
                </p>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <button
                    type="button"
                    disabled={!canSubmit}
                    onClick={() => {
                        if (!canSubmit) return;
                        onCommit(stage, effectiveAppellants);
                        resetPanel();
                    }}
                    className={primaryBtnClass}
                >
                    تسجيل الطعن
                </button>
                <button type="button" onClick={resetPanel} className={secondaryBtnClass}>
                    إلغاء
                </button>
            </div>
        </div>
    );
}
