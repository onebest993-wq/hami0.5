import React, { useState } from 'react';
import { Paperclip } from '@/app/components/ui/icons/Paperclip';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
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
import { prefetchVaultPdfJsViewer } from '@/app/components/lawyer/SmartVaultModal/VaultPdfJsViewerLazy';
import type { AddDocumentModalProps, TimelineEvent } from '../../smartFile/modalFormTypes';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';
import {
    confirmSmartFileDestructiveAction,
    SMART_FILE_DELETE_DOCUMENT_MESSAGE,
} from '../../smartFile/smartFileDestructiveConfirm';
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
import { AddDocumentModalEntryForm } from './AddDocumentModalEntryForm';
import { AddDocumentModalSavedActions } from './AddDocumentModalSavedActions';

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
        if (!confirmSmartFileDestructiveAction(SMART_FILE_DELETE_DOCUMENT_MESSAGE)) return;
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
            maxWidth="max-w-2xl"
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
            <div className={browseOnly ? 'p-3 sm:p-4' : T.body}>
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
                            <AddDocumentModalSavedActions
                                item={item}
                                browseOnly={browseOnly}
                                previewLoading={previewLoading}
                                previewingEventId={previewingEventId}
                                isPreviewMissing={isPreviewMissing}
                                onPreview={(doc) => {
                                    void handlePreviewSavedDocument(doc);
                                }}
                                onReplace={onReplaceDocument}
                                onDelete={(doc) => {
                                    void handleDeleteSavedDocument(doc);
                                }}
                            />
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
                    <AddDocumentModalEntryForm
                        T={T}
                        isPearl={isPearl}
                        fileInputId={fileInputId}
                        fileInputRef={fileInputRef}
                        title={title}
                        setTitle={setTitle}
                        category={category}
                        setCategory={setCategory}
                        notes={notes}
                        setNotes={setNotes}
                        selectedFile={selectedFile}
                        selectedFileKind={selectedFileKind}
                        selectedPreviewUrl={selectedPreviewUrl}
                        isFileDragActive={isFileDragActive}
                        saving={saving}
                        editMode={editMode}
                        handleFileSelect={handleFileSelect}
                        handleDropSelectedFile={handleDropSelectedFile}
                        handleDragState={handleDragState}
                        handleSubmit={() => {
                            void handleSubmit();
                        }}
                    />
                ) : null}
            </div>
        </MoroccanGlassShell>
    );
};
