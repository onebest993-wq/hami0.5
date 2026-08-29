import type { ShareProcedureDraft, ShareProcedureStepCard } from '@/app/services/transactions/sanitizeTransactionForSharing';
import {
    GLASS_FIELD,
    TX_TEXT_MUTED,
    TX_TEXT_OCHRE,
    TX_TEXT_PRIMARY,
} from './transactionsGlassTheme';

function ShareStepEditor({
    step,
    submitting,
    onTitleChange,
}: {
    step: ShareProcedureStepCard;
    submitting: boolean;
    onTitleChange: (id: string, title: string) => void;
}) {
    return (
        <div
            className="space-y-1"
            style={{ marginInlineStart: Math.min(step.depth, 3) * 12 }}
            data-testid={`share-step-card-${step.number}`}
        >
            <div className="flex items-start gap-2">
                <span className={`shrink-0 w-6 pt-3 text-[11px] font-bold tabular-nums ${TX_TEXT_OCHRE}`} aria-hidden>
                    {step.number}
                </span>
                <input
                    aria-label={`تعديل عنوان الخطوة ${step.number}`}
                    value={step.title}
                    onChange={(e) => onTitleChange(step.id, e.target.value)}
                    disabled={submitting}
                    className={GLASS_FIELD}
                    autoComplete="off"
                    enterKeyHint="done"
                />
            </div>
            {step.notes ? <p className={`${TX_TEXT_MUTED} text-[11px] leading-5 me-8`}>{step.notes}</p> : null}
        </div>
    );
}

export function ShareProcedureForm({
    title,
    onTitleChange,
    bodyText,
    onBodyChange,
    steps,
    documents,
    tagsText,
    onTagsChange,
    submitting,
    onRebuildBody,
    onStepTitleChange,
}: {
    title: string;
    onTitleChange: (value: string) => void;
    bodyText: string;
    onBodyChange: (value: string) => void;
    steps: ShareProcedureStepCard[];
    documents: ShareProcedureDraft['documents'];
    tagsText: string;
    onTagsChange: (value: string) => void;
    submitting: boolean;
    onRebuildBody: () => void;
    onStepTitleChange: (id: string, title: string) => void;
}) {
    return (
        <div dir="rtl" className="text-right space-y-3 mt-3">
            <div>
                <label htmlFor="share-procedure-title" className={`${TX_TEXT_MUTED} text-[11px] font-bold mb-1.5 block`}>
                    عنوان الدليل
                </label>
                <input
                    id="share-procedure-title"
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    className={GLASS_FIELD}
                    disabled={submitting}
                    autoComplete="off"
                    enterKeyHint="next"
                    autoCapitalize="sentences"
                />
            </div>

            <div>
                <div className={`${TX_TEXT_MUTED} text-[11px] font-bold mb-1.5`}>بطاقات الإجراءات</div>
                {steps.length === 0 ? (
                    <p className={`${TX_TEXT_MUTED} text-sm`}>لا توجد خطوات</p>
                ) : (
                    <div className="space-y-2 max-h-[22dvh] overflow-y-auto overscroll-y-contain pe-0.5">
                        {steps.map((step) => (
                            <ShareStepEditor
                                key={step.id}
                                step={step}
                                submitting={submitting}
                                onTitleChange={onStepTitleChange}
                            />
                        ))}
                    </div>
                )}
            </div>

            {documents.length > 0 ? (
                <div>
                    <div className={`${TX_TEXT_MUTED} text-[11px] font-bold mb-1.5`}>مستمسكات (عناوين فقط)</div>
                    <ul className="space-y-0.5">
                        {documents.map((doc, index) => (
                            <li key={`${doc.title}-${index}`} className={`text-[12px] ${TX_TEXT_PRIMARY}`}>
                                {doc.title}
                                <span className={`ms-2 ${TX_TEXT_MUTED} text-[11px]`}>{doc.ownerTag}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label htmlFor="share-procedure-body" className={`${TX_TEXT_MUTED} text-[11px] font-bold`}>
                        نص الإجراءات
                    </label>
                    <button
                        type="button"
                        onClick={onRebuildBody}
                        disabled={submitting || steps.length === 0}
                        className={`${TX_TEXT_OCHRE} text-[11px] font-bold min-h-[44px] px-2 touch-manipulation disabled:opacity-45`}
                    >
                        إعادة من البطاقات
                    </button>
                </div>
                <textarea
                    id="share-procedure-body"
                    value={bodyText}
                    onChange={(e) => onBodyChange(e.target.value)}
                    rows={8}
                    disabled={submitting}
                    className={`${GLASS_FIELD} !h-auto min-h-[140px] py-2.5 leading-5 resize-y`}
                    dir="rtl"
                />
            </div>

            <div>
                <label htmlFor="share-procedure-tags" className={`${TX_TEXT_MUTED} text-[11px] font-bold mb-1.5 block`}>
                    الوسوم
                </label>
                <input
                    id="share-procedure-tags"
                    value={tagsText}
                    onChange={(e) => onTagsChange(e.target.value)}
                    className={GLASS_FIELD}
                    disabled={submitting}
                    autoComplete="off"
                    enterKeyHint="done"
                    placeholder="#دليل_إجرائي #معاملات"
                />
            </div>
        </div>
    );
}
