import React from 'react';
import { FileText } from '@/app/components/ui/icons/FileText';
import { UploadCloud } from '@/app/components/ui/icons/UploadCloud';
import { VaultPdfJsViewerLazy } from '@/app/components/lawyer/SmartVaultModal/VaultPdfJsViewerLazy';
import { useSmartFileModalTheme } from '../../smartFile/smartFileModalTheme';

type SelectedFileKind = 'image' | 'pdf' | 'file' | null;
type SmartFileModalTheme = ReturnType<typeof useSmartFileModalTheme>;

export type AddDocumentModalEntryFormProps = {
    T: SmartFileModalTheme;
    isPearl: boolean;
    fileInputId: string;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    title: string;
    setTitle: (value: string) => void;
    category: string;
    setCategory: (value: string) => void;
    notes: string;
    setNotes: (value: string) => void;
    selectedFile: File | null;
    selectedFileKind: SelectedFileKind;
    selectedPreviewUrl: string | null;
    isFileDragActive: boolean;
    saving: boolean;
    editMode: boolean;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDropSelectedFile: (e: React.DragEvent<HTMLElement>) => void;
    handleDragState: (e: React.DragEvent<HTMLElement>, active: boolean) => void;
    handleSubmit: () => void;
};

export function AddDocumentModalEntryForm({
    T,
    isPearl,
    fileInputId,
    fileInputRef,
    title,
    setTitle,
    category,
    setCategory,
    notes,
    setNotes,
    selectedFile,
    selectedFileKind,
    selectedPreviewUrl,
    isFileDragActive,
    saving,
    editMode,
    handleFileSelect,
    handleDropSelectedFile,
    handleDragState,
    handleSubmit,
}: AddDocumentModalEntryFormProps) {
    return (
        <div className="space-y-5 md:self-center">
            <input
                id={fileInputId}
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,.pdf"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
            />
            <div>
                <label className={T.label}>
                    نوع المستند <span className="text-red-400">*</span>
                </label>
                <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="مثال: عريضة، وكالة، وصل..."
                    className={T.field}
                />
            </div>
            <div>
                <label className={T.label}>
                    اسم المستند <span className="text-red-400">*</span>
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: قرار تمييز، عقد بيع..."
                    className={T.field}
                />
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-black text-[#E6C673]/85">معاينة المستند</p>
                    <label
                        htmlFor={fileInputId}
                        className="cursor-pointer rounded-xl border border-[#E6C673]/18 bg-[#E6C673]/10 px-3 py-2 text-[11px] font-bold text-[#E6C673] transition-colors hover:bg-[#E6C673]/18"
                    >
                        {selectedFile ? 'تغيير الملف' : 'اختيار ملف'}
                    </label>
                </div>
                {selectedFile ? (
                    <div className="space-y-3">
                        {selectedFileKind === 'image' && selectedPreviewUrl ? (
                            <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-black/20 p-3">
                                <img
                                    src={selectedPreviewUrl}
                                    alt={selectedFile.name}
                                    className="block max-h-full max-w-full object-contain"
                                />
                            </div>
                        ) : null}
                        {selectedFileKind === 'pdf' && selectedPreviewUrl ? (
                            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#161616]">
                                <div className="h-44 w-full">
                                    <VaultPdfJsViewerLazy
                                        source={selectedFile}
                                        title={selectedFile.name}
                                        openUrl={selectedPreviewUrl}
                                        fallbackClassName="flex h-full items-center justify-center text-sm text-white/45"
                                    />
                                </div>
                            </div>
                        ) : null}
                        {selectedFileKind === 'file' ? (
                            <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-black/10 px-4 text-center">
                                <div className="space-y-2">
                                    <FileText size={28} className="mx-auto text-[#E6C673]" />
                                    <p className="text-sm font-bold text-[#F4E9CD] truncate max-w-[18rem]">
                                        {selectedFile.name}
                                    </p>
                                    <p className="text-[11px] text-white/40">
                                        لا تتوفر معاينة مضمنة لهذا النوع، لكن الملف جاهز للحفظ.
                                    </p>
                                </div>
                            </div>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/45">
                            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1">
                                {selectedFile.name}
                            </span>
                            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1">
                                {selectedFile.type || 'ملف عام'}
                            </span>
                        </div>
                    </div>
                ) : (
                    <label
                        htmlFor={fileInputId}
                        onDrop={handleDropSelectedFile}
                        onDragEnter={(e) => handleDragState(e, true)}
                        onDragOver={(e) => handleDragState(e, true)}
                        onDragLeave={(e) => handleDragState(e, false)}
                        className={`w-full h-28 cursor-pointer rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
                            isPearl
                                ? 'border-[#C9B89A]/15 bg-[#EDE6D6]/[0.02] text-[#9C9890] hover:border-[#C9B89A]/28 hover:text-[#C9B89A]/90 hover:bg-[#C9B89A]/5'
                                : 'border-white/10 bg-white/[0.02] text-white/40 hover:border-[#E6C673]/30 hover:text-[#E6C673]/80 hover:bg-[#E6C673]/5'
                        } ${isFileDragActive ? 'border-[#E6C673]/45 bg-[#E6C673]/8 text-[#E6C673]' : ''}`}
                    >
                        <UploadCloud size={22} />
                        <span className="text-sm font-bold">اسحب أو اختر ملفاً من الجهاز</span>
                        <span className="text-[11px] text-white/42">PDF أو صورة عالية الدقة</span>
                    </label>
                )}
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-black text-[#E6C673]/85">ملخص المستند</p>
                    <span className="text-[10px] text-white/35">
                        {selectedFile ? 'جاهز للحفظ' : 'ينتظر الملف'}
                    </span>
                </div>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="وصف مختصر أو ملاحظات قانونية للمستند..."
                    className={`${T.field} min-h-[88px] resize-none`}
                />
            </div>
            <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || !title.trim() || !category.trim() || (!editMode && !selectedFile)}
                className={T.btn}
            >
                {saving ? 'جارٍ حفظ المستند...' : editMode ? 'تحديث المستند' : 'حفظ المستند'}
            </button>
        </div>
    );
}
