import type { UploadDocumentModalFormModel } from '../hooks/useUploadDocumentModalForm';
import { UploadDocumentModalKindPicker } from './UploadDocumentModalKindPicker';
import { UploadDocumentModalTypeField } from './UploadDocumentModalTypeField';
import { UploadDocumentModalTagsField } from './UploadDocumentModalTagsField';
import { UploadDocumentModalFileField } from './UploadDocumentModalFileField';

type UploadDocumentModalFieldsProps = {
    form: UploadDocumentModalFormModel;
    isEditing: boolean;
};

export function UploadDocumentModalFields({ form, isEditing }: UploadDocumentModalFieldsProps) {
    const { title, setTitle, description, setDescription } = form;

    return (
        <div className="px-5 py-4 space-y-4 overflow-visible">
            {!isEditing ? (
                <UploadDocumentModalKindPicker
                    uploadKind={form.uploadKind}
                    switchUploadKind={form.switchUploadKind}
                />
            ) : null}

            <div>
                <label className="block text-white/70 text-xs font-bold mb-1.5">عنوان المستند</label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="أدخل عنوان المستند..."
                    className="w-full h-11 hami-forum-input rounded-xl px-4 text-white text-sm placeholder-white/20 border border-white/5 focus:border-[#E6C673]/30 focus:outline-none transition-colors"
                />
            </div>

            <UploadDocumentModalTypeField form={form} />

            <div>
                <label className="block text-white/70 text-xs font-bold mb-1.5">الوصف التفصيلي</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="أدخل وصفاً تفصيلياً للمستند..."
                    rows={4}
                    className="w-full hami-forum-input rounded-xl px-4 py-3 text-white text-[16px] placeholder-white/20 border border-white/5 focus:border-[#E6C673]/30 focus:outline-none transition-colors resize-none"
                />
            </div>

            <UploadDocumentModalTagsField form={form} />
            <UploadDocumentModalFileField form={form} isEditing={isEditing} />
        </div>
    );
}
