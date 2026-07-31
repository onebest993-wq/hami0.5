import React from 'react';
import { X, UserPlus, Trash2 } from 'lucide-react';
import { HamiDateInput } from '@/app/components/ui/HamiDateInput';
import { ProcedureCategoryActionPicker } from './Form_Urgent_Actions/ProcedureCategoryActionPicker';
import { PETITION_ORDER_MANUAL_OPTION, UNIFIED_URGENT_FORM_HEADER } from './Form_Urgent_Actions/constants';
import { useUrgentActionsForm } from './Form_Urgent_Actions/useUrgentActionsForm';
import type { UrgentActionsFormProps } from './Form_Urgent_Actions/urgentActionsFormTypes';

function ClientSideMarker({
    active,
    onToggle,
}: {
    active: boolean;
    onToggle: (next: boolean) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => onToggle(!active)}
            aria-pressed={active}
            aria-label={active ? 'إزالة علامة الموكل' : 'تعيين موكل من هذا الجانب'}
            className={[
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 min-h-[36px]',
                'text-[11px] font-bold transition-all duration-200 touch-manipulation shrink-0',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40',
                active
                    ? 'border-[#E6C673]/45 bg-gradient-to-br from-[#E6C673]/22 to-[#E6C673]/08 text-[#E6C673] shadow-[0_0_20px_rgba(230,198,115,0.18),inset_0_1px_0_rgba(255,255,255,0.12)]'
                    : 'border-white/10 bg-white/[0.04] text-white/50 hover:border-[#E6C673]/28 hover:bg-[#E6C673]/[0.06] hover:text-white/75',
            ].join(' ')}
        >
            <span
                className={[
                    'relative flex h-4 w-4 items-center justify-center rounded-full transition-all',
                    active
                        ? 'bg-[#E6C673] shadow-[0_0_10px_rgba(230,198,115,0.55)]'
                        : 'border border-white/20 bg-white/[0.03]',
                ].join(' ')}
                aria-hidden
            >
                {active ? <span className="h-1.5 w-1.5 rounded-full bg-[#0A0F1C]" /> : null}
            </span>
            <span>{active ? 'موكل' : 'موكلي'}</span>
        </button>
    );
}

const fieldInputClass =
    'w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-[#E6C673]/50 focus:outline-none';
const partyBlockClass = 'rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-4';

/**
 * نموذج الإجراءات المستعجلة والأوامر الولائية — منطق النموذج في useUrgentActionsForm
 */
export const Form_Urgent_Actions: React.FC<UrgentActionsFormProps> = (props) => {
    const {
        selectedSubActionType,
        setSelectedSubActionType,
        customSpecificActionType,
        setCustomSpecificActionType,
        party1List,
        party2List,
        party1EndRef,
        party2EndRef,
        formData,
        validationErrors,
        addParty1,
        removeParty1,
        updateParty1,
        addParty2,
        removeParty2,
        updateParty2,
        isIqrarContext,
        partyLabels,
        party2Hidden,
        isRespondentClient,
        partyCardTitle,
        isParty1Client,
        isParty2Client,
        toggleSideClient,
        handleSubmit,
        updateField,
        safeClose,
    } = useUrgentActionsForm(props);

    return (
        <div className="fixed inset-0 z-[200] bg-[#0B1021] font-['Tajawal'] overflow-hidden">
            <form onSubmit={handleSubmit} className="h-full flex flex-col">
                <div className="sticky top-0 z-50 border-b border-white/10 bg-[#0B1021]/95 backdrop-blur">
                    <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <div className="text-white font-extrabold text-base truncate">
                                {UNIFIED_URGENT_FORM_HEADER.title}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={safeClose}
                                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all flex items-center gap-2"
                                aria-label="إلغاء / رجوع"
                            >
                                <X size={18} />
                                <span className="text-xs font-bold">إلغاء / رجوع</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
                        {Object.keys(validationErrors).length > 0 && (
                            <div className="border border-red-500/25 bg-red-500/10 rounded-xl px-4 py-3 text-red-100 text-sm font-bold">
                                يرجى تصحيح الحقول الإلزامية قبل الإرسال
                            </div>
                        )}

                        <div className="bg-[#0B1021] border border-white/10 rounded-xl p-6">
                            <h2 className="text-white font-bold text-lg mb-4">معلومات الطلب الأساسية</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="md:col-span-2 lg:col-span-3">
                                    <label className="block text-white/70 text-sm mb-2">
                                        اسم المحكمة <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.courtName}
                                        onChange={(e) => updateField('courtName', e.target.value)}
                                        className={fieldInputClass}
                                    />
                                    {validationErrors.courtName && (
                                        <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.courtName}</div>
                                    )}
                                </div>
                                <div className="md:col-span-2 lg:col-span-3">
                                    <label className="block text-white/70 text-sm mb-2">
                                        نوع الطلب / الإجراء <span className="text-red-400">*</span>
                                    </label>
                                    <ProcedureCategoryActionPicker
                                        value={selectedSubActionType}
                                        onChange={(next) => {
                                            setSelectedSubActionType(next);
                                            if (next === 'other' || next === PETITION_ORDER_MANUAL_OPTION) {
                                                setCustomSpecificActionType('');
                                                updateField('specificActionType', '');
                                                return;
                                            }
                                            updateField('specificActionType', next);
                                        }}
                                    />
                                    {validationErrors.specificActionType && (
                                        <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.specificActionType}</div>
                                    )}
                                    {(selectedSubActionType === 'other' || selectedSubActionType === PETITION_ORDER_MANUAL_OPTION) && (
                                        <div className="mt-3">
                                            <label className="block text-white/70 text-sm mb-2">
                                                {selectedSubActionType === PETITION_ORDER_MANUAL_OPTION
                                                    ? 'تحديد الأمر الولائي يدوياً'
                                                    : 'تحديد نوع الإجراء يدوياً'}{' '}
                                                <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={customSpecificActionType}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setCustomSpecificActionType(val);
                                                    updateField('specificActionType', val);
                                                }}
                                                className={fieldInputClass}
                                            />
                                            {validationErrors.customSpecificActionType && (
                                                <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.customSpecificActionType}</div>
                                            )}
                                        </div>
                                    )}

                                    {isIqrarContext ? (
                                        <div className="mt-4">
                                            <label className="block text-white/70 text-sm mb-2">
                                                موضوع الإقرار وقيمة الحق <span className="text-red-400">*</span>
                                            </label>
                                            <textarea
                                                value={formData.requestSubject}
                                                onChange={(e) => updateField('requestSubject', e.target.value)}
                                                className={`${fieldInputClass} resize-y min-h-[96px]`}
                                            />
                                            {validationErrors.requestSubject && (
                                                <div className="text-red-300 text-xs mt-2 font-bold">
                                                    {validationErrors.requestSubject}
                                                </div>
                                            )}
                                            <p className="mt-2 text-white/45 text-xs leading-relaxed">
                                                الإقرار حجة طوعية — لا يُطبَّق عليه مسار التظلم (3 أيام) أو التمييز (7 أيام).
                                            </p>
                                        </div>
                                    ) : null}
                                </div>

                                {!isIqrarContext ? (
                                    <div className="md:col-span-2">
                                        <label className="block text-white/70 text-sm mb-2">رقم الطلب</label>
                                        <input
                                            type="text"
                                            value={formData.requestNumber}
                                            onChange={(e) => updateField('requestNumber', e.target.value)}
                                            className={fieldInputClass}
                                        />
                                    </div>
                                ) : null}
                                <div>
                                    <label className="block text-white/70 text-sm mb-2">
                                        {isIqrarContext ? (
                                            <>
                                                موعد الحضور للمصادقة <span className="text-red-400">*</span>
                                            </>
                                        ) : (
                                            <>تاريخ تقديم الطلب / المراجعة</>
                                        )}
                                    </label>
                                    <HamiDateInput
                                        value={formData.requestDate}
                                        onValueChange={(v) => updateField('requestDate', v)}
                                        className={fieldInputClass}
                                    />
                                    {validationErrors.requestDate && (
                                        <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.requestDate}</div>
                                    )}
                                </div>
                                {!isIqrarContext ? (
                                    <div>
                                        <label className="block text-white/70 text-sm mb-2">تاريخ أول مرافعة</label>
                                        <HamiDateInput
                                            value={formData.firstHearingDate ?? ''}
                                            onValueChange={(v) => updateField('firstHearingDate', v)}
                                            className={fieldInputClass}
                                        />
                                    </div>
                                ) : null}
                                {!isIqrarContext ? (
                                    <div>
                                        <label className="block text-white/70 text-sm mb-2">اسم القاضي</label>
                                        <input
                                            type="text"
                                            value={formData.judgeName}
                                            onChange={(e) => updateField('judgeName', e.target.value)}
                                            className={fieldInputClass}
                                        />
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="bg-[#0B1021] border border-white/10 rounded-xl p-6">
                            <div className="flex items-center gap-3 flex-wrap mb-4">
                                <h2 className="text-white font-bold text-lg min-w-0">{partyLabels.party1}</h2>
                                {!isIqrarContext ? (
                                    <ClientSideMarker
                                        active={isParty1Client}
                                        onToggle={(next) => toggleSideClient('party1', next)}
                                    />
                                ) : null}
                            </div>

                            <div className="space-y-6">
                                {party1List.map((party, index) => (
                                    <div key={index} className={partyBlockClass}>
                                        {index > 0 || partyCardTitle('party1', index) ? (
                                            <div className="flex items-center gap-2 mb-4 min-w-0">
                                                {index > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeParty1(index)}
                                                        className="w-8 h-8 rounded-full border border-red-500/40 bg-red-500/15 text-red-200 hover:bg-red-500/25 transition-colors flex items-center justify-center shrink-0"
                                                        title="حذف الطرف"
                                                        aria-label="حذف الطرف"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                                {partyCardTitle('party1', index) ? (
                                                    <span className="text-white/90 text-sm font-extrabold truncate">
                                                        {partyCardTitle('party1', index)}
                                                    </span>
                                                ) : null}
                                            </div>
                                        ) : null}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="block text-white/70 text-sm mb-2">نوع الطالب</label>
                                                <div className="flex gap-4">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            checked={party.type === 'person'}
                                                            onChange={() => updateParty1(index, 'type', 'person')}
                                                            className="accent-[#E6C673]"
                                                        />
                                                        <span className="text-white">شخص طبيعي</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            checked={party.type === 'company'}
                                                            onChange={() => updateParty1(index, 'type', 'company')}
                                                            className="accent-[#E6C673]"
                                                        />
                                                        <span className="text-white">شركة/مؤسسة</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-white/70 text-sm mb-2">
                                                    الاسم الكامل <span className="text-red-400">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={party.name}
                                                    onChange={(e) => updateParty1(index, 'name', e.target.value)}
                                                    className={fieldInputClass}
                                                />
                                                {index === 0 && validationErrors.party1Name && (
                                                    <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.party1Name}</div>
                                                )}
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-white/70 text-sm mb-2">
                                                    العنوان <span className="text-red-400">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={party.address}
                                                    onChange={(e) => updateParty1(index, 'address', e.target.value)}
                                                    required
                                                    className={fieldInputClass}
                                                />
                                                {validationErrors[`party1_${index}_address`] && (
                                                    <div className="text-red-300 text-xs mt-2 font-bold">
                                                        {validationErrors[`party1_${index}_address`]}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={party1EndRef} />
                            </div>

                            <button
                                type="button"
                                onClick={addParty1}
                                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all text-sm font-bold bg-white/5 text-white/70 hover:bg-white/10 hover:text-[#E6C673]"
                            >
                                <UserPlus size={16} />
                                + إضافة طرف آخر
                            </button>
                        </div>

                        {!party2Hidden && (
                            <div className="bg-[#0B1021] border border-white/10 rounded-xl p-6">
                                <div className="flex items-center gap-3 flex-wrap mb-4">
                                    <h2 className="text-white font-bold text-lg min-w-0">{partyLabels.party2}</h2>
                                    {!isIqrarContext ? (
                                        <ClientSideMarker
                                            active={isParty2Client}
                                            onToggle={(next) => toggleSideClient('party2', next)}
                                        />
                                    ) : null}
                                </div>

                                <div className="space-y-6">
                                    {party2List.map((party, index) => (
                                        <div key={index} className={partyBlockClass}>
                                            {index > 0 || partyCardTitle('party2', index) ? (
                                                <div className="flex items-center gap-2 mb-4 min-w-0">
                                                    {index > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeParty2(index)}
                                                            className="w-8 h-8 rounded-full border border-red-500/40 bg-red-500/15 text-red-200 hover:bg-red-500/25 transition-colors flex items-center justify-center shrink-0"
                                                            title="حذف الطرف"
                                                            aria-label="حذف الطرف"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                    {partyCardTitle('party2', index) ? (
                                                        <span className="text-white/90 text-sm font-extrabold truncate">
                                                            {partyCardTitle('party2', index)}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            ) : null}

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="col-span-2">
                                                    <label className="block text-white/70 text-sm mb-2">نوع المطلوب ضده</label>
                                                    <div className="flex gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                checked={party.type === 'person'}
                                                                onChange={() => updateParty2(index, 'type', 'person')}
                                                                className="accent-[#E6C673]"
                                                            />
                                                            <span className="text-white">شخص طبيعي</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                checked={party.type === 'company'}
                                                                onChange={() => updateParty2(index, 'type', 'company')}
                                                                className="accent-[#E6C673]"
                                                            />
                                                            <span className="text-white">شركة/مؤسسة</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-white/70 text-sm mb-2">
                                                        الاسم الكامل <span className="text-red-400">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={party.name}
                                                        onChange={(e) => updateParty2(index, 'name', e.target.value)}
                                                        className={fieldInputClass}
                                                    />
                                                    {index === 0 && validationErrors.party2Name && (
                                                        <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.party2Name}</div>
                                                    )}
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-white/70 text-sm mb-2">
                                                        العنوان <span className="text-red-400">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={party.address}
                                                        onChange={(e) => updateParty2(index, 'address', e.target.value)}
                                                        required
                                                        className={fieldInputClass}
                                                    />
                                                    {validationErrors[`party2_${index}_address`] && (
                                                        <div className="text-red-300 text-xs mt-2 font-bold">
                                                            {validationErrors[`party2_${index}_address`]}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={party2EndRef} />
                                </div>

                                <button
                                    type="button"
                                    onClick={addParty2}
                                    className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-all text-sm font-bold bg-white/5 text-white/70 hover:bg-white/10 hover:text-[#E6C673]"
                                >
                                    <UserPlus size={16} />
                                    + إضافة طرف آخر
                                </button>

                                {isRespondentClient && !isIqrarContext ? (
                                    <div className="mt-6 border border-[#E6C673]/25 bg-[#E6C673]/5 rounded-xl p-5 space-y-4">
                                        <div className="text-white font-extrabold text-sm">
                                            نقطة الدخول للدعوى (المرحلة الحالية) <span className="text-red-400">*</span>
                                        </div>
                                        <p className="text-white/55 text-xs leading-relaxed">
                                            بما أن موكليك من جهة المطلوب ضده، حدد المرحلة التي انضم بها الوكيل إلى الإضبارة.
                                        </p>
                                        {validationErrors.defenderEntryPhase ? (
                                            <div className="text-red-300 text-xs font-bold">{validationErrors.defenderEntryPhase}</div>
                                        ) : null}
                                        <div className="grid grid-cols-1 gap-3">
                                            {(
                                                [
                                                    { v: 1 as const, label: 'المرحلة البدائية (قيد النظر)' },
                                                    { v: 2 as const, label: 'مرحلة التظلم (صدر أمر غيابي)' },
                                                    { v: 3 as const, label: 'مرحلة التمييز (في محكمة الطعن)' },
                                                ] as const
                                            ).map((opt) => (
                                                <label
                                                    key={opt.v}
                                                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                                                        formData.defenderEntryPhase === opt.v
                                                            ? 'border-[#E6C673]/50 bg-white/10'
                                                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="defenderEntryPhase"
                                                        checked={formData.defenderEntryPhase === opt.v}
                                                        onChange={() => updateField('defenderEntryPhase', opt.v)}
                                                        className="accent-[#E6C673]"
                                                    />
                                                    <span className="text-white text-sm font-bold">{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {formData.defenderEntryPhase === 2 ? (
                                            <div>
                                                <label className="block text-white/70 text-sm mb-2">
                                                    تاريخ صدور الأمر الولائي <span className="text-red-400">*</span>
                                                </label>
                                                <HamiDateInput
                                                    value={formData.stateOrderIssuedDate}
                                                    onValueChange={(v) => updateField('stateOrderIssuedDate', v)}
                                                    className={fieldInputClass}
                                                />
                                                {validationErrors.stateOrderIssuedDate ? (
                                                    <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.stateOrderIssuedDate}</div>
                                                ) : null}
                                            </div>
                                        ) : null}

                                        {formData.defenderEntryPhase === 3 ? (
                                            <div>
                                                <label className="block text-white/70 text-sm mb-2">
                                                    تاريخ قرار التظلم <span className="text-red-400">*</span>
                                                </label>
                                                <HamiDateInput
                                                    value={formData.defenderPhase3GrievanceDecisionDate}
                                                    onValueChange={(v) => updateField('defenderPhase3GrievanceDecisionDate', v)}
                                                    className={fieldInputClass}
                                                />
                                                {validationErrors.defenderPhase3GrievanceDecisionDate ? (
                                                    <div className="text-red-300 text-xs mt-2 font-bold">
                                                        {validationErrors.defenderPhase3GrievanceDecisionDate}
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        )}
                        <div className="sticky bottom-0 z-10 -mx-4 px-4 py-4 mt-2 border-t border-white/[0.08] bg-[#0B1021]/95 backdrop-blur-md">
                            <div className="flex items-center justify-end max-w-5xl mx-auto">
                                <button
                                    type="submit"
                                    className="min-h-[48px] min-w-[11rem] px-8 rounded-xl font-bold text-[#0A0F1C] bg-[#E6C673] hover:bg-[#d4b85f] border border-[#E6C673]/60 shadow-[0_8px_28px_rgba(230,198,115,0.22)] transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1021]"
                                >
                                    تقديم الطلب
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};
