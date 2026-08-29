import { FileText } from '@/app/components/ui/icons/FileText';
import type { UploadDocumentModalFormModel } from '../hooks/useUploadDocumentModalForm';

export function UploadDocumentModalFileField({
    form,
    isEditing,
}: {
    form: UploadDocumentModalFormModel;
    isEditing: boolean;
}) {
    const { uploadKind, file, fileError, previewUrl, acceptValue, selectedKindLabel, handleFileChange } = form;

    return (
        <div>
            <label className="block text-white/70 text-xs font-bold mb-1.5">
                {uploadKind === 'image' ? 'الصورة' : 'الملف'}
                {isEditing ? (
                    <span className="text-white/30 font-normal mr-1">(اتركه فارغاً للاحتفاظ بالملف الحالي)</span>
                ) : null}
            </label>
            <input
                key={uploadKind}
                type="file"
                accept={acceptValue}
                onChange={handleFileChange}
                className="w-full h-11 min-h-[44px] hami-forum-input rounded-xl px-4 text-white/70 text-sm border border-white/5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#E6C673]/10 file:text-[#E6C673] file:text-xs file:font-bold hover:file:bg-[#E6C673]/15 transition-colors cursor-pointer touch-manipulation"
            />
            {fileError ? <p className="mt-1.5 text-[11px] text-red-400">{fileError}</p> : null}
            {file && !fileError ? (
                <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 hami-forum-input p-2.5">
                    {previewUrl ? (
                        <img src={previewUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    ) : (
                        <div className="w-12 h-12 rounded-lg bg-[#E6C673]/10 flex items-center justify-center text-[#E6C673] shrink-0">
                            <FileText size={20} />
                        </div>
                    )}
                    <div className="min-w-0 flex-1 text-right">
                        <p className="text-white text-xs font-bold truncate">{file.name}</p>
                        <p className="text-white/40 text-[10px]">
                            {selectedKindLabel} • {(file.size / (1024 * 1024)).toFixed(1)}MB
                        </p>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
