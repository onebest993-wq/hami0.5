import { FileImage } from '@/app/components/ui/icons/FileImage';
import { FileText } from '@/app/components/ui/icons/FileText';
import type { UploadDocumentModalFormModel } from '../hooks/useUploadDocumentModalForm';

type UploadDocumentModalKindPickerProps = {
    uploadKind: UploadDocumentModalFormModel['uploadKind'];
    switchUploadKind: UploadDocumentModalFormModel['switchUploadKind'];
};

export function UploadDocumentModalKindPicker({
    uploadKind,
    switchUploadKind,
}: UploadDocumentModalKindPickerProps) {
    return (
        <div className="grid grid-cols-2 gap-2">
            <button
                type="button"
                onClick={() => switchUploadKind('document')}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-bold transition-colors touch-manipulation min-h-[44px] ${
                    uploadKind === 'document'
                        ? 'border-[#E6C673]/50 bg-[#E6C673]/10 text-[#E6C673]'
                        : 'border-white/10 hami-forum-input text-white/60 hover:text-white'
                }`}
            >
                <FileText size={18} />
                ملف (PDF / DOCX)
            </button>
            <button
                type="button"
                onClick={() => switchUploadKind('image')}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-bold transition-colors touch-manipulation min-h-[44px] ${
                    uploadKind === 'image'
                        ? 'border-sky-400/50 bg-sky-500/10 text-sky-200'
                        : 'border-white/10 hami-forum-input text-white/60 hover:text-white'
                }`}
            >
                <FileImage size={18} />
                صورة (JPG / PNG)
            </button>
        </div>
    );
}
