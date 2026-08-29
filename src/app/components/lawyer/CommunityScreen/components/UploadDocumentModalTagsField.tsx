import { REPOSITORY_SUGGESTED_TAGS } from '../repositoryTagUtils';
import type { UploadDocumentModalFormModel } from '../hooks/useUploadDocumentModalForm';

export function UploadDocumentModalTagsField({ form }: { form: UploadDocumentModalFormModel }) {
    const { pickedTags, selectedTags, togglePickedTag } = form;

    return (
        <div>
            <label className="block text-white/70 text-xs font-bold mb-1.5">الوسوم والتصنيف</label>
            <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto scrollbar-hide">
                {REPOSITORY_SUGGESTED_TAGS.map((tag) => {
                    const active = pickedTags.includes(tag);
                    return (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => togglePickedTag(tag)}
                            className={`min-h-[44px] px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors touch-manipulation ${
                                active
                                    ? 'bg-[#E6C673]/15 border-[#E6C673]/40 text-[#E6C673]'
                                    : 'hami-forum-input border-white/10 text-white/45 hover:text-white/75'
                            }`}
                        >
                            #{tag.replace(/\s+/g, '_')}
                        </button>
                    );
                })}
            </div>
            {selectedTags.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-2">
                    {selectedTags.map((tag) => (
                        <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-[#E6C673]/80 border border-white/10"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
