import React, { useEffect, useState } from 'react';
import { FollowupSectionLinkCheckbox } from '@/app/components/lawyer/execution/FollowupSectionLinkCheckbox';

export interface PoliceAssistanceInlineFormProps {
    requestTitle?: string;
    initialAgencyName?: string;
    disabled?: boolean;
    /** داخل خطوة منسدلة — بدون حاوية مستقلة */
    embedded?: boolean;
    onSave: (payload: { agencyName: string; linkToTasks: boolean }) => void;
}

export const PoliceAssistanceInlineForm: React.FC<PoliceAssistanceInlineFormProps> = ({
    requestTitle,
    initialAgencyName = '',
    disabled = false,
    embedded = false,
    onSave,
}) => {
    const [agencyName, setAgencyName] = useState('');
    const [linkToTasks, setLinkToTasks] = useState(true);

    useEffect(() => {
        setAgencyName(String(initialAgencyName || '').trim());
        setLinkToTasks(true);
    }, [initialAgencyName, requestTitle]);

    const body = (
        <>
            {!embedded && requestTitle ? (
                <p className="text-[10px] text-slate-400 leading-relaxed">{requestTitle}</p>
            ) : null}
            <div>
                <label className="text-slate-400 text-[10px] mb-1.5 block">الجهة المرافقة</label>
                <input
                    type="text"
                    value={agencyName}
                    disabled={disabled}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/45 transition-all disabled:opacity-50 text-right"
                    placeholder="مثال: مركز شرطة ... / قوات ..."
                />
            </div>
            <FollowupSectionLinkCheckbox
                checked={linkToTasks}
                onChange={setLinkToTasks}
                label="إضافة متابعة القوة الجبرية إلى قسم المهام"
                hint="يمكنك إلغاء التحديد إذا أردت الحفظ في السجل فقط دون مهمة."
            />
            <button
                type="button"
                disabled={disabled || !agencyName.trim()}
                onClick={() => {
                    const v = agencyName.trim();
                    if (!v) return;
                    onSave({ agencyName: v, linkToTasks });
                }}
                className="w-full rounded-xl bg-gradient-to-l from-amber-500 to-yellow-600 py-2.5 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40 disabled:cursor-not-allowed"
            >
                حفظ بيانات القوة الإجرائية
            </button>
        </>
    );

    if (embedded) {
        return (
            <div className="space-y-2 text-right" dir="rtl">
                {body}
            </div>
        );
    }

    return (
        <div className="space-y-3 rounded-xl border border-amber-500/25 bg-amber-950/15 p-3 text-right" dir="rtl">
            {body}
        </div>
    );
};
