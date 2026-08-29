import { useEffect, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useAuthSafe } from '@/app/context/authHooks';
import { ForumApiService } from '@/app/services/forumApiService';
import type { CommunityPost } from '@/app/services/cloud/lawyerCommunityTypes';
import {
    formatProcedureCardsBody,
    resanitizeShareDraft,
    type ShareProcedureDraft,
    type ShareProcedureStepCard,
} from '@/app/services/transactions/sanitizeTransactionForSharing';
import {
    clampTransactionText,
    sanitizeTransactionForumAuthorName,
    TX_SHARE_BODY_MAX,
    TX_TASK_TITLE_MAX,
    TX_TITLE_MAX,
} from '@/app/services/transactions/transactionsInputSecurity';

function newPostId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * المسار الشبكي الوحيد داخل قسم المعاملات: نشر دليل إجرائي للمنتدى باختيار المستخدم.
 * المسار اليومي (قائمة/حفظ/أرشيف) يبقى محلياً بلا ForumApiService ولا WIFE.
 */
export function useShareProcedureModal({
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
            clampTransactionText(
                draft.body?.trim()
                    ? draft.body
                    : formatProcedureCardsBody({
                          title: draft.title,
                          steps: draft.steps ?? [],
                          documents: draft.documents ?? [],
                      }),
                TX_SHARE_BODY_MAX,
            ),
        );
        setSubmitting(false);
    }, [open, draft]);

    const rebuildBodyFromCards = () => {
        setBodyText(
            clampTransactionText(
                formatProcedureCardsBody({
                    title: title.trim() || 'دليل إجرائي',
                    steps,
                    documents,
                }),
                TX_SHARE_BODY_MAX,
            ),
        );
    };

    const updateStepTitle = (id: string, nextTitle: string) => {
        setSteps((prev) =>
            prev.map((s) =>
                s.id === id ? { ...s, title: clampTransactionText(nextTitle, TX_TASK_TITLE_MAX) } : s,
            ),
        );
    };

    const setTitleSafe = (value: string) => {
        setTitle(clampTransactionText(value, TX_TITLE_MAX));
    };

    const setTagsTextSafe = (value: string) => {
        setTagsText(clampTransactionText(value, 160));
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
            authorName: sanitizeTransactionForumAuthorName(user?.user_metadata?.fullName),
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

    return {
        title,
        setTitle: setTitleSafe,
        bodyText,
        set