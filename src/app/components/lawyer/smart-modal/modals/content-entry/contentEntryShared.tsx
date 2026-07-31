import React, { useEffect } from 'react';
import {
    ChevronDown,
    ChevronUp,
    FileText,
    X,
    type LucideIcon,
} from 'lucide-react';
import {
    prefetchVaultPdfViewerSurface,
    VaultPdfViewerSurfaceLazy,
} from '@/app/components/lawyer/SmartVaultModal/VaultPdfViewerSurfaceLazy';
import { ZoomableContainer } from '@/app/components/shared/ZoomableContainer';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import {
    resolveVaultDocUrl,
    resolveVaultDocViewerKind,
} from '@/app/services/vaultUploadService';
import { revokeBlobUrlIfNeeded } from '@/app/services/vault/vaultDocUtils';
import { SMART_FILE_NESTED_MODAL_OVERLAY_DARK_CLASS } from '../../smartFile/smartFileOverlayZ';
import type {
    TimelineEvent,
} from '../../smartFile/modalFormTypes';
import {
    MoroccanCloseButton,
    MoroccanHeaderDivider,
    GLASS_MODAL_HEADER,
} from '../../smartFile/moroccanGlassShell';
import { useSmartFileModalTheme } from '../../smartFile/smartFileModalTheme';

export function SmartModalHeader({
    T,
    icon: Icon,
    title,
    onClose,
}: {
    T: ReturnType<typeof useSmartFileModalTheme>;
    icon: LucideIcon;
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

export function ModalInlineTimeline({
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

export function normalizeDocLookupValue(value: unknown): string {
    return String(value ?? '')
        .trim()
        .toLowerCase();
}

export function normalizeDocLookupStem(value: unknown): string {
    return normalizeDocLookupValue(value).replace(/\.[a-z0-9]+$/i, '');
}

export function findVaultDocForTimelineItem(item: TimelineEvent, docs: SmartVaultDoc[]): SmartVaultDoc | null {
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

export function inferDocumentCategoryFromFile(file: File): string {
    if (file.type.startsWith('image/')) return 'صورة';
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return 'PDF';
    return 'مستند عام';
}

export function extractDocumentUserNotes(value: unknown): string {
    return String(value ?? '')
        .split('\n')
        .filter((line) => {
            const trimmed = line.trim();
            return trimmed && !trimmed.startsWith('نوع المستند:') && !trimmed.startsWith('الملف:');
        })
        .join('\n')
        .trim();
}

export function extractVaultDocSnapshot(item: TimelineEvent): SmartVaultDoc | null {
    const meta = (item.metadata as Record<string, unknown> | undefined) ?? {};
    const candidate = meta.vaultDoc;
    if (!candidate || typeof candidate !== 'object') return null;
    const doc = candidate as Record<string, unknown>;
    if (typeof doc.id !== 'string' || typeof doc.title !== 'string' || typeof doc.authorId !== 'string') return null;
    return doc as unknown as SmartVaultDoc;
}

export function DocumentTimelinePreview({
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

export function FullDocumentPreviewOverlay({
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
        if (isOpen && kind === 'pdf') prefetchVaultPdfViewerSurface();
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
                            {/* التقريب بقرصة اللمس أو Ctrl+عجلة — العجلة العادية تبقى لتمرير الصفحات */}
                            <ZoomableContainer wheelZoom="modifier" nativeVerticalScroll showControls>
                                <VaultPdfViewerSurfaceLazy
                                    source={pdfSource ?? url}
                                    title={title}
                                    openUrl={url}
                                    fallbackClassName="flex h-full items-center justify-center text-sm text-white/45"
                                />
                            </ZoomableContainer>
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
