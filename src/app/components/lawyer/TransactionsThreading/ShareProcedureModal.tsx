import { memo, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useAuthSafe } from '@/app/context/AuthContext';
import { ForumApiService } from '@/app/services/forumApiService';
import type { CommunityPost } from '@/app/services/cloud/lawyerCommunityTypes';
import {
    formatProcedureCardsBody,
    resanitizeShareDraft,
    type ShareProcedureDraft,
    type ShareProcedureStepCard,
} from '@/app/services/transactions/sanitizeTransactionForSharing';
import { TransactionsHubDialog } from './TransactionsHubDialog';
import {
    GLASS_BTN,
    GLASS_FIELD,
    TX_ACCENT_SURFACE,
    TX_DIALOG_BTN_CANCEL,
    TX_DIALOG_DESC,
    TX_DIALOG_SHELL,
    TX_DIALOG_TITLE,
    TX_STAGE_DOT,
    TX_TEXT_MUTED,
    TX_TEXT_OCHRE,
    TX_TEXT_PRIMARY,
} from './transactionsGlassTheme';

function newPostId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ShareStepPreviewCard({ step }: { step: ShareProcedureStepCard }) {
    return (
        <div
            className="relative overflow-hidden rounded-sm border border-[#D4A56A]/40 bg-[#1A3340] shadow-[0_4px_24px_rgba(212,165,106,0.08)]"
            style={{ marginInlineStart: Math.min(step.depth, 3) * 12 }}
            data-testid={`share-step-card-${step.number}`}
        >
            <div className="absolute top-0 left-0 bottom-0 w-[3px] bg-[#D4A56A] pointer-events-none" aria-hidden />
            <div className="px-3 py-3 text-right">
                <div className="flex items-start gap-2.5">
                    <div
                        className="shrink-0 w-9 h-9 rounded-[4px] border border-[#D4A56A]/45 bg-[#152A32] flex items-center justify-center font-extrabold text-sm text-[#E0B87A] tabular-nums"
                        aria-hidden
                    >
                        {step.number}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className={`${TX_TEXT_PRIMARY} font-extrabold text-[13px] leading-6 break-words`}>
                            {step.title}
                        </div>
                        {step.notes ? (
                            <p className={`${TX_TEXT_MUTED} text-[11px] mt-1.5 leading-5 font-medium`}>{step.notes}</p>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}

export const ShareProcedureModal = memo(function ShareProcedureModal({
    open,
    onOpenChange,
    draft,
    clientNameForScrub,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    draft: ShareProcedureDraft | null;
    clientNameForScrub?: string | null;
}) {
    const { user } = useAuthSafe();
    const [title, setTitle] = useState('');
    const [bodyText, setBodyText] = useState('');
    const [steps, setSteps] = useState<ShareProcedureStepCard[]>([]);
    const [documents, setDocuments] = useState<ShareProcedureDraft['documents']>([]);
    const [tagsText, setTagsText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open || !draft) return;
        setTitle(draft.title);
        setSteps(draft.steps ?? []);
        setDocuments(draft.documents ?? []);
        setTagsText(draft.tags.join(' '));
        setBodyText(
            draft.body?.trim()
                ? draft.body
                : formatProcedureCardsBody({
                      title: draft.title,
                      steps: draft.steps ?? [],
                      documents: draft.documents ?? [],
                  }),
        );
        setSubmitting(false);
    }, [open, draft]);

    const rebuildBodyFromCards = () => {
        setBodyText(
            formatProcedureCardsBody({
                title: title.trim() || 'دليل إجرائي',
                steps,
                documents,
            }),
        );
    };

    const updateStepTitle = (id: string, nextTitle: string) => {
        setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, title: nextTitle } : s)));
    };

    const publish = async () => {
        if (submitting || !draft) return;
        const authorId = user?.id?.trim();
        if (!authorId) {
            SmartToast.error('يلزم تسجيل الدخول لنشر الدليل في المنتدى');
            return;
        }

        const tags = tagsText
            .split(/[,|\s]+/g)
            .map((t) => t.trim())
            .filter(Boolean);
        const safe = resanitizeShareDraft(
            {
                title: title.trim(),
                body: bodyText,
                tags,
                steps,
                documents,
            },
            clientNameForScrub,
        );
        if (!safe.body.trim()) {
            SmartToast.warning('اكتب نص الإجراءات قبل النشر');
            return;
        }

        const content = safe.body;
        const now = new Date().toISOString();
        const post: CommunityPost = {
            id: newPostId(),
            authorId,
            authorName: user?.user_metadata?.fullName || user?.email || 'محامي',
            content,
            tags: safe.tags,
            createdAt: now,
            updatedAt: now,
            attachment: null,
            upvoterIds: [],
            comments: [],
            bestCommentId: null,
        };

        setSubmitting(true);
        try {
            await ForumApiService.createPost(post);
            SmartToast.success('نُشر الدليل الإجرائي في منتدى الزملاء');
            onOpenChange(false);
        } catch (err) {
            const message =
                err instanceof Error && err.message.trim()
                    ? err.message
                    : 'تعذر النشر في المنتدى — حاول مرة أخرى';
            SmartToast.error(message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <TransactionsHubDialog
            open={open && Boolean(draft)}
            onOpenChange={onOpenChange}
            testId="share-procedure-dialog"
            ariaLabel="مشاركة الإجراءات للمنتدى"
        >
            <div className={`${TX_DIALOG_SHELL} max-h-[min(92vh,720px)] overflow-y-auto overscroll-y-contain`}>
                <div className="text-right space-y-1">
                    <h2 className={TX_DIALOG_TITLE}>مشاركة الإجراءات للمنتدى</h2>
                    <p className={TX_DIALOG_DESC}>
                        الإجراءات فقط — عدّل النص يدوياً قبل النشر
                    </p>
                </div>

                <div
                    className="relative mt-4 flex items-start justify-between gap-2 px-1"
                    data-testid="share-procedure-stage-rail"
                    aria-hidden
                >
                    <span
                        className="pointer-events-none absolute top-[12px] start-[18%] end-[18%] h-[2px] rounded-full bg-gradient-to-l from-[#D4A56A]/55 via-[#A67C45]/40 to-[#D4A56A]/55 shadow-[0_0_10px_rgba(212,165,106,0.25)]"
                        aria-hidden
                    />
                    {[
                        { n: '1', label: 'الإجراءات' },
                        { n: '2', label: 'النشر' },
                    ].map((stage) => (
                        <div key={stage.n} className="relative z-[1] flex flex-1 flex-col items-center gap-1.5">
                            <span className={`${TX_STAGE_DOT} !border-[#A67C45] !bg-[#D4A56A]/25 !text-[#E8D4B0]`}>
                                {stage.n}
                            </span>
                            <span className={`${TX_TEXT_MUTED} text-[10px] font-bold`}>{stage.label}</span>
                        </div>
                    ))}
                </div>

                <div
                    className={`mt-3 flex items-start gap-2.5 ${TX_ACCENT_SURFACE} rounded-sm px-3 py-2.5`}
                    role="status"
                >
                    <ShieldCheck className={`w-4 h-4 shrink-0 mt-0.5 ${TX_TEXT_OCHRE}`} aria-hidden />
                    <p className={`${TX_TEXT_MUTED} text-[11px] leading-5 font-medium`}>
                        تمت إزالة بيانات الموكل والمستمسكات. يمكنك تحرير نص الإجراءات بالكامل قبل النشر.
                    </p>
                </div>

                <div dir="rtl" className="text-right space-y-3 mt-4">
                    <div>
                        <label htmlFor="share-procedure-title" className={`${TX_TEXT_MUTED} text-[11px] font-bold mb-1.5 block`}>
                            عنوان الدليل
                        </label>
                        <input
                            id="share-procedure-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={GLASS_FIELD}
                            disabled={submitting}
                            autoComplete="off"
                        />
                    </div>

                    <div>
                        <div className={`${TX_TEXT_MUTED} text-[11px] font-bold mb-2`}>بطاقات الإجراءات</div>
                        {steps.length === 0 ? (
                            <p className={`${TX_TEXT_MUTED} text-sm`}>لا توجد خطوات</p>
                        ) : (
                            <div className="space-y-2 max-h-[28vh] overflow-y-auto overscroll-y-contain pe-0.5">
                                {steps.map((step) => (
                                    <div key={step.id} className="space-y-1.5">
                                        <ShareStepPreviewCard step={step} />
                                        <input
                                            aria-label={`تعديل عنوان الخطوة ${step.number}`}
                                            value={step.title}
                                            onChange={(e) => updateStepTitle(step.id, e.target.value)}
                                            disabled={submitting}
                                            className={`${GLASS_FIELD} h-10 text-[12px]`}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {documents.length > 0 ? (
                        <div>
                            <div className={`${TX_TEXT_MUTED} text-[11px] font-bold mb-2`}>
                                مستمسكات (عناوين فقط)
                            </div>
                            <ul className="space-y-1.5">
                                {documents.map((doc, index) => (
                                    <li
                                        key={`${doc.title}-${index}`}
                                        className={`rounded-sm border border-[#2A4550] bg-[#152A32] px-3 py-2 text-[12px] ${TX_TEXT_PRIMARY}`}
                                    >
                                        □ {doc.title}
                                        <span className={`ms-2 ${TX_TEXT_MUTED} text-[11px]`}>{doc.ownerTag}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                            <label htmlFor="share-procedure-body" className={`${TX_TEXT_MUTED} text-[11px] font-bold`}>
                                نص الإجراءات (قابل للتحرير)
                            </label>
                            <button
                                type="button"
                                onClick={rebuildBodyFromCards}
                                disabled={submitting || steps.length === 0}
                                className={`${TX_TEXT_OCHRE} text-[11px] font-bold min-h-[44px] px-2 touch-manipulation disabled:opacity-45`}
                            >
                                إعادة من البطاقات
                            </button>
                        </div>
                        <textarea
                            id="share-procedure-body"
                            value={bodyText}
                            onChange={(e) => setBodyText(e.target.value)}
                            rows={12}
                            disabled={submitting}
                            className={`${GLASS_FIELD} !h-auto min-h-[200px] py-3 text-[12px] leading-5 resize-y`}
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
                            onChange={(e) => setTagsText(e.target.value)}
                            className={GLASS_FIELD}
                            disabled={submitting}
                            autoComplete="off"
                            placeholder="#دليل_إجرائي #معاملات"
                        />
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap justify-start gap-2">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                        className={TX_DIALOG_BTN_CANCEL}
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={() => void publish()}
                        disabled={submitting || !bodyText.trim()}
                        data-testid="share-procedure-publish"
                        className={GLASS_BTN + ' !w-auto !h-11 !px-5'}
                    >
                        {submitting ? 'جاري النشر...' : 'نشر للمنتدى'}
                    </button>
                </div>
            </div>
        </TransactionsHubDialog>
    );
});
