import React from 'react';
import { AlertTriangle } from '@/app/components/ui/icons/AlertTriangle';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import { Zap } from '@/app/components/ui/icons/Zap';
import { ecg } from './executionCreationGlassUi';
import type { ExecutionTargetOption } from '../types';

export interface InstrumentCommercialMetaSectionProps {
    docType: string;
    dueDate: string;
    onDueDateChange: (v: string) => void;
    executionTarget: ExecutionTargetOption;
    onExecutionTargetChange: (v: ExecutionTargetOption) => void;
    isDocumentBlocked: boolean;
}

/**
 * ميتا الأوراق التجارية / السندات: استحقاق، منفّذ ضده، بانر فقدان القوة التنفيذية.
 */
export const InstrumentCommercialMetaSection: React.FC<InstrumentCommercialMetaSectionProps> = ({
    docType,
    dueDate,
    onDueDateChange,
    executionTarget,
    onExecutionTargetChange,
    isDocumentBlocked,
}) => {
    return (
        <>
            {/* STATE C: COMMERCIAL PAPERS - Due Date */}
            {docType === 'الأوراق التجارية' && (
                <div className={ecg.subCard}>
                    <label className={`${ecg.labelGold} flex items-center gap-2`}>
                        <Calendar size={16} />
                        تاريخ الاستحقاق (إلزامي)
                    </label>
                    <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => onDueDateChange(e.target.value)}
                        style={{ direction: 'ltr', textAlign: 'right' }}
                        className={ecg.field}
                    />
                    {dueDate && new Date(dueDate) > new Date() && (
                        <p className="text-[#E6C673] text-xs mt-2 flex items-center gap-1">
                            <AlertTriangle size={14} />
                            التاريخ في المستقبل - لن يتم قبول التقديم حتى تاريخ الاستحقاق
                        </p>
                    )}
                </div>
            )}

            {/* 🔍 EXECUTION TARGET FILTER - Commercial Papers & Debt Acknowledgments */}
            {(docType === 'الأوراق التجارية' || docType === 'السندات المتضمنة إقراراً بدين') && (
                <div className={ecg.subCard}>
                    <label className={ecg.labelGold}>
                        المنفذ ضده (الطرف المستهدف بالتنفيذ)
                    </label>
                    <select
                        value={executionTarget}
                        onChange={(e) => onExecutionTargetChange(e.target.value as ExecutionTargetOption)}
                        className={ecg.select}
                    >
                        <option value="">-- اختر المنفذ ضده --</option>
                        <option value="المدين الأصلي">المدين الأصلي (الساحب)</option>
                        {docType === 'الأوراق التجارية' && (
                            <>
                                <option value="المُظَهِّر">المُظَهِّر (ممنوع قانوناً)</option>
                                <option value="كفيل متضامن">كفيل</option>
                            </>
                        )}
                        {docType === 'السندات المتضمنة إقراراً بدين' && (
                            <>
                                <option value="كفيل متضامن">كفيل متضامن</option>
                                <option value="كفيل غير متضامن">كفيل غير متضامن (ممنوع)</option>
                            </>
                        )}
                    </select>

                    {/* Dynamic Warnings */}
                    {docType === 'الأوراق التجارية' && executionTarget === 'كفيل متضامن' && (
                        <div className={ecg.hintWarn}>
                            <p className="text-amber-200 text-xs flex items-center gap-1">
                                <AlertTriangle size={14} />
                                مسموح، لكن المنفذ العدل مُلزم بتبليغ المدين الأصلي أولاً للوقوف على اعتراضاته
                            </p>
                        </div>
                    )}

                    {docType === 'السندات المتضمنة إقراراً بدين' && executionTarget === 'كفيل متضامن' && (
                        <div className={ecg.hintSuccess}>
                            <p className="text-emerald-300 text-xs flex items-center gap-1">
                                <Zap size={14} />
                                سيتم إمهال المدين الأصلي 7 أيام من تاريخ التبليغ قبل الحجز على الكفيل
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* 🛑 DOCUMENT BLOCKED BANNER */}
            {isDocumentBlocked && (
                <div className={ecg.calloutDanger}>
                    <h4 className={ecg.calloutDangerTitle}>
                        <AlertTriangle size={20} />
                        🛑 توقف - السند فقد قوته التنفيذية
                    </h4>
                    <p className="text-rose-200/90 text-sm leading-relaxed">
                        استناداً للفقرة رابعاً من المادة 14، فقدَ هذا السند قوته التنفيذية المباشرة. لا تراجع مديرية التنفيذ.
                    </p>
                    <div className={ecg.hintDangerInline}>
                        <p className="text-white text-sm font-bold mb-1">الحل القانوني:</p>
                        <p className="text-slate-300 text-xs">
                            أقم (دعوى إثبات دين) في محكمة البداءة، وبعد اكتساب الحكم الدرجة القطعية قم بتنفيذه.
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};
