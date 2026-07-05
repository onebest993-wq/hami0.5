import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { loadVaultPdfDocument, type VaultPdfSource } from '@/app/services/vault/vaultPdfDocument';

type VaultPdfJsViewerProps = {
    source: VaultPdfSource;
    title: string;
    openUrl?: string;
};

export const VaultPdfJsViewer: React.FC<VaultPdfJsViewerProps> = ({ source, title, openUrl }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [pageCount, setPageCount] = useState(0);

    const externalUrl = openUrl ?? (typeof source === 'string' ? source : '');

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let cancelled = false;
        let pdfDoc: Awaited<ReturnType<typeof loadVaultPdfDocument>> | null = null;

        const renderPdf = async () => {
            setLoading(true);
            setError(false);
            setPageCount(0);
            container.innerHTML = '';

            try {
                pdfDoc = await loadVaultPdfDocument(source);
                if (cancelled) return;

                const total = pdfDoc.numPages;
                setPageCount(total);

                for (let pageNum = 1; pageNum <= total; pageNum += 1) {
                    const page = await pdfDoc.getPage(pageNum);
                    if (cancelled) return;

                    const baseViewport = page.getViewport({ scale: 1 });
                    const availableWidth = Math.max(container.clientWidth - 12, 260);
                    const fitScale = availableWidth / Math.max(baseViewport.width, 1);
                    const renderScale = Math.min(Math.max(fitScale, 1.35), 3);
                    const viewport = page.getViewport({ scale: renderScale });
                    const outputScale =
                        typeof window !== 'undefined' && window.devicePixelRatio > 1
                            ? Math.min(window.devicePixelRatio, 2)
                            : 1;
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.floor(viewport.width * outputScale);
                    canvas.height = Math.floor(viewport.height * outputScale);
                    canvas.className = 'mx-auto mb-4 max-w-full rounded-lg border border-white/10 bg-white shadow-lg';
                    canvas.style.width = `${Math.floor(viewport.width)}px`;
                    canvas.style.height = `${Math.floor(viewport.height)}px`;
                    canvas.setAttribute('aria-label', `${title} — صفحة ${pageNum}`);

                    const ctx = canvas.getContext('2d');
                    if (!ctx) continue;

                    ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);
                    await page.render({ canvasContext: ctx, viewport }).promise;
                    if (cancelled) return;
                    container.appendChild(canvas);

                    if (pageNum === 1) setLoading(false);
                }

                if (!cancelled) setLoading(false);
            } catch {
                if (!cancelled) {
                    setError(true);
                    setLoading(false);
                }
            }
        };

        void renderPdf();

        return () => {
            cancelled = true;
            container.innerHTML = '';
            void pdfDoc?.destroy();
        };
    }, [source, title]);

    if (error) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/50 text-sm px-4 text-center">
                <p>تعذر عرض PDF داخل التطبيق</p>
                {externalUrl ? (
                    <a
                        href={externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#E6C673] text-xs font-bold underline"
                    >
                        <ExternalLink size={14} />
                        فتح PDF في نافذة جديدة
                    </a>
                ) : null}
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-white/40 text-sm">
                    <Loader2 size={18} className="animate-spin" />
                    جاري تحميل PDF...
                </div>
            ) : null}
            {pageCount > 1 && !loading ? (
                <p className="shrink-0 text-center text-[10px] text-white/35 pb-1">{pageCount} صفحات</p>
            ) : null}
            <div
                ref={containerRef}
                className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-1 py-2"
                data-testid="vault-pdf-js-viewer"
            />
        </div>
    );
};
