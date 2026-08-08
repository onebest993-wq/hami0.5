import React, { useState } from 'react';
import {
    Eye,
    FileText,
    Loader2,
    Paperclip,
    RefreshCw,
    Trash2,
    UploadCloud,
} from '@/app/components/ui/lucideIcons';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartVaultDB } from '@/app/services/vault/smartVaultRuntime';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import {
    readFilePreviewUrl,
    resolveVaultDocForViewing,
    resolveVaultDocUrl,
    resolveVaultDocViewerKind,
} from '@/app/services/vaultUploadService';
import { revokeBlobUrlIfNeeded } from '@/app/services/vault/vaultDocUtils';
import { readVaultLocalIndexSync } from '@/app/services/vault/vaultLocalIndex';
import { fetchVaultDocsDeduped, seedVaultWarmCacheFromLocalIndex } from '@/app/services/vault/vaultDocsWarmCache';
import { prefetchVaultPdfJsViewer, VaultPdfJsViewerLazy } from '@/app/components/lawyer/SmartVaultModal/VaultPdfJsViewerLazy';
import type { AddDocumentModalProps, TimelineEvent } from '../../smartFile/modalFormTypes';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';
import { MoroccanGlassShell } from '../../smartFile/moroccanGlassShell';
import { useSmartFileModalTheme } from '../../smartFile/smartFileModalTheme';
import {
    DocumentTimelinePreview,
    extractDocumentUserNotes,
    extractVaultDocSnapshot,
    findVaultDocForTimelineItem,
    FullDocumentPreviewOverlay,
    inferDocumentCategoryFromFile,
    ModalInlineTimeline,
    SmartModalHeader,
} from './shared';

export const AddDocumentModal = ({
    isOpen,
    onClose,
    onAdd,
    editMode = false,
    editData,
    recentDocuments = [],
    onDeleteDocument,
    onReplaceDocument,
    browseOnly = false,
}: AddDocumentModalProps) => {
    const T = useSmartFileModalTheme();
    const isPearl = T.variant === 'personal-pearl';
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [previewingEventId, setPreviewingEventId] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [fullPreviewOpen, setFullPreviewOpen] = useState(false);
    const [fullPreviewTitle, setFullPreviewTitle] = useState('');
    const [fullPreviewUrl, setFullPreviewUrl] = useState<string | null>(null);
    const [fullPreviewKind, setFullPreviewKind] = useState<'image' | 'pdf' | 'audio' | 'file' | null>(null);
    const [fullPreviewSource, setFullPreviewSource] = useState<string | Blob | null>(null);
    const [fullPreviewNonce, setFullPreviewNonce] = useState(0);
    const [missingPreviewIds, setMissingPreviewIds] = useState<string[]>([]);
    const [isFileDragActive, setIsFileDragActive] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const fileInputId = React.useId();
    const isPreviewMissing = React.useCallback(
        (itemId: string) => missingPreviewIds.includes(itemId),
        [missingPreviewIds],
    );
    const markPreviewMissing = React.useCallback((itemId: string) => {
        setMissingPreviewIds((prev) => (prev.includes(itemId) ? prev : [...prev, itemId]));
    }, []);
    const clearPreviewMissing = React.useCallback((itemId: string) => {
        setMissingPreviewIds((prev) => prev.filter((entry) => entry !== itemId));
    }, []);
    const selectedFileKind = !selectedFile
        ? null
        : selectedFile.type.startsWith('image/')
          ? 'image'
          : selectedFile.type === 'application/pdf' || /\.pdf$/i.test(selectedFile.name)
            ? 'pdf'
            : 'file';
    const selectedPreviewUrl = React.useMemo(() => {
        if (!selectedFile) return null;
        try {
            if (selectedFileKind === 'image') return readFilePreviewUrl(selectedFile) ?? null;
            if (selectedFileKind === 'pdf') return URL.createObjectURL(selectedFile);
            return null;
        } catch {
            return null;
        }
    }, [selectedFile, selectedFileKind]);

    React.useEffect(() => {
        if (selectedFileKind === 'pdf' && selectedPreviewUrl) {
            prefetchVaultPdfJsViewer();
        }
    }, [selectedFileKind, selectedPreviewUrl]);

    React.useEffect(() => {
        return () => revokeBlobUrlIfNeeded(selectedPreviewUrl);
    }, [selectedPreviewUrl]);

    React.useEffect(() => {
        return () => revokeBlobUrlIfNeeded(fullPreviewUrl);
    }, [fullPreviewUrl]);

    React.useEffect(() => {
        if (editMode && editData) {
            setTitle(editData.title || '');
            setCategory(editData.category || editData.docCategory || '');
            setNotes(extractDocumentUserNotes(editData.notes || editData.details || ''));
            setSelectedFile(null);
        } else {
            setTitle('');
            setCategory('');
            setNotes('');
            setSelectedFile(null);
        }
    }, [editMode, editData]);

    const applySelectedFile = React.useCallback(
        (nextFile: File | null) => {
            if (!nextFile) return;
            setPreviewingEventId(null);
            setSelectedFile(nextFile);
            if (!title.trim()) {
                setTitle(nextFile.name.replace(/\.[^/.]+$/, ''));
            }
            if (!category.trim()) {
                setCategory(inferDocumentCategoryFromFile(nextFile));
            }
        },
        [category, title],
    );

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        applySelectedFile(e.target.files?.[0] ?? null);
        e.target.value = '';
    };

    const handleDropSelectedFile = (e: React.DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsFileDragActive(false);
        applySelectedFile(e.dataTransfer.files?.[0] ?? null);
    };

    const handleDragState = (e: React.DragEvent<HTMLElement>, active: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setIsFileDragActive(active);
    };

    const openDocumentPreview = (
        title: string,
        url: string,
        kind: 'image' | 'pdf' | 'audio' | 'file',
        source?: string | Blob | null,
    ) => {
        revokeBlobUrlIfNeeded(fullPreviewUrl);
        setFullPreviewTitle(title);
        setFullPreviewUrl(url);
        setFullPreviewKind(kind);
        setFullPreviewSource(source ?? url);
        setFullPreviewNonce((value) => value + 1);
        setFullPreviewOpen(true);
    };

    const handlePreviewSavedDocument = async (item: TimelineEvent) => {
        const itemId = String(item.id);
        setPreviewLoading(true);
        setPreviewingEventId(itemId);
        try {
            const snapshot = extractVaultDocSnapshot(item);
            let snapshotFailed = false;
            if (snapshot) {
                const payload = await resolveVaultDocForViewing(snapshot).catch(() => null);
                if (payload) {
                    openDocumentPreview(
                        snapshot.fileName || snapshot.title,
                        payload.url,
                        payload.kind,
                        payload.blob ?? payload.url,
                    );
                    clearPreviewMissing(itemId);
                    return;
                }
                snapshotFailed = true;
                const fallbackUrl = await resolveVaultDocUrl(snapshot).catch(() => null);
                const fallbackKind = resolveVaultDocViewerKind(snapshot);
                if (fallbackUrl && fallbackKind) {
                    openDocumentPreview(
                        snapshot.fileName || snapshot.title,
                        fallbackUrl,
                        fallbackKind,
                        fallbackUrl,
                    );
                    clearPreviewMissing(itemId);
                    return;
                }
            }

            const candidateUserIds = Array.from(
                new Set([resolveCalendarUserId(), snapshot?.authorId].filter((value): value is string => Boolean(value?.trim()))),
            );
            const localDocs = readVaultLocalIndexSync();
            const findDocInList = (docs: SmartVaultDoc[]) =>
                (snapshotFailed && snapshot?.id ? docs.find((entry) => entry.id === snapshot.id) ?? null : null) ??
                findVaultDocForTimelineItem(item, docs);

            let doc = findDocInList(localDocs);
            for (const candidateUserId of candidateUserIds) {
                if (doc) break;
                const seededDocs = seedVaultWarmCacheFromLocalIndex(candidateUserId);
                doc = findDocInList(seededDocs);
            }
            for (const candidateUserId of candidateUserIds) {
                if (doc) break;
                const fetchedDocs = await fetchVaultDocsDeduped(candidateUserId);
                doc = findDocInList(fetchedDocs);
            }
            if (!doc) {
                markPreviewMissing(itemId);
                SmartToast.error('الملف الأصلي لهذا المستند غير موجود حالياً في الخزنة. أعد إرفاقه عبر استبدال.');
                return;
            }

            const payload = await resolveVaultDocForViewing(doc).catch(() => null);
            if (payload) {
                openDocumentPreview(
                    doc.fileName || doc.title,
                    payload.url,
                    payload.kind,
                    payload.blob ?? payload.url,
                );
                clearPreviewMissing(itemId);
                return;
            }
            const fallbackUrl = await resolveVaultDocUrl(doc).catch(() => null);
            const fallbackKind = resolveVaultDocViewerKind(doc);
            if (fallbackUrl && fallbackKind) {
                openDocumentPreview(doc.fileName || doc.title, fallbackUrl, fallbackKind, fallbackUrl);
                clearPreviewMissing(itemId);
                return;
            }
            markPreviewMissing(itemId);
            SmartToast.error('تعذر تجهيز هذا الملف للمعاينة. أعد إرفاقه عبر استبدال إذا كان مستنداً قديماً.');
            return;
        } catch {
            markPreviewMissing(itemId);
            SmartToast.error('تعذر فتح هذا المستند حالياً');
        } finally {
            setPreviewLoading(false);
            setPreviewingEventId(null);
        }
    };

    const handleDeleteSavedDocument = async (item: TimelineEvent) => {
        const snapshot = extractVaultDocSnapshot(item);
        const meta = (item.metadata as Record<string, unknown> | undefined) ?? {};
        const attachmentDocId =
            typeof meta.attachmentDocId === 'string' ? meta.attachmentDocId : snapshot?.id;
        const authorId = snapshot?.authorId || resolveCalendarUserId();
        if (attachmentDocId && authorId) {
            await SmartVaultDB.deleteDoc(attachmentDocId, authorId).catch(() => undefined);
        }
        await Promise.resolve(onDeleteDocument?.(String(item.id)));
        if (previewingEventId === String(item.id)) setPreviewingEventId(null);
        clearPreviewMissing(String(item.id));
    };

    const handleSubmit = async () => {
        const trimmedTitle = title.trim();
        const trimmedCategory = category.trim();
        const trimmedNotes = notes.trim();
        if (!trimmedTitle || !trimmedCategory) return;
        if (!editMode && !selectedFile) {
            SmartToast.error('اختر ملف المستند أولاً');
            return;
        }

        setSaving(true);
        try {
            await Promise.resolve(
                onAdd({
                    title: trimmedTitle,
                    category: trimmedCategory,
                    details: trimmedNotes,
                    notes: trimmedNotes,
                    file: selectedFile,
                    fileName: selectedFile?.name,
                    fileType: selectedFile?.type,
                    date: getLocalTodayYmd(),
                    ...(editMode && editData ? { id: editData.id } : {}),
                }),
            );
            if (!editMode) {
                setTitle('');
                setCategory('');
                setNotes('');
                setSelectedFile(null);
            }
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <MoroccanGlassShell
            onOverlayClick={onClose}
            overlayTestId={CIVIL_LAWSUIT_TEST_IDS.documentModal}
            maxWidth="max-w-4xl"
            className="min-h-[min(84dvh,760px)]"
        >
            <FullDocumentPreviewOverlay
                key={fullPreviewNonce}
                isOpen={fullPreviewOpen}
                onClose={() => {
                    setFullPreviewOpen(false);
                    setFullPreviewSource(null);
                }}
                title={fullPreviewTitle}
                url={fullPreviewUrl}
                kind={fullPreviewKind}
                pdfSource={fullPreviewSource}
            />
            <SmartModalHeader
                T={T}
                icon={Paperclip}
                title={browseOnly ? 'مستندات الإضبارة — للاطلاع' : editMode ? 'تعديل مستند' : 'محفظة الأدلة الذكية'}
                onClose={onClose}
            />
            <div
                className={
                    browseOnly
                        ? 'p-5 sm:p-6'
                        : T.useMoroccanCorners
                        ? 'grid gap-5 p-5 sm:p-6 md:min-h-[min(76dvh,640px)] md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-start'
                        : T.body
                }
            >
                <div className="space-y-4">
                    <ModalInlineTimeline
                        title={browseOnly ? 'مستندات هذه المرحلة' : 'سجل المستندات داخل هذا القسم'}
                        emptyLabel="لا توجد مستندات محفوظة في هذه المرحلة بعد"
                        items={recentDocuments}
                        pinActions={browseOnly}
                        renderMeta={(item) =>
                            [
                                item.docCategory ? `النوع: ${item.docCategory}` : null,
                                typeof (item.metadata as Record<string, unknown> | undefined)?.fileName === 'string'
                                    ? `الملف: ${String((item.metadata as Record<string, unknown>).fileName)}`
                                    : null,
                            ]
                                .filter(Boolean)
                                .join(' • ') || null
                        }
                        renderActions={(item) => (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        void handlePreviewSavedDocument(item);
                                    }}
                                    disabled={
                                        (previewLoading && previewingEventId === String(item.id)) ||
                                        isPreviewMissing(String(item.id))
                                    }
                                    className="inline-flex items-center gap-1 rounded-xl border border-[#E6C673]/18 bg-[#E6C673]/10 px-2 py-0.5 text-[9px] font-bold text-[#E6C673] transition-colors hover:bg-[#E6C673]/18 disabled:opacity-50"
                                >
                                    {previewLoading && previewingEventId === String(item.id) ? (
                                        <Loader2 size={12} className="animate-spin" />
                                    ) : isPreviewMissing(String(item.id)) ? (
                                        <FileText size={12} />
                                    ) : (
                                        <Eye size={12} />
                                    )}
                                    {isPreviewMissing(String(item.id)) ? 'مفقود' : 'اطلاع'}
                                </button>
                                {!browseOnly ? (
                                <>
                                <button
                                    type="button"
                                    onClick={() => onReplaceDocument?.(item)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-white/[0.12] bg-white/[0.05] px-2 py-0.5 text-[9px] font-bold text-white/70 transition-colors hover:bg-white/[0.08]"
                                >
                                    <RefreshCw size={12} />
                                    استبدال
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleDeleteSavedDocument(item)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold text-rose-200 transition-colors hover:bg-rose-500/16"
                                >
                                    <Trash2 size={12} />
                                    حذف
                                </button>
                                </>
                                ) : null}
                            </div>
                        )}
                        renderBody={(item) => (
                            <DocumentTimelinePreview
                                item={item}
                                onPreviewClick={
                                    browseOnly
                                        ? () => {
                                              void handlePreviewSavedDocument(item);
                                          }
                                        : undefined
                                }
                            />
                        )}
                    />
                </div>
                {!browseOnly ? (
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
                    <div className="rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4 space-y-3">
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
                                    <div className="flex h-44 sm:h-52 items-center justify-center overflow-hidden rounded-[22px] border border-white/[0.08] bg-black/20 p-3">
                                        <img
                                            src={selectedPreviewUrl}
                                            alt={selectedFile.name}
                                            className="block max-h-full max-w-full object-contain"
                                        />
                                    </div>
                                ) : null}
                                {selectedFileKind === 'pdf' && selectedPreviewUrl ? (
                                    <div className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#161616]">
                                        <div className="h-56 sm:h-64 w-full">
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
                                    <div className="flex h-40 items-center justify-center rounded-[22px] border border-dashed border-white/[0.08] bg-black/10 px-4 text-center">
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
                                className={`w-full h-36 cursor-pointer rounded-[22px] border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all backdrop-blur-sm ${
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
                    <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
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
                            className={`${T.field} min-h-[130px] resize-none`}
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
                ) : null}
            </div>
        </MoroccanGlassShell>
    );
};
