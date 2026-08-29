import React from 'react';
import { ArrowRightLeft } from '@/app/components/ui/icons/ArrowRightLeft';
import { X } from '@/app/components/ui/icons/X';
import { getLegalRoleTitle } from '../smartFile/legalRoleTitle';
import {
    EDIT_CASE_GLASS_FIELD,
    EDIT_CASE_GLASS_LABEL,
    type EditCaseParty,
} from './editCaseInfoHelpers';

export function EditCaseInfoCaseFields({
    stageName,
    caseNo,
    setCaseNo,
    court,
    setCourt,
    caseType,
    setCaseType,
    judge,
    setJudge,
    firstInstanceCaseNumber,
    firstInstanceCourt,
}: {
    stageName: string;
    caseNo: string;
    setCaseNo: (v: string) => void;
    court: string;
    setCourt: (v: string) => void;
    caseType: string;
    setCaseType: (v: string) => void;
    judge: string;
    setJudge: (v: string) => void;
    firstInstanceCaseNumber: string;
    firstInstanceCourt: string;
}) {
    return (
        <div className="space-y-4 border-b border-white/[0.06] pb-5">
            <h4 className="text-[#E6C673] text-sm font-bold">بيانات الدعوى</h4>

            {stageName?.includes('استئناف') && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                    <h5 className="text-xs font-bold text-white/50">بيانات مرحلة البداءة (محفوظة)</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className={EDIT_CASE_GLASS_LABEL}>رقم دعوى البداءة</label>
                            <input
                                type="text"
                                value={firstInstanceCaseNumber}
                                readOnly
                                className={`${EDIT_CASE_GLASS_FIELD} opacity-70 cursor-default`}
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <label className={EDIT_CASE_GLASS_LABEL}>محكمة البداءة</label>
                            <input
                                type="text"
                                value={firstInstanceCourt}
                                readOnly
                                className={`${EDIT_CASE_GLASS_FIELD} opacity-70 cursor-default`}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={EDIT_CASE_GLASS_LABEL}>
                        {stageName?.includes('استئناف') ? 'رقم دعوى الاستئناف' : 'رقم الدعوى'}
                    </label>
                    <input
                        type="text"
                        value={caseNo}
                        onChange={e => setCaseNo(e.target.value)}
                        className={`${EDIT_CASE_GLASS_FIELD} text-right`}
                        dir="ltr"
                    />
                </div>
                <div>
                    <label className={EDIT_CASE_GLASS_LABEL}>
                        {stageName?.includes('استئناف') ? 'محكمة الاستئناف' : 'المحكمة المختصة'}
                    </label>
                    <input
                        type="text"
                        value={court}
                        onChange={e => setCourt(e.target.value)}
                        className={EDIT_CASE_GLASS_FIELD}
                    />
                </div>
                <div>
                    <label className={EDIT_CASE_GLASS_LABEL}>نوع الدعوى</label>
                    <input type="text" value={caseType} onChange={e => setCaseType(e.target.value)} className={EDIT_CASE_GLASS_FIELD} />
                </div>
                <div>
                    <label className={EDIT_CASE_GLASS_LABEL}>اسم القاضي</label>
                    <input type="text" value={judge} onChange={e => setJudge(e.target.value)} className={EDIT_CASE_GLASS_FIELD} />
                </div>
            </div>
        </div>
    );
}

function PartySideEditor({
    parties,
    titleTone,
    onRemove,
    onUpdate,
}: {
    parties: EditCaseParty[];
    titleTone: string;
    onRemove: (index: number) => void;
    onUpdate: (index: number, field: string, value: string) => void;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            {parties.length > 0 && (
                <div className="flex justify-center w-full mb-4">
                    <span className={`text-xl font-extrabold tracking-wide ${titleTone}`}>
                        {getLegalRoleTitle(parties[0].role, parties.length)}
                    </span>
                </div>
            )}

            <div className="space-y-5">
                {parties.map((party, index) => (
                    <div key={index} className="relative space-y-3 pt-4 border-t border-white/5 first:border-0 first:pt-0">
                        {index > 0 && (
                            <button type="button" onClick={() => onRemove(index)} className="absolute left-0 top-0 text-red-400 hover:text-red-300 p-1">
                                <X size={14} />
                            </button>
                        )}

                        <div>
                            <label className={EDIT_CASE_GLASS_LABEL}>الاسم الكامل {parties.length > 1 ? `(${index + 1})` : ''}</label>
                            <input
                                type="text"
                                value={party.name || ''}
                                onChange={e => onUpdate(index, 'name', e.target.value)}
                                className={EDIT_CASE_GLASS_FIELD}
                            />
                        </div>
                        <div>
                            <label className={EDIT_CASE_GLASS_LABEL}>العنوان</label>
                            <input
                                type="text"
                                value={party.address || ''}
                                onChange={e => onUpdate(index, 'address', e.target.value)}
                                className={EDIT_CASE_GLASS_FIELD}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function EditCaseInfoPartiesSection({
    plaintiffs,
    defendants,
    handleRemoveParty,
    handleUpdateParty,
}: {
    plaintiffs: EditCaseParty[];
    defendants: EditCaseParty[];
    handleRemoveParty: (type: 'plaintiff' | 'defendant', index: number) => void;
    handleUpdateParty: (type: 'plaintiff' | 'defendant', index: number, field: string, value: unknown) => void;
}) {
    return (
        <div className="space-y-5">
            <h4 className="text-[#E6C673] text-sm font-bold">أطراف الدعوى</h4>
            <PartySideEditor
                parties={plaintiffs}
                titleTone="text-[#E6C673]"
                onRemove={(index) => handleRemoveParty('plaintiff', index)}
                onUpdate={(index, field, value) => handleUpdateParty('plaintiff', index, field, value)}
            />
            <PartySideEditor
                parties={defendants}
                titleTone="text-rose-300/90"
                onRemove={(index) => handleRemoveParty('defendant', index)}
                onUpdate={(index, field, value) => handleUpdateParty('defendant', index, field, value)}
            />
        </div>
    );
}

export function EditCaseInfoCrossAppealToggle({
    stageName,
    hasCrossAppeal,
    setHasCrossAppeal,
}: {
    stageName: string;
    hasCrossAppeal: boolean;
    setHasCrossAppeal: (v: boolean) => void;
}) {
    if (!stageName?.includes('استئناف')) return null;

    return (
        <div className="rounded-xl border border-indigo-400/25 bg-indigo-500/[0.08] p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                        <ArrowRightLeft size={18} className="text-indigo-300" />
                    </div>
                    <div>
                        <h4 className="text-white text-sm font-bold">استئناف متقابل</h4>
                        <p className="text-white/40 text-xs">هل يوجد استئناف متقابل من الخصم؟</p>
                    </div>
                </div>
                <button type="button"
                    onClick={() => setHasCrossAppeal(!hasCrossAppeal)}
                    className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                        hasCrossAppeal ? 'bg-indigo-500' : 'bg-white/10'
                    }`}
                >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 ${
                        hasCrossAppeal ? 'right-1' : 'left-1'
                    }`}
                    />
                </button>
            </div>
            {hasCrossAppeal && (
                <p className="text-xs text-indigo-200/80 leading-relaxed rounded-lg border border-indigo-400/20 bg-indigo-950/30 px-3 py-2">
                    سيظهر شريط يوضح وجود استئناف متقابل مقدم من الخصم.
                </p>
            )}
        </div>
    );
}
