import React from 'react';
import { HomeXIcon } from '@/app/components/lawyer/dashboard/homeStemIcons';
import { ecg } from '@/app/components/lawyer/ExecutionCreationView/components/executionCreationGlassUi';

const FIELD_SLOT = `${ecg.field} pointer-events-none`;

/** غلاف فوري أثناء تحميل chunk النموذج — رأس حي + هيكل هندسي صامت (بلا مسرح تحميل) */
export function ExecutionCreationBootShell({ onClose }: { onClose: () => void }) {
    return (
        <div dir="rtl" className={ecg.modalShell}>
            <div className={ecg.modalHeader}>
                <div className="flex min-w-0 items-center gap-2">
                    <h1 className={ecg.modalHeaderTitle} data-testid="execution-creation-title">
                        فتح إضبارة تنفيذ
                    </h1>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className={ecg.modalClose}
                    aria-label="إغلاق"
                    data-testid="execution-creation-close"
                >
                    <HomeXIcon size={18} />
                    <span className="text-xs font-medium">إغلاق</span>
                </button>
            </div>
            <div className={ecg.modalBody} aria-hidden data-testid="execution-creation-boot-slots">
                <div className={ecg.modalBodyStack}>
                    <section className={ecg.sectionWrap}>
                        <div className={ecg.sectionHeader}>
                            <div className="h-5 w-36 rounded-md border border-[#E6C673]/15 bg-[#E6C673]/8" />
                        </div>
                        <div className="flex w-full flex-col gap-2.5">
                            <div className={FIELD_SLOT} />
                            <div className={`${FIELD_SLOT} font-mono`} />
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
