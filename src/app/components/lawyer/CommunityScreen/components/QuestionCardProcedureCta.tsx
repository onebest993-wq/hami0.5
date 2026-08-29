import { openForumProcedureGuideHub } from '../forumProcedureGuideOpen';

type QuestionCardProcedureCtaProps = {
    postId: string;
    content: string;
};

export function QuestionCardProcedureCta({ postId, content }: QuestionCardProcedureCtaProps) {
    return (
        <button
            type="button"
            data-testid={`forum-open-transactions-${postId}`}
            onClick={(event) => {
                event.stopPropagation();
                openForumProcedureGuideHub(content);
            }}
            className="mb-4 w-full min-h-[44px] rounded-xl border border-[#C9A0A4]/35 bg-[#3A242C]/70 px-3 py-2.5 text-[12px] font-extrabold text-[#E8D0D2] touch-manipulation hover:bg-[#3A242C]"
        >
            فتح قسم المعاملات — أضف الأسماء والبيانات محلياً
        </button>
    );
}
