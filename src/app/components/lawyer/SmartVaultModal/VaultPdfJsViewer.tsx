import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Loader2, RotateCcw } from 'lucide-react';
import {
    classifyVaultPdfLoadError,
    loadVaultPdfDocument,
    type VaultPdfLoadErrorKind,
    type VaultPdfSource,
} from '@/app/services/vault/vaultPdfDocument';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

type VaultPdfJsViewerProps = {
    source: VaultPdfSource;
    title: string;
    openUrl?: string;
};

/** هامش الرصد — الصفحات تُرسم قبل دخولها الشاشة بمسافة مريحة فلا يظهر السكيلتون أثناء تمرير طبيعي */
const LAZY_RENDER_ROOT_MARGIN = '640px 0px';

type PageRenderState = 'pending' | 'rendered' | 'failed';

/**
 * صفحة PDF كسولة: سكيلتون بنسبة أبعاد الصفحة الحقيقية حتى يقترب المستخدم منها،
 * حينها تُرسم على canvas (فك التشفير داخل pdf.js worker — لا حجب للخيط الرئيسي).
 */
function VaultPdfLazyPage({
    doc,
    pageNumber,
    title,
    aspectRatio,
    eager,
}: {
    doc: PDFDocumentProxy;
    pageNumber: number;
    title: string;
    /** نسبة ارتفاع/عرض الصفحة الأولى — تثبيت ارتفاع السكيلتون يمنع قفزات التمرير */
    aspectRatio: number;
    eager: boolean;
}) {
    const hostRef = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(eager);
    const [state, setState] = useState<PageRenderState>('pending');

    useEffect(() => {
        if (visible) return;
        const host = hostRef.current;
        if (!host) return;
        if (typeof IntersectionObserver === 'undefined') {
            setVisible(true);
            return;
        }
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: LAZY_RENDER_ROOT_MARGIN },
        );
        observer.observe(host);
        return () => observer.disconnect();
    }, [visible]);

    useEffect(() => {
        if (!visible || state !== 'pending') return;
        const host = hostRef.current;
        if (!host) return;

        let cancelled = false;
        let renderTask: RenderTask | null = null;

        const renderPage = async () => {
            try {
                const page = await doc.getPage(pageNumber);
                if (cancelled) return;

                const baseViewport = page.getViewport({ scale: 1 });
                const availableWidth = Math.max(host.clientWidth - 4, 260);
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
                canvas.className = 'mx-auto max-w-full rounded-lg border border-white/10 bg-white shadow-lg';
                canvas.style.width = '100%';
                canvas.style.height = 'auto';
                canvas.setAttribute('aria-label', `${title} — صفحة ${pageNumber}`);

                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('canvas 2d unavailable');
                ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);

                renderTask = page.render({ canvasContext: ctx, viewport });
                await renderTask.promise;
                if (cancelled) return;

                host.replaceChildren(canvas);
                setState('rendered');
            } catch (err) {
                if (!cancelled) {
                    if (import.meta.env.DEV) {
                        console.error(`[vault-pdf] فشل رسم الصفحة ${pageNumber}`, err);
                    }
                    setState('failed');
                }
            }
        };

        void renderPage();

        return () => {
            cancelled = true;
            renderTask?.cancel();
        };
    }, [visible, state, doc, pageNumber, title]);

    return (
        <div
            className="mb-4 scroll-mt-1"
            data-testid={`vault-pdf-page-${pageNumber}`}
            data-pdf-page={pageNumber}
            data-render-state={state}
        >
            {state === 'failed' ? (
                <p className="py-6 text-center text-xs text-white/40">تعذر عرض الصفحة {pageNumber}</p>
            ) : (
                <div
                    ref={hostRef}
                    className={
                        state === 'rendered'
                            ? undefined
                            : 'w-full animate-pulse rounded-lg border border-white/10 bg-white/[0.06]'
                    }
                    style={state === 'rendered' ? undefined : { aspectRatio: `1 / ${aspectRatio}` }}
                />
            )}
        </div>
    );
}

/** رسالة الفشل حسب السبب — الملف التالف/المحمي يحتاج فعلاً من المستخدم، والعابر تكفيه إعادة محاولة */
const PDF_ERROR_MESSAGES: Record<VaultPdfLoadErrorKind, string> = {
    password: 'هذا الملف محمي بكلمة مرور — لا يمكن عرضه داخل التطبيق.',
    invalid: 'ملف PDF تالف أو غير مكتمل — أعد رفع المستند من نسخته الأصلية.',
    timeout: 'استغرق تحميل PDF وقتاً أطول من المعتاد.',
    transient: 'تعذر عرض PDF داخل التطبيق.',
};

export const VaultPdfJsViewer: React.FC<VaultPdfJsViewerProps> = ({ source, title, openUrl }) => {
    const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
    const [error, setError] = useState<VaultPdfLoadErrorKind | null>(null);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [firstPageAspectRatio, setFirstPageAspectRatio] = useState(Math.SQRT2); // A4 تقريباً
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [currentPage, setCurrentPage] = useState(1);

    // تتبّع الصفحة المرئية أثناء التمرير — يغذّي مؤشر «صفحة س من ص» وأزرار التنقل
    useEffect(() => {
        const scroller = scrollerRef.current;
        if (!doc || !scroller || doc.numPages <= 1) return;
        setCurrentPage(1);
        if (typeof IntersectionObserver === 'undefined') return;

        const ratios = new Map<number, number>();
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    const num = Number((entry.target as HTMLElement).dataset.pdfPage);
                    if (Number.isFinite(num)) ratios.set(num, entry.intersectionRatio);
                }
                let bestPage = 0;
                let bestRatio = 0;
                ratios.forEach((ratio, page) => {
                    if (ratio > bestRatio) {
                        bestRatio = ratio;
                        bestPage = page;
                    }
                });
                if (bestPage > 0) setCurrentPage(bestPage);
            },
            { root: scroller, threshold: [0.1, 0.3, 0.5, 0.7] },
        );
        scroller.querySelectorAll<HTMLElement>('[data-pdf-page]').forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [doc]);

    const goToPage = useCallback(
        (pageNumber: number) => {
            if (!doc) return;
            const target = Math.min(doc.numPages, Math.max(1, pageNumber));
            scrollerRef.current
                ?.querySelector(`[data-pdf-page="${target}"]`)
                ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
            setCurrentPage(target);
        },
        [doc],
    );

    const externalUrl = openUrl ?? (typeof source === 'string' && !source.startsWith('data:') ? source : '');

    useEffect(() => {
        let cancelled = false;
        let loadedDoc: PDFDocumentProxy | null = null;

        setDoc(null);
        setError(null);

        const load = async () => {
            try {
                loadedDoc = await loadVaultPdfDocument(source);
                if (cancelled) {
                    void loadedDoc.destroy();
                    return;
                }
                try {
                    const firstPage = await loadedDoc.getPage(1);
                    if (cancelled) return;
                    const viewport = firstPage.getViewport({ scale: 1 });
                    if (viewport.width > 0) {
                        setFirstPageAspectRatio(viewport.height / viewport.width);
                    }
                } catch {
                    /* نسبة افتراضية A4 كافية للسكيلتون */
                }
                if (!cancelled) setDoc(loadedDoc);
            } catch (err) {
                if (import.meta.env.DEV) {
                    console.error('[vault-pdf] فشل تحميل مستند PDF', err);
                }
                if (!cancelled) setError(classifyVaultPdfLoadError(err));
            }
        };

        void load();

        return () => {
            cancelled = true;
            void loadedDoc?.destroy();
        };
    }, [source, loadAttempt]);

    if (error) {
        const retryable = error === 'timeout' || error === 'transient';
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/50 text-sm px-4 text-center">
                <p>{PDF_ERROR_MESSAGES[error]}</p>
                {retryable ? (
                    <button
                        type="button"
                        onClick={() => setLoadAttempt((n) => n + 1)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/10 px-4 text-xs font-bold text-[#E6C673] transition-colors hover:bg-[#E6C673]/20 touch-manipulation"
                    >
                        <RotateCcw size={14} />
                        إعادة المحاولة
                    </button>
                ) : null}
                {externalUrl ? (
                    <a
                        href={externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[44px] items-center gap-1.5 text-[#E6C673] text-xs font-bold underline touch-manipulation"
                    >
                        <ExternalLink size={14} />
                        فتح PDF في نافذة جديدة
                    </a>
                ) : null}
            </div>
        );
    }

    return (
        <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden">
            {!doc ? (
                <div className="flex items-center justify-center gap-2 py-8 text-white/40 text-sm">
                    <Loader2 size={18} className="animate-spin" />
                    جاري تحميل PDF...
                </div>
            ) : null}
            {doc && doc.numPages > 1 ? (
                <div
                    className="shrink-0 flex items-center justify-center gap-2 pb-1.5"
                    data-testid="vault-pdf-page-nav"
                >
                    <button
                        type="button"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                        aria-label="الصفحة السابقة"
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/60 transition-colors hover:bg-white/[0.1] hover:text-white disabled:opacity-30 touch-manipulation"
                    >
                        <ChevronUp size={15} />
                    </button>
                    <span className="min-w-20 select-none text-center text-[11px] font-bold tabular-nums text-white/55">
                        صفحة {currentPage} من {doc.numPages}
                    </span>
                    <button
                        type="button"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= doc.numPages}
                        aria-label="الصفحة التالية"
                        className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/60 transition-colors hover:bg-white/[0.1] hover:text-white disabled:opacity-30 touch-manipulation"
                    >
                        <ChevronDown size={15} />
                    </button>
                </div>
            ) : null}
            <div
                ref={scrollerRef}
                className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-1 py-2"
                data-testid="vault-pdf-js-viewer"
            >
                {doc
                    ? Array.from({ length: doc.numPages }, (_, i) => (
                          <VaultPdfLazyPage
                              key={`${i + 1}`}
                              doc={doc}
                              pageNumber={i + 1}
                              title={title}
                              aspectRatio={firstPageAspectRatio}
                              eager={i < 2}
                          />
                      ))
                    : null}
            </div>
        </div>
    );
};
