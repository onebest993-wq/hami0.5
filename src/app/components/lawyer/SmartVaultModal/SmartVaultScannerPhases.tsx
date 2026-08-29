import React from 'react';
import { X } from '@/app/components/ui/icons/X';
import { Camera } from '@/app/components/ui/icons/Camera';
import { Upload } from '@/app/components/ui/icons/Upload';
import { Loader2 } from '@/app/components/ui/icons/Loader2';
import { CheckCircle2 } from '@/app/components/ui/icons/CheckCircle2';
import { Eye } from '@/app/components/ui/icons/Eye';
import { AlertCircle } from '@/app/components/ui/icons/AlertCircle';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { VaultCategoryPicker } from '@/app/components/lawyer/SmartVaultModal/VaultCategoryPicker';
import { VAULT_INPUT } from '@/app/components/lawyer/SmartVaultModal/vaultDustyRoseTheme';
import type { ScannerSaveResult } from './useSmartVaultScanner';

type ScannerIdlePhaseProps = {
    error: string | null;
    onClearError: () => void;
    onStartCamera: () => void;
};

export function ScannerIdlePhase({ error, onClearError, onStartCamera }: ScannerIdlePhaseProps) {
    return (
        <div className="flex flex-col gap-4">
            {error && (
                <div className="rounded-2xl border border-[#E6C673]/22 bg-[#12182B] px-4 py-3.5 text-sm text-[#F4E7C3]">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-300/18 bg-amber-300/10 text-[#E6C673]">
                            <AlertCircle size={17} />
                        </div>
                        <div className="min-w-0 flex-1" data-testid="vault-scanner-error">
                            <p className="font-bold text-[#F6EAD2]">تعذر تشغيل الكاميرا</p>
                            <p className="mt-1 leading-6 text-[#E6D7B5]/88">{error}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClearError}
                            aria-label="إغلاق التنبيه"
                            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white/38 hover:bg-white/[0.05] hover:text-white/72 transition-colors touch-manipulation"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}
            <button
                type="button"
                onClick={onStartCamera}
                data-testid="vault-scanner-open-camera"
                className="group flex items-center justify-center gap-3 rounded-2xl border border-[#E6C673]/28 bg-[#E6C673]/12 min-h-[44px] px-4 py-5 text-[#F7F3EB] font-bold transition-colors hover:border-[#E6C673]/42 hover:bg-[#E6C673]/16 touch-manipulation"
            >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#F6E7BC]/15 bg-black/15 text-[#F7F3EB]">
                    <Camera size={22} />
                </span>
                <span className="flex flex-col items-start text-right">
                    <span>فتح الكاميرا</span>
                    <span className="text-[11px] font-medium text-white/55 group-hover:text-white/68">
                        تصوير مباشر للمستند
                    </span>
                </span>
            </button>
        </div>
    );
}

type ScannerCameraPhaseProps = {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onCapture: () => void;
};

export function ScannerCameraPhase({ videoRef, onCapture }: ScannerCameraPhaseProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="relative rounded-xl overflow-hidden bg-black">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    disablePictureInPicture
                    data-testid="vault-scanner-video"
                    className="w-full h-[min(400px,50vh)] object-cover"
                />
            </div>
            <button
                type="button"
                onClick={onCapture}
                data-testid="vault-scanner-capture"
                className="flex items-center justify-center gap-3 bg-[#F7F3EB] hover:bg-[#FAF6EF] text-[#3A3530] font-bold min-h-[44px] py-4 rounded-xl transition-all touch-manipulation"
            >
                <Camera size={22} />
                التقاط الصورة
            </button>
        </div>
    );
}

type ScannerCapturingPhaseProps = {
    capturedImage: string;
    scanTitle: string;
    scanNote: string;
    scanCategory: string;
    categorySuggestions: string[];
    onTitleChange: (value: string) => void;
    onNoteChange: (value: string) => void;
    onCategoryChange: (value: string) => void;
    onCategoryUsed?: (name: string) => void;
    onRetake: () => void;
    onSave: () => void;
};

export function ScannerCapturingPhase({
    capturedImage,
    scanTitle,
    scanNote,
    scanCategory,
    categorySuggestions,
    onTitleChange,
    onNoteChange,
    onCategoryChange,
    onCategoryUsed,
    onRetake,
    onSave,
}: ScannerCapturingPhaseProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="relative rounded-xl overflow-hidden bg-black">
                <img
                    src={capturedImage}
                    alt="معاينة المسح"
                    className="w-full h-[min(280px,40vh)] object-contain"
                />
            </div>
            <div className="flex flex-col gap-2">
                <input
                    type="text"
                    value={scanTitle}
                    onChange={(e) => onTitleChange(e.target.value)}
                    placeholder="عنوان المسح"
                    className={VAULT_INPUT}
                    data-testid="vault-scanner-title"
                    enterKeyHint="done"
                    autoComplete="off"
                    autoCapitalize="sentences"
                />
                <textarea
                    value={scanNote}
                    onChange={(e) => onNoteChange(e.target.value)}
                    placeholder="وصف / تذكير: لمن هذا المستند؟"
                    rows={2}
                    className={`${VAULT_INPUT} resize-none`}
                    enterKeyHint="done"
                    autoComplete="off"
                />
                <VaultCategoryPicker
                    id="vault-scan-category"
                    categories={categorySuggestions}
                    value={scanCategory}
                    onChange={onCategoryChange}
                    onAddCategory={onCategoryUsed}
                />
            </div>
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onRetake}
                    data-testid="vault-scanner-retake"
                    className="flex-1 flex items-center justify-center gap-2 bg-[#4A4440]/45 hover:bg-[#4A4440]/60 text-[#D4B8B5] font-bold min-h-[44px] py-3 rounded-xl transition-all touch-manipulation"
                >
                    <X size={18} />
                    إعادة
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    data-testid="vault-scanner-save"
                    className="flex-1 flex items-center justify-center gap-2 bg-[#C9A9A6]/25 hover:bg-[#C9A9A6]/35 border border-[#C9A9A6]/40 text-[#F7F3EB] font-bold min-h-[44px] py-3 rounded-xl transition-all touch-manipulation"
                >
                    <Upload size={18} />
                    حفظ في المخزن
                </button>
            </div>
        </div>
    );
}

export function ScannerUploadingPhase() {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 size={48} className="text-[#C9A9A6] animate-spin" />
            <p className="text-[#D4B8B5]/70 text-sm">جاري حفظ المستند في المخزن...</p>
        </div>
    );
}

type ScannerResultPhaseProps = {
    result: ScannerSaveResult;
    onViewDoc?: (doc: SmartVaultDoc) => void;
    onScanAnother: () => void;
};

export function ScannerResultPhase({ result, onViewDoc, onScanAnother }: ScannerResultPhaseProps) {
    return (
        <div className="flex flex-col gap-4" data-testid="vault-scanner-saved">
            <div className="flex items-center justify-center gap-3 py-4">
                <CheckCircle2 size={44} className="text-emerald-500 shrink-0" />
                <div>
                    <p className="text-[#F7F3EB] font-bold text-lg">تم الحفظ بنجاح</p>
                    <p className="text-[#C9A9A6]/50 text-xs">
                        {result.localOnly ? 'محفوظ محلياً في المخزن' : 'تمت إضافته للمخزن الذكي'}
                    </p>
                </div>
            </div>
            {result.text ? (
                <div className="max-h-40 overflow-y-auto rounded-xl bg-[#4A4440]/35 border border-[#C9A9A6]/15 p-3 text-right">
                    <p className="text-[#B8A078] text-[10px] mb-1">النص المستخرج</p>
                    <p className="text-[#F7F3EB]/75 text-xs leading-relaxed whitespace-pre-wrap">{result.text}</p>
                </div>
            ) : null}
            {result.doc ? (
                <button
                    type="button"
                    onClick={() => onViewDoc?.(result.doc)}
                    data-testid="vault-scanner-view-doc"
                    className="flex items-center justify-center gap-2 bg-[#B8A078]/12 hover:bg-[#B8A078]/20 border border-[#B8A078]/30 rounded-xl min-h-[44px] py-3 text-[#B8A078] text-sm font-bold transition-all touch-manipulation"
                >
                    <Eye size={16} />
                    معاينة داخل التطبيق
                </button>
            ) : null}
            <button
                type="button"
                onClick={onScanAnother}
                data-testid="vault-scanner-scan-another"
                className="flex items-center justify-center gap-2 bg-[#C9A9A6]/12 hover:bg-[#C9A9A6]/22 border border-[#C9A9A6]/30 rounded-xl min-h-[44px] py-3 text-[#C9A9A6] text-sm font-bold transition-all touch-manipulation"
            >
                <Camera size={16} />
                مسح مستند آخر
            </button>
        </div>
    );
}
