import type { CriminalDefendant, CriminalStoreState, DefendantStatus } from '../criminalStore';
import { normalizeGuarantorDetails } from '../criminalStore';
import { formatCriminalStageLabel, getDefendantStatusSelectOptions } from '../criminalStagePresentationCore';
import { normalizeDefendantStatusForJuvenileToggle } from '../criminalStagePresentationCore';
import type { CrimeType } from '../criminalCaseModel';
import type { InvestigationDefendantsPartyMix } from '../juvenileInvestigationRules';
import { resolveDefendantFullName } from '../criminalUnknownDefendant';
import {
    CARD_BASE,
    FIELD_LABEL,
    INPUT_BASE,
    PremiumCheckbox,
    OfficeClientToggle,
    UnknownDefendantToggle,
    defendantNameLabel,
    defendantRoleJuvenileLabel,
    defendantStatusLabel,
    isMinorDefendant,
    requiresDetentionExpiryDate,
} from './helpers';

export type DefendantSectionProps = {
    defendantCardTitle: string;
    stage: string;
    investigationPartyMix: InvestigationDefendantsPartyMix;
    identifiedDefendantsForForm: CriminalDefendant[];
    unknownDefendants: CriminalDefendant[];
    showUnknownDefendantOption: boolean;
    primaryDefendantSlotId: string;
    crimeType: CrimeType | '';
    showMutualComplaintOption: boolean;
    isMutualComplaint: boolean;
    toggleDraftDefendantOfficeClient: CriminalStoreState['toggleDraftDefendantOfficeClient'];
    toggleDraftDefendantIdentityUnknown: CriminalStoreState['toggleDraftDefendantIdentityUnknown'];
    deleteDefendant: CriminalStoreState['deleteDefendant'];
    setDefendantField: CriminalStoreState['setDefendantField'];
    setDraftDefendantGuarantor: CriminalStoreState['setDraftDefendantGuarantor'];
    addDefendant: CriminalStoreState['addDefendant'];
    addUnknownDefendant: CriminalStoreState['addUnknownDefendant'];
    setDraftMutualComplaint: CriminalStoreState['setDraftMutualComplaint'];
};

/** بطاقة بيانات المشكو منه/المتهم — مستخرجة من CriminalNewCase بحرفية الـ JSX. */
export function DefendantSection({
    defendantCardTitle,
    stage,
    investigationPartyMix,
    identifiedDefendantsForForm,
    unknownDefendants,
    showUnknownDefendantOption,
    primaryDefendantSlotId,
    crimeType,
    showMutualComplaintOption,
    isMutualComplaint,
    toggleDraftDefendantOfficeClient,
    toggleDraftDefendantIdentityUnknown,
    deleteDefendant,
    setDefendantField,
    setDraftDefendantGuarantor,
    addDefendant,
    addUnknownDefendant,
    setDraftMutualComplaint,
}: DefendantSectionProps) {
    return (
        <div className={CARD_BASE}>
            <div className="text-white font-bold text-sm mb-3">{defendantCardTitle}</div>
            {stage && investigationPartyMix === 'juveniles_only' ? (
                <div className="mb-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[12px] font-black text-emerald-100/90">
                    👶 مسار الحدث: {formatCriminalStageLabel(stage, false)}
                </div>
            ) : null}
            <div className="space-y-3">
                {identifiedDefendantsForForm.map((d) => {
                            const isUnderSeven = Boolean(d.isUnderSeven);
                            const showDetentionExpiryDate = !isUnderSeven && requiresDetentionExpiryDate(d.status);
                            const isPrimaryDefendantSlot = d.id === primaryDefendantSlotId;
                            return (
                                <div
                                    key={d.id}
                                    className={`space-y-3 rounded-2xl border p-3 ${
                                        d.isOfficeClient
                                            ? 'border-[#E6C673]/35 bg-[#E6C673]/[0.04]'
                                            : 'border-white/10 bg-white/5'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <OfficeClientToggle
                                                active={Boolean(d.isOfficeClient)}
                                                onClick={() =>
                                                    toggleDraftDefendantOfficeClient(d.id, !d.isOfficeClient)
                                                }
                                            />
                                            {showUnknownDefendantOption &&
                                            isPrimaryDefendantSlot &&
                                            unknownDefendants.length === 0 ? (
                                                <UnknownDefendantToggle
                                                    active={false}
                                                    title="تفعيل: تحويل هذا المتهم إلى مجهول"
                                                    onClick={() =>
                                                        toggleDraftDefendantIdentityUnknown(d.id, true)
                                                    }
                                                />
                                            ) : null}
                                        </div>
                                        {defendantRoleJuvenileLabel(stage, Boolean(d.isJuvenile), isUnderSeven) ? (
                                            <div className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black text-emerald-100 whitespace-nowrap">
                                                {defendantRoleJuvenileLabel(stage, Boolean(d.isJuvenile), isUnderSeven)}
                                            </div>
                                        ) : null}
                                        {identifiedDefendantsForForm.length > 1 ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const ok =
                                                        typeof globalThis.confirm === 'function'
                                                            ? globalThis.confirm(
                                                                  isUnderSeven
                                                                      ? 'هل أنت متأكد من حذف هذا الصغير؟'
                                                                      : 'هل أنت متأكد من حذف هذا المتهم؟',
                                                              )
                                                            : false;
                                                    if (!ok) return;
                                                    deleteDefendant(d.id);
                                                }}
                                                className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1 text-[12px] font-black text-red-200/80 hover:text-red-200 hover:bg-red-500/15 transition"
                                            >
                                                🗑️ حذف
                                            </button>
                                        ) : null}
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                                        <div className="flex flex-wrap items-center gap-6">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-white/80 text-sm font-bold whitespace-nowrap">
                                                    👶 هذا الشخص حَدَث (قاصر لم يتم 18 سنة)
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const next = !Boolean(d.isJuvenile);
                                                        setDefendantField(d.id, 'isJuvenile', next);
                                                        const nextStatus = normalizeDefendantStatusForJuvenileToggle(
                                                            d.status,
                                                            next,
                                                        );
                                                        if (nextStatus !== d.status) {
                                                            setDefendantField(d.id, 'status', nextStatus);
                                                        }
                                                        if (!next) {
                                                            setDefendantField(d.id, 'guardianName', '');
                                                            setDefendantField(d.id, 'guardianRelationship', '');
                                                            setDefendantField(d.id, 'birthDate', '');
                                                        }
                                                    }}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                                                        Boolean(d.isJuvenile)
                                                            ? 'border-emerald-500/40 bg-emerald-500/20'
                                                            : 'border-slate-600/60 bg-slate-800/60'
                                                    }`}
                                                    aria-pressed={Boolean(d.isJuvenile)}
                                                >
                                                    <span
                                                        className={`inline-block h-5 w-5 transform rounded-full bg-white/90 transition ${
                                                            Boolean(d.isJuvenile) ? 'translate-x-5' : 'translate-x-1'
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-white/80 text-sm font-bold whitespace-nowrap">
                                                    🧒 دون الـ 7 سنوات
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const nextUnderSeven = !Boolean(d.isUnderSeven);
                                                        setDefendantField(d.id, 'isUnderSeven', nextUnderSeven);
                                                        if (nextUnderSeven) {
                                                            // أقل من 7 سنوات: لا مسؤولية جزائية ولا توقيف/إيداع.
                                                            setDefendantField(d.id, 'isJuvenile', true);
                                                            setDefendantField(d.id, 'status', '');
                                                            setDefendantField(d.id, 'detentionAuthority', '');
                                                            setDefendantField(d.id, 'detentionExpiryDate', '');
                                                            setDraftDefendantGuarantor(d.id, null);
                                                        }
                                                    }}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                                                        Boolean(d.isUnderSeven)
                                                            ? 'border-emerald-500/40 bg-emerald-500/20'
                                                            : 'border-slate-600/60 bg-slate-800/60'
                                                    }`}
                                                    aria-pressed={Boolean(d.isUnderSeven)}
                                                >
                                                    <span
                                                        className={`inline-block h-5 w-5 transform rounded-full bg-white/90 transition ${
                                                            Boolean(d.isUnderSeven)
                                                                ? 'translate-x-5'
                                                                : 'translate-x-1'
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                        {isUnderSeven ? (
                                            <div className="mt-2 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-200/95 leading-relaxed">
                                                تنبيه: انعدام المسؤولية الجزائية لعدم إكمال السن القانوني م/47 رعاية أحداث
                                            </div>
                                        ) : null}
                                        {isMinorDefendant(d) ? (
                                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="sm:col-span-2">
                                                    <label className="block text-white/70 text-xs mb-1">
                                                        اسم ولي الأمر أو الوصي القانوني
                                                    </label>
                                                    <input
                                                        className={INPUT_BASE}
                                                        value={String(d.guardianName ?? '')}
                                                        onChange={(e) =>
                                                            setDefendantField(d.id, 'guardianName', e.target.value)
                                                        }
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-white/70 text-xs mb-1">
                                                        صلة قرابة الوصي
                                                    </label>
                                                    <input
                                                        className={INPUT_BASE}
                                                        value={String(d.guardianRelationship ?? '')}
                                                        onChange={(e) =>
                                                            setDefendantField(
                                                                d.id,
                                                                'guardianRelationship',
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="أب / أم / عم ..."
                                                    />
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                    <div>
                                        <label className={FIELD_LABEL}>
                                            {defendantNameLabel(stage, Boolean(d.isJuvenile), isUnderSeven)}
                                        </label>
                                        <input
                                            className={INPUT_BASE}
                                            value={d.fullName}
                                            onChange={(e) => setDefendantField(d.id, 'fullName', e.target.value)}
                                            required
                                            data-testid="criminal-new-case-defendant-name"
                                        />
                                    </div>
                                    <div>
                                        <label className={FIELD_LABEL}>العنوان</label>
                                        <input
                                            className={INPUT_BASE}
                                            value={String(d.address ?? '')}
                                            onChange={(e) => setDefendantField(d.id, 'address', e.target.value)}
                                        />
                                    </div>

                                    {!isUnderSeven ? (
                                        <div>
                                            <label className={FIELD_LABEL}>{defendantStatusLabel(Boolean(d.isJuvenile))}</label>
                                            <select
                                                className={INPUT_BASE}
                                                value={d.status}
                                                onChange={(e) => {
                                                    const nextStatus = e.target.value as DefendantStatus | '';
                                                    setDefendantField(d.id, 'status', nextStatus);
                                                    if (nextStatus === 'مكفل') {
                                                        setDraftDefendantGuarantor(d.id, {
                                                            bailAmount:
                                                                normalizeGuarantorDetails(d.guarantorDetails)
                                                                    ?.bailAmount ?? '',
                                                            guarantorInfo:
                                                                normalizeGuarantorDetails(d.guarantorDetails)
                                                                    ?.guarantorInfo ?? '',
                                                        });
                                                    } else {
                                                        setDraftDefendantGuarantor(d.id, null);
                                                    }
                                                }}
                                            >
                                                <option value="" className="bg-[#0B1021] text-white">
                                                    اختر...
                                                </option>
                                                {getDefendantStatusSelectOptions({
                                                    isJuvenile: Boolean(d.isJuvenile),
                                                    crimeType,
                                                    stage,
                                                    currentStatus: d.status,
                                                }).map((opt) => (
                                                    <option key={opt.value} value={opt.value} className="bg-[#0B1021] text-white">
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : null}

                                    {!isUnderSeven && d.status === 'مكفل' ? (
                                        <div className="space-y-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
                                            <div>
                                                <label className={FIELD_LABEL}>مقدار الكفالة المالية</label>
                                                <input
                                                    className={INPUT_BASE}
                                                    value={
                                                        normalizeGuarantorDetails(d.guarantorDetails)?.bailAmount ?? ''
                                                    }
                                                    onChange={(e) =>
                                                        setDraftDefendantGuarantor(d.id, { bailAmount: e.target.value })
                                                    }
                                                    placeholder="مثال: 5,000,000 دينار"
                                                />
                                            </div>
                                            <div>
                                                <label className={FIELD_LABEL}>
                                                    معلومات الكفيل الضامن (كفالة أشخاص)
                                                </label>
                                                <textarea
                                                    className={`${INPUT_BASE} min-h-[88px]`}
                                                    value={
                                                        normalizeGuarantorDetails(d.guarantorDetails)?.guarantorInfo ??
                                                        ''
                                                    }
                                                    onChange={(e) =>
                                                        setDraftDefendantGuarantor(d.id, {
                                                            guarantorInfo: e.target.value,
                                                        })
                                                    }
                                                    placeholder='مثال: "الموظف فلان الفلاني - مديرية تربية القادسية"'
                                                />
                                            </div>
                                        </div>
                                    ) : null}

                                    {showDetentionExpiryDate ? (
                                        <div>
                                            <label className="block text-white/70 text-xs mb-1">
                                                تاريخ انتهاء التوقيف / موعد التمديد القادم
                                            </label>
                                            <input
                                                type="date"
                                                className={INPUT_BASE}
                                                value={d.detentionExpiryDate}
                                                onChange={(e) =>
                                                    setDefendantField(d.id, 'detentionExpiryDate', e.target.value)
                                                }
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}

                {showUnknownDefendantOption && unknownDefendants.length > 0 ? (
                    <div className="space-y-2">
                        {unknownDefendants.map((d) => (
                            <div
                                key={d.id}
                                className="flex items-center justify-between gap-2 rounded-xl border border-red-500/25 bg-red-900/15 px-3 py-2.5"
                            >
                                <span className="text-red-100 font-bold text-sm whitespace-normal break-words">
                                    {resolveDefendantFullName(d) || d.fullName}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                    {showUnknownDefendantOption && d.id === primaryDefendantSlotId ? (
                                        <UnknownDefendantToggle
                                            active
                                            title="إلغاء: إعادة هذا المتهم إلى معلوم"
                                            onClick={() =>
                                                toggleDraftDefendantIdentityUnknown(d.id, false)
                                            }
                                        />
                                    ) : null}
                                    {unknownDefendants.length > 1 ||
                                    identifiedDefendantsForForm.length > 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const ok =
                                                    typeof globalThis.confirm === 'function'
                                                        ? globalThis.confirm('حذف هذا المجهول من الإضبارة؟')
                                                        : false;
                                                if (!ok) return;
                                                deleteDefendant(d.id);
                                            }}
                                            className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-black text-red-200 hover:bg-red-500/20"
                                        >
                                            حذف
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                        type="button"
                        className="w-full rounded-xl border border-white/10 bg-white/5 text-white text-sm font-bold py-3 hover:bg-white/10 hover:border-[#E6C673]/40 transition-colors"
                        onClick={addDefendant}
                    >
                        + إضافة مشكو منه / متهم آخر
                    </button>
                    {showUnknownDefendantOption ? (
                        <button
                            type="button"
                            title={
                                unknownDefendants.length > 0
                                    ? 'إضافة متهم مجهول آخر'
                                    : 'إضافة متهم مجهول'
                            }
                            className="w-full rounded-xl border border-red-500/20 bg-red-500/10 text-red-100 text-sm font-bold py-3 hover:bg-red-500/15 hover:border-red-500/35 transition-colors"
                            onClick={addUnknownDefendant}
                        >
                            {unknownDefendants.length > 0
                                ? '+ إضافة متهم مجهول آخر'
                                : '+ إضافة متهم مجهول'}
                        </button>
                    ) : null}
                </div>
            </div>
            {showMutualComplaintOption ? (
                <PremiumCheckbox
                    className="mt-4"
                    checked={isMutualComplaint === true}
                    onChange={setDraftMutualComplaint}
                    label="إضافة دعوى متقابلة"
                    testId="criminal-mutual-complaint-toggle"
                />
            ) : null}
        </div>
    );
}
