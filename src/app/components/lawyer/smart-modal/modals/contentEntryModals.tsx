// @ts-nocheck
import React, { useEffect, useState } from 'react';
import {
    Calendar,
    ChevronDown,
    ChevronUp,
    CheckSquare,
    DollarSign,
    Eye,
    FileText,
    Loader2,
    Pencil,
    Paperclip,
    RefreshCw,
    Trash2,
    UploadCloud,
    X,
} from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { inferLawsuitTypeFromDocType } from '@/app/services/dossier-notes/dossierLawArticleTooltips';
import { DossierFastNoteComposer } from '@/app/components/lawyer/dossier-notes/DossierFastNoteComposer';
import { DossierNotesVault, type DossierVaultNote } from '@/app/components/lawyer/dossier-notes/DossierNotesVault';
import {
    prefetchVaultPdfJsViewer,
    VaultPdfJsViewerLazy,
} from '@/app/components/lawyer/SmartVaultModal/VaultPdfJsViewerLazy';
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
import { SMART_FILE_NESTED_MODAL_OVERLAY_DARK_CLASS } from '../smartFile/smartFileOverlayZ';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import type {
    AddAppointmentModalProps,
    AddDocumentModalProps,
    AddNoteModalProps,
    AddPaymentModalProps,
    AddTaskModalProps,
    TimelineEvent,
} from '../smartFile/modalFormTypes';
import {
    MoroccanCloseButton,
    MoroccanGlassShell,
    MoroccanHeaderDivider,
    GLASS_MODAL_HEADER,
} from '../smartFile/moroccanGlassShell';
import { useSmartFileModalTheme } from '../smartFile/smartFileModalTheme';
import { ManualClassificationPicker } from '../smartFile/ManualClassificationPicker';
import { normalizeManualClassificationTag } from '../smartFile/manualClassificationTemplates';

function SmartModalHeader({
    T,
    icon: Icon,
    title,
    onClose,
}: {
    T: ReturnType<typeof useSmartFileModalTheme>;
    icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
    title: string;
    onClose: () => void;
}) {
    return (
        <div className={T.useMoroccanCorners ? GLASS_MODAL_HEADER : T.header}>
            <h3 className={T.useMoroccanCorners ? 'font-bold flex items-center gap-2 text-[14px] text-white/95' : T.headerTitle}>
                <Icon size={17} className={T.headerIcon} strokeWidth={1.75} />
                {title}
            </h3>
            {T.useMoroccanCorners ? <MoroccanCloseButton onClick={onClose} /> : (
                <button type="button" onClick={onClose} className={T.closeBtn} aria-label="إغلاق">
                    <X size={16} />
                </button>
            )}
            {T.useMoroccanCorners ? <MoroccanHeaderDivider /> : null}
        </div>
    );
}

function ModalInlineTimeline({
    title,
    emptyLabel,
    items,
    renderMeta,
    renderActions,
    renderBody,
    collapsible = false,
    expanded = true,
    onToggle,
}: {
    title: string;
    emptyLabel: string;
    items: TimelineEvent[];
    renderMeta?: (item: TimelineEvent) => string | null;
    renderActions?: (item: TimelineEvent) => React.ReactNode;
    renderBody?: (item: TimelineEvent) => React.ReactNode;
    collapsible?: boolean;
    expanded?: boolean;
    onToggle?: () => void;
}) {
    return (
        <div className="rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    {collapsible ? (
                        <button
                            type="button"
                            onClick={onToggle}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/55 transition-colors hover:text-white hover:bg-white/[0.07]"
                            aria-label={expanded ? 'طي السجل' : 'توسيع السجل'}
                        >
                            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                    ) : null}
                    <p className="text-[12px] font-black text-[#E6C673]/85">{title}</p>
                </div>
                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-white/45">
                    {items.length}
                </span>
            </div>
            {!expanded ? null : items.length > 0 ? (
                <div className="space-y-2 pr-1">
                    {items.map((item) => (
                        <div
                            key={String(item.id)}
                            className="rounded-2xl border border-white/[0.06] bg-black/10 px-3 py-2.5"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-[12px] font-bold text-[#F4E9CD]">
                                    {String(item.title ?? 'بدون عنوان').trim() || 'بدون عنوان'}
                                </span>
                                <span className="shrink-0 text-[10px] text-white/35">
                                    {String(item.date ?? '').slice(0, 10) || 'بدون تاريخ'}
                                </span>
                            </div>
                            {renderMeta ? (
                                <p className="mt-1 text-[10px] text-white/48">
                                    {renderMeta(item)}
                                </p>
                            ) : null}
                            {renderBody ? renderBody(item) : item.details ? (
                                <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-[10px] leading-5 text-white/38">
                                    {item.details}
                                </p>
                            ) : null}
                            {renderActions ? (
                                <div className="mt-2 flex justify-end">
                                    {renderActions(item)}
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="rounded-2xl border border-dashed border-white/[0.08] bg-black/10 px-3 py-4 text-center text-[11px] text-white/35">
                    {emptyLabel}
                </div>
            )}
        </div>
    );
}

function normalizeDocLookupValue(value: unknown): string {
    return String(value ?? '')
        .trim()
        .toLowerCase();
}

function normalizeDocLookupStem(value: unknown): string {
    return normalizeDocLookupValue(value).replace(/\.[a-z0-9]+$/i, '');
}

function findVaultDocForTimelineItem(item: TimelineEvent, docs: SmartVaultDoc[]): SmartVaultDoc | null {
    if (!docs.length) return null;

    const meta = (item.metadata as Record<string, unknown> | undefined) ?? {};
    const attachmentDocId = typeof meta.attachmentDocId === 'string' ? meta.attachmentDocId.trim() : '';
    if (attachmentDocId) {
        return docs.find((entry) => entry.id === attachmentDocId) ?? null;
    }
    const snapshotDocId =
        meta.vaultDoc && typeof meta.vaultDoc === 'object' && typeof (meta.vaultDoc as { id?: unknown }).id === 'string'
            ? String((meta.vaultDoc as { id: string }).id).trim()
            : '';
    if (snapshotDocId) {
        return docs.find((entry) => entry.id === snapshotDocId) ?? null;
    }

    const itemTitle = normalizeDocLookupValue(item.title);
    const itemCategory = normalizeDocLookupValue(item.docCategory);
    const itemFileName = normalizeDocLookupValue(meta.fileName);
    const itemTitleStem = normalizeDocLookupStem(item.title);
    const itemFileNameStem = normalizeDocLookupStem(meta.fileName);
    const itemDate = String(item.date ?? '').slice(0, 10);

    let bestDoc: SmartVaultDoc | null = null;
    let bestScore = -1;

    for (const doc of docs) {
        let score = 0;
        const docTitle = normalizeDocLookupValue(doc.title);
        const docCategory = normalizeDocLookupValue(doc.customCategory);
        const docFileName = normalizeDocLookupValue(doc.fileName);
        const docTitleStem = normalizeDocLookupStem(doc.title);
        const docFileNameStem = normalizeDocLookupStem(doc.fileName);
        const docDate = String(doc.createdAt ?? '').slice(0, 10);

        if (itemFileName && docFileName === itemFileName) score += 10;
        else if (itemFileNameStem && docFileNameStem && (docFileNameStem.includes(itemFileNameStem) || itemFileNameStem.includes(docFileNameStem))) score += 7;
        if (itemTitle && docTitle === itemTitle) score += 6;
        else if (itemTitleStem && docTitleStem && (docTitleStem.includes(itemTitleStem) || itemTitleStem.includes(docTitleStem))) score += 4;
        if (itemCategory && docCategory === itemCategory) score += 4;
        else if (itemCategory && ((itemCategory === 'صورة' && doc.type === 'image') || (itemCategory === 'pdf' && doc.type === 'pdf'))) score += 3;
        if (itemDate && docDate === itemDate) score += 2;

        if (score > bestScore) {
            bestScore = score;
            bestDoc = doc;
        }
    }

    return bestScore > 0 ? bestDoc : null;
}

function inferDocumentCategoryFromFile(file: File): string {
    if (file.type.startsWith('image/')) return 'صورة';
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'PDF';
    return 'مستند عام';
}

function extractDocumentUserNotes(value: unknown): string {
    return String(value ?? '')
        .split('\n')
        .filter((line) => {
            const trimmed = line.trim();
            return trimmed && !trimmed.startsWith('نوع المستند:') && !trimmed.startsWith('الملف:');
        })
        .join('\n')
        .trim();
}

function extractVaultDocSnapshot(item: TimelineEvent): SmartVaultDoc | null {
    const meta = (item.metadata as Record<string, unknown> | undefined) ?? {};
    const candidate = meta.vaultDoc;
    if (!candidate || typeof candidate !== 'object') return null;
    const doc = candidate as Record<string, unknown>;
    if (typeof doc.id !== 'string' || typeof doc.title !== 'string' || typeof doc.authorId !== 'string') return null;
    return doc as unknown as SmartVaultDoc;
}

function DocumentTimelinePreview({
    item,
}: {
    item: TimelineEvent;
}) {
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
    const snapshot = React.useMemo(() => extractVaultDocSnapshot(item), [item]);
    const previewKind = snapshot ? resolveVaultDocViewerKind(snapshot) : null;

    React.useEffect(() => {
        let cancelled = false;
        if (!snapshot || previewKind !== 'image') {
            setPreviewUrl(null);
            return;
        }
        void resolveVaultDocUrl(snapshot)
            .then((resolved) => {
                if (!cancelled) setPreviewUrl(resolved);
            })
            .catch(() => {
                if (!cancelled) setPreviewUrl(null);
            });
        return () => {
            cancelled = true;
        };
    }, [snapshot, previewKind]);

    React.useEffect(() => {
        return () => revokeBlobUrlIfNeeded(previewUrl);
    }, [previewUrl]);

    if (previewKind === 'image' && previewUrl) {
        return (
            <div className="mt-2 overflow-hidden rounded-xl border border-white/[0.06] bg-black/20">
                <img src={previewUrl} alt={String(item.title ?? 'مستند')} className="h-28 w-full object-cover" />
            </div>
        );
    }

    if (previewKind === 'pdf') {
        return (
            <div className="mt-2 rounded-xl border border-white/[0.06] bg-black/10 px-3 py-2 text-[10px] text-white/42">
                ملف PDF جاهز للاطلاع
            </div>
        );
    }

    return null;
}

function FullDocumentPreviewOverlay({
    isOpen,
    onClose,
    title,
    url,
    kind,
    pdfSource,
}: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    url: string | null;
    kind: 'image' | 'pdf' | 'audio' | 'file' | null;
    pdfSource?: string | Blob | null;
}) {
    useEffect(() => {
        if (isOpen && kind === 'pdf') prefetchVaultPdfJsViewer();
    }, [isOpen, kind]);

    if (!isOpen || !url || !kind) return null;

    return (
        <div className={`${SMART_FILE_NESTED_MODAL_OVERLAY_DARK_CLASS} z-[340]`} onClick={onClose}>
            <div
                className="w-[min(98vw,96rem)] h-[min(94dvh,62rem)] rounded-[28px] border border-white/[0.08] bg-[#070B14] shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,24,38,0.98),rgba(10,15,28,0.98))]">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-black text-[#F4E9CD]">{title}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
                        aria-label="إغلاق المعاينة"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="h-[calc(100%-4.5rem)] p-4 bg-[#050810]">
                    {kind === 'image' ? (
                        <div className="flex h-full items-center justify-center overflow-auto rounded-[24px] border border-white/[0.06] bg-black/35 p-4">
                            <img src={url} alt={title} className="max-h-full max-w-full object-contain" />
                        </div>
                    ) : kind === 'pdf' ? (
                        <div className="h-full overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#161616]">
                            <VaultPdfJsViewerLazy
                                source={pdfSource ?? url}
                                title={title}
                                openUrl={url}
                                fallbackClassName="flex h-full items-center justify-center text-sm text-white/45"
                            />
                        </div>
                    ) : (
                        <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-white/[0.08] bg-black/20 text-center">
                            <div className="space-y-2 px-6">
                                <FileText size={30} className="mx-auto text-[#E6C673]" />
                                <p className="text-sm font-bold text-[#F4E9CD]">{title}</p>
                                <p className="text-[11px] text-white/42">هذا النوع لا يملك معاينة مضمّنة كاملة.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


export const AddTaskModal = ({ isOpen, onClose, onAdd, editMode = false, editData }: AddTaskModalProps) => {
    const T = useSmartFileModalTheme();
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');

    React.useEffect(() => {
        if (editMode && editData) {
            setTitle(editData.title || '');
            setDueDate(editData.dueDate || '');
        } else {
            setTitle('');
            setDueDate('');
        }
    }, [editMode, editData]);

    const handleSubmit = () => {
        if (!title) return;
        onAdd({ title, dueDate, ...(editMode && editData ? { id: editData.id } : {}) });
        onClose();
        setTitle(''); setDueDate('');
    };

    if (!isOpen) return null;

    return (
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-3xl">
            <SmartModalHeader T={T} icon={CheckSquare} title={editMode ? 'تحديث مهمة إدارية' : 'إضافة مهمة إدارية'} onClose={onClose} />
            <div data-testid={CIVIL_LAWSUIT_TEST_IDS.taskModal} className={T.useMoroccanCorners ? 'p-5 sm:p-6 space-y-5 md:min-h-[24rem]' : T.body}>
                <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] md:items-start">
                    <div>
                        <label className={T.label}>
                            عنوان المهمة <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.taskTitle}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="عنوان المهمة"
                            className={T.field}
                            autoFocus
                        />
                    </div>

                    <div className="rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-4 space-y-4">
                        <div>
                            <label className={T.label}>
                                تاريخ الإنجاز (اختياري)
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className={T.field}
                            />
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-black/10 px-3 py-3 text-[11px] text-white/45">
                            ستظهر المهمة مباشرة داخل قسم المهام الإدارية في نفس المرحلة.
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.taskSubmit}
                    onClick={handleSubmit}
                    disabled={!title}
                    className={T.btn}
                >
                    {editMode ? 'تحديث البيانات' : 'حفظ المهمة'}
                </button>
            </div>
        </MoroccanGlassShell>
    );
};


export const AddDocumentModal = ({
    isOpen,
    onClose,
    onAdd,
    editMode = false,
    editData,
    recentDocuments = [],
    onDeleteDocument,
    onReplaceDocument,
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

    const handlePreviewSavedDocument = async (item: TimelineEvent) => {
        const itemId = String(item.id);
        setPreviewLoading(true);
        setPreviewingEventId(itemId);
        try {
            const snapshot = extractVaultDocSnapshot(item);
            let snapshotFailed = false;
            if (snapshot) {
                const payload = await resolveVaultDocForViewing(snapshot).catch(() => null);
                if (!payload) {
                    snapshotFailed = true;
                } else {
                    revokeBlobUrlIfNeeded(fullPreviewUrl);
                    setFullPreviewTitle(snapshot.fileName || snapshot.title);
                    setFullPreviewUrl(payload.url);
                    setFullPreviewKind(payload.kind);
                    setFullPreviewSource(payload.blob ?? payload.url);
                    setFullPreviewNonce((value) => value + 1);
                    setFullPreviewOpen(true);
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
            if (!payload) {
                markPreviewMissing(itemId);
                SmartToast.error('تعذر تجهيز هذا الملف للمعاينة. أعد إرفاقه عبر استبدال إذا كان مستنداً قديماً.');
                return;
            }
            revokeBlobUrlIfNeeded(fullPreviewUrl);
            setFullPreviewTitle(doc.fileName || doc.title);
            setFullPreviewUrl(payload.url);
            setFullPreviewKind(payload.kind);
            setFullPreviewSource(payload.blob ?? payload.url);
            setFullPreviewNonce((value) => value + 1);
            setFullPreviewOpen(true);
            clearPreviewMissing(itemId);
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
            <SmartModalHeader T={T} icon={Paperclip} title={editMode ? 'تعديل مستند' : 'محفظة الأدلة الذكية'} onClose={onClose} />
            <div
                className={
                    T.useMoroccanCorners
                        ? 'grid gap-5 p-5 sm:p-6 md:min-h-[min(76dvh,640px)] md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-start'
                        : T.body
                }
            >
                <div className="space-y-4">
                    <ModalInlineTimeline
                        title="سجل المستندات داخل هذا القسم"
                        emptyLabel="لا توجد مستندات محفوظة في هذه المرحلة بعد"
                        items={recentDocuments}
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
                                    className="inline-flex items-center gap-1 rounded-xl border border-[#E6C673]/18 bg-[#E6C673]/10 px-3 py-1.5 text-[10px] font-bold text-[#E6C673] transition-colors hover:bg-[#E6C673]/18 disabled:opacity-50"
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
                                <button
                                    type="button"
                                    onClick={() => onReplaceDocument?.(item)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-white/[0.12] bg-white/[0.05] px-3 py-1.5 text-[10px] font-bold text-white/70 transition-colors hover:bg-white/[0.08]"
                                >
                                    <RefreshCw size={12} />
                                    استبدال
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleDeleteSavedDocument(item)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-[10px] font-bold text-rose-200 transition-colors hover:bg-rose-500/16"
                                >
                                    <Trash2 size={12} />
                                    حذف
                                </button>
                            </div>
                        )}
                        renderBody={(item) => <DocumentTimelinePreview item={item} />}
                    />
                </div>
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
            </div>
        </MoroccanGlassShell>
    );
};


export const AddNoteModal = ({
    isOpen,
    onClose,
    onAdd,
    editMode = false,
    editData,
    dossierContext,
    voiceUserId,
    savedNotes = [],
    onDeleteNote,
}: AddNoteModalProps) => {
    const T = useSmartFileModalTheme();
    const [title, setTitle] = useState('');
    const [bodyHtml, setBodyHtml] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

    const noteContext =
        dossierContext ??
        ({
            kind: 'lawsuit',
            lawsuitType: 'civil',
        } as const);

    const isEditing = Boolean(editingNoteId || (editMode && editData?.id));

    React.useEffect(() => {
        if (editMode && editData) {
            setTitle(editData.title || '');
            setBodyHtml(editData.details || '');
            setEditingNoteId(editData.id ? String(editData.id) : null);
        } else if (isOpen) {
            setTitle('');
            setBodyHtml('');
            setEditingNoteId(null);
        }
    }, [editMode, editData, isOpen]);

    const resetComposer = () => {
        setTitle('');
        setBodyHtml('');
        setEditingNoteId(null);
    };

    const commitNote = (payload: { title: string; bodyHtml: string }) => {
        onAdd({
            title: payload.title,
            details: payload.bodyHtml,
            ...(editingNoteId ? { id: editingNoteId } : editMode && editData?.id ? { id: editData.id } : {}),
        });
        resetComposer();
        SmartToast.success(isEditing ? 'تم تحديث الملاحظة' : 'تم حفظ الملاحظة في مخزن الإضبارة');
    };

    const handleVaultEdit = (note: DossierVaultNote) => {
        setTitle(note.title);
        setBodyHtml(note.body);
        setEditingNoteId(note.id);
    };

    if (!isOpen) return null;

    return (
        <MoroccanGlassShell
            onOverlayClick={onClose}
            overlayTestId={CIVIL_LAWSUIT_TEST_IDS.noteModal}
            maxWidth="max-w-5xl"
            className="min-h-[min(88dvh,860px)]"
        >
            <SmartModalHeader
                T={T}
                icon={FileText}
                title={isEditing ? 'تعديل ملاحظة' : 'ملاحظات الإضبارة'}
                onClose={onClose}
            />
            <div
                className={
                    T.useMoroccanCorners
                        ? 'grid gap-5 p-5 sm:p-6 lg:min-h-[min(82dvh,760px)] lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] lg:items-start'
                        : T.body
                }
            >
                <div className="min-h-[min(60dvh,560px)] overflow-y-auto rounded-[24px] border border-white/[0.08] bg-black/10 p-3">
                    <DossierNotesVault
                        notes={savedNotes}
                        onEdit={handleVaultEdit}
                        onDelete={onDeleteNote}
                        variant="repo"
                        heading="مخزن الملاحظات"
                        emptyLabel="لا توجد ملاحظات محفوظة بعد — اكتب ملاحظة جديدة أدناه."
                        lawContext={noteContext}
                    />
                </div>
                <div className="min-h-[min(60dvh,560px)] border-t border-white/[0.08] pt-4 lg:border-t-0 lg:border-r lg:pr-5 lg:pt-0">
                    <p className="mb-3 text-xs font-bold text-[#E6C673]/85">
                        {isEditing ? 'تعديل الملاحظة' : 'ملاحظة جديدة'}
                    </p>
                    <DossierFastNoteComposer
                        title={title}
                        onTitleChange={setTitle}
                        bodyHtml={bodyHtml}
                        onBodyChange={setBodyHtml}
                        context={noteContext}
                        onSave={commitNote}
                        onCancel={() => {
                            if (isEditing) resetComposer();
                            else onClose();
                        }}
                        saveLabel={isEditing ? 'تحديث الملاحظة' : 'حفظ الملاحظة'}
                        voiceUserId={voiceUserId ?? resolveCalendarUserId()}
                        onVoiceNote={(voicePayload) => {
                            commitNote({ title: voicePayload.title, bodyHtml: voicePayload.body });
                        }}
                        expanded
                    />
                </div>
            </div>
        </MoroccanGlassShell>
    );
};


export const AddPaymentModal = ({ isOpen, onClose, onAdd }: AddPaymentModalProps) => {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(getLocalTodayYmd());

    const handleSubmit = () => {
        if (!amount) return;
        onAdd(Number(amount), date);
        onClose();
        setAmount('');
    };

    if (!isOpen) return null;

    return (
        <div className={SMART_FILE_NESTED_MODAL_OVERLAY_DARK_CLASS}>
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                 <div className="bg-[#E6C673] p-4 text-[#0F172A] flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2"><DollarSign size={18}/> تسجيل دفعة جديدة</h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="المبلغ" className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673]" autoFocus />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673] [color-scheme:dark]" />
                    <button type="button" onClick={handleSubmit} className="w-full bg-[#E6C673] text-[#0F172A] py-3 rounded-lg font-bold text-sm hover:bg-[#F4D03F] transition-all shadow-lg shadow-[#E6C673]/20">تسجيل</button>
                </div>
            </div>
        </div>
    );
};


export const AddAppointmentModal = ({
    isOpen,
    onClose,
    onAdd,
    editMode = false,
    editData,
    recentAppointments = [],
    onDeleteAppointment,
    onEditAppointment,
}: AddAppointmentModalProps) => {
    const T = useSmartFileModalTheme();
    const [date, setDate] = useState('');
    const [details, setDetails] = useState('');
    const [purpose, setPurpose] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [timelineExpanded, setTimelineExpanded] = useState(true);

    React.useEffect(() => {
        if (editMode && editData) {
            setDate(editData.date || '');
            setDetails(editData.details || '');
            setPurpose(editData.purpose || editData.title || '');
            const tags = Array.isArray(editData.tags) ? editData.tags : [];
            setSelectedTags(
                tags
                    .map((tag) => normalizeManualClassificationTag(String(tag)))
                    .filter(Boolean)
                    .slice(0, 1),
            );
        } else {
            setDate(getLocalTodayYmd());
            setDetails('');
            setPurpose('');
            setSelectedTags([]);
            setTimelineExpanded(true);
        }
    }, [editMode, editData]);

    const handleSubmit = async () => {
        const trimmedPurpose = purpose.trim();
        if (!date || !trimmedPurpose) return;
        setSaving(true);
        try {
            await Promise.resolve(
                onAdd({
                    title: trimmedPurpose,
                    date,
                    details: details.trim(),
                    purpose: trimmedPurpose,
                    ...(selectedTags.length > 0 ? { tags: selectedTags } : {}),
                    ...(editMode && editData ? { id: editData.id } : {}),
                }),
            );
            if (!editMode) {
                setDate(getLocalTodayYmd());
                setDetails('');
                setPurpose('');
                setSelectedTags([]);
            }
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <MoroccanGlassShell
            onOverlayClick={onClose}
            overlayTestId={CIVIL_LAWSUIT_TEST_IDS.appointmentModal}
            maxWidth="max-w-4xl"
            className="min-h-[min(82dvh,740px)]"
        >
            <SmartModalHeader T={T} icon={Calendar} title={editMode ? 'تعديل موعد' : 'موعد جديد'} onClose={onClose} />
            <div
                className={
                    T.useMoroccanCorners
                        ? 'grid gap-5 p-5 sm:p-6 md:min-h-[min(74dvh,620px)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-start'
                        : T.body
                }
            >
                <div className="space-y-5">
                    <div>
                        <label className={T.label}>
                            الغاية من الموعد <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            placeholder="اكتب الغاية من الموعد..."
                            data-testid="smart-file-appointment-purpose-manual"
                            className={T.field}
                        />
                    </div>

                    <div>
                        <label className={T.label}>
                            تاريخ الموعد <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={T.field}
                        />
                    </div>
                    <ManualClassificationPicker
                        mode="single"
                        selected={selectedTags}
                        onSelectedChange={setSelectedTags}
                        placeholder="مثال: #مرافعة"
                        inputTestId={CIVIL_LAWSUIT_TEST_IDS.appointmentTagManualInput}
                        addTestId={CIVIL_LAWSUIT_TEST_IDS.appointmentTagManualAdd}
                        chipTestId={CIVIL_LAWSUIT_TEST_IDS.appointmentTagTemplateChip}
                        removeTestId={CIVIL_LAWSUIT_TEST_IDS.appointmentTagTemplateRemove}
                    />
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={saving || !date || !purpose.trim()}
                        className={T.btn}
                    >
                        {saving ? 'جارٍ حفظ الموعد...' : editMode ? 'تحديث الموعد' : 'حفظ الموعد'}
                    </button>
                </div>
                <div className="flex h-full flex-col gap-5">
                    <ModalInlineTimeline
                        title="سجل المواعيد داخل هذا القسم"
                        emptyLabel="لا توجد مواعيد محفوظة في هذه المرحلة بعد"
                        items={recentAppointments}
                        collapsible
                        expanded={timelineExpanded}
                        onToggle={() => setTimelineExpanded((prev) => !prev)}
                        renderMeta={(item) =>
                            Array.isArray(item.tags) && item.tags.length > 0
                                ? `التصنيف: ${item.tags.join(' • ')}`
                                : item.subType
                                  ? `التصنيف: ${String(item.subType)}`
                                  : null
                        }
                        renderActions={(item) => (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => onEditAppointment?.(item)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-white/[0.12] bg-white/[0.05] px-3 py-1.5 text-[10px] font-bold text-white/70 transition-colors hover:bg-white/[0.08]"
                                >
                                    <Pencil size={12} />
                                    تعديل
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDeleteAppointment?.(String(item.id))}
                                    className="inline-flex items-center gap-1 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-[10px] font-bold text-rose-200 transition-colors hover:bg-rose-500/16"
                                >
                                    <Trash2 size={12} />
                                    حذف
                                </button>
                            </div>
                        )}
                    />
                </div>
            </div>
        </MoroccanGlassShell>
    );
};
