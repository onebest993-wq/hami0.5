import { ForumMentionSuggestions } from './ForumMentionSuggestions';
import type { useForumMentionAutocomplete } from '@/app/hooks/useForumMentionAutocomplete';
import { FORUM_FIELD_LABEL, FORUM_SURFACE_INPUT, FORUM_TEXT_MUTED } from '../forumPlumTheme';

const POST_MAX_LENGTH = 10_000;
const TAGS_MAX_LENGTH = 200;

type AddQuestionSheetFieldsProps = {
    mention: ReturnType<typeof useForumMentionAutocomplete>;
    newPostText: string;
    newTagText: string;
    onNewTagTextChange: (text: string) => void;
};

export function AddQuestionSheetFields({
    mention,
    newPostText,
    newTagText,
    onNewTagTextChange,
}: AddQuestionSheetFieldsProps) {
    return (
        <>
            <div className="mb-4 relative">
                <label htmlFor="forum-add-question-body" className={FORUM_FIELD_LABEL}>
                    مضمون النشر
                </label>
                {mention.showSuggestions ? (
                    <ForumMentionSuggestions
                        suggestions={mention.suggestions}
                        activeIndex={mention.activeIndex}
                        onSelect={mention.insertMention}
                        onHover={mention.setActiveIndex}
                    />
                ) : null}
                <textarea
                    id="forum-add-question-body"
                    ref={mention.textareaRef}
                    value={newPostText}
                    onChange={(e) => {
                        mention.handleValueChange(
                            e.target.value.slice(0, POST_MAX_LENGTH),
                            e.target.selectionStart,
                        );
                    }}
                    onKeyDown={mention.handleKeyDown}
                    onBlur={() => window.setTimeout(() => mention.closeSuggestions(), 120)}
                    className={`w-full h-32 ${FORUM_SURFACE_INPUT} rounded-xl p-4 resize-none`}
                    placeholder="اكتب سؤالك أو ملاحظتك القانونية هنا…"
                    maxLength={POST_MAX_LENGTH}
                    enterKeyHint="enter"
                />
                {newPostText.length > POST_MAX_LENGTH * 0.7 ? (
                    <div
                        className={`text-[11px] text-left mt-1 ${
                            newPostText.length >= POST_MAX_LENGTH ? 'text-red-400' : 'text-white/40'
                        }`}
                    >
                        {newPostText.length.toLocaleString('ar-EG')} / {POST_MAX_LENGTH.toLocaleString('ar-EG')}
                    </div>
                ) : null}
            </div>

            <div className="mb-4">
                <label htmlFor="forum-add-question-tags" className={FORUM_FIELD_LABEL}>
                    الوسوم <span className={`${FORUM_TEXT_MUTED} font-normal`}>(اختياري)</span>
                </label>
                <input
                    id="forum-add-question-tags"
                    value={newTagText}
                    onChange={(e) => onNewTagTextChange(e.target.value.slice(0, TAGS_MAX_LENGTH))}
                    className={`w-full h-12 ${FORUM_SURFACE_INPUT} rounded-xl px-4`}
                    placeholder="مثال: جزائي، تنفيذ، أحوال شخصية"
                    maxLength={TAGS_MAX_LENGTH}
                />
            </div>
        </>
    );
}
