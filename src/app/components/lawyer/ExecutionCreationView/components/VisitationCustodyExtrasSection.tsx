import React from 'react';
import { Plus } from '@/app/components/ui/icons/Plus';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { ecg } from './executionCreationGlassUi';
import { ExecutionCreationSection } from './ExecutionCreationSection';
import type { VisitationScheduleConfig } from '@/app/types/visitationSchedule';
import {
    VisitationScheduleSetupSection,
} from './VisitationScheduleSetupSection';

export function VisitationCustodyExtrasSection({
    claimType,
    visitationChildrenNames,
    setVisitationChildrenNames,
    visitationScheduleDraft,
    setVisitationScheduleDraft,
    custodyWardNames,
    setCustodyWardNames,
}: {
    claimType: string;
    visitationChildrenNames: string[];
    setVisitationChildrenNames: React.Dispatch<React.SetStateAction<string[]>>;
    visitationScheduleDraft: Partial<VisitationScheduleConfig>;
    setVisitationScheduleDraft: React.Dispatch<React.SetStateAction<Partial<VisitationScheduleConfig>>>;
    custodyWardNames: string[];
    setCustodyWardNames: React.Dispatch<React.SetStateAction<string[]>>;
}) {
    if (!claimType || !['مشاهدة', 'تسليم ولد'].includes(claimType)) {
        return null;
    }

    return (
        <ExecutionCreationSection title="تفاصيل إضافية للمطالبة الشرعية">
            {claimType === 'مشاهدة' ? (
                <div className={`${ecg.subCard} space-y-4`}>
                    <p className={`${ecg.subCardTitle} text-[#E6C673]`}>
                        أسماء الأولاد (مشاهدة واستصحاب)
                    </p>
                    {visitationChildrenNames.map((childName, idx) => (
                        <div key={idx} className="flex gap-2 items-center flex-row-reverse">
                            <input
                                type="text"
                                value={childName}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setVisitationChildrenNames((prev) =>
                                        prev.map((n, i) => (i === idx ? v : n)),
                                    );
                                }}
                                className={`${ecg.field} flex-1 text-sm`}
                            />
                            {visitationChildrenNames.length > 1 ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setVisitationChildrenNames((prev) =>
                                            prev.filter((_, i) => i !== idx),
                                        )
                                    }
                                    className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                                    title="حذف السطر"
                                >
                                    <Trash2 size={16} />
                                </button>
                            ) : null}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => setVisitationChildrenNames((prev) => [...prev, ''])}
                        className={`${ecg.addBtn} !mt-0`}
                    >
                        <Plus size={14} />
                        إضافة اسم
                    </button>
                </div>
            ) : null}

            {claimType === 'مشاهدة' ? (
                <VisitationScheduleSetupSection
                    draft={visitationScheduleDraft}
                    onChange={setVisitationScheduleDraft}
                />
            ) : null}

            {claimType === 'تسليم ولد' ? (
                <div className={`${ecg.subCard} space-y-3`}>
                    <p className={ecg.subCardTitle}>
                        أسماء المحضونين (نزع حضانة)
                        <span className="text-rose-400 ms-1" aria-hidden="true">*</span>
                    </p>
                    {custodyWardNames.map((wardName, idx) => (
                        <div key={idx} className="flex gap-2 items-center flex-row-reverse">
                            <input
                                type="text"
                                value={wardName}
                                required
                                aria-required="true"
                                onChange={(e) => {
                                    const v = e.target.value;
                                    setCustodyWardNames((prev) =>
                                        prev.map((n, i) => (i === idx ? v : n)),
                                    );
                                }}
                                placeholder={`اسم المحضون ${idx + 1} (مطلوب)`}
                                className={`${ecg.field} flex-1 text-sm`}
                            />
                            {custodyWardNames.length > 1 ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCustodyWardNames((prev) =>
                                            prev.filter((_, i) => i !== idx),
                                        )
                                    }
                                    className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                                    title="حذف السطر"
                                >
                                    <Trash2 size={16} />
                                </button>
                            ) : null}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => setCustodyWardNames((prev) => [...prev, ''])}
                        className={`${ecg.addBtn} !mt-0`}
                    >
                        <Plus size={14} />
                        إضافة محضون
                    </button>
                </div>
            ) : null}
        </ExecutionCreationSection>
    );
}
