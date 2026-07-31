import { useState } from 'react';
import type {
    CrimeType,
    CriminalDefendant,
    DefendantAgeCategory,
    DefendantStatus,
} from '../criminalStore';
import { useCriminalStore } from '../criminalStore';
import { getDefendantStatusSelectOptions } from '../criminalStagePresentationCore';
import {
    DEFENDANT_STATUS_MENU_TITLE,
    REVEAL_INPUT,
    ageCategoryPillClass,
    defendantRevealNameLabel,
} from './shared';

function DefendantMinorDetailFields({
    guardianName,
    guardianRelationship,
    onGuardianName,
    onGuardianRelationship,
    showUnderSevenNotice,
    disabled,
}: {
    guardianName: string;
    guardianRelationship: string;
    onGuardianName: (v: string) => void;
    onGuardianRelationship: (v: string) => void;
    showUnderSevenNotice?: boolean;
    disabled?: boolean;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 space-y-2">
            {showUnderSevenNotice ? (
                <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-200/95 leading-relaxed">
                    تنبيه: انعدام المسؤولية الجزائية لعدم إكمال السن القانوني م/47 رعاية أحداث
                </div>
            ) : null}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="sm:col-span-2">
                    <label className="text-white/70 text-xs font-bold mb-1 block">
                        اسم ولي الأمر أو الوصي القانوني
                    </label>
                    <input
                        className={REVEAL_INPUT}
                        value={guardianName}
                        disabled={disabled}
                        onChange={(e) => onGuardianName(e.target.value)}
                    />
                </div>
                <div className="sm:col-span-2">
                    <label className="text-white/70 text-xs font-bold mb-1 block">صلة قرابة الوصي</label>
                    <input
                        className={REVEAL_INPUT}
                        value={guardianRelationship}
                        disabled={disabled}
                        placeholder="أب / أم / عم ..."
                        onChange={(e) => onGuardianRelationship(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}

function AgeCategoryPicker({
    category,
    onChange,
    disabled,
}: {
    category: DefendantAgeCategory;
    onChange: (next: DefendantAgeCategory) => void;
    disabled?: boolean;
}) {
    const juvenileActive = category === 'juvenile';
    const underSevenActive = category === 'under_seven';

    return (
        <div className="flex flex-wrap items-center gap-1.5 w-full">
            <button
                type="button"
                disabled={disabled}
                aria-pressed={underSevenActive}
                onClick={() => onChange(underSevenActive ? 'adult' : 'under_seven')}
                className={ageCategoryPillClass(underSevenActive, disabled)}
            >
                أقل من 7 سنوات
            </button>
            <button
                type="button"
                disabled={disabled}
                aria-pressed={juvenileActive}
                onClick={() => onChange(juvenileActive ? 'adult' : 'juvenile')}
                className={ageCategoryPillClass(juvenileActive, disabled)}
            >
                حدث (أقل من 18)
            </button>
        </div>
    );
}

export function UnknownDefendantRevealCard({
    caseId,
    defendant,
    disabled,
    crimeType,
    stage,
}: {
    caseId: string;
    defendant: CriminalDefendant;
    disabled?: boolean;
    crimeType: CrimeType | '';
    stage: string;
}) {
    const revealDefendantIdentity = useCriminalStore((s) => s.revealDefendantIdentity);
    const [open, setOpen] = useState(false);
    const [fullName, setFullName] = useState('');
    const [address, setAddress] = useState('');
    const [ageCategory, setAgeCategory] = useState<DefendantAgeCategory>('adult');
    const [guardianName, setGuardianName] = useState('');
    const [guardianRelationship, setGuardianRelationship] = useState('');
    const [status, setStatus] = useState<DefendantStatus | ''>('');
    const [error, setError] = useState('');

    const revealIsJuvenile = ageCategory === 'juvenile';
    const revealIsUnderSeven = ageCategory === 'under_seven';
    const revealIsMinor = revealIsJuvenile || revealIsUnderSeven;

    const statusOptions = getDefendantStatusSelectOptions({
        isJuvenile: revealIsJuvenile,
        crimeType,
        stage,
        currentStatus: status,
    });

    const resetRevealForm = () => {
        setFullName('');
        setAddress('');
        setAgeCategory('adult');
        setGuardianName('');
        setGuardianRelationship('');
        setStatus('');
        setError('');
    };

    const submitReveal = () => {
        const err = revealDefendantIdentity(caseId, defendant.id, {
            fullName,
            address,
            status: revealIsUnderSeven ? '' : status || undefined,
            isJuvenile: revealIsJuvenile,
            isUnderSeven: revealIsUnderSeven,
            guardianName: revealIsMinor ? guardianName : undefined,
            guardianRelationship: revealIsMinor ? guardianRelationship : undefined,
        });
        if (err) {
            setError(err);
            return;
        }
        setOpen(false);
        setError('');
    };

    return (
        <div className="rounded-md border border-red-500/30 bg-red-900/15 px-2.5 py-2 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-red-100 font-black text-sm whitespace-normal break-words">
                    {defendant.fullName}
                </span>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                        setOpen((prev) => {
                            const next = !prev;
                            if (next) {
                                resetRevealForm();
                            }
                            return next;
                        });
                    }}
                    className="rounded-lg border border-[#E6C673]/40 bg-[#E6C673]/15 px-2.5 py-1 text-[11px] font-black text-[#E6C673] hover:bg-[#E6C673]/25 disabled:opacity-45 disabled:cursor-not-allowed"
                >
                    {open ? 'إلغاء' : 'كشف الهوية'}
                </button>
            </div>
            {open ? (
                <div className="space-y-2 pt-1 border-t border-red-500/20">
                    {error ? (
                        <p className="text-red-300 text-xs font-bold whitespace-normal break-words">{error}</p>
                    ) : null}
                    <div>
                        <label className="text-white/70 text-xs font-bold mb-1 block">
                            {defendantRevealNameLabel(stage, ageCategory)}
                        </label>
                        <input
                            className={REVEAL_INPUT}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="اسم المشكو منه بعد التعرف"
                        />
                    </div>
                    <div>
                        <label className="text-white/70 text-xs font-bold mb-1 block">العنوان</label>
                        <input
                            className={REVEAL_INPUT}
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="text-white/70 text-xs font-bold mb-1 block">الفئة العمرية</label>
                        <AgeCategoryPicker
                            category={ageCategory}
                            onChange={(next) => {
                                setAgeCategory(next);
                                if (next === 'adult') {
                                    setGuardianName('');
                                    setGuardianRelationship('');
                                    setStatus('');
                                } else if (next === 'under_seven') {
                                    setStatus('');
                                }
                            }}
                            disabled={disabled}
                        />
                    </div>
                    {revealIsMinor ? (
                        <DefendantMinorDetailFields
                            guardianName={guardianName}
                            guardianRelationship={guardianRelationship}
                            onGuardianName={setGuardianName}
                            onGuardianRelationship={setGuardianRelationship}
                            showUnderSevenNotice={revealIsUnderSeven}
                            disabled={disabled}
                        />
                    ) : null}
                    {!revealIsUnderSeven ? (
                    <div>
                        <label className="text-white/70 text-xs font-bold mb-1 block">
                            {DEFENDANT_STATUS_MENU_TITLE}
                        </label>
                        <select
                            className={REVEAL_INPUT}
                            value={status}
                            onChange={(e) => setStatus(e.target.value as DefendantStatus | '')}
                        >
                            <option value="" className="bg-[#0B1021]">
                                اختر...
                            </option>
                            {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-[#0B1021]">
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    ) : null}
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={submitReveal}
                        className="w-full rounded-lg border border-emerald-500/35 bg-emerald-500/15 py-2 text-sm font-black text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-45"
                    >
                        تأكيد كشف الهوية
                    </button>
                </div>
            ) : null}
        </div>
    );
}
