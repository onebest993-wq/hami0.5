import type { CriminalComplainant, CriminalStoreState } from '../criminalStore';
import { isInvestigationStoredStage } from '../criminalStageRuntimeCore';
import { PUBLIC_RIGHT_COMPLAINANT_NAME } from '../publicProsecutionGovernance';
import {
    CARD_BASE,
    INPUT_BASE,
    PremiumCheckbox,
    PremiumSwitchRow,
    complainantNameLabel,
    complainantRoleJuvenileLabel,
    isMinorComplainant,
    OfficeClientToggle,
} from './helpers';

export type ComplainantSectionProps = {
    complainantCardTitle: string;
    complainants: CriminalComplainant[];
    isPublicProsecutionComplainant: boolean;
    stage: string;
    addComplainant: CriminalStoreState['addComplainant'];
    deleteComplainant: CriminalStoreState['deleteComplainant'];
    setComplainantField: CriminalStoreState['setComplainantField'];
    setDraftPublicProsecutionComplainant: CriminalStoreState['setDraftPublicProsecutionComplainant'];
    toggleDraftComplainantOfficeClient: CriminalStoreState['toggleDraftComplainantOfficeClient'];
};

/** بطاقة بيانات المشتكي/المجني عليه — مستخرجة من CriminalNewCase بحرفية الـ JSX. */
export function ComplainantSection({
    complainantCardTitle,
    complainants,
    isPublicProsecutionComplainant,
    stage,
    addComplainant,
    deleteComplainant,
    setComplainantField,
    setDraftPublicProsecutionComplainant,
    toggleDraftComplainantOfficeClient,
}: ComplainantSectionProps) {
    return (
        <div className={CARD_BASE}>
            <div className="text-white font-bold text-sm mb-3">{complainantCardTitle}</div>
            <div className="space-y-4">
                {complainants.map((c, complainantIndex) => {
                    const complainantMinor =
                        !isPublicProsecutionComplainant && isMinorComplainant(c);
                    const complainantFieldsLocked = isPublicProsecutionComplainant;
                    return (
                        <div
                            key={c.id}
                            className={`space-y-3 rounded-2xl border p-3 ${
                                c.isOfficeClient && !complainantFieldsLocked
                                    ? 'border-[#E6C673]/35 bg-[#E6C673]/[0.04]'
                                    : 'border-white/10 bg-white/[0.02]'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {!complainantFieldsLocked ? (
                                        <OfficeClientToggle
                                            active={Boolean(c.isOfficeClient)}
                                            onClick={() =>
                                                toggleDraftComplainantOfficeClient(c.id, !c.isOfficeClient)
                                            }
                                        />
                                    ) : null}
                                    {complainantIndex === 0 ? (
                                        <PremiumCheckbox
                                            dense
                                            checked={isPublicProsecutionComplainant}
                                            onChange={setDraftPublicProsecutionComplainant}
                                            label="المشتكي هو الحق العام / الادعاء العام"
                                            testId="criminal-public-prosecution-complainant"
                                        />
                                    ) : null}
                                </div>
                                {complainantRoleJuvenileLabel(stage, isMinorComplainant(c)) ? (
                                    <div className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-black text-emerald-100 whitespace-nowrap">
                                        {Boolean(c.isUnderSeven)
                                            ? isInvestigationStoredStage(stage)
                                                ? 'المشتكي - صغير'
                                                : 'المجني عليه - صغير'
                                            : complainantRoleJuvenileLabel(stage, Boolean(c.isJuvenile))}
                                    </div>
                                ) : null}
                                {!complainantFieldsLocked && complainants.length > 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const ok =
                                                typeof globalThis.confirm === 'function'
                                                    ? globalThis.confirm(
                                                          complainantMinor
                                                              ? 'هل أنت متأكد من حذف هذا المجني عليه الحدث/الصغير؟'
                                                              : 'هل أنت متأكد من حذف هذا المشتكي؟',
                                                      )
                                                    : false;
                                            if (!ok) return;
                                            deleteComplainant(c.id);
                                        }}
                                        className="min-h-[44px] rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-[12px] font-black text-red-200/85 hover:text-red-100 hover:bg-red-500/15 transition touch-manipulation"
                                    >
                                        حذف
                                    </button>
                                ) : null}
                            </div>
                            {!complainantFieldsLocked ? (
                                <div className="grid grid-cols-1 gap-2 rounded-lg border border-white/[0.07] bg-black/20 px-2.5 py-2 sm:grid-cols-2">
                                    <PremiumSwitchRow
                                        compact
                                        label="حدث (دون 18)"
                                        pressed={Boolean(c.isJuvenile)}
                                        onToggle={() => {
                                            const next = !Boolean(c.isJuvenile);
                                            setComplainantField(c.id, 'isJuvenile', next);
                                            if (!next) {
                                                setComplainantField(c.id, 'guardianName', '');
                                                setComplainantField(c.id, 'guardianRelationship', '');
                                                setComplainantField(c.id, 'birthDate', '');
                                            }
                                        }}
                                    />
                                    <PremiumSwitchRow
                                        compact
                                        label="دون الـ 7 سنوات"
                                        pressed={Boolean(c.isUnderSeven)}
                                        onToggle={() =>
                                            setComplainantField(
                                                c.id,
                                                'isUnderSeven',
                                                !Boolean(c.isUnderSeven),
                                            )
                                        }
                                    />
                                    {complainantMinor ? (
                                        <div className="mt-1 grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
                                            <div>
                                                <label className="mb-1.5 block text-[11px] font-bold text-white/65">
                                                    اسم ولي الأمر أو الوصي القانوني (مقدم الشكوى)
                                                </label>
                                                <input
                                                    className={INPUT_BASE}
                                                    value={String(c.guardianName ?? '')}
                                                    required
                                                    onChange={(e) =>
                                                        setComplainantField(c.id, 'guardianName', e.target.value)
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1.5 block text-[11px] font-bold text-white/65">
                                                    صلة قرابة الوصي
                                                </label>
                                                <input
                                                    className={INPUT_BASE}
                                                    value={String(c.guardianRelationship ?? '')}
                                                    required
                                                    onChange={(e) =>
                                                        setComplainantField(
                                                            c.id,
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
                            ) : null}
                            <div>
                                <label className="mb-1.5 block text-[11px] font-bold text-white/65">
                                    {complainantFieldsLocked
                                        ? 'اسم المشتكي'
                                        : complainantNameLabel(complainantMinor)}
                                </label>
                                <input
                                    className={`${INPUT_BASE}${complainantFieldsLocked ? ' opacity-70 cursor-not-allowed' : ''}`}
                                    value={
                                        complainantFieldsLocked
                                            ? PUBLIC_RIGHT_COMPLAINANT_NAME
                                            : c.fullName
                                    }
                                    onChange={(e) => setComplainantField(c.id, 'fullName', e.target.value)}
                                    disabled={complainantFieldsLocked}
                                    required={!complainantFieldsLocked}
                                    data-testid={
                                        complainantIndex === 0
                                            ? 'criminal-new-case-complainant-name'
                                            : undefined
                                    }
                                />
                            </div>
                            {!complainantFieldsLocked ? (
                                <>
                                    <div>
                                        <label className="mb-1.5 block text-[11px] font-bold text-white/65">
                                            رقم الهاتف
                                        </label>
                                        <input
                                            className={INPUT_BASE}
                                            value={c.phone}
                                            onChange={(e) =>
                                                setComplainantField(c.id, 'phone', e.target.value)
                                            }
                                            inputMode="tel"
                                        />
                                    </div>
                                </>
                            ) : null}
                            <div className="h-px bg-white/[0.06]" />
                        </div>
                    );
                })}

                {!isPublicProsecutionComplainant ? (
                    <button
                        type="button"
                        className="w-full min-h-[44px] rounded-xl border border-dashed border-white/15 bg-white/[0.03] py-3 text-sm font-bold text-white/85 transition-colors hover:border-[#E6C673]/40 hover:bg-white/[0.06] hover:text-[#E6C673] touch-manipulation"
                        onClick={addComplainant}
                    >
                        + إضافة مشتكي آخر
                    </button>
                ) : null}
            </div>
        </div>
    );
}
